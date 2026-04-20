'use client';

import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type AdminInfo = {
  id: string;
  email: string;
  name: string;
};

export type AdminGuardState = {
  admin: AdminInfo | null;
  loading: boolean;
  rejected: boolean; // logged in pero no está en admin_users
};

export function useAdminGuard(redirectIfAnon = true): AdminGuardState {
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejected, setRejected] = useState(false);

  useEffect(() => {
    let alive = true;

    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (alive) {
          if (redirectIfAnon) {
            window.location.href = '/admin';
            return;
          }
          setLoading(false);
        }
        return;
      }

      const { data: adminRow } = await supabase
        .from('admin_users')
        .select('id, name, email')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!alive) return;

      if (!adminRow) {
        setRejected(true);
        setLoading(false);
        return;
      }

      setAdmin({ id: adminRow.id, email: adminRow.email, name: adminRow.name });
      setLoading(false);
    }

    check();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && redirectIfAnon) {
        window.location.href = '/admin';
      } else if (session) {
        check();
      } else {
        setAdmin(null);
        setRejected(false);
        setLoading(false);
      }
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [redirectIfAnon]);

  return { admin, loading, rejected };
}

export async function adminSignOut() {
  await supabase.auth.signOut();
  window.location.href = '/admin';
}
