'use client';

import { useState, useEffect } from 'react';
import { supabase, Division, Area } from '@/lib/supabase';
import Link from 'next/link';

type DivisionWithAreas = Division & { areas: Area[] };

export default function AreasPage() {
  const [divisions, setDivisions] = useState<DivisionWithAreas[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDivision, setNewDivision] = useState('');
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaDivision, setNewAreaDivision] = useState('');

  useEffect(() => {
    if (localStorage.getItem('shake_admin_auth') !== 'true') {
      window.location.href = '/admin';
      return;
    }
    loadData();
  }, []);

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

  async function addDivision(e: React.FormEvent) {
    e.preventDefault();
    if (!newDivision.trim()) return;
    const maxOrder = Math.max(...divisions.map((d) => d.sort_order), 0);
    const { error } = await supabase
      .from('divisions')
      .insert({ name: newDivision.trim(), sort_order: maxOrder + 1 });
    if (error) alert(`Error: ${error.message}`);
    else {
      setNewDivision('');
      loadData();
    }
  }

  async function addArea(e: React.FormEvent) {
    e.preventDefault();
    if (!newAreaName.trim() || !newAreaDivision) return;
    const div = divisions.find((d) => d.id === newAreaDivision);
    const maxOrder = div ? Math.max(...div.areas.map((a) => a.sort_order), 0) : 0;
    const { error } = await supabase
      .from('areas')
      .insert({ name: newAreaName.trim(), division_id: newAreaDivision, sort_order: maxOrder + 1 });
    if (error) alert(`Error: ${error.message}`);
    else {
      setNewAreaName('');
      loadData();
    }
  }

  async function toggleAreaActive(id: string, current: boolean) {
    await supabase.from('areas').update({ active: !current }).eq('id', id);
    loadData();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="text-brand-500 hover:text-brand-700 text-sm">
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Gestionar áreas</h1>
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
          <button type="submit" className="px-5 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors">
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
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <input
            type="text"
            value={newAreaName}
            onChange={(e) => setNewAreaName(e.target.value)}
            placeholder="Nombre del área"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
          />
          <button type="submit" className="px-5 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors">
            Agregar
          </button>
        </form>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : (
        <div className="space-y-6">
          {divisions.map((div) => (
            <div key={div.id}>
              <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                {div.name}
              </h3>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
                {div.areas.length === 0 ? (
                  <p className="px-5 py-3 text-sm text-gray-400">Sin áreas</p>
                ) : (
                  div.areas.map((area) => (
                    <div
                      key={area.id}
                      className={`flex items-center justify-between px-5 py-3 ${!area.active ? 'opacity-50' : ''}`}
                    >
                      <span className="text-sm text-gray-900">{area.name}</span>
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
