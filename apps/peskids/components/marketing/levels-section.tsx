import { SWIM_LEVELS } from '@/lib/brand';
import { Card, CardContent } from '@/components/ui/card';

export function LevelsSection(): React.ReactElement {
  return (
    <section id="niveles" className="border-y border-pk-border bg-pk-surface py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-14">
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="pk-eyebrow">El método Peskids</p>
            <h2 className="mt-2 max-w-xl text-3xl font-bold tracking-tight text-pk-ink sm:text-4xl">
              Seis niveles · de la primera burbuja al estilo mariposa.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-pk-sub">
            Cada nivel tiene logros concretos. Avanzas cuando los dominas, no por edad ni por
            tiempo.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SWIM_LEVELS.map((level) => (
            <Card key={level.n} hover className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                    style={{
                      background: level.color,
                      color: level.dark ? '#A8DDE3' : '#ffffff',
                    }}
                  >
                    {level.emoji}
                  </span>
                  <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-pk-mutedText">
                      Nivel {level.n}
                    </p>
                    <p className="text-xl font-bold tracking-tight text-pk-ink">{level.name}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-pk-sub">{level.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
