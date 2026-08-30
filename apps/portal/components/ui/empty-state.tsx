import type { ReactElement, ReactNode } from 'react';
import { AlertTriangle, Building2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps): ReactElement {
  return (
    <div
      className={cn('flex flex-col items-center justify-center px-4 py-12 text-center', className)}
    >
      {icon !== undefined && icon !== null ? (
        <div className="mb-4 rounded-full border border-ops-border bg-ops-surface p-3 text-ops-gray">
          {icon}
        </div>
      ) : null}
      <h3 className="mb-1 text-lg font-medium text-neutral-100">{title}</h3>
      {description !== undefined && description.length > 0 ? (
        <p className="mb-4 max-w-sm text-sm text-neutral-500">{description}</p>
      ) : null}
      {action !== undefined && action !== null ? <div>{action}</div> : null}
    </div>
  );
}

export function EmptyTenants(props: { onAdd?: () => void }): ReactElement {
  const { onAdd } = props;
  return (
    <EmptyState
      icon={<Building2 className="h-8 w-8" strokeWidth={1.5} aria-hidden />}
      title="No hay tenants"
      description="Cuando existan tenants asociados, aparecerán aquí."
      action={
        onAdd !== undefined ? (
          <Button type="button" variant="primary" onClick={onAdd}>
            Crear tenant
          </Button>
        ) : undefined
      }
    />
  );
}

export function EmptySearch(props: { query: string }): ReactElement {
  const { query } = props;
  return (
    <EmptyState
      icon={<Search className="h-8 w-8" strokeWidth={1.5} aria-hidden />}
      title="Sin resultados"
      description={`No encontramos resultados para "${query}".`}
    />
  );
}

export function EmptyError(props: { onRetry?: () => void }): ReactElement {
  const { onRetry } = props;
  return (
    <EmptyState
      icon={<AlertTriangle className="h-8 w-8 text-ops-red" strokeWidth={1.5} aria-hidden />}
      title="Error al cargar"
      description="Hubo un problema al cargar los datos. Reintenta en unos segundos."
      action={
        onRetry !== undefined ? (
          <Button type="button" variant="default" onClick={onRetry}>
            Reintentar
          </Button>
        ) : undefined
      }
    />
  );
}
