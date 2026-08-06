'use client';

import { useState } from 'react';
import { Copy, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type SupportReplyTemplatesProps = {
  leadName: string;
  leadType: string | null | undefined;
  status: string;
  latestTrial?: {
    teacherName: string | null;
    scheduledDate: string | null;
    scheduledTime: string | null;
  } | null;
};

type Template = {
  id: string;
  label: string;
  message: string;
};

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function formatTrialDate(scheduledDate: string | null): string {
  if (!scheduledDate) return 'la fecha que coordinamos';
  const parsed = new Date(`${scheduledDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return scheduledDate;
  return parsed.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
}

function familyTemplates(
  name: string,
  status: string,
  trial: SupportReplyTemplatesProps['latestTrial']
): Template[] {
  const templates: Template[] = [];

  if (trial?.scheduledDate) {
    const teacher = trial.teacherName ? ` con el profe ${trial.teacherName}` : '';
    templates.push({
      id: 'trial_confirmation',
      label: 'Confirmar clase de prueba',
      message: `Hola ${name}! 🏊 Tu clase de prueba en Peskids quedó confirmada para el ${formatTrialDate(trial.scheduledDate)}${trial.scheduledTime ? ` a las ${trial.scheduledTime}` : ''}${teacher}. Cualquier cosa nos escribes por aquí. ¡Nos vemos!`,
    });
  }

  if (status === 'enrolled' || status === 'active') {
    templates.push({
      id: 'welcome_enrolled',
      label: 'Bienvenida — matriculado',
      message: `¡Bienvenido a Peskids, ${name}! 🎉 Tu matrícula quedó confirmada. En breve te compartimos los detalles de pago y el horario definitivo de las clases.`,
    });
  }

  templates.push({
    id: 'missing_info',
    label: 'Solicitar información faltante',
    message: `Hola ${name}, para continuar con tu solicitud en Peskids nos falta un dato. ¿Nos puedes confirmar esa información por aquí para seguir con el proceso?`,
  });

  templates.push({
    id: 'follow_up',
    label: 'Seguimiento — ¿sigue interesado?',
    message: `Hola ${name}, ¿sigues interesado/a en las clases de natación con Peskids? Cuéntanos si quieres que te ayudemos a agendar tu clase de prueba.`,
  });

  return templates;
}

function teacherApplicantTemplates(name: string): Template[] {
  return [
    {
      id: 'application_received',
      label: 'Confirmar recepción de aplicación',
      message: `Hola ${name}, recibimos tu hoja de vida y tu video de natación. Nuestro equipo lo va a revisar y te contactamos pronto con los siguientes pasos. ¡Gracias por tu interés en Peskids!`,
    },
    {
      id: 'application_approved',
      label: 'Aprobado — siguientes pasos',
      message: `¡Hola ${name}! Tu aplicación como profesor(a) en Peskids fue aprobada 🎉 Te vamos a compartir los siguientes pasos para la vinculación. ¿Tienes disponibilidad para una llamada breve esta semana?`,
    },
    {
      id: 'no_vacancy',
      label: 'Sin vacantes por ahora',
      message: `Hola ${name}, gracias por tu interés en Peskids. Por ahora no tenemos vacantes disponibles para tu perfil, pero guardamos tu información y te contactamos apenas surja una oportunidad.`,
    },
  ];
}

function companyTemplates(name: string): Template[] {
  return [
    {
      id: 'schedule_call',
      label: 'Agendar llamada',
      message: `Hola ${name}, gracias por tu interés en una alianza con Peskids. ¿Podemos agendar una llamada esta semana para conversar los detalles? Cuéntanos qué día y hora te queda bien.`,
    },
    {
      id: 'proposal_follow_up',
      label: 'Seguimiento de propuesta',
      message: `Hola ${name}, ¿pudiste revisar la propuesta que te compartimos para la alianza con Peskids? Quedamos atentos a tus comentarios o dudas.`,
    },
  ];
}

function buildTemplates(props: SupportReplyTemplatesProps): Template[] {
  const name = firstName(props.leadName);
  if (props.leadType === 'teacher_applicant') return teacherApplicantTemplates(name);
  if (props.leadType === 'company') return companyTemplates(name);
  return familyTemplates(name, props.status, props.latestTrial);
}

export function SupportReplyTemplates(props: SupportReplyTemplatesProps): React.ReactElement {
  const templates = buildTemplates(props);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (template: Template) => {
    try {
      await navigator.clipboard.writeText(template.message);
      setCopiedId(template.id);
      setTimeout(() => setCopiedId((current) => (current === template.id ? null : current)), 2000);
    } catch (err) {
      console.error('Failed to copy reply template:', err);
    }
  };

  return (
    <Card accent="violet" className="border-pk-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" aria-hidden />
          Mensajes rápidos para responder
        </CardTitle>
        <CardDescription>
          Cópialos y pégalos en WhatsApp para responder al cliente. Se irán afinando con el equipo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className="rounded-xl border border-pk-border bg-pk-bg p-3 text-left text-sm"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-semibold text-pk-ink">{template.label}</p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void handleCopy(template)}
                className="gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                {copiedId === template.id ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>
            <p className="whitespace-pre-wrap text-pk-sub">{template.message}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
