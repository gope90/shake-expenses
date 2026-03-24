'use client';

import { Area, Client, Division } from '@/lib/supabase';

type GroupedAreas = {
  division: Division;
  areas: Area[];
}[];

type ExpenseRowData = {
  tempId: string;
  expense_date: string;
  provider: string;
  amount: string;
  currency: 'ARS' | 'USD';
  area_id: string;
  client_id: string;
  client_other: string;
  payment_method: 'corporate_card' | 'cash' | 'personal_card';
  description: string;
  files: File[];
};

type Props = {
  index: number;
  data: ExpenseRowData;
  groupedAreas: GroupedAreas;
  clients: Client[];
  onChange: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
  canRemove: boolean;
};

export default function ExpenseRow({
  index,
  data,
  groupedAreas,
  clients,
  onChange,
  onRemove,
  onDuplicate,
  canRemove,
}: Props) {
  const selectedClientName = clients.find((c) => c.id === data.client_id)?.name;
  const showClientOther = selectedClientName === 'Potencial cliente';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-500">
          Gasto #{index + 1}
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onDuplicate(index)}
            className="text-xs text-brand-500 hover:text-brand-700 transition-colors"
            title="Duplicar gasto"
          >
            Duplicar
          </button>
          {canRemove && (
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Fecha */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Fecha *
          </label>
          <input
            type="date"
            value={data.expense_date}
            onChange={(e) => onChange(index, 'expense_date', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
            required
          />
        </div>

        {/* Proveedor */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Proveedor *
          </label>
          <input
            type="text"
            value={data.provider}
            onChange={(e) => onChange(index, 'provider', e.target.value)}
            placeholder="Nombre del proveedor"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
            required
          />
        </div>

        {/* Monto + Moneda */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Monto *
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={data.amount}
              onChange={(e) => onChange(index, 'amount', e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
              required
            />
            <select
              value={data.currency}
              onChange={(e) => onChange(index, 'currency', e.target.value)}
              className="w-20 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none bg-white"
            >
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        {/* Área */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Área *
          </label>
          <select
            value={data.area_id}
            onChange={(e) => onChange(index, 'area_id', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none bg-white"
            required
          >
            <option value="">Seleccionar área</option>
            {groupedAreas.map((group) => (
              <optgroup key={group.division.id} label={group.division.name}>
                {group.areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Cliente */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Cliente
          </label>
          <select
            value={data.client_id}
            onChange={(e) => onChange(index, 'client_id', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none bg-white"
          >
            <option value="">Seleccionar cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        {/* Medio de pago */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Medio de pago *
          </label>
          <select
            value={data.payment_method}
            onChange={(e) => onChange(index, 'payment_method', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none bg-white"
            required
          >
            <option value="corporate_card">Tarjeta corporativa</option>
            <option value="cash">Efectivo</option>
            <option value="personal_card">Tarjeta personal</option>
          </select>
        </div>

        {/* Cliente otro */}
        {showClientOther && (
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nombre del potencial cliente (como figura en HubSpot)
            </label>
            <input
              type="text"
              value={data.client_other}
              onChange={(e) => onChange(index, 'client_other', e.target.value)}
              placeholder="Nombre del cliente potencial"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
            />
          </div>
        )}

        {/* Descripción */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Descripción *
          </label>
          <input
            type="text"
            value={data.description}
            onChange={(e) => onChange(index, 'description', e.target.value)}
            placeholder="Detalle del gasto: qué se compró/pagó"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
            required
          />
        </div>

        {/* Comprobante */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Comprobante(s) *
          </label>
          <input
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              onChange(index, 'files', files);
            }}
            className="w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-brand-50 file:text-brand-600 hover:file:bg-brand-100 cursor-pointer"
          />
          {data.files.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {data.files.length} archivo(s) seleccionado(s)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export type { ExpenseRowData, GroupedAreas };
