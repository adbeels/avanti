import { useState, useEffect, useRef } from 'react';
import { X, Eye, Code2, Save, RotateCcw, Tag, Plus, Trash2, Type, FileText, AlignLeft } from 'lucide-react';
import { EmailTemplate } from './emailTemplates';

interface TemplateEditorProps {
  template: EmailTemplate;
  onSave: (updated: EmailTemplate) => void;
  onClose: () => void;
}

type EditorTab = 'html' | 'preview';

const AVAILABLE_VARIABLES = ['nombre', 'empresa'];

export default function TemplateEditor({ template, onSave, onClose }: TemplateEditorProps) {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description);
  const [subject, setSubject] = useState(template.subject);
  const [html, setHtml] = useState(template.html);
  const [variables, setVariables] = useState<string[]>(template.variables);
  const [tab, setTab] = useState<EditorTab>('html');
  const [newVar, setNewVar] = useState('');
  const [previewDoc, setPreviewDoc] = useState(template.html);
  const previewDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (tab === 'preview') {
      setPreviewDoc(html);
    }
  }, [tab, html]);

  useEffect(() => {
    if (previewDebounce.current) clearTimeout(previewDebounce.current);
    previewDebounce.current = setTimeout(() => {
      if (tab === 'preview') setPreviewDoc(html);
    }, 600);
    return () => {
      if (previewDebounce.current) clearTimeout(previewDebounce.current);
    };
  }, [html, tab]);

  const markDirty = () => setDirty(true);

  const handleSave = () => {
    const updated: EmailTemplate = {
      ...template,
      name: name.trim() || template.name,
      description: description.trim(),
      subject: subject.trim(),
      html,
      variables,
    };
    onSave(updated);
    setDirty(false);
  };

  const handleReset = () => {
    setName(template.name);
    setDescription(template.description);
    setSubject(template.subject);
    setHtml(template.html);
    setVariables(template.variables);
    setDirty(false);
  };

  const addVariable = () => {
    const v = newVar.trim().toLowerCase().replace(/\s+/g, '_');
    if (v && !variables.includes(v)) {
      setVariables([...variables, v]);
      markDirty();
    }
    setNewVar('');
  };

  const removeVariable = (v: string) => {
    setVariables(variables.filter((x) => x !== v));
    markDirty();
  };

  const insertVariable = (v: string) => {
    const tag = `{{${v}}}`;
    setHtml((prev) => prev + tag);
    markDirty();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <FileText size={17} className="text-amber-400" />
            <span className="text-white font-semibold">Editar plantilla</span>
            {dirty && (
              <span className="text-xs text-amber-500/70 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                Sin guardar
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
          <div className="lg:w-72 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-800 p-5 space-y-5 overflow-y-auto">
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                <Type size={12} />
                Nombre
              </label>
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); markDirty(); }}
                className="w-full px-3 py-2.5 bg-black border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="Nombre de la plantilla"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                <AlignLeft size={12} />
                Descripción
              </label>
              <textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); markDirty(); }}
                rows={2}
                className="w-full px-3 py-2.5 bg-black border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
                placeholder="Descripción breve"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                <FileText size={12} />
                Asunto del correo
              </label>
              <input
                value={subject}
                onChange={(e) => { setSubject(e.target.value); markDirty(); }}
                className="w-full px-3 py-2.5 bg-black border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="Asunto del correo"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                <Tag size={12} />
                Variables
              </label>
              <div className="flex flex-wrap gap-1.5 mb-3 min-h-[28px]">
                {variables.map((v) => (
                  <span
                    key={v}
                    className="flex items-center gap-1 bg-amber-500/10 text-amber-400 text-xs px-2 py-1 rounded border border-amber-500/20 font-mono"
                  >
                    {`{{${v}}}`}
                    <button
                      onClick={() => removeVariable(v)}
                      className="text-amber-600 hover:text-red-400 transition-colors ml-0.5"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
                {variables.length === 0 && (
                  <span className="text-gray-700 text-xs italic">Sin variables</span>
                )}
              </div>

              <div className="flex gap-2 mb-3">
                <input
                  value={newVar}
                  onChange={(e) => setNewVar(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addVariable(); } }}
                  className="flex-1 min-w-0 px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500 transition-colors font-mono"
                  placeholder="nueva_variable"
                />
                <button
                  onClick={addVariable}
                  disabled={!newVar.trim()}
                  className="flex items-center gap-1 px-3 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs hover:bg-amber-500/20 transition-all disabled:opacity-40"
                >
                  <Plus size={12} />
                </button>
              </div>

              <div>
                <p className="text-gray-700 text-xs mb-2">Insertar en HTML:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[...new Set([...AVAILABLE_VARIABLES, ...variables])].map((v) => (
                    <button
                      key={v}
                      onClick={() => { insertVariable(v); if (!variables.includes(v)) { setVariables((prev) => [...prev, v]); } }}
                      className="text-xs font-mono bg-black border border-gray-800 hover:border-amber-500/40 text-gray-500 hover:text-amber-400 px-2 py-1 rounded transition-all"
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            <div className="flex items-center gap-1 px-4 pt-4 pb-0 flex-shrink-0">
              <button
                onClick={() => setTab('html')}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-xs font-medium border-b-2 transition-all ${
                  tab === 'html'
                    ? 'text-amber-400 border-amber-500 bg-amber-500/5'
                    : 'text-gray-500 border-transparent hover:text-gray-300'
                }`}
              >
                <Code2 size={13} />
                Código HTML
              </button>
              <button
                onClick={() => setTab('preview')}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-xs font-medium border-b-2 transition-all ${
                  tab === 'preview'
                    ? 'text-amber-400 border-amber-500 bg-amber-500/5'
                    : 'text-gray-500 border-transparent hover:text-gray-300'
                }`}
              >
                <Eye size={13} />
                Vista previa
              </button>
              <div className="flex-1" />
              <span className="text-gray-700 text-xs pr-2">{html.length.toLocaleString()} car.</span>
            </div>

            <div className="flex-1 min-h-0 p-4 pt-3">
              {tab === 'html' ? (
                <textarea
                  value={html}
                  onChange={(e) => { setHtml(e.target.value); markDirty(); }}
                  spellCheck={false}
                  className="w-full h-full px-4 py-3 bg-black border border-gray-800 rounded-xl text-green-400/90 text-xs leading-relaxed font-mono resize-none focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="<!DOCTYPE html>..."
                />
              ) : (
                <div className="w-full h-full border border-gray-800 rounded-xl overflow-hidden bg-white">
                  <iframe
                    srcDoc={previewDoc}
                    title="Vista previa"
                    className="w-full h-full border-0"
                    sandbox="allow-same-origin"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 flex-shrink-0 gap-3">
          <button
            onClick={handleReset}
            disabled={!dirty}
            className="flex items-center gap-2 px-4 py-2.5 bg-black border border-gray-800 hover:border-gray-700 text-gray-500 hover:text-gray-300 rounded-lg text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <RotateCcw size={14} />
            Descartar cambios
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!dirty}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-black rounded-lg text-sm font-bold hover:shadow-lg hover:shadow-amber-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save size={14} />
              Guardar plantilla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
