'use client';

import { useEffect, useState } from 'react';
import { ClipboardList, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type DataBackup = {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by_email: string | null;
  note: string | null;
  created_at: string;
};

const ACCEPTED_MIME = new Set([
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? (result.split(',')[1] ?? '') : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function DataBackupPanel(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [backups, setBackups] = useState<DataBackup[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const loadBackups = async (): Promise<void> => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/admin/data-backups', { credentials: 'include' });
      const json = (await res.json()) as { backups?: DataBackup[] };
      if (res.ok) {
        setBackups(json.backups ?? []);
      }
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (open) void loadBackups();
  }, [open]);

  const handleFile = async (file: File | null): Promise<void> => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      if (!ACCEPTED_MIME.has(file.type) && !/\.(csv|xlsx)$/i.test(file.name)) {
        throw new Error('Solo se aceptan archivos .csv o .xlsx.');
      }
      const content_base64 = await fileToBase64(file);
      const mime_type =
        ACCEPTED_MIME.has(file.type) && file.type
          ? file.type
          : file.name.toLowerCase().endsWith('.xlsx')
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'text/csv';

      const res = await fetch('/api/admin/data-backups', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, mime_type, size_bytes: file.size, content_base64 }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || 'No se pudo guardar el archivo');
      }
      await loadBackups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el archivo');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-stretch gap-2">
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>
        <ClipboardList className="mr-1.5 h-4 w-4" aria-hidden />
        Guardar base de datos (backup)
      </Button>

      {open ? (
        <div className="w-full max-w-xl rounded-2xl border border-pk-border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-start gap-2">
            <ClipboardList className="mt-0.5 h-5 w-5 text-pk-primary" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-pk-ink">Guardar base de datos</p>
              <p className="mt-1 text-xs leading-relaxed text-pk-sub">
                Sube tu archivo <strong>.csv</strong> o <strong>.xlsx</strong> tal cual lo tengas. Solo
                se guarda con backup para revisarlo después — no se procesa ni se sube a Twenty
                automáticamente.
              </p>
            </div>
          </div>

          <label className="block">
            <span className="sr-only">Archivo</span>
            <input
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="block w-full text-sm text-pk-sub file:mr-3 file:rounded-full file:border-0 file:bg-pk-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                void handleFile(file);
                event.target.value = '';
              }}
            />
          </label>

          {busy ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-pk-sub">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Guardando…
            </p>
          ) : null}
          {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

          <div className="mt-3 rounded-xl border border-pk-border bg-pk-muted/40 p-3 text-xs text-pk-sub">
            <p className="font-medium text-pk-ink">Backups guardados</p>
            {loadingList ? (
              <p className="mt-1">Cargando…</p>
            ) : backups.length === 0 ? (
              <p className="mt-1">Todavía no hay archivos guardados.</p>
            ) : (
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                {backups.map((backup) => (
                  <li key={backup.id}>
                    {backup.file_name} · {formatSize(backup.size_bytes)} · {formatDate(backup.created_at)}
                    {backup.uploaded_by_email ? ` · ${backup.uploaded_by_email}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
