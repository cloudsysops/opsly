'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TenantSettings {
  tenant_id: string;
  academy_name: string;
  sede_label: string;
  support_email: string | null;
  support_phone: string | null;
  default_modality: 'llanogrande' | 'domicilio';
  default_capacity: number;
  default_price_cents: number;
}

interface SettingsApiResponse {
  settings?: TenantSettings;
  error?: string;
}

export function SettingsForm(): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    academy_name: '',
    sede_label: '',
    support_email: '',
    support_phone: '',
    default_modality: 'llanogrande' as 'llanogrande' | 'domicilio',
    default_capacity: '8',
    default_price_cents: '85000',
  });

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const res = await fetch('/api/admin/settings', { credentials: 'include' });
        const json = (await res.json()) as SettingsApiResponse;
        if (!res.ok || !json.settings) {
          throw new Error(json.error || 'No se pudo cargar la configuración');
        }
        const s = json.settings;
        setForm({
          academy_name: s.academy_name,
          sede_label: s.sede_label,
          support_email: s.support_email ?? '',
          support_phone: s.support_phone ?? '',
          default_modality: s.default_modality,
          default_capacity: String(s.default_capacity),
          default_price_cents: String(s.default_price_cents),
        });
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error cargando configuración');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academy_name: form.academy_name.trim(),
          sede_label: form.sede_label.trim(),
          support_email: form.support_email.trim() || undefined,
          support_phone: form.support_phone.trim() || undefined,
          default_modality: form.default_modality,
          default_capacity: Number(form.default_capacity),
          default_price_cents: Number(form.default_price_cents),
        }),
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || 'No se pudo guardar la configuración');
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-pk-sub">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Cargando configuración…
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {saved ? <p className="text-sm text-emerald-700">Configuración guardada.</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Academia</CardTitle>
          <CardDescription>Nombre y sede que ve el equipo en el panel.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="settings-academy-name">Nombre de la academia</Label>
            <Input
              id="settings-academy-name"
              required
              value={form.academy_name}
              onChange={(e) => setForm({ ...form, academy_name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="settings-sede-label">Sede</Label>
            <Input
              id="settings-sede-label"
              required
              value={form.sede_label}
              onChange={(e) => setForm({ ...form, sede_label: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contacto de soporte</CardTitle>
          <CardDescription>Dónde pueden escribirles las familias si algo falla.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="settings-support-email">Email de soporte</Label>
            <Input
              id="settings-support-email"
              type="email"
              value={form.support_email}
              onChange={(e) => setForm({ ...form, support_email: e.target.value })}
              placeholder="soporte@academia.com"
            />
          </div>
          <div>
            <Label htmlFor="settings-support-phone">Teléfono / WhatsApp de soporte</Label>
            <Input
              id="settings-support-phone"
              value={form.support_phone}
              onChange={(e) => setForm({ ...form, support_phone: e.target.value })}
              placeholder="+57 300 000 0000"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parámetros operativos por defecto</CardTitle>
          <CardDescription>Valores iniciales al crear una clase nueva.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div>
            <Label htmlFor="settings-default-modality">Modalidad default</Label>
            <select
              id="settings-default-modality"
              className="h-10 w-full rounded-lg border border-pk-border bg-white px-3 text-sm"
              value={form.default_modality}
              onChange={(e) =>
                setForm({
                  ...form,
                  default_modality: e.target.value as 'llanogrande' | 'domicilio',
                })
              }
            >
              <option value="llanogrande">Llanogrande</option>
              <option value="domicilio">Domicilio</option>
            </select>
          </div>
          <div>
            <Label htmlFor="settings-default-capacity">Cupo default</Label>
            <Input
              id="settings-default-capacity"
              type="number"
              min={1}
              required
              value={form.default_capacity}
              onChange={(e) => setForm({ ...form, default_capacity: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="settings-default-price">Precio default (COP)</Label>
            <Input
              id="settings-default-price"
              type="number"
              min={0}
              required
              value={form.default_price_cents}
              onChange={(e) => setForm({ ...form, default_price_cents: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={saving}>
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Save className="mr-1 h-4 w-4" aria-hidden />
            Guardar configuración
          </>
        )}
      </Button>
    </form>
  );
}
