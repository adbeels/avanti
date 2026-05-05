import { useEffect, useState } from 'react';
import {
  UserCog, X, Save, AlertCircle, CheckCircle2, Loader2, ShieldCheck,
  EyeOff, Eye, Hash, Info, FileText,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ROLE_CONFIG, type UserProfile, type UserProfileRole } from './UsersTable';

interface UserEditorProps {
  selected: UserProfile | null;
  isAdmin: boolean;
  currentUserId: string | null;
  onChanged: () => void;
  onClose: () => void;
}

export default function UserEditor({ selected, isAdmin, currentUserId, onChanged, onClose }: UserEditorProps) {
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserProfileRole>('pending');
  const [active, setActive] = useState(true);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (selected) {
      setFullName(selected.full_name || '');
      setRole(selected.role);
      setActive(selected.active);
    }
    setStatus('idle');
    setMessage('');
  }, [selected?.user_id]);

  const showError = (msg: string) => { setStatus('error'); setMessage(msg); };
  const showSuccess = (msg: string) => {
    setStatus('success');
    setMessage(msg);
    setTimeout(() => { setStatus('idle'); setMessage(''); }, 4000);
  };

  const isSelf = selected && currentUserId && selected.user_id === currentUserId;

  const handleSave = async () => {
    if (!selected) return;
    if (!fullName.trim()) return showError('El nombre es obligatorio.');

    // Guardas
    if (isSelf && role !== 'admin' && selected.role === 'admin') {
      return showError('No puedes quitarte el rol de admin a ti mismo. Pide a otro admin que lo haga.');
    }
    if (isSelf && !active && selected.active) {
      return showError('No puedes desactivar tu propia cuenta.');
    }

    setStatus('loading');
    const { error } = await supabase
      .from('user_profiles')
      .update({
        full_name: fullName.trim(),
        role,
        active,
      })
      .eq('user_id', selected.user_id);

    if (error) return showError(error.message);
    showSuccess('Cambios guardados.');
    onChanged();
  };

  if (!isAdmin) {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-6 text-center">
          <AlertCircle size={32} className="text-amber-400 mx-auto mb-3" />
          <p className="text-white text-sm font-semibold mb-1">Solo administración</p>
          <p className="text-gray-500 text-xs">Únicamente el rol <strong className="text-amber-400">admin</strong> puede gestionar usuarios.</p>
        </div>
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
          <UserCog size={18} className="text-amber-400" />
          <span className="text-white font-semibold">Editor de usuario</span>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-col items-center justify-center py-8 text-gray-600">
            <UserCog size={40} className="mb-3 opacity-20" />
            <p className="text-sm text-center">Selecciona un usuario de la lista</p>
          </div>
          <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-3 text-xs text-amber-300/80 space-y-1.5">
            <p className="flex items-center gap-1.5 font-semibold">
              <Info size={12} /> ¿Cómo agregar nuevos usuarios?
            </p>
            <p className="text-amber-300/70 leading-relaxed">
              1. Ingresa al <strong>Supabase Dashboard</strong> &rarr; Authentication &rarr; Users.
            </p>
            <p className="text-amber-300/70 leading-relaxed">
              2. Click <strong>Invite user</strong> e ingresa el email del nuevo usuario.
            </p>
            <p className="text-amber-300/70 leading-relaxed">
              3. Cuando el usuario complete su registro, aparecerá aquí con rol <strong>Pendiente</strong>. Asígnale entonces el rol correcto.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const cfg = ROLE_CONFIG[role];
  const dirty = (
    fullName.trim() !== (selected.full_name || '') ||
    role !== selected.role ||
    active !== selected.active
  );

  return (
    <div className={`bg-gray-950 border rounded-2xl overflow-hidden ${active ? 'border-amber-800/30' : 'border-red-800/30'}`}>
      <div className={`flex items-center justify-between px-6 py-4 border-b ${active ? 'border-amber-800/30 bg-amber-950/20' : 'border-red-800/30 bg-red-950/20'}`}>
        <div className="flex items-center gap-3 min-w-0">
          <UserCog size={18} className={active ? 'text-amber-400' : 'text-red-400'} />
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{selected.full_name || 'Sin nombre'}</p>
            <p className="text-gray-500 text-[10px] font-mono">{selected.user_id}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300" title="Cerrar">
          <X size={16} />
        </button>
      </div>

      <div className="p-5 space-y-4">
        {isSelf && (
          <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-2.5 text-[11px] text-amber-300/80 flex items-start gap-2">
            <Info size={12} className="flex-shrink-0 mt-0.5" />
            <span>Estás editando <strong>tu propio perfil</strong>. No puedes quitarte el rol admin ni desactivar tu cuenta.</span>
          </div>
        )}

        {/* Nombre */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
            <FileText size={11} /> Nombre / Email
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nombre completo o email"
            className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Rol */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
            <ShieldCheck size={11} /> Rol
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['admin', 'warehouse', 'fulfillment', 'pending'] as UserProfileRole[]).map((r) => {
              const c = ROLE_CONFIG[r];
              const isActiveBtn = role === r;
              return (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                    isActiveBtn
                      ? `${c.color} ${c.bg} ${c.border}`
                      : 'bg-black border-gray-800 text-gray-500 hover:border-gray-700'
                  }`}
                >
                  <ShieldCheck size={12} />
                  {c.label}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-600 mt-1.5">
            {role === 'admin' && 'Acceso total al sistema. Puede gestionar usuarios y catálogo.'}
            {role === 'warehouse' && 'Recepciones, ajustes de stock, transferencias, picking.'}
            {role === 'fulfillment' && 'Pedidos, picking, entregas y firma.'}
            {role === 'pending' && 'Sin permisos efectivos. Esperando asignación de rol real.'}
          </p>
        </div>

        {/* Activo */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
            <Hash size={11} /> Estado
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setActive(true)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                active
                  ? 'bg-green-500/10 border-green-500/40 text-green-300'
                  : 'bg-black border-gray-800 text-gray-500 hover:border-gray-700'
              }`}
            >
              <Eye size={12} />
              Activo
            </button>
            <button
              onClick={() => setActive(false)}
              disabled={!!isSelf}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                !active
                  ? 'bg-red-500/10 border-red-500/40 text-red-300'
                  : 'bg-black border-gray-800 text-gray-500 hover:border-gray-700'
              }`}
            >
              <EyeOff size={12} />
              Inactivo
            </button>
          </div>
        </div>

        {/* Vista previa */}
        <div className="bg-black/40 border border-gray-800 rounded-lg p-3 text-xs">
          <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1.5">Resultado</p>
          <p className="text-gray-300">
            <strong className="text-white">{fullName.trim() || '(sin nombre)'}</strong>{' '}
            tendrá rol{' '}
            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
              {cfg.label}
            </span>{' '}
            y estará{' '}
            <strong className={active ? 'text-green-400' : 'text-red-400'}>
              {active ? 'activo' : 'inactivo'}
            </strong>.
          </p>
        </div>

        {(status === 'success' || status === 'error') && (
          <div className={`flex items-start gap-3 p-3 rounded-lg border ${
            status === 'success'
              ? 'bg-green-950/30 border-green-800/40 text-green-400'
              : 'bg-red-950/30 border-red-800/40 text-red-400'
          }`}>
            {status === 'success' ? <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />}
            <p className="text-xs">{message}</p>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={status === 'loading' || !dirty || !fullName.trim()}
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black py-2.5 rounded-lg font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Guardar cambios
        </button>
      </div>
    </div>
  );
}
