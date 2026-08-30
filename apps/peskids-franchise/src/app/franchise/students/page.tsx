'use client';

import { useEffect, useState } from 'react';

type FranchiseStudent = {
  id: string;
  full_name: string;
  parent_email: string | null;
  grade: string | null;
  status: string;
  enrollment_date: string | null;
  franchise_id: string | null;
  franchise_name: string | null;
};

const STATUS_OPTIONS = ['active', 'inactive', 'graduated', 'transferred'] as const;

export default function FranchiseStudentsPage() {
  const [students, setStudents] = useState<FranchiseStudent[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const limit = 25;

  useEffect(() => {
    setState('loading');
    const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit) });
    if (statusFilter) params.set('status', statusFilter);

    fetch(`/api/franchise/students?${params}`, { cache: 'no-store' })
      .then((r) => {
        if (r.status === 401) {
          window.location.href = '/login?callbackUrl=/franchise/students';
          return null;
        }
        if (!r.ok) throw new Error('students failed');
        return r.json();
      })
      .then((result) => {
        if (!result) return;
        setStudents(result.students ?? []);
        setTotal(result.total ?? 0);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [statusFilter, page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <main className="mx-auto max-w-7xl p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-brand-navy">Estudiantes de Franquicia</h1>
        <p className="mt-1 text-slate-600">
          {total} estudiante{total !== 1 ? 's' : ''} en total
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-purple focus:ring-1 focus:ring-brand-purple"
        >
          <option value="">Todos los estados</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {state === 'loading' ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      ) : state === 'error' ? (
        <p className="text-red-600">Error al cargar los estudiantes.</p>
      ) : students.length === 0 ? (
        <p className="text-slate-600">No hay estudiantes con los filtros seleccionados.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Nombre</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Padre/Madre</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Grado</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Unidad</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Inscripción</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{student.full_name}</td>
                    <td className="px-4 py-3 text-slate-600">{student.parent_email ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{student.grade ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={student.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{student.franchise_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {student.enrollment_date
                        ? new Date(student.enrollment_date).toLocaleDateString('es-CO')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Página {page + 1} de {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-slate-100 text-slate-700',
    graduated: 'bg-blue-100 text-blue-700',
    transferred: 'bg-amber-100 text-amber-700',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? 'bg-slate-100 text-slate-700'}`}
    >
      {status}
    </span>
  );
}
