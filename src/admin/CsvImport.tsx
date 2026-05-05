import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CsvImportProps {
  onImportComplete: () => void;
}

interface ParsedRow {
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  source: string | null;
  owner: string | null;
}

interface ImportResult {
  inserted: number;
  skipped: number;
  errors: string[];
}

function normalize(s: string): string {
  return s
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseCsv(text: string): ParsedRow[] {
  const clean = text.replace(/^\uFEFF/, '');
  const lines = clean.split('\n').map((l) => l.trimEnd());
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

  const colIndex = (names: string[]): number => {
    for (const n of names) {
      const idx = header.findIndex((h) => normalize(h) === normalize(n));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const idxName = colIndex(['Lead Name', 'Nombre', 'name']);
  const idxCompany = colIndex(['Empresa', 'Company', 'company']);
  const idxEmail = colIndex(['Correo electronico', 'Correo electrónico', 'Email', 'email', 'correo']);
  const idxPhone = colIndex(['Telefono', 'Teléfono', 'Phone', 'phone']);
  const idxSource = colIndex(['Fuente de Posible cliente', 'Source', 'source']);
  const idxOwner = colIndex(['Propietario de Posible cliente', 'Owner', 'owner']);

  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = splitCsvLine(line);

    const get = (idx: number) => (idx >= 0 && idx < cols.length ? cols[idx].trim() : '');

    const name = get(idxName);
    if (!name) continue;

    rows.push({
      name,
      company: get(idxCompany) || null,
      email: get(idxEmail) || '',
      phone: get(idxPhone) || null,
      source: get(idxSource) || null,
      owner: get(idxOwner) || null,
    });
  }

  return rows;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export default function CsvImport({ onImportComplete }: CsvImportProps) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setStatus('idle');

    const binaryReader = new FileReader();
    binaryReader.onload = (ev) => {
      const buffer = ev.target?.result as ArrayBuffer;
      const bytes = new Uint8Array(buffer);

      const hasUtf8Bom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
      let hasNonUtf8 = false;
      if (!hasUtf8Bom) {
        for (let i = 0; i < Math.min(bytes.length, 4000); i++) {
          if (bytes[i] > 0x7f) { hasNonUtf8 = true; break; }
        }
      }

      const encoding = hasUtf8Bom || !hasNonUtf8 ? 'UTF-8' : 'windows-1252';
      const decoder = new TextDecoder(encoding);
      const text = decoder.decode(buffer);
      const rows = parseCsv(text);
      setPreview(rows);
    };
    binaryReader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setStatus('loading');

    const insertResult: ImportResult = { inserted: 0, skipped: 0, errors: [] };

    let counter = Date.now();

    const BATCH = 50;
    for (let i = 0; i < preview.length; i += BATCH) {
      const batch = preview.slice(i, i + BATCH);
      const records = batch.map((r) => ({
        name: r.name,
        email: r.email || `sin-correo-${++counter}@importado.local`,
        phone: r.phone,
        company: r.company,
        message: r.source ? `Fuente: ${r.source}${r.owner ? ` | Propietario: ${r.owner}` : ''}` : (r.owner ? `Propietario: ${r.owner}` : null),
        interested_brands: [],
      }));

      const { error, data } = await supabase
        .from('contact_leads')
        .upsert(records, { onConflict: 'email', ignoreDuplicates: true })
        .select('id');

      if (error) {
        insertResult.errors.push(`Lote ${Math.floor(i / BATCH) + 1}: ${error.message}`);
      } else {
        insertResult.inserted += data?.length ?? 0;
        insertResult.skipped += batch.length - (data?.length ?? 0);
      }
    }

    setResult(insertResult);
    setStatus(insertResult.errors.length > 0 ? 'error' : 'done');
    onImportComplete();
  };

  const handleClose = () => {
    setOpen(false);
    setPreview([]);
    setFileName('');
    setStatus('idle');
    setResult(null);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-700 hover:border-amber-500/50 text-gray-400 hover:text-amber-400 rounded-lg text-sm font-medium transition-all"
      >
        <Upload size={15} />
        Importar CSV
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-amber-400" />
            <span className="text-white font-semibold">Importar contactos desde CSV</span>
          </div>
          <button onClick={handleClose} className="text-gray-600 hover:text-gray-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          <div className="bg-black/40 border border-gray-800 rounded-xl p-4 text-sm text-gray-500 space-y-1">
            <p className="text-gray-400 font-medium mb-2">Columnas esperadas del CSV (Zoho CRM):</p>
            <div className="grid grid-cols-2 gap-1 text-xs font-mono">
              <span className="text-amber-400/70">Lead Name</span>
              <span className="text-amber-400/70">Empresa</span>
              <span className="text-amber-400/70">Correo electrónico</span>
              <span className="text-amber-400/70">Teléfono</span>
              <span className="text-amber-400/70">Fuente de Posible cliente</span>
              <span className="text-amber-400/70">Propietario de Posible cliente</span>
            </div>
            <p className="text-gray-600 text-xs pt-1">Los contactos duplicados (mismo correo) serán omitidos automáticamente.</p>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-black border border-gray-700 hover:border-amber-500/50 text-gray-400 hover:text-amber-400 rounded-lg text-sm font-medium transition-all"
            >
              <Upload size={15} />
              {fileName ? `Cambiar archivo (${fileName})` : 'Seleccionar archivo .csv'}
            </button>
          </div>

          {preview.length > 0 && status !== 'done' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm font-medium">
                  Vista previa —{' '}
                  <span className="text-amber-400">{preview.length} contactos</span> detectados
                </p>
              </div>
              <div className="overflow-x-auto border border-gray-800 rounded-xl">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-black/60 border-b border-gray-800">
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase tracking-wider">Nombre</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase tracking-wider">Correo</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase tracking-wider hidden sm:table-cell">Empresa</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase tracking-wider hidden md:table-cell">Teléfono</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {preview.slice(0, 20).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-900/40">
                        <td className="px-3 py-2 text-white">{row.name}</td>
                        <td className="px-3 py-2 text-gray-400">{row.email || <span className="text-gray-700 italic">sin correo</span>}</td>
                        <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{row.company || '—'}</td>
                        <td className="px-3 py-2 text-gray-500 hidden md:table-cell">{row.phone || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 20 && (
                  <p className="text-center text-gray-700 text-xs py-2">
                    ... y {preview.length - 20} más
                  </p>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className={`flex items-start gap-3 p-4 rounded-xl border ${
              status === 'done'
                ? 'bg-green-950/30 border-green-800/40 text-green-400'
                : 'bg-amber-950/30 border-amber-800/40 text-amber-400'
            }`}>
              {status === 'done'
                ? <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
                : <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              }
              <div className="text-sm space-y-1">
                <p className="font-medium">
                  {result.inserted} contactos importados
                  {result.skipped > 0 ? `, ${result.skipped} omitidos por duplicado` : ''}
                </p>
                {result.errors.map((e, i) => (
                  <p key={i} className="text-red-400 text-xs">{e}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            {status === 'done' ? 'Cerrar' : 'Cancelar'}
          </button>
          {preview.length > 0 && status !== 'done' && (
            <button
              onClick={handleImport}
              disabled={status === 'loading'}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-black rounded-lg text-sm font-bold hover:shadow-lg hover:shadow-amber-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload size={15} />
                  Importar {preview.length} contactos
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
