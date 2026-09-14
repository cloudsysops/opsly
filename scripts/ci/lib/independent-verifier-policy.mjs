const TRUST_RANK = new Map([
  ['observe', 0],
  ['shadow', 1],
  ['supervised', 2],
  ['trusted', 3],
  ['autonomous_low_risk', 4],
]);

export const STRUCTURED_VERIFIER_MARKER = 'opsly-independent-verifier-v1';

function normalizePath(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\.\//, '');
}

function globToRegExp(pattern) {
  const input = normalizePath(pattern);
  let source = '^';

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '*') {
      if (input[index + 1] === '*') {
        source += '.*';
        index += 1;
      } else {
        source += '[^/]*';
      }
      continue;
    }

    if ('\\.^$+?()[]{}|'.includes(char)) source += '\\' + char;
    else source += char;
  }

  source += '$';
  return new RegExp(source, 'i');
}

export function pathMatchesPattern(filePath, pattern) {
  return globToRegExp(pattern).test(normalizePath(filePath));
}

export function trustAtLeast(actual, minimum) {
  return (TRUST_RANK.get(String(actual)) ?? -1) >= (TRUST_RANK.get(String(minimum)) ?? 99);
}

export function classifySensitiveSurfaces(files = [], policy = {}) {
  const paths = files
    .map((file) => normalizePath(typeof file === 'string' ? file : file?.filename))
    .filter(Boolean);
  const matched = [];

  for (const surface of policy.sensitive_surfaces ?? []) {
    const patterns = Array.isArray(surface?.patterns) ? surface.patterns : [];
    const matchedPaths = paths.filter((file) =>
      patterns.some((pattern) => pathMatchesPattern(file, pattern))
    );
    if (matchedPaths.length > 0) {
      matched.push({
        id: String(surface.id || 'sensitive'),
        quorum: Number(surface.quorum || policy.sensitive_quorum || 2),
        required_specialties: Array.isArray(surface.required_specialties)
          ? surface.required_specialties.map(String)
          : [],
        matched_paths: matchedPaths,
      });
    }
  }

  return matched;
}

export function extractStructuredVerifierEvidence(body) {
  const text = String(body || '');
  const match = text.match(
    /<!--\s*opsly-independent-verifier-v1\s*([\s\S]*?)-->/i
  );
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[1].trim());
    if (parsed?.schema_version !== 'IndependentVerifierEvidenceV1') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function requiredVerifierPolicy(files = [], policy = {}) {
  const surfaces = classifySensitiveSurfaces(files, policy);
  const sensitive = surfaces.length > 0;
  const quorum = sensitive
    ? Math.max(
        Number(policy.sensitive_quorum || 2),
        ...surfaces.map((surface) => Number(surface.quorum || 0))
      )
    : Number(policy.normal_quorum || 1);

  const requiredSpecialties = [
    ...new Set(surfaces.flatMap((surface) => surface.required_specialties ?? [])),
  ].sort();

  return {
    sensitive,
    quorum,
    required_specialties: requiredSpecialties,
    surfaces,
  };
}

function actorTimestamp(entry) {
  return (
    Date.parse(entry?.submitted_at || entry?.updated_at || entry?.created_at || '') ||
    Number(entry?.id || 0)
  );
}

export function collectQualifiedVerifierEvidence({
  reviews = [],
  issueComments = [],
  headSha,
  author,
  policy,
  commitMatches,
  extractReviewedCommit,
  isCleanReviewBody,
}) {
  const profiles = policy?.verifier_profiles ?? {};
  const minimumTrust = policy?.minimum_trust_level ?? 'trusted';
  const all = [];

  for (const entry of [...reviews, ...issueComments]) {
    const login = entry?.user?.login;
    const profile = profiles[login];
    if (!login || !profile || login === author) continue;
    if (!trustAtLeast(profile.trust_level, minimumTrust)) continue;

    const structured = extractStructuredVerifierEvidence(entry?.body);
    let reviewedSha = null;
    let decision = null;
    let evidenceType = null;
    let findings = [];

    if (structured) {
      reviewedSha = structured.head_sha;
      decision = String(structured.decision || '').toUpperCase();
      evidenceType = 'structured';
      findings = Array.isArray(structured.findings) ? structured.findings.map(String) : [];
    } else if (isCleanReviewBody(entry?.body)) {
      reviewedSha = entry?.commit_id || extractReviewedCommit(entry?.body);
      decision = 'PASS';
      evidenceType = 'qualified_clean_review';
    }

    if (!reviewedSha || !commitMatches(headSha, reviewedSha)) continue;
    if (!['PASS', 'FAIL', 'BLOCKED'].includes(decision)) continue;
    if (decision === 'PASS' && findings.some((finding) => /\bP[012]\b/i.test(finding))) {
      decision = 'FAIL';
    }

    all.push({
      login,
      profile_id: profile.profile_id,
      agent_id: profile.agent_id,
      model_family: profile.model_family,
      trust_level: profile.trust_level,
      independence_group: profile.independence_group,
      specialties: Array.isArray(profile.specialties) ? profile.specialties.map(String) : [],
      decision,
      findings,
      evidence_type: evidenceType,
      reviewed_sha: reviewedSha,
      order: actorTimestamp(entry),
    });
  }

  const latestByActor = new Map();
  for (const evidence of all) {
    const previous = latestByActor.get(evidence.login);
    if (!previous || evidence.order >= previous.order) {
      latestByActor.set(evidence.login, evidence);
    }
  }

  return [...latestByActor.values()];
}

export function evaluateQualifiedVerifierQuorum({
  evidence = [],
  requirement,
}) {
  const negative = evidence.find(
    (item) => item.decision === 'FAIL' || item.decision === 'BLOCKED'
  );
  if (negative) {
    return {
      ok: false,
      status: negative.decision,
      reason:
        'qualified_verifier_' +
        negative.decision.toLowerCase() +
        ':' +
        negative.login,
      observed_quorum: 0,
      verifier_groups: [],
      covered_specialties: [],
    };
  }

  const passes = evidence.filter((item) => item.decision === 'PASS');
  const byGroup = new Map();
  for (const item of passes) {
    if (!item.independence_group) continue;
    if (!byGroup.has(item.independence_group)) {
      byGroup.set(item.independence_group, item);
    }
  }

  const selected = [...byGroup.values()];
  const specialties = [...new Set(selected.flatMap((item) => item.specialties))].sort();
  const missingSpecialties = (requirement.required_specialties ?? []).filter(
    (specialty) => !specialties.includes(specialty)
  );

  if (selected.length < requirement.quorum) {
    return {
      ok: false,
      status: 'BLOCKED',
      reason: 'qualified_verifier_quorum_missing',
      observed_quorum: selected.length,
      verifier_groups: selected.map((item) => item.independence_group),
      covered_specialties: specialties,
      missing_specialties: missingSpecialties,
    };
  }

  if (missingSpecialties.length > 0) {
    return {
      ok: false,
      status: 'BLOCKED',
      reason: 'qualified_verifier_specialty_missing',
      observed_quorum: selected.length,
      verifier_groups: selected.map((item) => item.independence_group),
      covered_specialties: specialties,
      missing_specialties: missingSpecialties,
    };
  }

  return {
    ok: true,
    status: 'PASS',
    reason: 'qualified_verifier_quorum_pass',
    observed_quorum: selected.length,
    verifier_groups: selected.map((item) => item.independence_group),
    verifier_agents: selected.map((item) => item.agent_id),
    covered_specialties: specialties,
    missing_specialties: [],
  };
}
