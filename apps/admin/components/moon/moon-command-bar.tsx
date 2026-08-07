'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

/**
 * MoonCommandBar — dry-run only. Routes to /moon/command; never enqueues LLM jobs.
 */
export function MoonCommandBar(): React.ReactElement {
  const router = useRouter();
  const [command, setCommand] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <form
      className="relative flex min-w-0 flex-1 items-center md:max-w-md"
      onSubmit={(event) => {
        event.preventDefault();
        const q = command.trim();
        if (!q) {
          router.push('/moon/command');
          return;
        }
        router.push(`/moon/command?q=${encodeURIComponent(q)}`);
        setCommand('');
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        Command Center dry-run
      </label>
      <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-slate-500" aria-hidden />
      <input
        id={inputId}
        ref={inputRef}
        value={command}
        onChange={(event) => setCommand(event.target.value)}
        placeholder="¿Qué quieres revisar? (dry-run)"
        className="h-9 w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-12 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-400/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
        autoComplete="off"
      />
      <kbd className="absolute right-2 hidden rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 sm:inline">
        ⌘K
      </kbd>
    </form>
  );
}
