'use client';

import { useMemo, useState } from 'react';
import { ClipboardList, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  mapStaffFromSpreadsheet,
  mapStudentsFromSpreadsheet,
  parseSpreadsheetFile,
  type StaffImportDraft,
  type StudentImportDraft,
} from '@/lib/import/spreadsheet';

type ImportKind = 'students' | 'staff';

interface DataImportDialogProps {
  kind: ImportKind;
  onImported: () => void;
}

type PreviewState =
  | { mode: 'students'; drafts: StudentImportDraft[]; skipped: number; fileName: string }
  | { mode: 'staff'; drafts: StaffImportDraft[]; skipped: number; fileName: string };

export function DataImportDialog({ kind, onImported }: DataImportDialogProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const title = kind === 'students' ? 'Importar alumnos / familias' : 'Importar staff / profesores';
  const endpoint = kind === 'students' ? '/api/admin/students/import' : '/api/admin/team/import';

  const previewCount = useMemo(() => preview?.drafts.length ?? 0, [preview]);

  const reset = (): void => {
    setPreview(null);
    setError('');
    setResult('');
  };

  const handleFile = async (file: File | null): Promise<void> => {
    if (!file) return;
    setBusy(true);
    setError('');
    setResult('');
    try {
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.pdf')) {
        throw new Error(
          'Los PDF no se importan solos. Adjúntalos en el chat “Pedir cambios” para que Opsly los revise, o exporta tu Excel como .csv UTF-8.'
        );
      }
      const parsed = await parseSpreadsheetFile(file);
      if (kind === 'students') {
        const mapped = mapStudentsFromSpreadsheet(parsed);
        if (mapped.drafts.length === 0) {
          throw new Error(
            'No encontramos columnas de alumno. Usa encabezados como Nombre, Grado, Email, Teléfono.'
          );
        }
        setPreview({
          mode: 'students',
          drafts: mapped.drafts,
          skipped: mapped.skipped,
          fileName: file.name,
        });
      } else {
        const mapped = mapStaffFromSpreadsheet(parsed);
        if (mapped.drafts.length === 0) {
          throw new Error(
            'No encontramos columnas de staff. Usa encabezados como Email, Nombre, Rol (profesor/admin/soporte).'
          );
        }
        setPreview({
          mode: 'staff',
          drafts: mapped.drafts,
          skipped: mapped.skipped,
          fileName: file.name,
        });
      }
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo');
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (): Promise<void> => {
    if (!preview || preview.drafts.length === 0) return;
    setBusy(true);
    setError('');
    setResult('');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: preview.drafts, dry_run: false }),
      });
      const json = (await res.json()) as {
        error?: string;
        created?: number;
        invited?: number;
        failed?: Array<{ error: string }>;
      };
      if (!res.ok) {
        throw new Error(json.error || 'Importación fallida');
      }
      const okCount = kind === 'students' ? (json.created ?? 0) : (json.invited ?? 0);
      const failCount = json.failed?.length ?? 0;
      setResult(
        kind === 'students'
          ? `Listo: ${okCount} alumno(s) cargados${failCount ? `, ${failCount} con error` : ''}.`
          : `Listo: ${okCount} invitación(es)${failCount ? `, ${failCount} con error` : ''}.`
      );
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo importar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-stretch gap-2">
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>
        <ClipboardList className="mr-1.5 h-4 w-4" aria-hidden />
        Subir CSV
      </Button>

      {open ? (
        <div className="w-full max-w-xl rounded-2xl border border-pk-border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-start gap-2">
            <ClipboardList className="mt-0.5 h-5 w-5 text-pk-primary" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-pk-ink">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-pk-sub">
                Acepta <strong>.csv</strong> (exporta tu Excel como CSV UTF-8). Los <strong>PDF</strong> y capturas de chats con familias súbelos en
                el chat <em>Pedir cambios</em>.
              </p>
            </div>
          </div>

          <label className="block">
            <span className="sr-only">Archivo</span>
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              className="block w-full text-sm text-pk-sub file:mr-3 file:rounded-full file:border-0 file:bg-pk-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                void handleFile(file);
                event.target.value = '';
              }}
            />
          </label>

          {preview ? (
            <div className="mt-3 rounded-xl border border-pk-border bg-pk-muted/40 p-3 text-xs text-pk-sub">
              <p className="font-medium text-pk-ink">
                {preview.fileName}: {previewCount} fila(s) listas
                {preview.skipped ? ` · ${preview.skipped} omitida(s)` : ''}
              </p>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                {preview.drafts.slice(0, 8).map((row, idx) => (
                  <li key={`${idx}-${'email' in row ? row.email : row.name}`}>
                    {'email' in row
                      ? `${row.name} · ${row.email} · ${row.role}`
                      : `${row.name} · ${row.grade}${row.parent_email ? ` · ${row.parent_email}` : ''}`}
                  </li>
                ))}
                {preview.drafts.length > 8 ? (
                  <li>… y {preview.drafts.length - 8} más</li>
                ) : null}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" disabled={busy} onClick={() => void handleImport()}>
                  {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : null}
                  Confirmar importación
                </Button>
                <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={reset}>
                  Limpiar
                </Button>
              </div>
            </div>
          ) : null}

          {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
          {result ? <p className="mt-2 text-xs text-emerald-700">{result}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
