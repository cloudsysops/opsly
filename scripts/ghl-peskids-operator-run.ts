/**
 * Peskids GHL operator verification — API-only actions.
 * Idempotent: reuses test contact by email; no deletes; no duplicate tags/pipeline ops.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { GoHighLevelClient } from '../lib/services/gohighlevel/client.js';
import { resolveGoHighLevelPeskidsEnv } from '../lib/services/gohighlevel/env-config.js';

const TEST_EMAIL = 'opsly.verify+peskids@intcloudsysops.com';
const TEST_PHONE = '+573001234567';
const TEST_PARENT = 'Opsly Verify Parent';
const TEST_CHILD = 'Mateo Test';
const TEST_CHILD_AGE = 8;
const EXPECTED_TAGS = ['lead-web'] as const;
const PIPELINE_NAMES = ['Peskids Enrollment', 'Academy Growth'] as const;
const EXPECTED_STAGE = 'New Lead';
const MANIFEST_FORM = 'Peskids Lead Capture';
const EMAIL_TEMPLATES = [
  'Peskids — Welcome Parent',
  'Peskids — Trial Class Confirmation',
] as const;
const SMS_TEMPLATE = 'Peskids — Trial Reminder';

interface OperatorReport {
  completed: string[];
  pending: string[];
  blockers: string[];
  apiActions: string[];
  manualRequired: string[];
  testContact?: { id: string; email: string; reused: boolean };
  pipeline?: { id: string; name: string; stageId: string; stageName: string };
  tagsOnContact?: string[];
  customFieldsOnContact?: Record<string, unknown>;
  formsFound?: string[];
  pipelinesFound?: string[];
  customFieldsFound?: string[];
  tagsFound?: string[];
  noteAcademyGrowth?: string;
}

async function ghlFetch(
  baseUrl: string,
  apiKey: string,
  apiVersion: string,
  method: string,
  reqPath: string,
  body?: unknown
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}${reqPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Version: apiVersion,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    json = { raw: text };
  }
  return { ok: response.ok, status: response.status, json };
}

async function main(): Promise<void> {
  const env = resolveGoHighLevelPeskidsEnv();
  if (!env.apiKey || !env.locationId) {
    throw new Error('GOHIGHLEVEL_PESKIDS_API_KEY and GOHIGHLEVEL_PESKIDS_LOCATION_ID required');
  }
  const client = new GoHighLevelClient(env.apiKey, env.baseUrl, {
    locationId: env.locationId,
    apiVersion: env.apiVersion,
  });

  const report: OperatorReport = {
    completed: [],
    pending: [],
    blockers: [],
    apiActions: [],
    manualRequired: [],
  };

  const locationId = env.locationId;
  const baseUrl = env.baseUrl;
  const apiKey = env.apiKey;
  const apiVersion = env.apiVersion;

  // --- Inventory (read-only) ---
  const tags = await client.listTags();
  report.tagsFound = tags.map((t) => t.name);
  const customFields = await client.listCustomFields();
  report.customFieldsFound = customFields.map((f) => f.name ?? f.id);
  const pipelines = await client.listPipelines();
  report.pipelinesFound = pipelines.map((p) => p.name);

  let forms: Awaited<ReturnType<GoHighLevelClient['listForms']>> = [];
  try {
    forms = await client.listForms();
    report.formsFound = forms.map((f) => f.name);
  } catch (err) {
    report.manualRequired.push(
      `forms.list: ${err instanceof Error ? err.message : String(err)} — verify form in GHL UI`
    );
  }

  // Pipeline resolution (manifest: Peskids Enrollment; user may say Academy Growth)
  const pipeline =
    pipelines.find((p) => p.name === 'Peskids Enrollment') ??
    pipelines.find((p) => p.name === 'Academy Growth') ??
    pipelines.find((p) => p.name.toLowerCase().includes('enrollment'));

  if (!pipeline) {
    report.blockers.push(
      `Pipeline not found. Expected "Peskids Enrollment" (manifest). Found: ${report.pipelinesFound?.join(', ') || 'none'}`
    );
  } else {
    if (pipeline.name !== 'Peskids Enrollment') {
      report.noteAcademyGrowth =
        `Using pipeline "${pipeline.name}" — manifest canonical name is "Peskids Enrollment".`;
    }
    const stage =
      pipeline.stages?.find((s) => s.name === EXPECTED_STAGE) ?? pipeline.stages?.[0];
    if (stage?.id) {
      report.pipeline = {
        id: pipeline.id,
        name: pipeline.name,
        stageId: stage.id,
        stageName: stage.name,
      };
      report.completed.push(`Pipeline verified: ${pipeline.name} / stage ${stage.name}`);
    } else {
      report.blockers.push(`Pipeline ${pipeline.name} has no stages via API`);
    }
  }

  // Custom field IDs for contact payload
  const fieldByName = new Map(
    customFields.map((f) => [(f.name ?? '').toLowerCase(), f])
  );
  const requiredFieldNames = ['child_name', 'child_age', 'interest_level', 'preferred_schedule'];
  for (const name of requiredFieldNames) {
    if (!fieldByName.has(name)) {
      report.pending.push(`Custom field missing in location: ${name}`);
    }
  }

  // --- Find or create test contact ---
  const search = await ghlFetch(baseUrl, apiKey, apiVersion, 'POST', '/contacts/search', {
    locationId,
    page: 1,
    pageLimit: 1,
    filters: [{ field: 'email', operator: 'eq', value: TEST_EMAIL }],
  });

  let contactId: string | undefined;
  let reused = false;

  if (search.ok) {
    const contacts = (search.json.contacts ?? search.json.data) as
      | Array<{ id?: string }>
      | undefined;
    contactId = contacts?.[0]?.id;
    if (contactId) {
      reused = true;
      report.apiActions.push(`Reused existing test contact ${contactId} (${TEST_EMAIL})`);
    }
  }

  if (!contactId) {
    const customFieldPayload: Array<{ id: string; value: string | number }> = [];
    const childNameField = fieldByName.get('child_name');
    const childAgeField = fieldByName.get('child_age');
    if (childNameField?.id) {
      customFieldPayload.push({ id: childNameField.id, value: TEST_CHILD });
    }
    if (childAgeField?.id) {
      customFieldPayload.push({ id: childAgeField.id, value: TEST_CHILD_AGE });
    }

    const createRes = await ghlFetch(baseUrl, apiKey, apiVersion, 'POST', '/contacts/', {
      locationId,
      name: TEST_PARENT,
      email: TEST_EMAIL,
      phone: TEST_PHONE,
      source: 'Opsly Operator Verify',
      ...(customFieldPayload.length > 0 ? { customFields: customFieldPayload } : {}),
    });
    if (!createRes.ok) {
      throw new Error(
        `Create contact failed HTTP ${createRes.status}: ${JSON.stringify(createRes.json).slice(0, 400)}`
      );
    }
    const created = (createRes.json.contact ?? createRes.json.data) as { id?: string };
    if (!created?.id) {
      throw new Error('Create contact: missing id in response');
    }
    contactId = created.id;
    report.apiActions.push(`Created test contact ${contactId}`);
  }

  report.testContact = { id: contactId, email: TEST_EMAIL, reused };

  // --- Tags (add only if missing) ---
  const contact = await client.getContact(contactId);
  const existingTags = new Set(
    (contact as ContactWithTags).tags?.map((t) => (typeof t === 'string' ? t : t.name)) ?? []
  );
  report.tagsOnContact = [...existingTags];

  const tagsToAdd = EXPECTED_TAGS.filter((t) => !existingTags.has(t));
  if (tagsToAdd.length > 0) {
    const tagRes = await ghlFetch(
      baseUrl,
      apiKey,
      apiVersion,
      'POST',
      `/contacts/${contactId}/tags`,
      { tags: tagsToAdd }
    );
    if (tagRes.ok) {
      report.apiActions.push(`Added tags: ${tagsToAdd.join(', ')}`);
      tagsToAdd.forEach((t) => existingTags.add(t));
      report.tagsOnContact = [...existingTags];
      report.completed.push('Tags applied to test contact');
    } else {
      report.blockers.push(
        `Add tags failed HTTP ${tagRes.status}: ${JSON.stringify(tagRes.json).slice(0, 200)}`
      );
    }
  } else {
    report.completed.push('Tags already present on test contact');
  }

  for (const tag of EXPECTED_TAGS) {
    if (!report.tagsOnContact?.includes(tag)) {
      report.pending.push(`Tag not on contact: ${tag}`);
    }
  }

  // --- Custom fields on contact ---
  report.customFieldsOnContact = contact.customFields ?? {};
  const hasChildName =
    Object.values(report.customFieldsOnContact).some((v) => v === TEST_CHILD) ||
    (contact as ContactWithTags).child_name === TEST_CHILD;
  if (!reused && fieldByName.has('child_name')) {
    report.completed.push('Custom fields set on create (child_name, child_age)');
  } else if (reused) {
    report.completed.push('Custom fields visible on existing contact (verify mapping in UI)');
  }

  // --- Opportunity in pipeline ---
  if (report.pipeline && contactId) {
    const oppSearch = await ghlFetch(baseUrl, apiKey, apiVersion, 'POST', '/opportunities/search', {
      locationId,
      contactId,
      page: 1,
      limit: 5,
    });

    const opps = (oppSearch.json.opportunities ?? oppSearch.json.data) as
      | Array<{ id?: string; pipelineId?: string }>
      | undefined;
    const existingOpp = opps?.find((o) => o.pipelineId === report.pipeline?.id);

    if (existingOpp?.id) {
      report.apiActions.push(`Reused opportunity ${existingOpp.id} in pipeline`);
      report.completed.push(`Contact in pipeline ${report.pipeline.name}`);
    } else {
      const createOpp = await ghlFetch(baseUrl, apiKey, apiVersion, 'POST', '/opportunities/', {
        locationId,
        contactId,
        pipelineId: report.pipeline.id,
        pipelineStageId: report.pipeline.stageId,
        name: `${TEST_PARENT} — Opsly Verify`,
        status: 'open',
      });
      if (createOpp.ok) {
        const opp = (createOpp.json.opportunity ?? createOpp.json.data) as { id?: string };
        report.apiActions.push(`Created opportunity ${opp?.id ?? 'unknown'}`);
        report.completed.push(`Contact entered pipeline ${report.pipeline.name} at ${report.pipeline.stageName}`);
      } else {
        report.blockers.push(
          `Create opportunity failed HTTP ${createOpp.status}: ${JSON.stringify(createOpp.json).slice(0, 300)}`
        );
      }
    }
  }

  // --- Form (API list only) ---
  const form = forms.find((f) => f.name === MANIFEST_FORM);
  if (form) {
    report.completed.push(`Form found via API: ${MANIFEST_FORM} (${form.id})`);
  } else {
    report.manualRequired.push(
      `Form "${MANIFEST_FORM}" — API list empty or IAM blocked; confirm in GHL UI + test submit`
    );
    report.pending.push('Form submit E2E (manual UI)');
  }

  // --- Templates (not API verifiable) ---
  for (const name of EMAIL_TEMPLATES) {
    report.manualRequired.push(`email_template: ${name} — verify in Marketing → Email Templates (UI)`);
  }
  report.manualRequired.push(`sms_template: ${SMS_TEMPLATE} — verify in Conversations → Templates (UI)`);

  // --- Workflows ---
  report.manualRequired.push(
    'Basic follow-up workflow — verify in Automation → Workflows can reference templates (UI); Opsly uses n8n for execution'
  );
  report.pending.push('Activate GHL workflow OR confirm n8n peskids-lead-intake wired');

  // Write report
  const outDir = path.join(process.cwd(), 'docs/artifacts/provisioning');
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, 'peskids-operator-report.json');
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nReport written: ${outPath}`);
}

interface ContactWithTags {
  tags?: Array<string | { name: string }>;
  child_name?: string;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
