'use client';

import { useState, useEffect } from 'react';
import { supabase, ExpenseSubmission } from '@/lib/supabase';
import { useAdminGuard, adminSignOut } from '@/lib/adminGuard';
import Link from 'next/link';
import * as XLSX from 'xlsx';

type ItemSummary = {
  id: string;
  expense_date: string;
  provider: string;
  amount: number;
  currency: string;
  description: string;
  payment_method: string;
  areas: { name: string; divisions: { name: string } } | null;
  clients: { name: string } | null;
  expense_attachments: { id: string; file_name: string; file_path: string }[];
};

type SubmissionFull = ExpenseSubmission & { items?: ItemSummary[] };

const PAYMENT_LABELS: Record<string, string> = {
  corporate_card: 'Tarjeta corporativa',
  cash: 'Efectivo',
  personal_card: 'Tarjeta personal',
};

export default function AdminPage() {
  const { admin, loading: authLoading, rejected } = useAdminGuard(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  // Change password modal
  const [showChangePw, setShowChangePw] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [newPwConfirm, setNewPwConfirm] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  // Panel state
  const [submissions, setSubmissions] = useState<SubmissionFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (admin) loadSubmissions();
  }, [admin]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    setLoginBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim().toLowerCase(),
      password: loginPassword,
    });
    setLoginBusy(false);
    if (error) {
      setLoginError(error.message === 'Invalid login credentials' ? 'Email o clave incorrectos.' : error.message);
    } else {
      setLoginPassword('');
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 8) {
      alert('La clave nueva tiene que tener al menos 8 caracteres.');
      return;
    }
    if (newPw !== newPwConfirm) {
      alert('Las claves no coinciden.');
      return;
    }
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwBusy(false);
    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      alert('Clave actualizada correctamente.');
      setShowChangePw(false);
      setNewPw('');
      setNewPwConfirm('');
    }
  }

  async function loadSubmissions() {
    setLoading(true);
    const { data } = await supabase
      .from('expense_submissions')
      .select('*')
      .order('submitted_at', { ascending: false });
    if (data) setSubmissions(data);
    setLoading(false);
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    const sub = submissions.find((s) => s.id === id);
    if (sub && !sub.items) {
      const { data: items } = await supabase
        .from('expense_items')
        .select(
          `*, areas ( name, divisions:division_id ( name ) ), clients ( name ), expense_attachments ( id, file_name, file_path )`
        )
        .eq('submission_id', id)
        .order('expense_date');
      if (items) {
        setSubmissions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, items: items as any } : s))
        );
      }
    }
    setExpandedId(id);
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    if (!admin) return;
    setActionLoading(id);
    const reviewNotes =
      status === 'rejected' ? prompt('Motivo del rechazo (opcional):') || '' : '';
    const reviewer = admin.email;

    const { error } = await supabase
      .from('expense_submissions')
      .update({
        status,
        reviewed_by: reviewer,
        reviewed_at: new Date().toISOString(),
        notes: reviewNotes || null,
      })
      .eq('id', id);

    if (!error) {
      const sub = submissions.find((s) => s.id === id);
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                status,
                reviewed_by: reviewer,
                reviewed_at: new Date().toISOString(),
                notes: reviewNotes || null,
              }
            : s
        )
      );
      if (sub) {
        fetch('/api/sync-sheets-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submitted_by: sub.submitted_by,
            submitted_at: sub.submitted_at,
            new_status: status === 'approved' ? 'Aprobado' : 'Rechazado',
          }),
        }).catch(() => {});
      }
    } else {
      alert(`Error: ${error.message}`);
    }
    setActionLoading(null);
  }

  function getFileUrl(filePath: string) {
    const { data } = supabase.storage.from('receipts').getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function exportToExcel() {
    const { data: items } = await supabase
      .from('expense_items')
      .select(
        `*, expense_submissions!inner ( submitted_by, submitted_at, status ), areas ( name, divisions:division_id ( name ) ), clients ( name )`
      )
      .order('expense_date', { ascending: false });

    if (!items || items.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const rows = items.map((item: any) => ({
      'Fecha gasto': item.expense_date,
      'Enviado por': item.expense_submissions?.submitted_by || '',
      'Fecha envío': item.expense_submissions?.submitted_at
        ? new Date(item.expense_submissions.submitted_at).toLocaleDateString('es-AR')
        : '',
      Estado:
        item.expense_submissions?.status === 'approved'
          ? 'Aprobado'
          : item.expense_submissions?.status === 'rejected'
          ? 'Rechazado'
          : 'Pendiente',
      Proveedor: item.provider,
      Monto: Number(item.amount),
      Moneda: item.currency,
      División: item.areas?.divisions?.name || '',
      Área: item.areas?.name || '',
      Cliente: item.clients?.name || '',
      'Medio de pago': PAYMENT_LABELS[item.payment_method] || item.payment_method,
      Descripción: item.description,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos');
    const colWidths = Object.keys(rows[0]).map((key) => ({
      wch:
        Math.max(
          key.length,
          ...rows.map((r: any) => String(r[key] || '').length)
        )
          .toString().length + 4,
    }));
    ws['!cols'] = colWidths;

    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `gastos-shake-${today}.xlsx`);
  }

  // Loading inicial
  if (authLoading) {
    return <div className="text-center py-20 text-gray-400">Cargando...</div>;
  }

  // No logueado: mostrar login
  if (!admin && !rejected) {
    return (
      <div className="max-w-sm mx-auto mt-20">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Panel de administración
        </h1>
        <form
          onSubmit={handleLogin}
          className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input
            type="email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none mb-4"
            placeholder="nombre@shakeagain.com"
            autoComplete="email"
            required
          />
          <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
          <input
            type="password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none mb-4"
            placeholder="Tu contraseña"
            autoComplete="current-password"
            required
          />
          {loginError && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
              {loginError}
            </div>
          )}
          <button
            type="submit"
            disabled={loginBusy}
            className="w-full py-2.5 bg-brand-500 text-white font-semibold rounded-lg hover:bg-brand-600 transition-colors text-sm disabled:opacity-50"
          >
            {loginBusy ? 'Ingresando...' : 'Ingresar'}
          </button>
          <p className="text-xs text-gray-400 mt-3 text-center">
            Si es tu primera vez, usá la contraseña temporal que te pasaron. Luego podés cambiarla desde el panel.
          </p>
        </form>
      </div>
    );
  }

  // Logueado pero no es admin
  if (rejected) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-4">No tenés permisos de administrador</h1>
        <p className="text-sm text-gray-500 mb-6">
          Tu cuenta está autenticada pero no figura en la lista de administradores. Contactá a Shake Again si creés que es un error.
        </p>
        <button
          onClick={adminSignOut}
          className="px-4 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  const pendingCount = submissions.filter((s) => s.status === 'pending').length;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-wrap justify-between items-start mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de administración</h1>
          <p className="text-gray-500 mt-1">
            Aprobá o rechazá rendiciones de gastos.{' '}
            {admin && (
              <>
                Conectado como <strong>{admin.name}</strong> ({admin.email}).
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportToExcel}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Exportar a Excel
          </button>
          <Link href="/admin/clientes" className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Clientes
          </Link>
          <Link href="/admin/areas" className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Áreas
          </Link>
          <Link href="/admin/equipo" className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Equipo
          </Link>
          <Link href="/admin/auditoria" className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Auditoría
          </Link>
          <button
            onClick={() => setShowChangePw(true)}
            className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cambiar clave
          </button>
          <button
            onClick={adminSignOut}
            className="px-4 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            Salir
          </button>
        </div>
      </div>

      {showChangePw && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form
            onSubmit={handleChangePassword}
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm"
          >
            <h3 className="text-lg font-semibold mb-4">Cambiar contraseña</h3>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-3"
              minLength={8}
              required
              autoFocus
            />
            <label className="block text-sm font-medium text-gray-700 mb-1">Repetí la contraseña</label>
            <input
              type="password"
              value={newPwConfirm}
              onChange={(e) => setNewPwConfirm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-4"
              minLength={8}
              required
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowChangePw(false);
                  setNewPw('');
                  setNewPwConfirm('');
                }}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pwBusy}
                className="px-4 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
              >
                {pwBusy ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
          <p className="text-xs text-yellow-600">Pendientes</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-700">
            {submissions.filter((s) => s.status === 'approved').length}
          </p>
          <p className="text-xs text-green-600">Aprobadas</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-700">
            {submissions.filter((s) => s.status === 'rejected').length}
          </p>
          <p className="text-xs text-red-600">Rechazadas</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => {
            const isExpanded = expandedId === sub.id;
            const isPending = sub.status === 'pending';

            return (
              <div
                key={sub.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                  isPending ? 'border-yellow-200' : 'border-gray-200'
                }`}
              >
                <button
                  onClick={() => toggleExpand(sub.id)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{sub.submitted_by}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(sub.submitted_at).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      &middot; {sub.item_count} gasto{sub.item_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {sub.total_ars > 0 && (
                        <p className="text-sm font-medium">
                          ${Number(sub.total_ars).toLocaleString('es-AR', { minimumFractionDigits: 2 })} ARS
                        </p>
                      )}
                      {sub.total_usd > 0 && (
                        <p className="text-sm font-medium">
                          US${Number(sub.total_usd).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        sub.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : sub.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {sub.status === 'pending'
                        ? 'Pendiente'
                        : sub.status === 'approved'
                        ? 'Aprobado'
                        : 'Rechazado'}
                    </span>
                    <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isExpanded && sub.items && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                    {sub.notes && (
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                        <strong>Nota:</strong> {sub.notes}
                      </div>
                    )}
                    <div className="space-y-3 mb-4">
                      {sub.items.map((item) => (
                        <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-4">
                          <div className="flex flex-wrap justify-between items-start gap-2 mb-1">
                            <div>
                              <p className="text-sm font-medium">{item.provider}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(item.expense_date + 'T00:00:00').toLocaleDateString('es-AR')} &middot;{' '}
                                {item.areas
                                  ? `${(item.areas as any).divisions?.name} → ${item.areas.name}`
                                  : '-'}{' '}
                                &middot; {PAYMENT_LABELS[item.payment_method]}
                                {item.clients && <> &middot; {item.clients.name}</>}
                              </p>
                            </div>
                            <p className="text-sm font-semibold">
                              {item.currency === 'ARS' ? '$' : 'US$'}
                              {Number(item.amount).toLocaleString(
                                item.currency === 'ARS' ? 'es-AR' : 'en-US',
                                { minimumFractionDigits: 2 }
                              )}{' '}
                              {item.currency}
                            </p>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                          {item.expense_attachments?.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {item.expense_attachments.map((att) => (
                                <a
                                  key={att.id}
                                  href={getFileUrl(att.file_path)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-brand-500 hover:text-brand-700 underline"
                                >
                                  {att.file_name}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {isPending && (
                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={() => updateStatus(sub.id, 'rejected')}
                          disabled={actionLoading === sub.id}
                          className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          Rechazar
                        </button>
                        <button
                          onClick={() => updateStatus(sub.id, 'approved')}
                          disabled={actionLoading === sub.id}
                          className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          Aprobar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
