import { useEffect, useState } from 'react';
import {
  Users, Search, RefreshCw, ChevronRight, ShieldCheck, EyeOff, Calendar,
  UserCog, AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export type UserProfileRole = 'admin' | 'warehouse' | 'fulfillment' | 'pending';

export interface UserProfile {
  user_id: string;
  role: UserProfileRole;
  full_name: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

type RoleFilter = 'all' | UserProfileRole;
type ActiveFilter = 'all' | 'active' | 'inactive';

export const ROLE_CONFIG: Record<UserProfileRole, { label: string; color: string; bg: string; border: string }> = {
  admin:       { label: 'Admin',        color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30' },
  warehouse:   { label: 'Almacén',      color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30' },
  fulfillment: { label: 'Fulfillment',  color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30' },
  pending:     { label: 'Pendiente',    color: 'text-gray-400',   bg: 'bg-gray-500/10',   border: 'border-gray-500/30' },
};

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}

function shortId(id: string) {
  if (!id) return '—';
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

interface UsersTableProps {
  selectedId: string | null;
  onSelect: (u: UserProfile | null) => void;
  refreshKey?: number;
}

export default function UsersTable({ selectedId, onSelect, refreshKey }: UsersTableProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers((data as UserProfile[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [refreshKey]);

  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (activeFilter === 'active' && !u.active) return false;
    if (activeFilter === 'inactive' && u.active) return false;
    if (search) {
      const q = search.toLowerCase();
      return (u.full_name || '').toLowerCase().includes(q) || u.user_id.toLowerCase().includes(q);
    }
    return true;
  });

  const counts = {
    all: users.length,
    admin: users.filter((u) => u.role === 'admin').length,
    warehouse: users.filter((u) => u.role === 'warehouse').length,
    fulfillment: users.filter((u) => u.role === 'fulfillment').length,
    pending: users.filter((u) => u.role === 'pending').length,
  };

  const pendingCount = counts.pending;

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Users size={16} className="text-amber-400" />
            <span className="text-white font-semibold text-sm">Usuarios</span>
            <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-0.5 rounded-full border border-amber-500/20">
              {users.length}
            </span>
            {pendingCount > 0 && (
              <span className="bg-orange-500/10 text-orange-400 text-xs px-2 py-0.5 rounded-full border border-orange-500/20 flex items-center gap-1">
                <AlertCircle size={10} /> {pendingCount} sin rol
              </span>
            )}
          </div>
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nombre o email..."
              className="w-full pl-8 pr-4 py-2 bg-black border border-gray-800 rounded-lg text-white text-xs placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
          <button
            onClick={fetchUsers}
            className="p-2 bg-black border border-gray-800 rounded-lg text-gray-400 hover:text-amber-400 hover:border-amber-500/40 transition-all flex-shrink-0"
            title="Refrescar"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Filtro por rol */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'admin', 'warehouse', 'fulfillment', 'pending'] as RoleFilter[]).map((r) => {
            const config = r === 'all' ? null : ROLE_CONFIG[r];
            const isActive = roleFilter === r;
            const label = r === 'all' ? 'Todos' : config!.label;
            const c = counts[r];
            return (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                  isActive
                    ? config
                      ? `${config.color} ${config.bg} ${config.border}`
                      : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                    : 'text-gray-500 bg-black border-gray-800 hover:border-gray-700'
                }`}
              >
                {label} <span className="opacity-60 ml-1">{c}</span>
              </button>
            );
          })}
        </div>

        {/* Filtro activo / inactivo */}
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as ActiveFilter[]).map((f) => {
            const isActive = activeFilter === f;
            const label = f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Inactivos';
            return (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`text-[11px] px-2.5 py-1 rounded border font-medium transition-all ${
                  isActive
                    ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                    : 'text-gray-500 bg-black border-gray-800 hover:border-gray-700'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-600">
          <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
          <p className="text-sm">Cargando usuarios...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-gray-600">
          <Users size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Ningún usuario coincide con los filtros.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-900">
          {filtered.map((u) => {
            const cfg = ROLE_CONFIG[u.role];
            const isSelected = selectedId === u.user_id;
            return (
              <button
                key={u.user_id}
                onClick={() => onSelect(u)}
                className={`w-full text-left px-5 py-3 flex items-center gap-3 transition-colors ${
                  isSelected ? 'bg-amber-950/20' : 'hover:bg-gray-900/40'
                } ${!u.active ? 'opacity-50' : ''}`}
              >
                <div className="w-9 h-9 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center flex-shrink-0">
                  <UserCog size={15} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate flex items-center gap-2">
                    {u.full_name || shortId(u.user_id)}
                    {!u.active && <EyeOff size={11} className="text-red-400 flex-shrink-0" />}
                  </p>
                  <p className="text-gray-500 text-xs flex items-center gap-3 mt-0.5">
                    <span className="font-mono text-[10px]">{shortId(u.user_id)}</span>
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {formatShortDate(u.created_at)}
                    </span>
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium flex-shrink-0 ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                  <ShieldCheck size={10} className="inline mr-1" />
                  {cfg.label}
                </span>
                <ChevronRight size={14} className={`flex-shrink-0 transition-colors ${isSelected ? 'text-amber-400' : 'text-gray-700'}`} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
