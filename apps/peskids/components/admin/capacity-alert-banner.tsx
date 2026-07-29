'use client';

import { useEffect, useState } from 'react';
import {
  capacityAlert,
  capacityAlertDismissStorageKey,
  shouldShowPeskidsBanner,
} from '@intcloudsysops/capacity-alert';

/**
 * Banner de capacidad en el admin Peskids.
 * Copia compartida: @intcloudsysops/capacity-alert (alert.json).
 * Dismissal solo local (sessionStorage); no silencia email/Discord/Cursor.
 */
export function CapacityAlertBanner(): React.ReactElement | null {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!shouldShowPeskidsBanner()) {
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
      // private mode — still hide for this render tree
    }
    setVisible(false);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-amber-950 sm:px-7"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight">{capacityAlert.title_es}</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-900/90">
            {capacityAlert.peskids_body_es}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="pk-focus shrink-0 self-start rounded-lg border border-amber-300 bg-white/70 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-white"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
