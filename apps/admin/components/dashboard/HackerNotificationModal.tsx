'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, TerminalSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function HackerNotificationModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="holo-border neon-glow max-w-xl rounded-2xl border-ops-cyan/50 bg-ops-bg/95 p-0">
        <DialogHeader className="border-b border-ops-cyan/30 px-5 py-4">
          <DialogTitle className="flex items-center gap-2 font-display text-sm tracking-[0.18em] text-ops-cyan">
            <TerminalSquare className="h-4 w-4 text-ops-magenta" />
            TERMINAL ALERT // CYBERPUNK CORE
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-300">
            Neural scanner ha detectado patrón de carga en agentes autónomos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 px-5 py-4 font-mono text-xs text-neutral-200">
          <p className="digital-readout text-ops-cyan">[SYS] PATTERN DETECTED · PREDICTIVE SPIKE +18%</p>
          <p>[AI] Recomendación: activar throttling suave para workers secundarios.</p>
          <p className="text-ops-magenta">[ACTION] Apply staged deployment and monitor latency stream.</p>
        </div>
        <DialogFooter className="border-t border-ops-cyan/30 px-5 py-4">
          <Button
            onClick={() => setOpen(false)}
            className="cyber-hover border border-ops-cyan/60 bg-ops-cyan/20 text-ops-cyan hover:bg-ops-cyan/30"
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            ACKNOWLEDGE
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
