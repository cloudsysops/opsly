import { MissionControlLiveBoard } from '@/components/mission-control/MissionControlLiveBoard';

export default async function MissionControlLivePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  return (
    <main className="min-h-screen overflow-hidden bg-[#020611] text-slate-100">
      <MissionControlLiveBoard devMode={mode === 'dev'} />
    </main>
  );
}
