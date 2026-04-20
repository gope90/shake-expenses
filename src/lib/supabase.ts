import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Division = {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
  last_modified_by?: string | null;
  updated_at?: string | null;
};

export type Area = {
  id: string;
  division_id: string;
  name: string;
  sort_order: number;
  active: boolean;
  last_modified_by?: string | null;
  updated_at?: string | null;
  divisions?: Division;
};

export type Client = {
  id: string;
  name: string;
  active: boolean;
  last_modified_by?: string | null;
  updated_at?: string | null;
};

export type AuditLogEntry = {
  id: string;
  table_name: 'divisions' | 'areas' | 'clients' | 'team_members';
  row_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  actor: string | null;
  changes: {
    before?: Record<string, any>;
    after?: Record<string, any>;
    diff?: Record<string, { from: any; to: any }>;
  };
  created_at: string;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

export type TeamMember = {
  id: string;
  name: string;
  email?: string | null;
  active: boolean;
  last_modified_by?: string | null;
  updated_at?: string | null;
  created_at?: string;
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
