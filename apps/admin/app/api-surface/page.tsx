import { Activity, Database, LockKeyhole, RadioTower, Route, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  API_ENDPOINTS,
  categorizeEndpoint,
  endpointRisk,
  isMutation,
  type ApiSurfaceCategory,
} from '@/lib/api-surface';

const categoryLabels: Record<ApiSurfaceCategory, string> = {
  admin: 'Admin',
  agents: 'Agentes',
  billing: 'Billing',
  cron: 'Cron',
  feedback: 'Feedback',
  health: 'Health',
  infra: 'Infra',
  internal: 'Internal',
  n8n: 'n8n',
  portal: 'Portal',
  public: 'Public',
  tenants: 'Tenants',
  tools: 'Tools',
  webhooks: 'Webhooks',
};

const riskVariant = {
  low: 'green',
  medium: 'yellow',
  high: 'red',
} as const;

const methodTone = {
  GET: 'border-ops-green/40 bg-ops-green/10 text-ops-green',
  POST: 'border-ops-blue/40 bg-ops-blue/10 text-ops-blue',
  PATCH: 'border-ops-yellow/40 bg-ops-yellow/10 text-ops-yellow',
  PUT: 'border-ops-yellow/40 bg-ops-yellow/10 text-ops-yellow',
  DELETE: 'border-ops-red/40 bg-ops-red/10 text-ops-red',
  OPTIONS: 'border-ops-gray/40 bg-ops-gray/10 text-ops-gray',
  HEAD: 'border-ops-gray/40 bg-ops-gray/10 text-ops-gray',
} as const;

function countBy<T extends string>(items: T[]): Record<T, number> {
  return items.reduce(
    (acc, item) => {
      acc[item] = (acc[item] ?? 0) + 1;
      return acc;
    },
    {} as Record<T, number>
  );
}

export default function ApiSurfacePage() {
  const categories = API_ENDPOINTS.map((endpoint) => categorizeEndpoint(endpoint.path));
  const byCategory = countBy(categories);
  const mutations = API_ENDPOINTS.filter((endpoint) => isMutation(endpoint.methods));
  const highRisk = API_ENDPOINTS.filter((endpoint) => endpointRisk(endpoint) === 'high');
  const controlEndpoints = API_ENDPOINTS.filter((endpoint) => endpoint.app === 'control');

  const grouped = API_ENDPOINTS.reduce(
    (acc, endpoint) => {
      const category = categorizeEndpoint(endpoint.path);
      acc[category] = [...(acc[category] ?? []), endpoint];
      return acc;
    },
    {} as Record<ApiSurfaceCategory, typeof API_ENDPOINTS>
  );

  const sortedCategories = Object.keys(grouped).sort((a, b) =>
    categoryLabels[a as ApiSurfaceCategory].localeCompare(categoryLabels[b as ApiSurfaceCategory])
  ) as ApiSurfaceCategory[];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-ops-gray">API Surface</p>
          <h1 className="mt-2 font-mono text-lg tracking-tight text-ops-green">
            Inventario de endpoints
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
            Mapa operativo de rutas expuestas por API, Admin, Portal y Web. Sirve para revisar
            cobertura frontend, blast radius y endpoints que requieren mayor cuidado.
          </p>
        </div>
        <Badge variant="blue">{API_ENDPOINTS.length} endpoints</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-wide text-ops-gray">
              <Route className="h-4 w-4" />
              Control plane
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-3xl text-neutral-100">{controlEndpoints.length}</p>
            <p className="mt-1 text-sm text-neutral-500">rutas en apps/api</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-wide text-ops-gray">
              <Database className="h-4 w-4" />
              Mutaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-3xl text-ops-yellow">{mutations.length}</p>
            <p className="mt-1 text-sm text-neutral-500">POST/PATCH/PUT/DELETE</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-wide text-ops-gray">
              <ShieldAlert className="h-4 w-4" />
              Alto cuidado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-3xl text-ops-red">{highRisk.length}</p>
            <p className="mt-1 text-sm text-neutral-500">admin, billing, internal, webhooks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-wide text-ops-gray">
              <Activity className="h-4 w-4" />
              Dominios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-3xl text-ops-green">{sortedCategories.length}</p>
            <p className="mt-1 text-sm text-neutral-500">categorias funcionales</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LockKeyhole className="h-4 w-4 text-ops-green" />
            Lectura rapida por dominio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {sortedCategories.map((category) => (
              <div key={category} className="rounded border border-ops-border bg-ops-bg/50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-neutral-200">{categoryLabels[category]}</span>
                  <span className="font-mono text-sm text-ops-green">{byCategory[category]}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-5">
        {sortedCategories.map((category) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-4">
                <span>{categoryLabels[category]}</span>
                <Badge variant="gray">{grouped[category].length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-ops-border">
                {grouped[category].map((endpoint) => {
                  const risk = endpointRisk(endpoint);
                  return (
                    <div
                      key={`${endpoint.app}:${endpoint.path}`}
                      className="grid gap-3 p-3 lg:grid-cols-[220px_1fr_90px]"
                    >
                      <div className="flex flex-wrap gap-1">
                        {endpoint.methods.map((method) => (
                          <span
                            key={method}
                            className={`rounded border px-1.5 py-0.5 font-mono text-[11px] ${
                              methodTone[method as keyof typeof methodTone] ?? methodTone.OPTIONS
                            }`}
                          >
                            {method}
                          </span>
                        ))}
                      </div>
                      <div>
                        <p className="break-all font-mono text-sm text-neutral-100">
                          {endpoint.path}
                        </p>
                        <p className="mt-1 break-all font-mono text-xs text-neutral-600">
                          {endpoint.file}
                        </p>
                      </div>
                      <div className="flex items-start justify-start lg:justify-end">
                        <Badge variant={riskVariant[risk]}>{risk}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs leading-6 text-neutral-600">
        Nota: este inventario es una fotografia del codigo actual. Si se agregan rutas nuevas,
        actualizar `apps/admin/lib/api-surface.ts` en el mismo PR para mantener la UI alineada.
      </p>
    </div>
  );
}

