import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type UserRole = 'admin' | 'warehouse' | 'fulfillment' | null;

export function useCurrentUserRole() {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('current_user_role');
      if (cancelled) return;
      if (!error && data) {
        setRole(data as UserRole);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { role, loading, isAdmin: role === 'admin', isWarehouse: role === 'warehouse', isFulfillment: role === 'fulfillment' };
}
