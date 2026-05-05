import { useState, useRef } from 'react';
import { Send, AlertCircle, CheckCircle2, Mail, Users, Type, AlignLeft, Code2, Eye, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import TemplateSelector from './TemplateSelector';
import { EmailTemplate, applyTemplateVariables } from './emailTemplates';

export interface SelectedContact {
  email: string;
  name: string;
  company: string | null;
  unsubscribeToken?: string | null;
}

interface MailingComposerProps {
  selectedContacts: SelectedContact[];
  onClearSelection: () => void;
}

type BodyMode = 'text' | 'html';

export default function MailingComposer({ selectedContacts, onClearSelection }: MailingComposerProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [bodyMode, setBodyMode] = useState<BodyMode>('text');
  const [htmlSource, setHtmlSource] = useState('');
  const [previewHtml, setPreviewHtml] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setHtmlSource(content);
      setPreviewHtml(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleApplyTemplate = (template: EmailTemplate) => {
    setSubject(template.subject);
    setHtmlSource(template.html);
    setBodyMode('html');
    setPreviewHtml(false);
  };

  const handleSend = async () => {
    const activeBody = bodyMode === 'html' ? htmlSource : body;
    if (!subject.trim() || !activeBody.trim() || selectedContacts.length === 0) return;

    setStatus('loading');
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-mailing`;

      const isHtml = bodyMode === 'html';
      const hasVariables = isHtml && (htmlSource.includes('{{nombre}}') || htmlSource.includes('{{empresa}}') || htmlSource.includes('{{email}}') || htmlSource.includes('{{unsubscribe_url}}'));

      let sentCount = 0;
      let failedCount = 0;
      const errorList: string[] = [];

      if (hasVariables) {
        for (const contact of selectedContacts) {
          const token = contact.unsubscribeToken;
          const unsubscribeUrl = token
            ? `https://avantimexico.com/unsubscribe?token=${encodeURIComponent(token)}`
            : 'https://avantimexico.com/unsubscribe';
          const vars: Record<string, string> = {
            nombre: contact.name,
            empresa: contact.company ? ` ${contact.company}` : ' tu empresa',
            email: contact.email,
            unsubscribe_url: unsubscribeUrl,
          };
          const personalizedBody = applyTemplateVariables(activeBody, vars);

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              emails: [contact.email],
              tokens: [contact.unsubscribeToken ?? null],
              subject,
              body: personalizedBody,
              isHtml,
            }),
          });

          let result: Record<string, unknown> = {};
          try { result = await response.json(); } catch { /* empty */ }

          if (!response.ok || (result.failed as number) > 0) {
            failedCount++;
            const errDetail = Array.isArray(result.errors) && (result.errors as string[]).length > 0
              ? (result.errors as string[])[0]
              : typeof result.error === 'string'
                ? result.error
                : `HTTP ${response.status}`;
            errorList.push(`${contact.email}: ${errDetail}`);
          } else {
            sentCount++;
          }
        }
      } else {
        const emails = selectedContacts.map((c) => c.email);
        const tokens = selectedContacts.map((c) => c.unsubscribeToken ?? null);
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ emails, tokens, subject, body: activeBody, isHtml }),
        });

        let result: Record<string, unknown> = {};
        try { result = await response.json(); } catch {
          throw new Error(`HTTP ${response.status} — respuesta no válida del servidor`);
        }

        if (!response.ok) {
          const errList = Array.isArray(result.errors) ? (result.errors as string[]) : [];
          const detail = errList.length > 0
            ? errList.join(' | ')
            : (typeof result.error === 'string' ? result.error : `HTTP ${response.status}`);
          throw new Error(detail);
        }

        sentCount = typeof result.sent === 'number' ? result.sent : emails.length;
        failedCount = typeof result.failed === 'number' ? result.failed : 0;
        const skippedCount = typeof result.skipped === 'number' ? result.skipped : 0;
        if (skippedCount > 0) errorList.push(`${skippedCount} omitido${skippedCount !== 1 ? 's' : ''} (desuscritos)`);
        if (Array.isArray(result.errors)) errorList.push(...(result.errors as string[]));
      }

      const partialErrors = errorList.length > 0
        ? ` | Fallos: ${errorList.join(' | ')}`
        : '';

      if (sentCount === 0 && failedCount > 0) {
        setStatus('error');
        setMessage(`No se pudo enviar a ningún destinatario.${partialErrors}`);
      } else {
        setStatus('success');
        setMessage(`Mailing enviado a ${sentCount} destinatario${sentCount !== 1 ? 's' : ''}.${partialErrors}`);
      }
      setSubject('');
      setBody('');
      setHtmlSource('');
      onClearSelection();

      setTimeout(() => { setStatus('idle'); setMessage(''); }, 6000);
    } catch (err: unknown) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Error desconocido al enviar el mailing.');
    }
  };

  const activeBody = bodyMode === 'html' ? htmlSource : body;
  const canSend = subject.trim() && activeBody.trim() && selectedContacts.length > 0 && status !== 'loading';

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
        <Mail size={18} className="text-amber-400" />
        <span className="text-white font-semibold">Redactar Mailing</span>
      </div>

      <div className="p-6 space-y-5">
        <div className="flex items-center gap-3 p-4 bg-black/40 border border-gray-800 rounded-xl">
          <Users size={16} className="text-amber-400 flex-shrink-0" />
          {selectedContacts.length === 0 ? (
            <span className="text-gray-600 text-sm italic">Selecciona contactos en la tabla para agregar destinatarios</span>
          ) : (
            <div className="flex flex-wrap gap-2 flex-1">
              {selectedContacts.slice(0, 8).map((c) => (
                <span key={c.email} className="bg-amber-500/10 text-amber-400 text-xs px-2.5 py-1 rounded-full border border-amber-500/20" title={c.email}>
                  {c.name}
                </span>
              ))}
              {selectedContacts.length > 8 && (
                <span className="text-amber-500/60 text-xs px-2.5 py-1">
                  +{selectedContacts.length - 8} más
                </span>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2">
            <Type size={14} />
            Asunto
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-4 py-3 bg-black border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors text-sm"
            placeholder="Ej. Novedades AVANTI | Enero 2026"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-400">
              <AlignLeft size={14} />
              Contenido
            </label>
            <div className="flex items-center gap-2">
              <TemplateSelector onApply={handleApplyTemplate} />
              <div className="flex items-center bg-black border border-gray-800 rounded-lg p-0.5">
                <button
                  onClick={() => { setBodyMode('text'); setPreviewHtml(false); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    bodyMode === 'text'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <AlignLeft size={12} />
                  Texto
                </button>
                <button
                  onClick={() => { setBodyMode('html'); setPreviewHtml(false); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    bodyMode === 'html'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Code2 size={12} />
                  HTML
                </button>
              </div>
            </div>
          </div>

          {bodyMode === 'text' ? (
            <>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 bg-black border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors text-sm resize-none leading-relaxed font-mono"
                placeholder="Redacta el contenido de tu correo aquí. Puedes usar saltos de línea para estructurar el mensaje..."
              />
              <p className="text-gray-700 text-xs mt-1.5">{body.length} caracteres</p>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-black border border-gray-700 hover:border-amber-500/50 text-gray-400 hover:text-amber-400 rounded-lg text-xs font-medium transition-all"
                >
                  <Upload size={13} />
                  Cargar .html
                </button>
                {htmlSource && (
                  <>
                    <button
                      onClick={() => setPreviewHtml(!previewHtml)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all border ${
                        previewHtml
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : 'bg-black border-gray-700 hover:border-amber-500/50 text-gray-400 hover:text-amber-400'
                      }`}
                    >
                      <Eye size={13} />
                      {previewHtml ? 'Editar' : 'Vista previa'}
                    </button>
                    <button
                      onClick={() => { setHtmlSource(''); setPreviewHtml(false); }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-black border border-gray-800 hover:border-red-800/50 text-gray-600 hover:text-red-400 rounded-lg text-xs transition-all"
                    >
                      <X size={13} />
                    </button>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".html,.htm"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {htmlSource && (
                <div className="px-3 py-2 bg-amber-950/20 border border-amber-500/20 rounded-lg text-xs text-amber-400/70">
                  Variables disponibles:&nbsp;
                  <span className="font-mono">{'{{nombre}}'}</span>, <span className="font-mono">{'{{empresa}}'}</span>, <span className="font-mono">{'{{email}}'}</span> y <span className="font-mono">{'{{unsubscribe_url}}'}</span>
                  &nbsp;— se personalizarán por contacto al enviar.
                </div>
              )}

              {previewHtml && htmlSource ? (
                <div className="border border-gray-800 rounded-lg overflow-hidden bg-white">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-950 border-b border-gray-800">
                    <Eye size={12} className="text-amber-400" />
                    <span className="text-gray-500 text-xs">Vista previa del correo</span>
                  </div>
                  <iframe
                    srcDoc={htmlSource}
                    title="Vista previa del correo"
                    className="w-full border-0"
                    style={{ height: '400px' }}
                    sandbox="allow-same-origin"
                  />
                </div>
              ) : (
                !previewHtml && (
                  <>
                    <textarea
                      value={htmlSource}
                      onChange={(e) => setHtmlSource(e.target.value)}
                      rows={12}
                      className="w-full px-4 py-3 bg-black border border-gray-800 rounded-lg text-green-400/90 placeholder-gray-700 focus:outline-none focus:border-amber-500 transition-colors text-xs resize-none leading-relaxed font-mono"
                      placeholder={'<!DOCTYPE html>\n<html>\n  <body>\n    <h1>Tu contenido aquí</h1>\n  </body>\n</html>'}
                    />
                    <p className="text-gray-700 text-xs">{htmlSource.length} caracteres</p>
                  </>
                )
              )}
            </div>
          )}
        </div>

        {(status === 'success' || status === 'error') && (
          <div className={`flex items-start gap-3 p-4 rounded-lg border ${
            status === 'success'
              ? 'bg-green-950/30 border-green-800/40 text-green-400'
              : 'bg-red-950/30 border-red-800/40 text-red-400'
          }`}>
            {status === 'success' ? <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />}
            <p className="text-sm">{message}</p>
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={!canSend}
          className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-black py-3.5 rounded-lg font-bold text-sm hover:shadow-lg hover:shadow-amber-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {status === 'loading' ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Enviando a {selectedContacts.length} destinatario{selectedContacts.length !== 1 ? 's' : ''}...
            </>
          ) : (
            <>
              <Send size={16} />
              Enviar a {selectedContacts.length > 0 ? `${selectedContacts.length} destinatario${selectedContacts.length !== 1 ? 's' : ''}` : 'destinatarios'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
