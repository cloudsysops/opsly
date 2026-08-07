'use client';

import { useEffect, useState } from 'react';
import {
  capacityAlert,
  capacityAlertDismissStorageKey,
  shouldShowOpslyBanner,
} from '@intcloudsysops/capacity-alert';

/**
 * Banner de capacidad en Opsly admin (control plane).
 * Copia: @intcloudsysops/capacity-alert. Dismissal local solo.
 */
export function CapacityAlertBanner(): React.ReactElement | null {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!shouldShowOpslyBanner()) {
      setVisible(false);
      return;
    }
    try {
      const dismissed = sessionStorage.getItem(capacityAlertDismissStorageKey());
      setVisible(dismissed !== '1');
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) {
    return null;
  }

  const dismiss = (): void => {
    try {
      sessionStorage.setItem(capacityAlertDismissStorageKey(), '1');
    } catch {
      // ignore
    }
    setVisible(false);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-amber-500/40 bg-amber-500/10 px-6 py-3 text-amber-100"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber-300/90">
            Capacity alert · {capacityAlert.severity}
          </p>
          <p className="mt-1 text-sm font-semibold text-amber-50">{capacityAlert.title_es}</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-100/85">
            {capacityAlert.opsly_body_es}
          </p>
          <p className="mt-2 font-mono text-[10px] text-amber-200/70">
            Runbook: {capacityAlert.runbook}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 self-start rounded-md border border-amber-400/40 bg-black/20 px-3 py-1.5 font-mono text-[11px] text-amber-100 hover:bg-black/35"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
