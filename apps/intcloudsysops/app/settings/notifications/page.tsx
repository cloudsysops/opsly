'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check, Loader2, Mail, MessageCircle, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  ALL_EVENT_TYPES,
  EVENT_LABELS,
  type NotificationPreference,
} from '@/components/notifications/notification-types';

// ── Toggle switch (accessible) ──────────────────────────────────────────────

interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

function ToggleSwitch({
  id,
  checked,
  onChange,
  disabled = false,
  label,
  description,
  icon,
}: ToggleSwitchProps): React.ReactElement {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-center gap-4 rounded-xl border border-pk-border bg-pk-surface px-4 py-4',
        'transition-colors hover:border-pk-primary/40 hover:bg-pk-snow',
        disabled && 'cursor-not-allowed opacity-60',
        checked && 'border-pk-primary/30 bg-teal-50/30'
      )}
    >
      {icon && (
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            checked ? 'bg-pk-primary/10 text-pk-primary' : 'bg-pk-muted text-pk-mutedText'
          )}
        >
          {icon}
        </span>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-pk-ink">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-pk-mutedText">{description}</p>
        )}
      </div>

      {/* Visual pill toggle */}
      <div
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors',
          checked
            ? 'border-pk-primary bg-pk-primary'
            : 'border-pk-border bg-pk-muted'
        )}
        aria-hidden
      >
        <span
          className={cn(
            'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </div>

      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
    </label>
  );
}

// ── Event checkbox row ───────────────────────────────────────────────────────

interface EventCheckboxProps {
  eventKey: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

function EventCheckbox({
  eventKey,
  checked,
  onChange,
  disabled = false,
}: EventCheckboxProps): React.ReactElement {
  const label = EVENT_LABELS[eventKey] ?? eventKey;

  return (
    <label
      htmlFor={`event-${eventKey}`}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3',
        'border border-pk-border/60 bg-pk-surface transition-colors',
        'hover:border-pk-primary/30 hover:bg-pk-snow',
        disabled && 'cursor-not-allowed opacity-60',
        checked && 'border-pk-primary/30 bg-teal-50/30'
      )}
    >
      {/* Custom checkbox visual */}
      <span
        aria-hidden
        className={cn(
          'flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded',
          'border-2 transition-colors',
          checked ? 'border-pk-primary bg-pk-primary' : 'border-pk-border bg-pk-surface'
        )}
        style={{ width: '1.125rem', height: '1.125rem' }}
      >
        {checked && <Check className="h-2.5 w-2.5 text-white" aria-hidden strokeWidth={3} />}
      </span>

      <span className="text-sm font-medium text-pk-ink">{label}</span>

      <input
        id={`event-${eventKey}`}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
    </label>
  );
}

// ── Save confirmation banner ─────────────────────────────────────────────────

function SavedBanner({ visible }: { visible: boolean }): React.ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5',
        'text-sm font-semibold text-emerald-700 transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 -translate-y-1'
      )}
    >
      <Check className="h-4 w-4" aria-hidden />
      Guardado
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const DEFAULT_PREFERENCES: NotificationPreference = {
  id: '',
  email_enabled: true,
  whatsapp_enabled: false,
  inapp_enabled: true,
  events: [...ALL_EVENT_TYPES],
};

export default function NotificationPreferencesPage(): React.ReactElement {
  const [prefs, setPrefs] = useState<NotificationPreference>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedVisible, setSavedVisible] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Load preferences ---
  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const res = await fetch('/api/preferences/notifications', { credentials: 'include' });
        if (!res.ok) return;
        const data = (await res.json()) as NotificationPreference;
        setPrefs(data);
      } catch {
        // Graceful: show default state, user can still adjust
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  // --- Auto-save with debounced "Saved" banner ---
  const save = useCallback(async (updated: NotificationPreference): Promise<void> => {
    setSaving(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);

    try {
      const res = await fetch('/api/preferences/notifications', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_enabled: updated.email_enabled,
          whatsapp_enabled: updated.whatsapp_enabled,
          inapp_enabled: updated.inapp_enabled,
          events: updated.events,
        }),
      });
      if (!res.ok) return;

      setSavedVisible(true);
      savedTimerRef.current = setTimeout(() => setSavedVisible(false), 2500);
    } catch {
      // Graceful: no crash
    } finally {
      setSaving(false);
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // --- Handlers ---
  const handleChannelToggle = useCallback(
    (field: keyof Pick<NotificationPreference, 'email_enabled' | 'whatsapp_enabled' | 'inapp_enabled'>) =>
      (value: boolean): void => {
        const updated = { ...prefs, [field]: value };
        setPrefs(updated);
        void save(updated);
      },
    [prefs, save]
  );

  const handleEventToggle = useCallback(
    (eventKey: string) =>
      (checked: boolean): void => {
        const events = checked
          ? [...prefs.events, eventKey]
          : prefs.events.filter((e) => e !== eventKey);
        const updated = { ...prefs, events };
        setPrefs(updated);
        void save(updated);
      },
    [prefs, save]
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-pk-bg p-4 sm:p-6">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-center gap-3 py-20 text-pk-mutedText">
            <Loader2 className="h-5 w-5 animate-spin text-pk-primary" aria-hidden />
            <span className="text-sm">Cargando preferencias…</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-pk-bg p-4 sm:p-6">
      <div className="mx-auto max-w-2xl space-y-6">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-pk-primary" aria-hidden />
              <h1 className="text-xl font-bold text-pk-ink">Notificaciones</h1>
            </div>
            <p className="mt-1 text-sm text-pk-mutedText">
              Elige cómo y cuándo recibes avisos de Peskids.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin text-pk-primary" aria-hidden />}
            <SavedBanner visible={savedVisible} />
          </div>
        </div>

        {/* Channels card */}
        <Card>
          <CardHeader>
            <CardTitle>Canales de entrega</CardTitle>
            <CardDescription>Activa los canales por los que quieres recibir notificaciones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleSwitch
              id="channel-email"
              checked={prefs.email_enabled}
              onChange={handleChannelToggle('email_enabled')}
              label="Correo electrónico"
              description="Recibe notificaciones en tu email registrado"
              icon={<Mail className="h-4 w-4" aria-hidden />}
            />
            <ToggleSwitch
              id="channel-whatsapp"
              checked={prefs.whatsapp_enabled}
              onChange={handleChannelToggle('whatsapp_enabled')}
              label="WhatsApp"
              description="Requiere número registrado"
              icon={<MessageCircle className="h-4 w-4" aria-hidden />}
            />
            <ToggleSwitch
              id="channel-inapp"
              checked={prefs.inapp_enabled}
              onChange={handleChannelToggle('inapp_enabled')}
              label="En la app"
              description="Notificaciones en el panel de Peskids"
              icon={<Smartphone className="h-4 w-4" aria-hidden />}
            />
          </CardContent>
        </Card>

        {/* Event types card */}
        <Card>
          <CardHeader>
            <CardTitle>Tipos de evento</CardTitle>
            <CardDescription>Selecciona los eventos para los que quieres recibir avisos</CardDescription>
          </CardHeader>
          <CardContent>
            <fieldset>
              <legend className="sr-only">Tipos de evento para notificar</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {ALL_EVENT_TYPES.map((eventKey) => (
                  <EventCheckbox
                    key={eventKey}
                    eventKey={eventKey}
                    checked={prefs.events.includes(eventKey)}
                    onChange={handleEventToggle(eventKey)}
                  />
                ))}
              </div>
            </fieldset>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const updated = { ...prefs, events: [...ALL_EVENT_TYPES] };
                  setPrefs(updated);
                  void save(updated);
                }}
                className="text-xs font-semibold text-pk-primary underline-offset-2 hover:underline"
              >
                Seleccionar todos
              </button>
              <span className="text-pk-border" aria-hidden>·</span>
              <button
                type="button"
                onClick={() => {
                  const updated = { ...prefs, events: [] };
                  setPrefs(updated);
                  void save(updated);
                }}
                className="text-xs font-semibold text-pk-mutedText underline-offset-2 hover:underline"
              >
                Deseleccionar todos
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Footer note */}
        <p className="pb-8 text-center text-xs text-pk-mutedText">
          Los cambios se guardan automáticamente.
        </p>
      </div>
    </main>
  );
}
