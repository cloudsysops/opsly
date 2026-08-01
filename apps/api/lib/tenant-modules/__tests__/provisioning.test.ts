import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execa } from 'execa';
import * as serviceMod from '../../services/tenant-modules.service';
import * as catalogMod from '../catalog';
import { runModuleProvisioning } from '../provisioning';

vi.mock('execa', () => ({ execa: vi.fn() }));
vi.mock('../../services/tenant-modules.service', () => ({
  upsertTenantModuleStatus: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../catalog', () => ({ getModuleDefinition: vi.fn() }));

describe('runModuleProvisioning', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks the module active when bootstrap and smoke both succeed and there are no manual steps', async () => {
    vi.mocked(catalogMod.getModuleDefinition).mockReturnValue({
      id: 'uptime',
      name: 'Uptime Kuma Monitor',
      description: '',
      category: 'monitoring',
      tier: 'starter',
      required_by: [],
      requires: [],
      bootstrap_script: null,
      smoke_script: null,
      manual_steps: [],
      estimated_setup_minutes: 10,
      cost_level: 'low',
    });

    await runModuleProvisioning('peskids', 'uptime');

    expect(serviceMod.upsertTenantModuleStatus).toHaveBeenCalledWith(
      'peskids',
      'uptime',
      'provisioning'
    );
    expect(serviceMod.upsertTenantModuleStatus).toHaveBeenLastCalledWith(
      'peskids',
      'uptime',
      'active',
      expect.objectContaining({ activated_at: expect.any(String) })
    );
  });

  it('marks the module active_needs_manual_steps when the catalog lists manual steps', async () => {
    vi.mocked(catalogMod.getModuleDefinition).mockReturnValue({
      id: 'twenty',
      name: 'Twenty CRM',
      description: '',
      category: 'crm',
      tier: 'starter',
      required_by: [],
      requires: [],
      bootstrap_script: 'scripts/tenants/bootstrap-twenty.sh --tenant ${slug}',
      smoke_script: 'scripts/tenants/twenty-crm-smoke.sh --tenant ${slug}',
      manual_steps: ['Crear primer workspace admin'],
      estimated_setup_minutes: 20,
      cost_level: 'low',
    });
    vi.mocked(execa).mockResolvedValue({ stdout: 'ok', stderr: '' } as never);

    await runModuleProvisioning('peskids', 'twenty');

    expect(execa).toHaveBeenCalledTimes(2);
    expect(serviceMod.upsertTenantModuleStatus).toHaveBeenLastCalledWith(
      'peskids',
      'twenty',
      'active_needs_manual_steps',
      expect.objectContaining({ activated_at: expect.any(String) })
    );
  });

  it('marks the module failed with stderr when the bootstrap script fails', async () => {
    vi.mocked(catalogMod.getModuleDefinition).mockReturnValue({
      id: 'twenty',
      name: 'Twenty CRM',
      description: '',
      category: 'crm',
      tier: 'starter',
      required_by: [],
      requires: [],
      bootstrap_script: 'scripts/tenants/bootstrap-twenty.sh --tenant ${slug}',
      smoke_script: null,
      manual_steps: [],
      estimated_setup_minutes: 20,
      cost_level: 'low',
    });
    vi.mocked(execa).mockRejectedValue(
      Object.assign(new Error('exit 1'), { stderr: 'doppler flag missing' })
    );

    await runModuleProvisioning('peskids', 'twenty');

    expect(serviceMod.upsertTenantModuleStatus).toHaveBeenLastCalledWith(
      'peskids',
      'twenty',
      'failed',
      expect.objectContaining({ last_error: expect.stringContaining('doppler flag missing') })
    );
  });

  it('marks the module failed if the catalog has no definition for the id', async () => {
    vi.mocked(catalogMod.getModuleDefinition).mockReturnValue(null);

    await runModuleProvisioning('peskids', 'unknown-module');

    expect(serviceMod.upsertTenantModuleStatus).toHaveBeenLastCalledWith(
      'peskids',
      'unknown-module',
      'failed',
      expect.objectContaining({ last_error: expect.stringContaining('Unknown module') })
    );
  });

  it('resolves without throwing when upsertTenantModuleStatus itself rejects (never-throws contract)', async () => {
    vi.mocked(catalogMod.getModuleDefinition).mockReturnValue({
      id: 'uptime',
      name: 'Uptime Kuma Monitor',
      description: '',
      category: 'monitoring',
      tier: 'starter',
      required_by: [],
      requires: [],
      bootstrap_script: null,
      smoke_script: null,
      manual_steps: [],
      estimated_setup_minutes: 10,
      cost_level: 'low',
    });
    // The very first upsert call (marking 'provisioning') rejects, simulating
    // a real Supabase network error. This must not produce an unhandled
    // promise rejection or cause runModuleProvisioning to reject.
    vi.mocked(serviceMod.upsertTenantModuleStatus).mockRejectedValueOnce(
      new Error('supabase network error')
    );

    await expect(runModuleProvisioning('peskids', 'uptime')).resolves.toBeUndefined();
  });
});
