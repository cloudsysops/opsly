import Link from 'next/link';
import { MoonPageHeader } from '@/components/moon/primitives';
import { CommandDeckShell } from './command-deck-shell';

export default function CommandDeckPage(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <MoonPageHeader
          title="Command Deck"
          subtitle="Creator OS second-screen cockpit. Live sources remain fail-closed until their adapters are connected."
        />
        <Link
          href="/moon/creator"
          className="rounded-lg border border-white/10 px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-slate-300 hover:border-violet-400/40 hover:text-violet-100"
        >
          Creator Studio
        </Link>
      </div>
      <CommandDeckShell />
    </div>
  );
}
