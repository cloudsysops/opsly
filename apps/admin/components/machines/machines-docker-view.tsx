'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { ArrowLeft, Boxes, RefreshCw, Search, Server } from 'lucide-react';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getDockerContainers } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { AdminDockerContainerRow } from '@/lib/types';
import type { VariantProps } from 'class-variance-authority';

const REFRESH_MS = 20_000;
const SWR_KEY = 'admin-docker-containers';

function dockerStateVariant(state: string): VariantProps<typeof badgeVariants>['variant'] {
  const s = state.toLowerCase();
  if (s === 'running') {
    return 'green';
  }
  if (s === 'restarting' || s === 'paused') {
    return 'yellow';
  }
  if (s === 'dead' || s === 'error') {
    return 'red';
  }
  return 'gray';
}

function DockerStateBadge({ state }: Readonly<{ state: string }>) {
  return (
    <Badge
      variant={dockerStateVariant(state)}
      className="font-mono text-[10px] uppercase tracking-wide"
    >
      {state}
    </Badge>
  );
}

function filterRows(
  rows: AdminDockerContainerRow[],
  q: string,
  stateKey: string
): AdminDockerContainerRow[] {
  let next = rows;
  if (stateKey !== 'all') {
    next = next.filter((r) => r.state.toLowerCase() === stateKey);
  }
  const needle = q.trim().toLowerCase();
  if (needle.length === 0) {
    return next;
  }
  return next.filter((r) => {
    const hay = [r.id, r.image, r.state, r.status, r.names.join(' '), r.ports]
      .join(' ')
      .toLowerCase();
    return hay.includes(needle);
  });
}

function countByState(rows: AdminDockerContainerRow[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, r) => {
    const k = r.state.toLowerCase() || 'unknown';
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

function TruncatedCell({
  children,
  className,
}: Readonly<{
  children: string;
  className?: string;
}>) {
  const text = children.length > 0 ? children : '—';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'block max-w-[min(280px,28vw)] cursor-default truncate font-mono text-xs',
            className
          )}
        >
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm font-mono text-[11px]">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function MachinesLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] w-full rounded border border-ops-border/60" />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-full max-w-md" />
        <Skeleton className="h-9 w-44" />
      </div>
      <Skeleton className="h-[420px] w-full rounded border border-ops-border/60" />
    </div>
  );
}

export function MachinesDockerView() {
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('all');

  const { data, error, isLoading, mutate, isValidating } = useSWR(
    SWR_KEY,
    () => getDockerContainers(),
    { refreshInterval: REFRESH_MS, revalidateOnFocus: false }
  );

  const totals = useMemo(() => countByState(data?.containers ?? []), [data?.containers]);
  const stateKeys = useMemo(() => Object.keys(totals).sort((a, b) => a.localeCompare(b)), [totals]);

  const filtered = useMemo(
    () => filterRows(data?.containers ?? [], query, stateFilter),
    [data?.containers, query, stateFilter]
  );

  const total = data?.containers.length ?? 0;
  const running = totals.running ?? 0;
  const runningPct = total > 0 ? Math.round((running / total) * 100) : 0;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded border border-ops-border bg-ops-bg">
                <Boxes className="h-5 w-5 text-ops-green" aria-hidden />
              </div>
              <h1 className="font-mono text-lg tracking-tight text-ops-green">Máquinas · Docker</h1>
            </div>
            <p className="max-w-2xl font-sans text-sm leading-relaxed text-ops-gray">
              Inventario del host donde corre la API. Equivalente a{' '}
              <code className="rounded bg-ops-border/60 px-1.5 py-0.5 font-mono text-xs text-neutral-300">
                docker ps -a
              </code>
              . Requiere socket Docker en el servicio{' '}
              <code className="rounded bg-ops-border/60 px-1 font-mono text-xs">app</code>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data?.generated_at ? (
              <span className="font-mono text-xs text-ops-gray">
                {new Date(data.generated_at).toLocaleString('es')}
              </span>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              type="button"
              disabled={isLoading || isValidating}
              onClick={() => void mutate()}
              className="font-mono text-xs"
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', isValidating && 'animate-spin')}
                aria-hidden
              />
              Actualizar
            </Button>
            <Button variant="primary" size="sm" asChild>
              <Link href="/dashboard" className="font-mono text-xs">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                Dashboard
              </Link>
            </Button>
          </div>
        </div>

        <Separator className="bg-ops-border" />

        {error ? (
          <Card className="border-ops-red/40 bg-ops-red/5">
            <CardHeader className="py-3">
              <CardTitle className="text-sm text-ops-red">Error al cargar</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 pt-0">
              <p className="font-sans text-sm text-red-300">{String(error.message)}</p>
            </CardContent>
          </Card>
        ) : null}

        {isLoading && data === undefined ? <MachinesLoadingSkeleton /> : null}

        {data !== undefined && !data.docker_available ? (
          <Card className="border-ops-yellow/50 bg-ops-yellow/5">
            <CardHeader className="flex flex-row items-center gap-2 py-3">
              <Server className="h-4 w-4 text-ops-yellow" aria-hidden />
              <CardTitle className="text-sm text-ops-yellow">Docker no disponible</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pb-4 pt-0">
              <p className="font-sans text-sm text-neutral-300">{data.error ?? 'Sin detalle'}</p>
              <p className="font-sans text-xs text-ops-gray">
                Local: Docker Desktop. VPS: montar{' '}
                <code className="rounded bg-black/30 px-1 font-mono">/var/run/docker.sock</code>.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {data?.docker_available === true ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Total contenedores"
                value={total}
                color={data.truncated ? 'ops-yellow' : 'ops-gray'}
                unit={data.truncated ? `límite ${data.limit}` : undefined}
              />
              <KpiCard label="En ejecución" value={running} color="ops-green" />
              <KpiCard label="Estados distintos" value={stateKeys.length} color="ops-gray" />
              <Card className="border-ops-border bg-ops-surface">
                <CardHeader className="pb-1 pt-3">
                  <CardTitle className="font-sans text-xs font-normal uppercase tracking-wide text-ops-gray">
                    Carga en ejecución
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pb-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-2xl text-neutral-100">{runningPct}%</span>
                    <span className="font-mono text-xs text-ops-gray">
                      {running}/{total}
                    </span>
                  </div>
                  <Progress value={runningPct} className="h-2 bg-ops-border/80" />
                </CardContent>
              </Card>
            </div>

            {stateKeys.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {stateKeys.slice(0, 8).map((sk) => (
                  <Badge key={sk} variant="default" className="font-mono text-[10px]">
                    {sk}: {totals[sk]}
                  </Badge>
                ))}
              </div>
            ) : null}

            <Card className="overflow-hidden border-ops-border">
              <CardHeader className="flex flex-col gap-4 border-b border-ops-border py-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="font-sans text-xs font-normal uppercase tracking-wide text-ops-gray">
                  Contenedores
                  <span className="ml-2 font-mono text-neutral-300">
                    ({filtered.length}
                    {filtered.length !== total ? ` / ${total}` : ''})
                  </span>
                </CardTitle>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                  <div className="relative w-full min-w-[200px] sm:max-w-md">
                    <Search
                      className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ops-gray"
                      aria-hidden
                    />
                    <Input
                      placeholder="Buscar nombre, imagen, puertos…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="border-ops-border bg-ops-bg pl-9 font-mono text-sm"
                      aria-label="Filtrar contenedores"
                    />
                  </div>
                  <Select value={stateFilter} onValueChange={setStateFilter}>
                    <SelectTrigger className="w-full border-ops-border bg-ops-bg sm:w-[200px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      {stateKeys.map((k) => (
                        <SelectItem key={k} value={k}>
                          {k} ({totals[k]})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[120px]">Estado</TableHead>
                      <TableHead>Nombres</TableHead>
                      <TableHead>Imagen</TableHead>
                      <TableHead className="hidden md:table-cell">Puertos</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="align-top">
                          <DockerStateBadge state={row.state} />
                        </TableCell>
                        <TableCell className="align-top text-neutral-200">
                          <TruncatedCell className="text-ops-green">
                            {row.names.join(', ')}
                          </TruncatedCell>
                        </TableCell>
                        <TableCell className="align-top text-ops-gray">
                          <TruncatedCell>{row.image}</TruncatedCell>
                        </TableCell>
                        <TableCell className="hidden align-top text-ops-gray md:table-cell">
                          <TruncatedCell>{row.ports.length > 0 ? row.ports : '—'}</TruncatedCell>
                        </TableCell>
                        <TableCell className="max-w-[200px] align-top">
                          <p className="line-clamp-2 font-mono text-[11px] leading-snug text-neutral-400">
                            {row.status}
                          </p>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filtered.length === 0 && total > 0 ? (
                  <div className="border-t border-ops-border px-3 py-8 text-center">
                    <p className="font-sans text-sm text-ops-gray">
                      Ningún contenedor coincide con filtros actuales.
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-2"
                      type="button"
                      onClick={() => {
                        setQuery('');
                        setStateFilter('all');
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                ) : null}
                {total === 0 ? (
                  <div className="border-t border-ops-border px-3 py-8 text-center font-sans text-sm text-ops-gray">
                    No hay contenedores listados.
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
