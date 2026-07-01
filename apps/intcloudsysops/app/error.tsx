'use client';

export default function Error({ reset }: { reset: () => void }): React.ReactElement {
  return (
    <main className="flex min-h-screen items-center justify-center bg-pk-bg px-4">
      <div className="rounded-2xl border border-pk-border bg-pk-surface px-6 py-5 text-sm text-pk-sub shadow-card">
        <button type="button" onClick={reset}>
          Reintentar
        </button>
      </div>
    </main>
  );
}
