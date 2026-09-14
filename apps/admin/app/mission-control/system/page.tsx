import { SystemTopologyPanel } from '@/components/mission-control/SystemTopologyPanel';

export default function MissionControlSystemPage() {
  return (
    <div className="min-h-screen bg-[#030712] p-4 text-slate-100 lg:p-6">
      <div className="mx-auto max-w-[1900px]">
        <SystemTopologyPanel />
      </div>
    </div>
  );
}
