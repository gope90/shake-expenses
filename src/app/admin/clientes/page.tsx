'use client';

import { useState, useEffect } from 'react';
import { supabase, Client } from '@/lib/supabase';
import Link from 'next/link';

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('shake_admin_auth') !== 'true') {
      window.location.href = '/admin';
      return;
    }
    loadClients();
  }, []);

  async function loadClients() {
    setLoading(true);
    const { data } = await supabase.from('clients').select('*').order('name');
    if (data) setClients(data);
    setLoading(false);
  }

  async function addClient(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('clients').insert({ name: newName.trim() });
    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      setNewName('');
      loadClients();
    }
    setSaving(false);
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('clients').update({ active: !current }).eq('id', id);
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: !current } : c))
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="text-brand-500 hover:text-brand-700 text-sm">
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Gestionar clientes</h1>
      </div>

      {/* Add new */}
      <form onSubmit={addClient} className="flex gap-3 mb-6">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nombre del nuevo cliente"
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

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {clients.map((client) => (
            <div
              key={client.id}
              className={`flex items-center justify-between px-5 py-3 ${
                !client.active ? 'opacity-50' : ''
              }`}
            >
              <span className="text-sm text-gray-900">{client.name}</span>
              <button
                onClick={() => toggleActive(client.id, client.active)}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  client.active
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {client.active ? 'Activo' : 'Inactivo'}
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4 text-center">
        {clients.length} clientes en total &middot;{' '}
        {clients.filter((c) => c.active).length} activos
      </p>
    </div>
  );
}
