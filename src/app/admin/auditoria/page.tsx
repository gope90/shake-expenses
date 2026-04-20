'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase, AuditLogEntry } from '@/lib/supabase';
import { useAdminGuard } from '@/lib/adminGuard';
import Link from 'next/link';

const TABLE_LABELS: Record<string, string> = {
  divisions: 'División',
  areas: 'Área',
  clients: 'Cliente',
  team_members: 'Equipo',
};

const ACTION_LABELS: Record<string, string> = {
  INSERT: 'Creó',
  UPDATE: 'Modificó',
  DELETE: 'Eliminó',
};

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
};

function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderValue(v: any): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nombre',
  active: 'Activo',
  sort_order: 'Orden',
  division_id: 'División',
  last_modified_by: 'Modificado por',
  updated_at: 'Modificado en',
};

function humanField(f: string): string {
  return FIELD_LABELS[f] || f;
}

export default function AuditoriaPage() {
  const { admin, loading: authLoading } = useAdminGuard();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTable, setFilterTable] = useState<string>('');
  const [filterActor, setFilterActor] = useState<string>('');
  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (admin) loadData();
  }, [admin]);

  async function loadData() {
    setLoading(true);
    const [logRes, divRes, areaRes, clientRes, teamRes] = await Promise.all([
      supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase.from('divisions').select('id, name'),
      supabase.from('areas').select('id, name'),
      supabase.from('clients').select('id, name'),
      supabase.from('team_members').select('id, name'),
    ]);

    if (logRes.data) setEntries(logRes.data as AuditLogEntry[]);

    const map: Record<string, string> = {};
    for (const d of divRes.data || []) map[d.id] = d.name;
    for (const a of areaRes.data || []) map[a.id] = a.name;
    for (const c of clientRes.data || []) map[c.id] = c.name;
    for (const t of teamRes.data || []) map[t.id] = t.name;
    setNameMap(map);

    setLoading(false);
  }

  const actors = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (e.actor) set.add(e.actor);
    });
    return Array.from(set).sort();
  }, [entries]);

  const filtered = entries.filter((e) => {
    if (filterTable && e.table_name !== filterTable) return false;
    if (filterActor && e.actor !== filterActor) return false;
    return true;
  });

  function labelForRow(e: AuditLogEntry): string {
    if (nameMap[e.row_id]) return nameMap[e.row_id];
    // Si fue borrado, intentar leerlo de changes.before.name
    const before = e.changes?.before as Record<string, any> | undefined;
    if (before?.name) return `${before.name} (borrado)`;
    const after = e.changes?.after as Record<string, any> | undefined;
    if (after?.name) return after.name;
    return e.row_id.slice(0, 8);
  }

  function renderChange(e: AuditLogEntry) {
    if (e.action === 'INSERT') {
      const after = (e.changes?.after || {}) as Record<string, any>;
      const fields = ['name', 'active', 'sort_order']
        .filter((f) => after[f] !== undefined)
        .map((f) => `${humanField(f)}: ${renderValue(after[f])}`);
      return <span className="text-gray-600">{fields.join(' · ')}</span>;
    }
    if (e.action === 'DELETE') {
      const before = (e.changes?.before || {}) as Record<string, any>;
      return <span className="text-gray-600">Nombre previo: {renderValue(before.name)}</span>;
    }
    // UPDATE: render diff
    const diff = (e.changes?.diff || {}) as Record<string, { from: any; to: any }>;
    const keys = Object.keys(diff).filter((k) => k !== 'last_modified_by');
    if (keys.length === 0) {
      return <span className="text-gray-400 italic">Solo cambió el autor</span>;
    }
    return (
      <ul className="space-y-0.5">
        {keys.map((k) => (
          <li key={k} className="text-gray-600">
            <span className="font-medium text-gray-700">{humanField(k)}:</span>{' '}
            <span className="text-red-600 line-through">{renderValue(diff[k].from)}</span>{' '}
            →{' '}
            <span className="text-green-700">{renderValue(diff[k].to)}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="text-brand-500 hover:text-brand-700 text-sm">
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Historial de cambios</h1>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Registro automático de cada creación, modificación y baja en divisiones, áreas y clientes.
      </p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterTable}
          onChange={(e) => setFilterTable(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none bg-white"
        >
          <option value="">Todos los tipos</option>
          <option value="divisions">Divisiones</option>
          <option value="areas">Áreas</option>
          <option value="clients">Clientes</option>
          <option value="team_members">Equipo</option>
        </select>
        <select
          value={filterActor}
          onChange={(e) => setFilterActor(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none bg-white"
        >
          <option value="">Todos los usuarios</option>
          {actors.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <button
          onClick={loadData}
          className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Refrescar
        </button>
      </div>

      {authLoading || loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No hay registros que coincidan con los filtros.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <div
              key={e.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      ACTION_COLORS[e.action] || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {ACTION_LABELS[e.action] || e.action}
                  </span>
                  <span className="text-xs text-gray-400">
                    {TABLE_LABELS[e.table_name] || e.table_name}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {labelForRow(e)}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  <span className="font-medium text-gray-600">{e.actor || 'sistema'}</span>{' '}
                  · {formatStamp(e.created_at)}
                </div>
              </div>
              <div className="text-sm">{renderChange(e)}</div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-6 text-center">
        Mostrando hasta los últimos 500 cambios.
      </p>
    </div>
  );
}
