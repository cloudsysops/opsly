import type { ReactElement, ReactNode } from 'react';
import { McShell } from '@/components/mission-control/mc-ui';
import { resolveIcsoMcAccess } from '@/lib/mission-control/access';
import { loadIcsoMissionControlProfile } from '@/lib/mission-control/load-profile';

export const metadata = {
  title: 'ICSO Mission Control',
  robots: { index: false, follow: false },
};

export default async function MissionControlLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactElement> {
  const access = await resolveIcsoMcAccess();
  const profile = await loadIcsoMissionControlProfile();

  if (!access.allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4 text-slate-100">
        <div className="max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <h1 className="text-lg font-semibold">Acceso restringido</h1>
          <p className="mt-2 text-sm text-slate-400">{access.reason}</p>
        </div>
      </div>
    );
  }

  return (
    <McShell profile={profile} ungatedWarning={!access.gated}>
      {children}
    </McShell>
  );
}
