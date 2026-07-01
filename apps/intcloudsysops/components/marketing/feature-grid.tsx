import { Inbox, MessageCircle, Shield, Waves } from 'lucide-react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';

const features = [
  {
    icon: Waves,
    title: 'Operación en piscina',
    description: 'Cupos, clases y alumnos visibles para el equipo en tiempo real.',
    accent: 'teal' as const,
  },
  {
    icon: Inbox,
    title: 'Interesados centralizados',
    description: 'Formulario web y mensajes entrantes en un solo panel.',
    accent: 'green' as const,
  },
  {
    icon: MessageCircle,
    title: 'Voz de los padres',
    description: 'Encuestas de satisfacción con alertas cuando baja la calificación.',
    accent: 'amber' as const,
  },
  {
    icon: Shield,
    title: 'Operación centralizada',
    description: 'Accesos, seguimiento y alertas del equipo en un mismo lugar.',
    accent: 'violet' as const,
  },
];

export function OpslyFeatureGrid(): React.ReactElement {
  return (
    <section id="metodo" className="bg-pk-snow py-14 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-14">
        <p className="pk-eyebrow">Panel operativo</p>
        <h2 className="mt-2 max-w-2xl text-2xl font-bold text-pk-ink sm:text-3xl">
          Tu equipo ve interesados, familias y mensajes sin salir de Peskids
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, description, accent }) => (
            <Card key={title} accent={accent} hover>
              <CardContent className="flex gap-4 pt-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pk-bg text-pk-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription className="mt-1.5">{description}</CardDescription>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
