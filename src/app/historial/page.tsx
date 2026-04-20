'use client';

import { useState, useEffect } from 'react';
import { supabase, ExpenseSubmission } from '@/lib/supabase';

type ItemWithDetails = {
  id: string;
  expense_date: string;
  provider: string;
  amount: number;
  currency: string;
  payment_method: string;
  description: string;
  areas: { name: string; divisions: { name: string } } | null;
  clients: { name: string } | null;
  expense_attachments: { id: string; file_name: string; file_path: string }[];
};

type SubmissionWithItems = ExpenseSubmission & {
  items?: ItemWithDetails[];
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Aprobado', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rechazado', color: 'bg-red-100 text-red-700' },
};

const PAYMENT_LABELS: Record<string, string> = {
  corporate_card: 'Tarjeta corporativa',
  cash: 'Efectivo',
  personal_card: 'Tarjeta personal',
};

export default function HistorialPage() {
  const [submissions, setSubmissions] = useState<SubmissionWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [userName, setUserName] = useState('');
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [teamNames, setTeamNames] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('shake_expense_name');
    if (saved) {
      setUserName(saved);
      setNameConfirmed(true);
    }
    supabase
      .from('team_members')
      .select('name')
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        if (data) setTeamNames(data.map((t: { name: string }) => t.name));
      });
  }, []);

  useEffect(() => {
    if (nameConfirmed && userName) {
      loadSubmissions();
    }
  }, [nameConfirmed, userName]);

  async function loadSubmissions() {
    setLoading(true);
    const { data } = await supabase
      .from('expense_submissions')
      .select('*')
      .ilike('submitted_by', userName.trim())
      .order('submitted_at', { ascending: false });

    if (data) setSubmissions(data);
    setLoading(false);
  }

  function handleConfirmName(e: React.FormEvent) {
    e.preventDefault();
    if (userName.trim()) {
      localStorage.setItem('shake_expense_name', userName.trim());
      setNameConfirmed(true);
    }
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
        .select(`
          *,
          areas ( name, divisions:division_id ( name ) ),
          clients ( name ),
          expense_attachments ( id, file_name, file_path )
        `)
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

  function getFileUrl(filePath: string) {
    const { data } = supabase.storage.from('receipts').getPublicUrl(filePath);
    return data.publicUrl;
  }

  const filtered = submissions.filter((s) => {
    if (filterStatus && s.status !== filterStatus) return false;
    return true;
  });

  // If no name confirmed yet, show name input
  if (!nameConfirmed) {
    return (
      <div className="max-w-md mx-auto mt-16">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Mis gastos
        </h1>
        <p className="text-gray-500 text-center mb-8">
          Ingresá tu nombre para ver tus rendiciones.
        </p>
        <form onSubmit={handleConfirmName} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tu nombre
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Nombre y apellido"
            list="team-names-historial"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none mb-4"
            required
            autoComplete="off"
          />
          <datalist id="team-names-historial">
            {teamNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <button
            type="submit"
            className="w-full py-2.5 bg-brand-500 text-white font-semibold rounded-lg hover:bg-brand-600 transition-colors text-sm"
          >
            Ver mis gastos
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mis gastos</h1>
            <p className="text-gray-500 mt-1">
              Rendiciones de <strong>{userName}</strong>.{' '}
              <button
                onClick={() => { setNameConfirmed(false); setSubmissions([]); }}
                className="text-brand-500 hover:text-brand-700 underline"
              >
                Cambiar
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none bg-white"
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobado</option>
          <option value="rejected">Rechazado</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No tenés rendiciones registradas con este nombre.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => {
            const status = STATUS_LABELS[sub.status] || STATUS_LABELS.pending;
            const isExpanded = expandedId === sub.id;

            return (
              <div
                key={sub.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => toggleExpand(sub.id)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-gray-400">
                        {new Date(sub.submitted_at).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {sub.item_count} gasto{sub.item_count !== 1 ? 's' : ''}
                      </p>
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
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                    <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isExpanded && sub.items && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                    {sub.notes && (
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                        <strong>Nota del revisor:</strong> {sub.notes}
                      </div>
                    )}
                    <div className="space-y-3">
                      {sub.items.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white rounded-lg border border-gray-200 p-4"
                        >
                          <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {item.provider}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(item.expense_date + 'T00:00:00').toLocaleDateString('es-AR')} &middot;{' '}
                                {item.areas
                                  ? `${(item.areas as any).divisions?.name} → ${item.areas.name}`
                                  : 'Sin área'}{' '}
                                &middot; {PAYMENT_LABELS[item.payment_method]}
                              </p>
                              {item.clients && (
                                <p className="text-xs text-gray-400">
                                  Cliente: {item.clients.name}
                                </p>
                              )}
                            </div>
                            <p className="text-sm font-semibold">
                              {item.currency === 'ARS' ? '$' : 'US$'}
                              {Number(item.amount).toLocaleString(
                                item.currency === 'ARS' ? 'es-AR' : 'en-US',
                                { minimumFractionDigits: 2 }
                              )}{' '}
                              <span className="text-xs font-normal text-gray-400">
                                {item.currency}
                              </span>
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
