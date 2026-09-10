'use client';

import { useState } from 'react';
import { Copy, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  buildSupportReplyTemplates,
  type SupportReplyTemplate,
} from '@/lib/admin/support-reply-copy';

type SupportReplyTemplatesProps = {
  leadName: string;
  leadType: string | null | undefined;
  status: string;
  enrollmentUrl?: string;
};

export function SupportReplyTemplates(props: SupportReplyTemplatesProps): React.ReactElement {
  const templates = buildSupportReplyTemplates(props);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (template: SupportReplyTemplate) => {
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
