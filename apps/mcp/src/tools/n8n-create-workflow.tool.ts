import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';

import type { ToolDefinition } from '../types/index.js';

const n8nSimpleStepSchema = z.object({
  step: z.string().min(1),
  type: z.enum(['investigate', 'transform', 'notify', 'sync', 'custom']).default('custom'),
});

const n8nCreateWorkflowInputSchema = z.object({
  name: z.string().min(1),
  nodes: z.array(n8nSimpleStepSchema).min(1),
});

type N8nCreateWorkflowInput = z.infer<typeof n8nCreateWorkflowInputSchema>;
type N8nSimpleStep = z.infer<typeof n8nSimpleStepSchema>;

type N8nNode = {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
};

type N8nConnectionEntry = {
  node: string;
  type: 'main';
  index: number;
};

type N8nConnections = Record<string, { main: N8nConnectionEntry[][] }>;

type N8nWorkflow = {
  name: string;
  nodes: N8nNode[];
  connections: N8nConnections;
  settings: Record<string, unknown>;
  staticData: Record<string, unknown>;
  meta: Record<string, unknown>;
  pinData: Record<string, unknown>;
  tags: string[];
  versionId: string;
};

type N8nCreateWorkflowOutput =
  | {
      success: true;
      path: string;
      workflow_name: string;
      nodes_count: number;
      observation: string;
    }
  | {
      success: false;
      error: string;
    };

function safeWorkflowName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9-_]+/g, '-')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^-|-$/g, '')
    .slice(0, 80);
}

function workflowDir(): string {
  const root = process.env.OPSLY_REPO_ROOT?.trim() || '/opt/opsly';
  return resolve(root, '.n8n-temp', 'workflows');
}

function stepToWebhookBodySnippet(step: N8nSimpleStep): string {
  return `${step.type}:${step.step}`.slice(0, 240);
}

function buildWorkflow(name: string, steps: N8nSimpleStep[]): N8nWorkflow {
  const webhookNode: N8nNode = {
    id: '1',
    name: 'Opsly Trigger',
    type: 'n8n-nodes-base.webhook',
    typeVersion: 2,
    position: [240, 300],
    parameters: {
      httpMethod: 'POST',
      path: `opsly/${safeWorkflowName(name)}`,
      responseMode: 'onReceived',
      options: {},
    },
  };

  const nodes: N8nNode[] = [webhookNode];
  const connections: N8nConnections = {};
  let previousName = webhookNode.name;

  steps.forEach((step, index) => {
    const nodeName = `Step ${index + 1} - ${step.type}`;
    const setNode: N8nNode = {
      id: String(index + 2),
      name: nodeName,
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: [520 + index * 260, 300],
      parameters: {
        keepOnlySet: false,
        values: {
          string: [
            { name: 'opsly_step', value: step.step },
            { name: 'opsly_step_type', value: step.type },
            { name: 'opsly_step_hint', value: stepToWebhookBodySnippet(step) },
          ],
        },
      },
    };
    nodes.push(setNode);
    connections[previousName] = {
      main: [[{ node: setNode.name, type: 'main', index: 0 }]],
    };
    previousName = setNode.name;
  });

  const opslyWebhookNode: N8nNode = {
    id: String(steps.length + 2),
    name: 'Opsly API Callback',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [520 + steps.length * 260, 300],
    parameters: {
      method: 'POST',
      url: "={{ $env.OPSLY_API_URL + '/api/n8n/execute' }}",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          {
            name: 'Authorization',
            value: "={{ 'Bearer ' + $env.PLATFORM_ADMIN_TOKEN }}",
          },
          { name: 'Content-Type', value: 'application/json' },
        ],
      },
      sendBody: true,
      specifyBody: 'json',
      jsonBody:
        "={{ { agent_id: 'cursor', plan_step_index: 0, args: { tenant_slug: ($json.tenant_slug || 'platform'), task_description: ($json.opsly_step || 'n8n automation task') } } }}",
      options: {},
    },
  };
  nodes.push(opslyWebhookNode);
  connections[previousName] = {
    main: [[{ node: opslyWebhookNode.name, type: 'main', index: 0 }]],
  };

  return {
    name,
    nodes,
    connections,
    settings: { executionOrder: 'v1' },
    staticData: {},
    meta: { templateCredsSetupCompleted: false },
    pinData: {},
    tags: ['opsly', 'automation'],
    versionId: '1',
  };
}

export const n8nCreateWorkflowTool: ToolDefinition<
  N8nCreateWorkflowInput,
  N8nCreateWorkflowOutput
> = {
  name: 'n8n_create_workflow',
  description:
    'Genera un workflow JSON de n8n desde pasos simplificados y lo guarda en disco para importacion via CLI.',
  inputSchema: n8nCreateWorkflowInputSchema,
  handler: async (input): Promise<N8nCreateWorkflowOutput> => {
    const safeName = safeWorkflowName(input.name);
    if (safeName.length === 0) {
      return { success: false, error: 'Nombre de workflow invalido' };
    }

    try {
      const dir = workflowDir();
      await mkdir(dir, { recursive: true });
      const filePath = resolve(dir, `${safeName}.json`);
      const workflow = buildWorkflow(input.name.trim(), input.nodes);
      await writeFile(filePath, JSON.stringify(workflow, null, 2), 'utf8');
      return {
        success: true,
        path: filePath,
        workflow_name: input.name.trim(),
        nodes_count: workflow.nodes.length,
        observation: 'Workflow JSON generado. Ejecuta scripts/n8n-import.sh para importarlo.',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  },
};
