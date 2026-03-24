import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Division = {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
};

export type Area = {
  id: string;
  division_id: string;
  name: string;
  sort_order: number;
  active: boolean;
  divisions?: Division;
};

export type Client = {
  id: string;
  name: string;
  active: boolean;
};

export type ExpenseItem = {
  id: string;
  tempId?: string;
  expense_date: string;
  provider: string;
  amount: number;
  currency: 'ARS' | 'USD';
  area_id: string;
  client_id: string;
  client_other: string;
  payment_method: 'corporate_card' | 'cash' | 'personal_card';
  description: string;
  files: File[];
};

export type ExpenseSubmission = {
  id: string;
  submitted_by: string;
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  total_ars: number;
  total_usd: number;
  item_count: number;
};
