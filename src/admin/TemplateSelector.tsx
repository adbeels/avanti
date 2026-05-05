import { useState } from 'react';
import { LayoutTemplate, ChevronDown, Eye, Check, X, Tag, Pencil } from 'lucide-react';
import { EMAIL_TEMPLATES, EmailTemplate } from './emailTemplates';
import TemplateEditor from './TemplateEditor';

interface TemplateSelectorProps {
  onApply: (template: EmailTemplate) => void;
}

export default function TemplateSelector({ onApply }: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>(EMAIL_TEMPLATES);

  const handleApply = (template: EmailTemplate) => {
    onApply(template);
    setOpen(false);
    setPreviewId(null);
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
  };

  const handleSaveEdit = (updated: EmailTemplate) => {
    setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setEditingTemplate(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-black border border-gray-700 hover:border-amber-500/50 text-gray-400 hover:text-amber-400 rounded-lg text-xs font-medium transition-all"
      >
        <LayoutTemplate size={13} />
        Plantillas
        <ChevronDown size={12} className="opacity-50" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <LayoutTemplate size={17} className="text-amber-400" />
                <span className="text-white font-semibold">Seleccionar plantilla</span>
              </div>
              <button
                onClick={() => { setOpen(false); setPreviewId(null); }}
                className="text-gray-600 hover:text-gray-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className={`border rounded-xl transition-all ${
                    previewId === tpl.id
                      ? 'border-amber-500/40 bg-amber-950/10'
                      : 'border-gray-800 hover:border-gray-700 bg-black/30'
                  }`}
                >
                  <div className="flex items-start justify-between p-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">{tpl.name}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{tpl.description}</p>
                      <p className="text-gray-600 text-xs mt-1.5 truncate">
                        <span className="text-gray-700">Asunto: </span>{tpl.subject}
                      </p>
                      {tpl.variables.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <Tag size={11} className="text-amber-500/50" />
                          {tpl.variables.map((v) => (
                            <span
                              key={v}
                              className="text-amber-400/70 text-xs bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono"
                            >
                              {`{{${v}}}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <button
                        onClick={() => setPreviewId(previewId === tpl.id ? null : tpl.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          previewId === tpl.id
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : 'bg-black border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        <Eye size={12} />
                        {previewId === tpl.id ? 'Ocultar' : 'Ver'}
                      </button>
                      <button
                        onClick={() => handleEdit(tpl)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-black border-gray-700 text-gray-500 hover:text-amber-400 hover:border-amber-500/40 transition-all"
                      >
                        <Pencil size={12} />
                        Editar
                      </button>
                      <button
                        onClick={() => handleApply(tpl)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-600 text-black transition-all hover:shadow-md hover:shadow-amber-600/20"
                      >
                        <Check size={12} />
                        Usar
                      </button>
                    </div>
                  </div>

                  {previewId === tpl.id && (
                    <div className="border-t border-amber-500/20 bg-white rounded-b-xl overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2 bg-gray-950 border-b border-gray-800">
                        <Eye size={11} className="text-amber-400" />
                        <span className="text-gray-500 text-xs">Vista previa — las variables se reemplazarán con datos del contacto al enviar</span>
                      </div>
                      <iframe
                        srcDoc={tpl.html}
                        title={`Vista previa: ${tpl.name}`}
                        className="w-full border-0"
                        style={{ height: '360px' }}
                        sandbox="allow-same-origin"
                      />
                    </div>
                  )}
                </div>
              ))}

              {templates.length === 0 && (
                <div className="text-center py-12 text-gray-600">
                  <LayoutTemplate size={36} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No hay plantillas disponibles</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-800 flex justify-end">
              <button
                onClick={() => { setOpen(false); setPreviewId(null); }}
                className="px-4 py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTemplate && (
        <TemplateEditor
          template={editingTemplate}
          onSave={handleSaveEdit}
          onClose={() => setEditingTemplate(null)}
        />
      )}
    </>
  );
}
