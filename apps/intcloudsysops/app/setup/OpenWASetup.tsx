'use client';

import { useState, useEffect, useCallback } from 'react';

interface SetupState {
  loading: boolean;
  status: string | null;
  qrCode: string | null;
  webhookUrl: string | null;
  error: string | null;
}

export default function OpenWASetup({ tenantName = 'Tenant' }: { tenantName?: string }) {
  const [state, setState] = useState<SetupState>({
    loading: true, status: null, qrCode: null, webhookUrl: null, error: null,
  });
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);

  const fetchStatus = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch('/api/setup/openwa');
      const json = (await res.json()) as {
        ok: boolean;
        data?: { session?: { status?: string }; qrCode?: string };
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setState({ loading: false, status: null, qrCode: null, webhookUrl: null, error: json.error ?? 'Error' });
        return;
      }
      setState({ loading: false, status: json.data?.session?.status ?? null, qrCode: json.data?.qrCode ?? null, webhookUrl: null, error: null });
    } catch (err) {
      setState({ loading: false, status: null, qrCode: null, webhookUrl: null, error: String(err) });
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
    const t = setInterval(() => void fetchStatus(), 5000);
    return () => clearInterval(t);
  }, [fetchStatus]);

  async function registerWebhook() {
    setRegistering(true);
    try {
      const res = await fetch('/api/setup/openwa', { method: 'POST' });
      const json = (await res.json()) as { ok: boolean; data?: { webhookUrl?: string }; error?: string };
      if (json.ok) {
        setRegistered(true);
        setState((s) => ({ ...s, webhookUrl: json.data?.webhookUrl ?? null }));
      } else {
        setState((s) => ({ ...s, error: json.error ?? 'Error al registrar' }));
      }
    } finally {
      setRegistering(false);
    }
  }

  const STATUS_COLOR: Record<string, string> = {
    CONNECTED: 'text-emerald-400',
    SCAN_QR: 'text-yellow-400',
    CONNECTING: 'text-blue-400',
    INITIALIZING: 'text-blue-400',
    STARTING: 'text-blue-400',
    STOPPED: 'text-zinc-500',
    DISCONNECTED: 'text-zinc-500',
    FAILED: 'text-red-400',
    WORKING: 'text-emerald-400',
    SCAN_QR_CODE: 'text-yellow-400',
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Estado — {tenantName}</h2>
          <button onClick={() => void fetchStatus()} className="text-xs text-zinc-500 hover:text-zinc-300">↻</button>
        </div>
        {state.loading && <p className="text-zinc-500 text-sm animate-pulse">Consultando...</p>}
        {state.error && <p className="text-red-400 text-sm">❌ {state.error}</p>}
        {state.status && !state.loading && (
          <p className={`text-sm font-medium ${STATUS_COLOR[state.status] ?? 'text-zinc-400'}`}>
            ● {state.status}
            {state.status === 'CONNECTED' && ' — ✅ WhatsApp activo'}
            {state.status === 'WORKING' && ' — ✅ WhatsApp activo'}
            {state.status === 'SCAN_QR' && ' — escanea el QR'}
            {state.status === 'SCAN_QR_CODE' && ' — escanea el QR'}
          </p>
        )}
      </div>

      {state.qrCode && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-5 space-y-3 text-center">
          <p className="text-yellow-400 font-medium">📱 Escanea con WhatsApp</p>
          <p className="text-zinc-400 text-xs">WhatsApp → Dispositivos vinculados → Vincular</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={state.qrCode} alt="QR WhatsApp" className="mx-auto w-56 h-56 rounded-lg" />
        </div>
      )}

      {(state.status === 'CONNECTED' || state.status === 'WORKING') && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3">
          <p className="text-emerald-400 font-medium">✅ Sesión activa</p>
          {registered || state.webhookUrl ? (
            <div>
              <p className="text-emerald-400 text-sm">✅ Webhook registrado</p>
              <p className="font-mono text-xs text-zinc-500 mt-1">{state.webhookUrl}</p>
            </div>
          ) : (
            <button
              onClick={() => void registerWebhook()}
              disabled={registering}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm font-medium"
            >
              {registering ? 'Registrando...' : '🔗 Registrar webhook'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
