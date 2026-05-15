import { z } from 'zod';
import type { ToolDefinition } from '../types/index.js';

const ORCHESTRATOR_URL = process.env.MCP_ORCHESTRATOR_URL || 'http://orchestrator:3011';
const ADMIN_TOKEN = process.env.PLATFORM_ADMIN_TOKEN || '';

interface WorkflowNode {
  id: string;
  label: string;
  type: 'agent' | 'job' | 'service' | 'event';
  status?: string;
  latencyMs?: number;
  group?: string;
}

interface WorkflowEdge {
  source: string;
  target: string;
  label?: string;
  type?: string;
}

interface WorkflowVisualization {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata: {
    jobCount: number;
    agentCount: number;
    serviceCount: number;
    avgLatencyMs: number;
  };
  mermaidCode: string;
  graphvizCode: string;
  formattedCode: string;
}

const STYLED_NODE = (id: string, label: string, type: string, status?: string): string => {
  const shape = type === 'agent' ? '([`' : type === 'service' ? '[`' : '[`';
  const end = type === 'agent' ? '`])' : '`]';
  const style = status === 'healthy' ? ':::green' : status === 'unhealthy' ? ':::red' : '';
  return `${id}${shape}${label}${end}${style}`;
};

async function fetchFromService(url: string, path: string): Promise<unknown> {
  try {
    const response = await fetch(`${url}${path}`, {
      signal: AbortSignal.timeout(5000),
      headers: ADMIN_TOKEN ? { Authorization: `Bearer ${ADMIN_TOKEN}` } : {},
    });
    if (!response.ok) return null;
    return response.json() as unknown;
  } catch {
    return null;
  }
}

async function discoverOrchestrator(): Promise<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }> {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  const health = await fetchFromService(ORCHESTRATOR_URL, '/health');
  if (health && typeof health === 'object') {
    const h = health as Record<string, unknown>;
    nodes.push({
      id: 'orchestrator',
      label: 'Orquestador',
      type: 'service',
      status: h.status === 'ok' ? 'healthy' : 'unhealthy',
    });
  }

  const localState = await fetchFromService(ORCHESTRATOR_URL, '/api/local/state');
  if (localState && typeof localState === 'object') {
    const s = localState as Record<string, unknown>;
    const services = s.services as Record<string, { status?: string; url?: string }> | undefined;
    if (services) {
      for (const [name, info] of Object.entries(services)) {
        const sid = `svc:${name}`;
        nodes.push({
          id: sid,
          label: name,
          type: 'service',
          status: info.status === 'running' ? 'healthy' : info.status,
          group: 'servicios',
        });
        edges.push({
          source: 'orchestrator',
          target: sid,
          label: 'gestiona',
          type: 'orchestration',
        });
      }
    }
    const agents = s.agents as Record<string, { status?: string; task?: string }> | undefined;
    if (agents) {
      for (const [name, info] of Object.entries(agents)) {
        const aid = `agent:${name}`;
        nodes.push({
          id: aid,
          label: `${name}${info.task ? `\\n[${info.task}]` : ''}`,
          type: 'agent',
          status: info.status,
          group: 'agentes',
        });
        edges.push({
          source: 'orchestrator',
          target: aid,
          label: 'ejecuta',
          type: 'execution',
        });
      }
    }
  }

  return { nodes, edges };
}

async function discoverDocker(): Promise<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }> {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  try {
    const { access, readFile } = await import('node:fs/promises');
    await access('/var/run/docker.sock');

    const containersRaw = await fetchFromService(
      `http://localhost`,
      '/containers/json?all=false'
    ).catch(() => null);

    if (Array.isArray(containersRaw)) {
      for (const c of containersRaw as Array<{ Names?: string[]; State?: string; Image?: string; Ports?: Array<{ PublicPort?: number }> }>) {
        const name = (c.Names?.[0] || '').replace(/^\//, '');
        if (!name || name === 'traefik') continue;

        const cid = `docker:${name}`;
        nodes.push({
          id: cid,
          label: `${name}\\n${c.Image?.split('/').pop() || ''}`,
          type: 'job',
          status: c.State === 'running' ? 'healthy' : 'unhealthy',
          group: 'contenedores',
        });

        const agentMatch = name.match(/^opsly_(\w+)/);
        if (agentMatch) {
          edges.push({
            source: 'orchestrator',
            target: cid,
            label: 'contiene',
            type: 'deployment',
          });
        }
      }
    }
  } catch {
    // Docker socket not available — skip
  }

  return { nodes, edges };
}

function buildMermaid(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  metadata: { jobCount: number; agentCount: number; serviceCount: number; avgLatencyMs: number }
): string {
  const lines: string[] = ['```mermaid', 'graph LR'];

  lines.push('');
  lines.push('%% Estilos');
  lines.push('classDef green fill:#d4edda,stroke:#28a745,color:#155724');
  lines.push('classDef red fill:#f8d7da,stroke:#dc3545,color:#721c24');
  lines.push('classDef blue fill:#d1ecf1,stroke:#17a2b8,color:#0c5460');
  lines.push('');

  const groups = new Map<string, { title: string; nodes: string[] }>();
  for (const n of nodes) {
    if (n.group) {
      if (!groups.has(n.group)) {
        const title = n.group.charAt(0).toUpperCase() + n.group.slice(1);
        groups.set(n.group, { title, nodes: [] });
      }
      groups.get(n.group)!.nodes.push(n.id);
    }
  }

  const seenSubgraphs = new Set<string>();
  for (const n of nodes) {
    if (n.group && !seenSubgraphs.has(n.group)) {
      seenSubgraphs.add(n.group);
      const g = groups.get(n.group)!;
      lines.push(`  subgraph ${g.title}Grp["${g.title}"]`);
      for (const nodeId of g.nodes) {
        const node = nodes.find((x) => x.id === nodeId)!;
        lines.push(`    ${STYLED_NODE(node.id, node.label, node.type, node.status)}`);
      }
      lines.push('  end');
    } else if (!n.group) {
      lines.push(`  ${STYLED_NODE(n.id, n.label, n.type, n.status)}`);
    }
  }

  lines.push('');
  for (const e of edges) {
    const label = e.label ? `|${e.label}|` : '';
    lines.push(`  ${e.source} -->${label} ${e.target}`);
  }

  lines.push('');
  lines.push(`%% Metadata: ${metadata.jobCount} jobs, ${metadata.agentCount} agents, ${metadata.serviceCount} services, ${metadata.avgLatencyMs}ms avg latency`);

  lines.push('```');
  return lines.join('\n');
}

function buildGraphviz(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): string {
  const lines: string[] = ['```graphviz', 'digraph G {', '  rankdir=LR;', '  splines=true;', '  node [style="rounded,filled", fillcolor="#d4edda", fontcolor="#155724"];', ''];

  for (const n of nodes) {
    const color = n.status === 'healthy' ? '#d4edda' : n.status === 'unhealthy' ? '#f8d7da' : '#d1ecf1';
    const fontColor = n.status === 'healthy' ? '#155724' : n.status === 'unhealthy' ? '#721c24' : '#0c5460';
    const shape = n.type === 'agent' ? 'box3d' : n.type === 'service' ? 'component' : 'box';
    lines.push(`  "${n.id}" [label="${n.label}", fillcolor="${color}", fontcolor="${fontColor}", shape="${shape}"];`);
  }

  lines.push('');
  for (const e of edges) {
    const label = e.label ? ` [label="${e.label}"]` : '';
    lines.push(`  "${e.source}" -> "${e.target}"${label};`);
  }

  lines.push('}');
  lines.push('```');
  return lines.join('\n');
}

export const visualizeWorkflowTool: ToolDefinition<
  { tenant_slug: string; format?: 'mermaid' | 'graphviz'; include_metrics?: boolean },
  { workflow: WorkflowVisualization }
> = {
  name: 'visualize_tenant_workflow',
  description:
    'Visualiza el flujo de trabajo de un tenant: agentes, servicios, conexiones y estado actual. Genera diagramas mermaid o graphviz a partir de datos reales del orquestador y Docker.',
  inputSchema: z.object({
    tenant_slug: z.string().min(1).max(64),
    format: z.enum(['mermaid', 'graphviz']).optional().default('mermaid'),
    include_metrics: z.boolean().optional().default(false),
  }),
  handler: async ({ tenant_slug, format = 'mermaid' }) => {
    const { nodes: orchNodes, edges: orchEdges } = await discoverOrchestrator();
    const { nodes: dockerNodes, edges: dockerEdges } = await discoverDocker();

    const nodes = [...orchNodes, ...dockerNodes];
    const edges = [...orchEdges, ...dockerEdges];

    const metadata = {
      jobCount: nodes.filter((n) => n.type === 'job').length,
      agentCount: nodes.filter((n) => n.type === 'agent').length,
      serviceCount: nodes.filter((n) => n.type === 'service').length,
      avgLatencyMs: nodes.reduce((sum, n) => sum + (n.latencyMs || 0), 0) / (nodes.length || 1),
    };

    const mermaidCode = buildMermaid(nodes, edges, metadata);
    const graphvizCode = buildGraphviz(nodes, edges);
    const formattedCode = format === 'mermaid' ? mermaidCode : graphvizCode;

    return {
      workflow: {
        nodes,
        edges,
        metadata,
        mermaidCode,
        graphvizCode,
        formattedCode,
      },
    };
  },
};
