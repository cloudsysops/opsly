'use client';

import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';

export type FranchiseOption = {
  id: string;
  slug: string;
  name: string;
  type: string;
  is_primary: boolean;
};

type Props = {
  value: string;
  onChange: (franchiseId: string) => void;
  className?: string;
};

/**
 * Admin filter: All | Llanogrande | Domicilios (etc.).
 * Does not mutate user role or tenant — only scopes dashboard queries.
 */
export function FranchiseFilterSelect({ value, onChange, className }: Props): React.ReactElement {
  const [options, setOptions] = useState<FranchiseOption[]>([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const res = await fetch('/api/admin/franchises?status=active', { credentials: 'include' });
        const json = (await res.json()) as {
          ok?: boolean;
          franchises?: FranchiseOption[];
          error?: string;
        };
        if (!res.ok || !json.franchises) {
          throw new Error(json.error || 'No se pudieron cargar franquicias');
        }
        setOptions(json.franchises);
        setLoadError('');
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Error cargando franquicias');
      }
    };
    void load();
  }, []);

  return (
    <div className={className}>
      <Label htmlFor="franchise-filter" className="text-xs text-pk-sub">
        Franquicia / sede
      </Label>
      <select
        id="franchise-filter"
        className="mt-1 w-full rounded-md border border-pk-border bg-white px-2 py-1.5 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Filtrar por franquicia"
      >
        <option value="">Todas (tenant Peskids)</option>
        {options.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
            {f.is_primary ? ' · flagship' : ''}
          </option>
        ))}
      </select>
      {loadError ? <p className="mt-1 text-xs text-amber-700">{loadError}</p> : null}
    </div>
  );
}
