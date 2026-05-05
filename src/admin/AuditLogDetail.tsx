import { useEffect, useState } from 'react';
import {
  History, User as UserIcon, Calendar, Hash, ArrowRight, Code2, ChevronDown,
  ChevronRight as ChevronRightIcon, Plus as PlusIcon, Pencil, Trash2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ENTITY_TYPE_LABELS, type AuditEntry } from './AuditLogTable';

interface AuditLogDetailProps {
  entry: AuditEntry | null;
}

const ACTION_META: Record<AuditEntry['action'], { label: string; color: string; bg: string; border: string; icon: typeof PlusIcon }> = {
  INSERT: { label: 'Creado',    color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20',  icon: PlusIcon },
  UPDATE: { label: 'Modificado', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   icon: Pencil },
  DELETE: { label: 'Eliminado', color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    icon: Trash2 },
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function shortId(id: string | null | undefined) {
  if (!id) return '—';
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'string') {
    if (v === '') return '""';
    if (v.length > 80) return `"${v.slice(0, 80)}…"`;
    return `"${v}"`;
  }
  if (typeof v === 'number') return v.toString();
  if (Array.isArray(v)) return `[${v.length}]`;
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 80);
  return String(v);
}

export default function AuditLogDetail({ entry }: AuditLogDetailProps) {
  const [userLabel, setUserLabel] = useState<string>('—');
  const [showRawBefore, setShowRawBefore] = useState(false);
  const [showRawAfter, setShowRawAfter] = useState(false);

  useEffect(() => {
    setShowRawBefore(false);
    setShowRawAfter(false);
    if (!entry) {
      setUserLabel('—');
      return;
    }
    if (!entry.user_id) {
      setUserLabel('Sistema (sin usuario)');
      return;
    }
    supabase
      .from('user_profiles')
      .select('full_name, role')
      .eq('user_id', entry.user_id)
      .single()
      .then(({ data }) => {
        if (data) {
          setUserLabel(`${data.full_name || shortId(entry.user_id!)} · ${data.role}`);
        } else {
          setUserLabel(shortId(entry.user_id!));
        }
      });
  }, [entry?.id, entry?.user_id]);

  if (!entry) {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
          <History size={18} className="text-amber-400" />
          <span className="text-white font-semibold">Detalle del registro</span>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-gray-600">
            <Code2 size={40} className="mb-3 opacity-20" />
            <p className="text-sm text-center">Selecciona un registro de la bitácora para ver su diff</p>
          </div>
        </div>
      </div>
    );
  }

  const meta = ACTION_META[entry.action];
  const Icon = meta.icon;
  const entityLabel = ENTITY_TYPE_LABELS[entry.entity_type] ?? entry.entity_type;

  // Build diff for UPDATE
  const buildDiff = (): { field: string; before: unknown; after: unknown }[] => {
    if (entry.action !== 'UPDATE') return [];
    if (!entry.changed_fields) return [];
    const before = entry.before_jsonb || {};
    const after = entry.after_jsonb || {};
    return entry.changed_fields.map((f) => ({
      field: f,
      before: before[f],
      after: after[f],
    }));
  };

  const diff = buildDiff();
  const fullJson = entry.action === 'INSERT' ? entry.after_jsonb : entry.before_jsonb;

  return (
    <div className="bg-gray-950 border border-amber-800/30 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className={`px-6 py-4 border-b border-amber-800/30 bg-amber-950/20 flex items-center gap-3`}>
        <span className={`flex-shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center ${meta.color} ${meta.bg} ${meta.border}`}>
          <Icon size={14} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">
            {entityLabel}
            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${meta.color} ${meta.bg} border ${meta.border}`}>
              {meta.label}
            </span>
          </p>
          <p className="text-gray-500 text-[11px] font-mono truncate">{entry.entity_id}</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Meta */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 text-gray-400">
            <UserIcon size={12} className="text-gray-600" />
            <span>{userLabel}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Calendar size={12} className="text-gray-600" />
            <span>{formatDateTime(entry.created_at)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <Hash size={12} className="text-gray-600" />
            <span className="font-mono text-[10px]">audit_log #{entry.id}</span>
          </div>
        </div>

        {/* DIFF para UPDATE */}
        {entry.action === 'UPDATE' && diff.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold">
              Cambios ({diff.length})
            </p>
            <div className="space-y-1.5">
              {diff.map((d) => (
                <div key={d.field} className="bg-black border border-gray-800 rounded-lg p-2.5">
                  <p className="text-amber-400 text-[11px] font-mono font-semibold mb-1.5">{d.field}</p>
                  <div className="flex items-start gap-2 text-[11px]">
                    <div className="flex-1 min-w-0 px-2 py-1 bg-red-950/30 border border-red-900/40 rounded">
                      <p className="text-red-400/70 text-[9px] uppercase tracking-wide mb-0.5">Antes</p>
                      <p className="text-red-300 font-mono break-all">{formatValue(d.before)}</p>
                    </div>
                    <ArrowRight size={12} className="text-gray-600 mt-3 flex-shrink-0" />
                    <div className="flex-1 min-w-0 px-2 py-1 bg-green-950/30 border border-green-900/40 rounded">
                      <p className="text-green-400/70 text-[9px] uppercase tracking-wide mb-0.5">Después</p>
                      <p className="text-green-300 font-mono break-all">{formatValue(d.after)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INSERT — mostrar campos del nuevo registro */}
        {entry.action === 'INSERT' && entry.after_jsonb && (
          <div className="space-y-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold">
              Datos nuevos
            </p>
            <div className="bg-black border border-gray-800 rounded-lg p-3 space-y-1">
              {Object.entries(entry.after_jsonb)
                .filter(([k]) => !['created_at', 'updated_at', 'id'].includes(k))
                .slice(0, 12)
                .map(([k, v]) => (
                  <div key={k} className="flex items-start gap-2 text-[11px]">
                    <span className="text-amber-400/70 font-mono w-32 flex-shrink-0 truncate" title={k}>{k}</span>
                    <span className="text-green-300 font-mono break-all">{formatValue(v)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* DELETE — mostrar campos del registro borrado */}
        {entry.action === 'DELETE' && entry.before_jsonb && (
          <div className="space-y-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold">
              Datos eliminados
            </p>
            <div className="bg-black border border-red-900/30 rounded-lg p-3 space-y-1">
              {Object.entries(entry.before_jsonb)
                .filter(([k]) => !['created_at', 'updated_at', 'id'].includes(k))
                .slice(0, 12)
                .map(([k, v]) => (
                  <div key={k} className="flex items-start gap-2 text-[11px]">
                    <span className="text-amber-400/70 font-mono w-32 flex-shrink-0 truncate" title={k}>{k}</span>
                    <span className="text-red-300 font-mono break-all line-through">{formatValue(v)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Raw JSON expandibles */}
        {(entry.before_jsonb || entry.after_jsonb) && (
          <div className="space-y-2 pt-2 border-t border-gray-800">
            {entry.before_jsonb && (
              <div>
                <button
                  onClick={() => setShowRawBefore(!showRawBefore)}
                  className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-amber-400 uppercase tracking-wide font-bold"
                >
                  {showRawBefore ? <ChevronDown size={11} /> : <ChevronRightIcon size={11} />}
                  JSON antes ({Object.keys(entry.before_jsonb).length} campos)
                </button>
                {showRawBefore && (
                  <pre className="mt-2 p-3 bg-black border border-gray-800 rounded text-[10px] text-gray-400 overflow-x-auto max-h-64 overflow-y-auto">
                    {JSON.stringify(entry.before_jsonb, null, 2)}
                  </pre>
                )}
              </div>
            )}
            {entry.after_jsonb && (
              <div>
                <button
                  onClick={() => setShowRawAfter(!showRawAfter)}
                  className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-amber-400 uppercase tracking-wide font-bold"
                >
                  {showRawAfter ? <ChevronDown size={11} /> : <ChevronRightIcon size={11} />}
                  JSON después ({Object.keys(entry.after_jsonb).length} campos)
                </button>
                {showRawAfter && (
                  <pre className="mt-2 p-3 bg-black border border-gray-800 rounded text-[10px] text-gray-400 overflow-x-auto max-h-64 overflow-y-auto">
                    {JSON.stringify(entry.after_jsonb, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {!fullJson && diff.length === 0 && (
          <div className="text-center py-8 text-gray-600 text-xs italic">
            Sin datos adicionales en este registro.
          </div>
        )}
      </div>
    </div>
  );
}
