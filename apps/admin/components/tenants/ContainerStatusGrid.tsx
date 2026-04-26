import type { ContainerStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function Dot({ state, health }: { state: ContainerStatus['state']; health: string }) {
  const starting = state === 'running' && health !== 'healthy' && health !== 'ok';
  if (state === 'running' && (health === 'healthy' || health === 'ok' || !health)) {
    return (
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full rounded-full bg-ops-green opacity-40" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-ops-green" />
      </span>
    );
  }
  if (starting) {
    return (
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-ops-yellow opacity-50" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-ops-yellow" />
      </span>
    );
  }
  if (state === 'stopped') {
    return <span className="h-3 w-3 rounded-full bg-ops-red" />;
  }
  return <span className="h-3 w-3 rounded-full bg-ops-gray" />;
}

export function ContainerStatusGrid({ containers }: { containers: ContainerStatus[] }) {
  if (containers.length === 0) {
    return (
      <p className="font-sans text-sm text-ops-gray">
        Sin datos de contenedores (stack vacío o no desplegado).
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {containers.map((c) => (
        <Card key={c.name}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-mono text-sm font-normal text-neutral-200">
              {c.name}
            </CardTitle>
            <Dot state={c.state} health={c.health} />
          </CardHeader>
          <CardContent>
            <div className="font-sans text-xs text-ops-gray">
              <div>
                status: <span className="font-mono text-neutral-300">{c.state}</span>
              </div>
              <div>
                health: <span className="font-mono text-neutral-300">{c.health || '—'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
