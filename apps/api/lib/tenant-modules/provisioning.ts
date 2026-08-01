import { execa } from 'execa';
import { resolveOpslyRepoRoot } from '../tools-execute';
import { upsertTenantModuleStatus } from '../services/tenant-modules.service';
import { getModuleDefinition } from './catalog';

function parseScriptCommand(script: string, tenantSlug: string): { file: string; args: string[] } {
  const withSlug = script.replace(/\$\{slug\}/g, tenantSlug);
  const [file, ...args] = withSlug.split(' ').filter((part) => part.length > 0);
  return { file, args };
}

function tailStderr(err: unknown): string {
  if (err && typeof err === 'object' && 'stderr' in err) {
    const stderr = (err as { stderr?: unknown }).stderr;
    if (typeof stderr === 'string' && stderr.length > 0) {
      return stderr.slice(-2000);
    }
  }
  const message = err instanceof Error ? err.message : String(err);
  return message.slice(-2000);
}

async function runScript(
  script: string,
  tenantSlug: string,
  timeoutMinutes: number
): Promise<void> {
  const { file, args } = parseScriptCommand(script, tenantSlug);
  await execa(file, args, {
    cwd: resolveOpslyRepoRoot(),
    timeout: timeoutMinutes * 60_000,
  });
}

export async function runModuleProvisioning(tenantSlug: string, moduleId: string): Promise<void> {
  try {
    const mod = getModuleDefinition(moduleId);
    if (!mod) {
      await upsertTenantModuleStatus(tenantSlug, moduleId, 'failed', {
        last_error: `Unknown module id in catalog: ${moduleId}`,
      });
      return;
    }

    await upsertTenantModuleStatus(tenantSlug, moduleId, 'provisioning');

    try {
      if (mod.bootstrap_script) {
        await runScript(mod.bootstrap_script, tenantSlug, mod.estimated_setup_minutes * 2);
      }
      if (mod.smoke_script) {
        await runScript(mod.smoke_script, tenantSlug, mod.estimated_setup_minutes);
      }
    } catch (err) {
      await upsertTenantModuleStatus(tenantSlug, moduleId, 'failed', {
        last_error: tailStderr(err),
      });
      return;
    }

    const finalStatus = mod.manual_steps.length > 0 ? 'active_needs_manual_steps' : 'active';
    await upsertTenantModuleStatus(tenantSlug, moduleId, finalStatus, {
      activated_at: new Date().toISOString(),
    });
  } catch (err) {
    // Guarantee the "never throws" contract: this function is called
    // fire-and-forget from the API route, so an unguarded rejection here
    // (e.g. a real Supabase network error) would become an unhandled
    // promise rejection. Make a best-effort attempt to persist the
    // failure, but never let that attempt itself reject this function.
    await upsertTenantModuleStatus(tenantSlug, moduleId, 'failed', {
      last_error: tailStderr(err),
    }).catch(() => {});
  }
}
