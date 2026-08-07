/**
 * GET /api/orchestrator/status
 *
 * Expone el estado del sistema Local-First existente (lib/runtime/) y del
 * registro de agentes externos (lib/external-agent-registry/). No agrega
 * un nuevo orquestador: solo lee datos de los módulos ya en producción.
 */

import { NextResponse } from 'next/server';
import { getLocalFirstStatus, getRecentUsage } from '../../../../../../lib/runtime/orchestrator-integration';
import { loadExternalAgentRegistry, listEnabledWorkers } from '@intcloudsysops/external-agent-registry';

export async function GET() {
  try {
    const [localFirstStatus, registry] = await Promise.all([
      getLocalFirstStatus(),
      loadExternalAgentRegistry().catch(() => null),
    ]);

    const enabledWorkers = registry ? listEnabledWorkers(registry) : [];

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      localFirst: localFirstStatus,
      externalAgents: {
        defaultWorkerId: registry?.default_worker_id ?? null,
        enabled: enabledWorkers.map(({ id, entry }) => ({
          id,
          command: entry.command,
          capabilities: entry.capabilities,
          riskCeiling: entry.risk_ceiling,
          writeAccess: entry.write_access,
        })),
      },
      recentUsage: getRecentUsage(20),
    });
  } catch (error) {
    console.error('[orchestrator] status error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
