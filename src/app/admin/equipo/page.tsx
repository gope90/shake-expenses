'use client';

import { useState, useEffect } from 'react';
import { supabase, TeamMember } from '@/lib/supabase';
import { useAdminGuard } from '@/lib/adminGuard';
import Link from 'next/link';

function formatStamp(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EquipoPage() {
  const { admin, loading: authLoading } = useAdminGuard();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const adminActor = admin?.email || '';

  useEffect(() => {
    if (admin) loadMembers();
  }, [admin]);

  async function loadMembers() {
    setLoading(true);
    const { data } = await supabase
      .from('team_members')
      .select('*')
      .order('name');
    if (data) setMembers(data);
    setLoading(false);
  }

  function humanizeError(message: string): string {
    if (/duplicate key|unique/i.test(message)) {
      return 'Ya existe un miembro con ese email.';
    }
    return message;
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('team_members').insert({
      name: newName.trim(),
      email: newEmail.trim() || null,
      last_modified_by: adminActor,
    });
    if (error) {
      alert(`Error: ${humanizeError(error.message)}`);
    } else {
      setNewName('');
      setNewEmail('');
      loadMembers();
    }
    setSaving(false);
  }

  async function renameMember(id: string) {
    const newTrimmed = editingName.trim();
    if (!newTrimmed) return;
    const current = members.find((m) => m.id === id);
    if (!current) return;
    if (newTrimmed === current.name) {
      setEditingId(null);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('team_members')
      .update({ name: newTrimmed, last_modified_by: adminActor })
      .eq('id', id);
    setSaving(false);
    if (error) {
      alert(`Error: ${humanizeError(error.message)}`);
    } else {
      setEditingId(null);
      setEditingName('');
      loadMembers();
    }
  }

  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase
      .from('team_members')
      .update({ active: !current, last_modified_by: adminActor })
      .eq('id', id);
    if (error) {
      alert(`Error: ${humanizeError(error.message)}`);
    } else {
      loadMembers();
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="text-brand-500 hover:text-brand-700 text-sm">
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Equipo</h1>
        {admin && (
          <span className="ml-auto text-xs text-gray-400">Conectado como {admin.name}</span>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Los nombres cargados acá aparecen como sugerencia cuando alguien ingresa su nombre al cargar un gasto.
      </p>

      <form onSubmit={addMember} className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nombre y apellido"
          className="flex-1 min-w-[200px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
        />
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="Email (opcional)"
          className="flex-1 min-w-[200px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
        />
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
        >
          Agregar
        </button>
      </form>

      {authLoading || loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : members.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          Todavía no hay miembros cargados.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {members.map((m) => (
            <div
              key={m.id}
              className={`flex items-center justify-between px-5 py-3 gap-3 ${
                !m.active ? 'opacity-50' : ''
              }`}
            >
              {editingId === m.id ? (
                <div className="flex gap-2 flex-1">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') renameMember(m.id);
                      if (e.key === 'Escape') {
                        setEditingId(null);
                        setEditingName('');
                      }
                    }}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                  />
                  <button
                    onClick={() => renameMember(m.id)}
                    disabled={saving}
                    className="px-3 py-1.5 text-xs bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setEditingName('');
                    }}
                    className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{m.name}</p>
                    {m.email && <p className="text-xs text-gray-400">{m.email}</p>}
                    {(m.last_modified_by || m.updated_at) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {m.last_modified_by && (
                          <>Editado por <span className="font-medium text-gray-500">{m.last_modified_by}</span></>
                        )}
                        {m.updated_at && <> · {formatStamp(m.updated_at)}</>}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingId(m.id);
                        setEditingName(m.name);
                      }}
                      className="text-xs text-brand-500 hover:text-brand-700"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => toggleActive(m.id, m.active)}
                      className={`text-xs px-3 py-1 rounded-full transition-colors ${
                        m.active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {m.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4 text-center">
        {members.length} miembro{members.length !== 1 ? 's' : ''} · {members.filter((m) => m.active).length} activos
      </p>
    </div>
  );
}
