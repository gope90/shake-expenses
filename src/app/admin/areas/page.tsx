'use client';

import { useState, useEffect } from 'react';
import { supabase, Division, Area } from '@/lib/supabase';
import { useAdminGuard } from '@/lib/adminGuard';
import Link from 'next/link';

type DivisionWithAreas = Division & { areas: Area[] };

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

function LastEdited({ by, at }: { by?: string | null; at?: string | null }) {
  if (!by && !at) return null;
  return (
    <p className="text-xs text-gray-400 mt-0.5">
      {by ? <>Editado por <span className="font-medium text-gray-500">{by}</span></> : 'Editado'}
      {at && <> · {formatStamp(at)}</>}
    </p>
  );
}

export default function AreasPage() {
  const { admin, loading: authLoading } = useAdminGuard();
  const [divisions, setDivisions] = useState<DivisionWithAreas[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDivision, setNewDivision] = useState('');
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaDivision, setNewAreaDivision] = useState('');
  const [editingDivisionId, setEditingDivisionId] = useState<string | null>(null);
  const [editingDivisionName, setEditingDivisionName] = useState('');
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editingAreaName, setEditingAreaName] = useState('');
  const [saving, setSaving] = useState(false);

  const adminActor = admin?.email || '';

  useEffect(() => {
    if (admin) loadData();
  }, [admin]);

  async function loadData() {
    setLoading(true);
    const [divRes, areaRes] = await Promise.all([
      supabase.from('divisions').select('*').order('sort_order'),
      supabase.from('areas').select('*').order('sort_order'),
    ]);
    if (divRes.data && areaRes.data) {
      const grouped = divRes.data.map((div) => ({
        ...div,
        areas: areaRes.data!.filter((a) => a.division_id === div.id),
      }));
      setDivisions(grouped);
      if (divRes.data.length > 0 && !newAreaDivision) {
        setNewAreaDivision(divRes.data[0].id);
      }
    }
    setLoading(false);
  }

  function humanizeError(message: string): string {
    if (/duplicate key|unique/i.test(message)) {
      return 'Ya existe un registro con ese nombre. Probá con otro.';
    }
    return message;
  }

  async function addDivision(e: React.FormEvent) {
    e.preventDefault();
    if (!newDivision.trim()) return;
    setSaving(true);
    const maxOrder = Math.max(0, ...divisions.map((d) => d.sort_order));
    const { error } = await supabase
      .from('divisions')
      .insert({
        name: newDivision.trim(),
        sort_order: maxOrder + 1,
        last_modified_by: adminActor,
      });
    setSaving(false);
    if (error) {
      alert(`Error: ${humanizeError(error.message)}`);
    } else {
      setNewDivision('');
      loadData();
    }
  }

  async function renameDivision(id: string) {
    const newName = editingDivisionName.trim();
    if (!newName) return;
    const current = divisions.find((d) => d.id === id);
    if (!current) return;
    if (newName === current.name) {
      setEditingDivisionId(null);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('divisions')
      .update({ name: newName, last_modified_by: adminActor })
      .eq('id', id);
    setSaving(false);
    if (error) {
      alert(`Error: ${humanizeError(error.message)}`);
    } else {
      setEditingDivisionId(null);
      setEditingDivisionName('');
      loadData();
    }
  }

  async function toggleDivisionActive(id: string, current: boolean) {
    const { error } = await supabase
      .from('divisions')
      .update({ active: !current, last_modified_by: adminActor })
      .eq('id', id);
    if (error) {
      alert(`Error: ${humanizeError(error.message)}`);
    } else {
      loadData();
    }
  }

  async function addArea(e: React.FormEvent) {
    e.preventDefault();
    if (!newAreaName.trim() || !newAreaDivision) return;
    const div = divisions.find((d) => d.id === newAreaDivision);
    const maxOrder = div ? Math.max(0, ...div.areas.map((a) => a.sort_order)) : 0;
    setSaving(true);
    const { error } = await supabase
      .from('areas')
      .insert({
        name: newAreaName.trim(),
        division_id: newAreaDivision,
        sort_order: maxOrder + 1,
        last_modified_by: adminActor,
      });
    setSaving(false);
    if (error) {
      alert(`Error: ${humanizeError(error.message)}`);
    } else {
      setNewAreaName('');
      loadData();
    }
  }

  async function renameArea(id: string) {
    const newName = editingAreaName.trim();
    if (!newName) return;
    const currentArea = divisions.flatMap((d) => d.areas).find((a) => a.id === id);
    if (!currentArea) return;
    if (newName === currentArea.name) {
      setEditingAreaId(null);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('areas')
      .update({ name: newName, last_modified_by: adminActor })
      .eq('id', id);
    setSaving(false);
    if (error) {
      alert(`Error: ${humanizeError(error.message)}`);
    } else {
      setEditingAreaId(null);
      setEditingAreaName('');
      loadData();
    }
  }

  async function toggleAreaActive(id: string, current: boolean) {
    const { error } = await supabase
      .from('areas')
      .update({ active: !current, last_modified_by: adminActor })
      .eq('id', id);
    if (error) {
      alert(`Error: ${humanizeError(error.message)}`);
    } else {
      loadData();
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="text-brand-500 hover:text-brand-700 text-sm">
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Gestionar áreas</h1>
        {admin && (
          <span className="ml-auto text-xs text-gray-400">Conectado como {admin.name}</span>
        )}
      </div>

      {/* Add division */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Nueva división</h3>
        <form onSubmit={addDivision} className="flex gap-3">
          <input
            type="text"
            value={newDivision}
            onChange={(e) => setNewDivision(e.target.value)}
            placeholder="Nombre de la división"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
          />
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            Agregar
          </button>
        </form>
      </div>

      {/* Add area */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-8">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Nueva área</h3>
        <form onSubmit={addArea} className="flex gap-3">
          <select
            value={newAreaDivision}
            onChange={(e) => setNewAreaDivision(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none bg-white"
          >
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newAreaName}
            onChange={(e) => setNewAreaName(e.target.value)}
            placeholder="Nombre del área"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
          />
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            Agregar
          </button>
        </form>
      </div>

      {authLoading || loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : (
        <div className="space-y-6">
          {divisions.map((div) => (
            <div key={div.id}>
              <div className="flex items-center justify-between mb-2">
                {editingDivisionId === div.id ? (
                  <div className="flex gap-2 flex-1">
                    <input
                      type="text"
                      value={editingDivisionName}
                      onChange={(e) => setEditingDivisionName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') renameDivision(div.id);
                        if (e.key === 'Escape') {
                          setEditingDivisionId(null);
                          setEditingDivisionName('');
                        }
                      }}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                    />
                    <button
                      onClick={() => renameDivision(div.id)}
                      disabled={saving}
                      className="px-3 py-1.5 text-xs bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => {
                        setEditingDivisionId(null);
                        setEditingDivisionName('');
                      }}
                      className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <span className={!div.active ? 'line-through opacity-60' : ''}>{div.name}</span>
                      <button
                        onClick={() => {
                          setEditingDivisionId(div.id);
                          setEditingDivisionName(div.name);
                        }}
                        className="text-xs text-brand-500 hover:text-brand-700 normal-case font-normal tracking-normal"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleDivisionActive(div.id, div.active)}
                        className={`text-xs px-2 py-0.5 rounded-full normal-case font-normal tracking-normal ${
                          div.active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {div.active ? 'Activo' : 'Inactivo'}
                      </button>
                    </h3>
                    <LastEdited by={div.last_modified_by} at={div.updated_at} />
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
                {div.areas.length === 0 ? (
                  <p className="px-5 py-3 text-sm text-gray-400">Sin áreas</p>
                ) : (
                  div.areas.map((area) => (
                    <div
                      key={area.id}
                      className={`flex items-center justify-between px-5 py-3 ${!area.active ? 'opacity-50' : ''}`}
                    >
                      {editingAreaId === area.id ? (
                        <div className="flex gap-2 flex-1">
                          <input
                            type="text"
                            value={editingAreaName}
                            onChange={(e) => setEditingAreaName(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') renameArea(area.id);
                              if (e.key === 'Escape') {
                                setEditingAreaId(null);
                                setEditingAreaName('');
                              }
                            }}
                            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                          />
                          <button
                            onClick={() => renameArea(area.id)}
                            disabled={saving}
                            className="px-3 py-1.5 text-xs bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => {
                              setEditingAreaId(null);
                              setEditingAreaName('');
                            }}
                            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-gray-900">{area.name}</span>
                            <LastEdited by={area.last_modified_by} at={area.updated_at} />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingAreaId(area.id);
                                setEditingAreaName(area.name);
                              }}
                              className="text-xs text-brand-500 hover:text-brand-700"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => toggleAreaActive(area.id, area.active)}
                              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                                area.active
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              {area.active ? 'Activo' : 'Inactivo'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
