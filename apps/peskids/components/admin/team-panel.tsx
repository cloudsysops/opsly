'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, Loader2, Mail, UserPlus, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  TeamInviteResult,
  TeamMemberSummary,
  TeamViewData,
  TeamRole,
} from '@/lib/team-management';
import { cn } from '@/lib/utils';

type InviteState = {
  email: string;
  name: string;
  role: Exclude<TeamRole, 'owner'>;
};

const ROLE_LABEL: Record<TeamRole, string> = {
  owner: 'Propietario',
  admin: 'Admin',
  support: 'Soporte',
  teacher: 'Profesor',
};

const ROLE_TONE: Record<TeamRole, 'green' | 'violet' | 'teal' | 'amber'> = {
  owner: 'green',
  admin: 'violet',
  support: 'teal',
  teacher: 'amber',
};

const STATUS_LABEL: Record<TeamMemberSummary['status'], string> = {
  invited: 'Invitado',
  active: 'Activo',
  disabled: 'Bloqueado',
};

const STATUS_TONE: Record<TeamMemberSummary['status'], 'amber' | 'green' | 'neutral'> = {
  invited: 'amber',
  active: 'green',
  disabled: 'neutral',
};

function buildNameFallback(email: string): string {
  return email.split('@')[0]?.replace(/[._-]+/g, ' ') || email;
}

export function TeamPanel(): React.ReactElement {
  const [team, setTeam] = useState<TeamViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteResult, setInviteResult] = useState<TeamInviteResult | null>(null);
  const [copyOk, setCopyOk] = useState(false);
  const [form, setForm] = useState<InviteState>({
    email: '',
    name: '',
    role: 'teacher',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadTeam = async (isRefresh = false): Promise<void> => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await fetch('/api/admin/team', { credentials: 'include' });
      const json = (await res.json()) as TeamViewData & { error?: string };
      if (!res.ok) {
        throw new Error(json.error || 'No se pudo cargar el equipo');
      }
      setTeam(json);
      setWarning(json.warnings?.join(' · ') || '');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el equipo');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadTeam();
  }, []);

  const counts = useMemo(() => {
    const members = team?.members ?? [];
    return {
      total: members.length,
      invited: members.filter((member) => member.status === 'invited').length,
      active: members.filter((member) => member.status === 'active').length,
      support: members.filter((member) => member.role === 'support').length,
      teacher: members.filter((member) => member.role === 'teacher').length,
      admin: members.filter((member) => member.role === 'admin').length,
    };
  }, [team]);

  async function copyLink(link: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(link);
      setCopyOk(true);
      window.setTimeout(() => setCopyOk(false), 2000);
    } catch {
      window.prompt('Copia este enlace', link);
    }
  }

  async function submitInvite(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    setInviteError('');
    setInviteResult(null);
    try {
      const email = form.email.trim();
      const name = form.name.trim() || buildNameFallback(email);
      const res = await fetch('/api/admin/team', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, role: form.role }),
      });
      const json = (await res.json()) as TeamInviteResult & { error?: string };
      if (!res.ok) {
        throw new Error(json.error || 'No se pudo generar la invitación');
      }
      setInviteResult(json);
      setForm({ email: '', name: '', role: form.role });
      await loadTeam(true);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'No se pudo generar la invitación');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      data-admin-section="team"
      className="rounded-3xl border border-pk-border bg-white p-5 shadow-card sm:p-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-pk-mutedText">
            Peskids / Equipo
          </p>
          <h3 className="mt-1 font-display text-2xl font-semibold tracking-tight text-pk-ink">
            Staff, invitados y soporte
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-pk-sub">
            Gestiona aquí profesores, administradores y soporte. Si algo falla en memberships, el
            panel sigue mostrando el enlace de acceso.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-2xl border border-pk-border bg-pk-muted px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.12em] text-pk-mutedText">Total</p>
            <p className="mt-1 font-semibold text-pk-ink">{counts.total}</p>
          </div>
          <div className="rounded-2xl border border-pk-border bg-pk-muted px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.12em] text-pk-mutedText">Activos</p>
            <p className="mt-1 font-semibold text-pk-ink">{counts.active}</p>
          </div>
          <div className="rounded-2xl border border-pk-border bg-pk-muted px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.12em] text-pk-mutedText">Invitados</p>
            <p className="mt-1 font-semibold text-pk-ink">{counts.invited}</p>
          </div>
          <div className="rounded-2xl border border-pk-border bg-pk-muted px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.12em] text-pk-mutedText">Soporte</p>
            <p className="mt-1 font-semibold text-pk-ink">{counts.support}</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}
      {warning ? (
        <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          {warning}
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-pk-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Invitar miembro</CardTitle>
            <CardDescription>
              Genera acceso para profesores, admin o soporte. El correo saldrá con branding de
              Peskids y fallback de enlace manual.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void submitInvite(e)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-pk-ink">Email</span>
                  <input
                    type="email"
                    className="pk-input mt-1"
                    required
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="profesor@peskids.com"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-pk-ink">Nombre</span>
                  <input
                    type="text"
                    className="pk-input mt-1"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Santiago Sierra"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-pk-ink">Rol</span>
                <select
                  className="pk-input mt-1"
                  value={form.role}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      role: e.target.value as InviteState['role'],
                    }))
                  }
                >
                  <option value="teacher">Profesor</option>
                  <option value="support">Soporte</option>
                  <option value="admin">Admin</option>
                </select>
              </label>

              {inviteError ? <p className="text-sm text-red-600">{inviteError}</p> : null}
              {inviteResult ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <p className="font-semibold">
                    {inviteResult.flow === 'recovery'
                      ? 'Enlace de recuperación listo'
                      : 'Invitación lista'}
                  </p>
                  <p className="mt-1 break-all">{inviteResult.link}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void copyLink(inviteResult.link)}
                    >
                      <Copy className="mr-2 h-4 w-4" aria-hidden />
                      {copyOk ? 'Copiado' : 'Copiar enlace'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setInviteResult(null)}
                    >
                      Cerrar
                    </Button>
                  </div>
                  {inviteResult.emailDeliverySkipped ? (
                    <p className="mt-2 text-xs text-emerald-800">
                      Email no enviado automáticamente:{' '}
                      {inviteResult.emailDeliveryWarning ||
                        inviteResult.warning ||
                        'usa el enlace manual'}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Generando…
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" aria-hidden />
                      Invitar miembro
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void loadTeam(true)}
                  disabled={refreshing || loading}
                >
                  <Users
                    className={cn('mr-2 h-4 w-4', (refreshing || loading) && 'animate-spin')}
                    aria-hidden
                  />
                  Actualizar lista
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-pk-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Miembros actuales</CardTitle>
            <CardDescription>
              Propietario, administrador, soporte y profesores con su estado real en memberships.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-3 py-8 text-sm text-pk-sub">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Cargando equipo…
              </div>
            ) : (team?.members.length ?? 0) > 0 ? (
              <ul className="space-y-3">
                {team?.members.map((member) => (
                  <li
                    key={`${member.email}-${member.role}`}
                    className="rounded-2xl border border-pk-border bg-pk-muted/40 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-pk-ink">
                          {member.display_name || member.email}
                        </p>
                        <p className="text-xs text-pk-sub">{member.email}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge tone={ROLE_TONE[member.role]}>{ROLE_LABEL[member.role]}</Badge>
                        <Badge tone={STATUS_TONE[member.status]}>
                          {STATUS_LABEL[member.status]}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-pk-sub">
                      <Mail className="h-3.5 w-3.5" aria-hidden />
                      <span>{member.user_id ? 'Cuenta vinculada' : 'Pendiente de vincular'}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-dashed border-pk-border bg-pk-muted/40 px-4 py-6 text-sm text-pk-sub">
                Todavía no hay miembros sincronizados. Puedes invitar profesor, soporte o admin
                desde el formulario.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
