'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, getIcsoCatalog, putIcsoCatalog } from '@/lib/api-client';
import type {
  IcsoCatalogEditable,
  IcsoCatalogModule,
  IcsoCatalogPackage,
  IcsoCatalogVertical,
  IcsoCommercialCatalog,
} from '@/lib/types';

function toEditable(catalog: IcsoCommercialCatalog): IcsoCatalogEditable {
  return {
    modules: catalog.modules,
    packages: catalog.packages,
    verticals: catalog.verticals,
    disclaimer: catalog.disclaimer,
    sales_pitch_es: catalog.sales_pitch_es,
    currency: catalog.currency,
  };
}

function emptyModule(): IcsoCatalogModule {
  return {
    id: '',
    label: '',
    label_es: '',
    mvp_default: false,
    risk: 'low',
    summary: '',
  };
}

function emptyPackage(): IcsoCatalogPackage {
  return {
    id: '',
    name: '',
    name_es: '',
    ideal_for: '',
    setup_range_usd: { min: 0, max: 0 },
    ops_monthly_usd: { min: 0, max: 0 },
    highlighted: false,
    module_ids: [],
    includes: [],
    excludes: [],
  };
}

function emptyVertical(): IcsoCatalogVertical {
  return {
    id: '',
    label: '',
    reference_tenant: null,
    status: 'blueprint',
    recommended_package_id: '',
  };
}

function moduleReferencedBy(
  editable: IcsoCatalogEditable,
  moduleId: string
): string[] {
  return editable.packages
    .filter((pkg) => pkg.module_ids.includes(moduleId))
    .map((pkg) => pkg.id);
}

function packageReferencedBy(
  editable: IcsoCatalogEditable,
  packageId: string
): string[] {
  return editable.verticals
    .filter((vertical) => vertical.recommended_package_id === packageId)
    .map((vertical) => vertical.id);
}

export default function IcsoCatalogPage(): React.ReactElement {
  const [etag, setEtag] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ version: string; updated: string; owner: string } | null>(
    null
  );
  const [editable, setEditable] = useState<IcsoCatalogEditable | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [saveOk, setSaveOk] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setStale(false);
    setSaveOk(false);
    try {
      const data = await getIcsoCatalog();
      setEtag(data.etag);
      setMeta({
        version: data.catalog.version,
        updated: data.catalog.updated,
        owner: data.catalog.owner,
      });
      setEditable(toEditable(data.catalog));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el catálogo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = useCallback(async (): Promise<void> => {
    if (!editable || !etag) {
      return;
    }
    setSaving(true);
    setError(null);
    setStale(false);
    setSaveOk(false);
    try {
      const result = await putIcsoCatalog(editable, etag);
      setEtag(result.etag);
      setSaveOk(true);
      setMeta((prev) =>
        prev ? { ...prev, updated: new Date().toISOString().slice(0, 10) } : prev
      );
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { reason?: string; details?: string[]; error?: string } | null;
        if (body?.reason === 'stale') {
          setStale(true);
          setError(
            'El catálogo cambió desde que lo cargaste. Recargá (perderás cambios no guardados).'
          );
        } else if (body?.reason === 'referenced') {
          setError(
            `${body.error ?? 'Integridad referencial'}: ${(body.details ?? []).join('; ')}`
          );
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo guardar');
      }
    } finally {
      setSaving(false);
    }
  }, [editable, etag]);

  const packageIds = useMemo(
    () => editable?.packages.map((pkg) => pkg.id).filter(Boolean) ?? [],
    [editable]
  );

  if (loading) {
    return (
      <div className="p-8 text-ops-muted">
        Cargando catálogo ICSO…
      </div>
    );
  }

  if (!editable) {
    return (
      <div className="space-y-4 p-8">
        <p className="text-red-400">{error ?? 'Catálogo no disponible'}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded bg-ops-accent px-3 py-2 text-sm text-black"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ops-text">ICSO Commercial Catalog</h1>
          <p className="mt-1 text-sm text-ops-muted">
            Edita módulos, paquetes y verticales. Fuente: <code>config/commercial-catalog.json</code>
            {meta ? (
              <>
                {' '}
                · v{meta.version} · updated {meta.updated} · {meta.owner}
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {stale ? (
            <button
              type="button"
              onClick={() => {
                if (
                  globalThis.confirm(
                    'Recargar descartará cambios no guardados. ¿Continuar?'
                  )
                ) {
                  void load();
                }
              }}
              className="rounded border border-amber-500/50 px-3 py-2 text-sm text-amber-300"
            >
              Recargar
            </button>
          ) : null}
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="rounded bg-ops-accent px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </header>

      {error ? <p className="rounded border border-red-500/40 bg-red-950/40 p-3 text-sm text-red-300">{error}</p> : null}
      {saveOk ? (
        <p className="rounded border border-emerald-500/40 bg-emerald-950/30 p-3 text-sm text-emerald-300">
          Guardado. El sitio ICSO verá los cambios en el próximo request (sin redeploy).
        </p>
      ) : null}

      <section className="space-y-3 rounded border border-ops-border bg-ops-surface/40 p-4">
        <h2 className="text-lg font-semibold text-ops-text">Metadata</h2>
        <label className="block text-sm text-ops-muted">
          Currency
          <input
            className="mt-1 w-full rounded border border-ops-border bg-black/40 px-3 py-2 text-ops-text"
            value={editable.currency}
            onChange={(e) => setEditable({ ...editable, currency: e.target.value })}
          />
        </label>
        <label className="block text-sm text-ops-muted">
          Sales pitch (ES)
          <textarea
            rows={3}
            className="mt-1 w-full rounded border border-ops-border bg-black/40 px-3 py-2 text-ops-text"
            value={editable.sales_pitch_es}
            onChange={(e) => setEditable({ ...editable, sales_pitch_es: e.target.value })}
          />
        </label>
        <label className="block text-sm text-ops-muted">
          Disclaimer
          <textarea
            rows={3}
            className="mt-1 w-full rounded border border-ops-border bg-black/40 px-3 py-2 text-ops-text"
            value={editable.disclaimer}
            onChange={(e) => setEditable({ ...editable, disclaimer: e.target.value })}
          />
        </label>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ops-text">Módulos</h2>
          <button
            type="button"
            className="text-sm text-ops-accent"
            onClick={() =>
              setEditable({ ...editable, modules: [...editable.modules, emptyModule()] })
            }
          >
            + Módulo
          </button>
        </div>
        <ul className="space-y-4">
          {editable.modules.map((mod, index) => {
            const refs = moduleReferencedBy(editable, mod.id);
            return (
              <li
                key={`mod-${index}`}
                className="space-y-2 rounded border border-ops-border bg-ops-surface/30 p-3"
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    placeholder="id"
                    className="rounded border border-ops-border bg-black/40 px-2 py-1 text-sm text-ops-text"
                    value={mod.id}
                    onChange={(e) => {
                      const modules = [...editable.modules];
                      modules[index] = { ...mod, id: e.target.value };
                      setEditable({ ...editable, modules });
                    }}
                  />
                  <input
                    placeholder="label"
                    className="rounded border border-ops-border bg-black/40 px-2 py-1 text-sm text-ops-text"
                    value={mod.label}
                    onChange={(e) => {
                      const modules = [...editable.modules];
                      modules[index] = { ...mod, label: e.target.value };
                      setEditable({ ...editable, modules });
                    }}
                  />
                  <input
                    placeholder="label_es"
                    className="rounded border border-ops-border bg-black/40 px-2 py-1 text-sm text-ops-text"
                    value={mod.label_es}
                    onChange={(e) => {
                      const modules = [...editable.modules];
                      modules[index] = { ...mod, label_es: e.target.value };
                      setEditable({ ...editable, modules });
                    }}
                  />
                  <select
                    className="rounded border border-ops-border bg-black/40 px-2 py-1 text-sm text-ops-text"
                    value={mod.risk}
                    onChange={(e) => {
                      const modules = [...editable.modules];
                      modules[index] = {
                        ...mod,
                        risk: e.target.value as IcsoCatalogModule['risk'],
                      };
                      setEditable({ ...editable, modules });
                    }}
                  >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                </div>
                <textarea
                  placeholder="summary"
                  rows={2}
                  className="w-full rounded border border-ops-border bg-black/40 px-2 py-1 text-sm text-ops-text"
                  value={mod.summary}
                  onChange={(e) => {
                    const modules = [...editable.modules];
                    modules[index] = { ...mod, summary: e.target.value };
                    setEditable({ ...editable, modules });
                  }}
                />
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs text-ops-muted">
                    <input
                      type="checkbox"
                      checked={mod.mvp_default}
                      onChange={(e) => {
                        const modules = [...editable.modules];
                        modules[index] = { ...mod, mvp_default: e.target.checked };
                        setEditable({ ...editable, modules });
                      }}
                    />
                    MVP default
                  </label>
                  <button
                    type="button"
                    disabled={refs.length > 0}
                    title={
                      refs.length > 0
                        ? `Referenciado por paquetes: ${refs.join(', ')}`
                        : 'Eliminar módulo'
                    }
                    className="text-xs text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => {
                      if (!globalThis.confirm(`¿Eliminar módulo ${mod.id || '(sin id)'}?`)) {
                        return;
                      }
                      setEditable({
                        ...editable,
                        modules: editable.modules.filter((_, i) => i !== index),
                      });
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ops-text">Paquetes</h2>
          <button
            type="button"
            className="text-sm text-ops-accent"
            onClick={() =>
              setEditable({ ...editable, packages: [...editable.packages, emptyPackage()] })
            }
          >
            + Paquete
          </button>
        </div>
        <ul className="space-y-4">
          {editable.packages.map((pkg, index) => {
            const refs = packageReferencedBy(editable, pkg.id);
            return (
              <li
                key={`pkg-${index}`}
                className="space-y-2 rounded border border-ops-border bg-ops-surface/30 p-3"
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    placeholder="id"
                    className="rounded border border-ops-border bg-black/40 px-2 py-1 text-sm text-ops-text"
                    value={pkg.id}
                    onChange={(e) => {
                      const packages = [...editable.packages];
                      packages[index] = { ...pkg, id: e.target.value };
                      setEditable({ ...editable, packages });
                    }}
                  />
                  <input
                    placeholder="name"
                    className="rounded border border-ops-border bg-black/40 px-2 py-1 text-sm text-ops-text"
                    value={pkg.name}
                    onChange={(e) => {
                      const packages = [...editable.packages];
                      packages[index] = { ...pkg, name: e.target.value };
                      setEditable({ ...editable, packages });
                    }}
                  />
                  <input
                    placeholder="name_es"
                    className="rounded border border-ops-border bg-black/40 px-2 py-1 text-sm text-ops-text"
                    value={pkg.name_es}
                    onChange={(e) => {
                      const packages = [...editable.packages];
                      packages[index] = { ...pkg, name_es: e.target.value };
                      setEditable({ ...editable, packages });
                    }}
                  />
                  <input
                    placeholder="ideal_for"
                    className="rounded border border-ops-border bg-black/40 px-2 py-1 text-sm text-ops-text"
                    value={pkg.ideal_for}
                    onChange={(e) => {
                      const packages = [...editable.packages];
                      packages[index] = { ...pkg, ideal_for: e.target.value };
                      setEditable({ ...editable, packages });
                    }}
                  />
                </div>
                <label className="block text-xs text-ops-muted">
                  module_ids (comma-separated)
                  <input
                    className="mt-1 w-full rounded border border-ops-border bg-black/40 px-2 py-1 text-sm text-ops-text"
                    value={pkg.module_ids.join(', ')}
                    onChange={(e) => {
                      const packages = [...editable.packages];
                      packages[index] = {
                        ...pkg,
                        module_ids: e.target.value
                          .split(',')
                          .map((id) => id.trim())
                          .filter(Boolean),
                      };
                      setEditable({ ...editable, packages });
                    }}
                  />
                </label>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-ops-muted">
                    <input
                      type="checkbox"
                      checked={pkg.highlighted}
                      onChange={(e) => {
                        const packages = [...editable.packages];
                        packages[index] = { ...pkg, highlighted: e.target.checked };
                        setEditable({ ...editable, packages });
                      }}
                    />
                    Highlighted
                  </label>
                  <button
                    type="button"
                    disabled={refs.length > 0}
                    title={
                      refs.length > 0
                        ? `Referenciado por verticales: ${refs.join(', ')}`
                        : 'Eliminar paquete'
                    }
                    className="text-xs text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => {
                      if (!globalThis.confirm(`¿Eliminar paquete ${pkg.id || '(sin id)'}?`)) {
                        return;
                      }
                      setEditable({
                        ...editable,
                        packages: editable.packages.filter((_, i) => i !== index),
                      });
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ops-text">Verticales</h2>
          <button
            type="button"
            className="text-sm text-ops-accent"
            onClick={() =>
              setEditable({
                ...editable,
                verticals: [...editable.verticals, emptyVertical()],
              })
            }
          >
            + Vertical
          </button>
        </div>
        <ul className="space-y-4">
          {editable.verticals.map((vertical, index) => (
            <li
              key={`vert-${index}`}
              className="space-y-2 rounded border border-ops-border bg-ops-surface/30 p-3"
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  placeholder="id"
                  className="rounded border border-ops-border bg-black/40 px-2 py-1 text-sm text-ops-text"
                  value={vertical.id}
                  onChange={(e) => {
                    const verticals = [...editable.verticals];
                    verticals[index] = { ...vertical, id: e.target.value };
                    setEditable({ ...editable, verticals });
                  }}
                />
                <input
                  placeholder="label"
                  className="rounded border border-ops-border bg-black/40 px-2 py-1 text-sm text-ops-text"
                  value={vertical.label}
                  onChange={(e) => {
                    const verticals = [...editable.verticals];
                    verticals[index] = { ...vertical, label: e.target.value };
                    setEditable({ ...editable, verticals });
                  }}
                />
                <select
                  className="rounded border border-ops-border bg-black/40 px-2 py-1 text-sm text-ops-text"
                  value={vertical.status}
                  onChange={(e) => {
                    const verticals = [...editable.verticals];
                    verticals[index] = {
                      ...vertical,
                      status: e.target.value as IcsoCatalogVertical['status'],
                    };
                    setEditable({ ...editable, verticals });
                  }}
                >
                  <option value="live">live</option>
                  <option value="ready">ready</option>
                  <option value="blueprint">blueprint</option>
                </select>
                <select
                  className="rounded border border-ops-border bg-black/40 px-2 py-1 text-sm text-ops-text"
                  value={vertical.recommended_package_id}
                  onChange={(e) => {
                    const verticals = [...editable.verticals];
                    verticals[index] = {
                      ...vertical,
                      recommended_package_id: e.target.value,
                    };
                    setEditable({ ...editable, verticals });
                  }}
                >
                  <option value="">package…</option>
                  {packageIds.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs text-red-400"
                  onClick={() => {
                    if (
                      !globalThis.confirm(`¿Eliminar vertical ${vertical.id || '(sin id)'}?`)
                    ) {
                      return;
                    }
                    setEditable({
                      ...editable,
                      verticals: editable.verticals.filter((_, i) => i !== index),
                    });
                  }}
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
