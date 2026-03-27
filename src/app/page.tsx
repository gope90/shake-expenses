'use client';

import { useState, useEffect } from 'react';
import { supabase, Division, Area, Client } from '@/lib/supabase';
import ExpenseRow, { ExpenseRowData, GroupedAreas } from '@/components/ExpenseRow';

function createEmptyRow(): ExpenseRowData {
  const today = new Date().toISOString().split('T')[0];
  return {
    tempId: crypto.randomUUID(),
    expense_date: today,
    provider: '',
    amount: '',
    currency: 'ARS',
    area_id: '',
    client_id: '',
    client_other: '',
    payment_method: 'corporate_card',
    description: '',
    files: [],
  };
}

export default function HomePage() {
  const [submittedBy, setSubmittedBy] = useState('');
  const [rows, setRows] = useState<ExpenseRowData[]>([createEmptyRow()]);
  const [groupedAreas, setGroupedAreas] = useState<GroupedAreas>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [knownNames, setKnownNames] = useState<string[]>([]);

  useEffect(() => {
    loadCatalogs();
    // Load remembered name
    const saved = localStorage.getItem('shake_expense_name');
    if (saved) setSubmittedBy(saved);
    // Load known names
    const names = JSON.parse(localStorage.getItem('shake_expense_known_names') || '[]');
    setKnownNames(names);
  }, []);

  async function loadCatalogs() {
    const [divisionsRes, areasRes, clientsRes] = await Promise.all([
      supabase.from('divisions').select('*').eq('active', true).order('sort_order'),
      supabase.from('areas').select('*').eq('active', true).order('sort_order'),
      supabase.from('clients').select('*').eq('active', true).order('name'),
    ]);

    if (divisionsRes.data && areasRes.data) {
      const grouped: GroupedAreas = divisionsRes.data.map((div: Division) => ({
        division: div,
        areas: areasRes.data!.filter((a: Area) => a.division_id === div.id),
      }));
      setGroupedAreas(grouped);
    }

    if (clientsRes.data) {
      setClients(clientsRes.data);
    }
  }

  function handleRowChange(index: number, field: string, value: any) {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function addRow() {
    setRows((prev) => [...prev, createEmptyRow()]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function duplicateRow(index: number) {
    setRows((prev) => {
      const source = prev[index];
      const duplicate: ExpenseRowData = {
        ...source,
        tempId: crypto.randomUUID(),
        files: [],
      };
      const newRows = [...prev];
      newRows.splice(index + 1, 0, duplicate);
      return newRows;
    });
  }

  function validate(): string | null {
    if (!submittedBy.trim()) return 'Ingresá tu nombre';
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.expense_date) return `Gasto #${i + 1}: falta la fecha`;
      if (!r.provider.trim()) return `Gasto #${i + 1}: falta el proveedor`;
      if (!r.amount || parseFloat(r.amount) <= 0) return `Gasto #${i + 1}: falta el monto`;
      if (!r.area_id) return `Gasto #${i + 1}: falta el área`;
      if (!r.description.trim()) return `Gasto #${i + 1}: falta la descripción`;
      if (r.files.length === 0) return `Gasto #${i + 1}: falta el comprobante`;
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      // Calculate totals
      const totalArs = rows
        .filter((r) => r.currency === 'ARS')
        .reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);
      const totalUsd = rows
        .filter((r) => r.currency === 'USD')
        .reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);

      // Create submission
      const { data: submission, error: subError } = await supabase
        .from('expense_submissions')
        .insert({
          submitted_by: submittedBy.trim(),
          total_ars: totalArs,
          total_usd: totalUsd,
          item_count: rows.length,
        })
        .select()
        .single();

      if (subError) throw subError;

      // Create items and collect file URLs per row
      const rowFileUrls: string[][] = [];
      for (const row of rows) {
        const { data: item, error: itemError } = await supabase
          .from('expense_items')
          .insert({
            submission_id: submission.id,
            expense_date: row.expense_date,
            provider: row.provider.trim(),
            amount: parseFloat(row.amount),
            currency: row.currency,
            area_id: row.area_id,
            client_id: row.client_id || null,
            client_other: row.client_other || null,
            payment_method: row.payment_method,
            description: row.description.trim(),
          })
          .select()
          .single();

        if (itemError) throw itemError;

        // Upload files
        const urls: string[] = [];
        for (const file of row.files) {
          // Sanitize filename: remove accents, replace spaces & special chars
          const sanitized = file.name
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
            .replace(/[^a-zA-Z0-9._-]/g, '_') // replace special chars with underscore
            .replace(/_+/g, '_'); // collapse multiple underscores
          const filePath = `${submission.id}/${item.id}/${Date.now()}_${sanitized}`;
          const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          // Get public URL for this file
          const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(filePath);
          urls.push(urlData.publicUrl);

          await supabase.from('expense_attachments').insert({
            item_id: item.id,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
          });
        }
        rowFileUrls.push(urls);
      }

      // Sync to Google Sheets (best-effort, don't block submission)
      try {
        const paymentLabels: Record<string, string> = {
          corporate_card: 'Tarjeta corporativa',
          cash: 'Efectivo',
          personal_card: 'Tarjeta personal',
        };
        const sheetsPayload = rows.map((row, idx) => {
          // Resolve area name
          let areaName = '';
          let divisionName = '';
          for (const group of groupedAreas) {
            const found = group.areas.find((a) => a.id === row.area_id);
            if (found) {
              areaName = found.name;
              divisionName = group.division.name;
              break;
            }
          }
          // Resolve client name
          const client = clients.find((c) => c.id === row.client_id);
          return {
            submitted_by: submittedBy.trim(),
            submitted_at: new Date().toISOString(),
            expense_date: row.expense_date,
            provider: row.provider.trim(),
            amount: parseFloat(row.amount),
            currency: row.currency,
            division: divisionName,
            area: areaName,
            client: client?.name || row.client_other || '',
            payment_method: paymentLabels[row.payment_method] || row.payment_method,
            description: row.description.trim(),
            file_urls: rowFileUrls[idx] || [],
          };
        });
        fetch('/api/sync-sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: sheetsPayload }),
        }).catch(() => {}); // fire-and-forget
      } catch {}

      // Save name for future use
      localStorage.setItem('shake_expense_name', submittedBy.trim());
      const updatedNames = Array.from(new Set([...knownNames, submittedBy.trim()]));
      localStorage.setItem('shake_expense_known_names', JSON.stringify(updatedNames));
      setKnownNames(updatedNames);

      setSuccess(true);
      setRows([createEmptyRow()]);
    } catch (err: any) {
      setError(`Error al enviar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const totalArs = rows
    .filter((r) => r.currency === 'ARS')
    .reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);
  const totalUsd = rows
    .filter((r) => r.currency === 'USD')
    .reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Cargar gastos</h1>
        <p className="text-gray-500 mt-1">
          Cargá todos tus gastos del período y envialos juntos.
        </p>
      </div>

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
          <strong>Gastos enviados correctamente.</strong> Ya fueron registrados y están
          pendientes de aprobación. Podés ver el historial en la sección{' '}
          <a href="/historial" className="underline font-medium">Historial</a>.
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Nombre */}
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tu nombre *
          </label>
          <input
            type="text"
            value={submittedBy}
            onChange={(e) => setSubmittedBy(e.target.value)}
            placeholder="Nombre y apellido"
            list="known-names"
            className="w-full sm:w-80 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
            required
          />
          <datalist id="known-names">
            {knownNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>

        {/* Expense rows */}
        <div className="space-y-4 mb-6">
          {rows.map((row, i) => (
            <ExpenseRow
              key={row.tempId}
              index={i}
              data={row}
              groupedAreas={groupedAreas}
              clients={clients}
              onChange={handleRowChange}
              onRemove={removeRow}
              onDuplicate={duplicateRow}
              canRemove={rows.length > 1}
            />
          ))}
        </div>

        {/* Add row button */}
        <button
          type="button"
          onClick={addRow}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-brand-500 hover:text-brand-500 transition-colors mb-6"
        >
          + Agregar otro gasto
        </button>

        {/* Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Resumen</h3>
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-gray-500">Gastos:</span>{' '}
              <span className="font-semibold">{rows.length}</span>
            </div>
            {totalArs > 0 && (
              <div>
                <span className="text-gray-500">Total ARS:</span>{' '}
                <span className="font-semibold">
                  ${totalArs.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {totalUsd > 0 && (
              <div>
                <span className="text-gray-500">Total USD:</span>{' '}
                <span className="font-semibold">
                  US${totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Enviando...' : 'Enviar rendición de gastos'}
        </button>
      </form>
    </div>
  );
}
