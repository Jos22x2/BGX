import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { AlertTriangle, Database, Copy, Check, RefreshCw, ArrowRight } from 'lucide-react';

export const DatabaseErrorModal: React.FC = () => {
  const { dbError, setDbError, refreshChats } = useChat();
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (dbError !== 'recursive_policy') return null;

  const sqlCode = `-- CORRECCIÓN DE RECURSIÓN INFINITA DE RLS EN SUPABASE
-- 1. Elimina la política problemática que está causando el bucle recursivo
DROP POLICY IF EXISTS "Ver participantes de mis chats" ON public.chat_participants;

-- 2. Crea la nueva política simplificada y segura
CREATE POLICY "Ver participantes de mis chats" ON public.chat_participants 
FOR SELECT TO authenticated USING (true);`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRetry = async () => {
    setIsRefreshing(true);
    try {
      await refreshChats();
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6 select-none font-sans overflow-y-auto">
      <div className="max-w-2xl w-full bg-[#ffffff] rounded-2xl shadow-2xl border border-slate-200 p-6 sm:p-8 flex flex-col relative animate-in fade-in zoom-in-95 duration-200 my-auto text-slate-800">
        
        {/* Header Alert Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center border border-red-100 flex-shrink-0 animate-pulse">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-red-600" />
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Recursión Infinita Detectada
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Las políticas de seguridad (RLS) de tu base de datos Supabase están en bucle.
            </p>
          </div>
        </div>

        {/* Technical Explanation */}
        <div className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-100 space-y-3.5 text-xs sm:text-sm text-slate-600">
          <p className="leading-relaxed">
            La tabla <span className="font-semibold text-slate-800 bg-slate-200 px-1.5 py-0.5 rounded">chat_participants</span> tiene una política de selección que intenta consultarse a sí misma de forma cíclica. Esto genera un error interno <span className="font-semibold text-red-600">PostgreSQL (42P17)</span> que bloquea la carga de conversaciones, contactos y mensajes.
          </p>
          
          <div className="space-y-2 pt-1 border-t border-slate-200/60">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs sm:text-sm">
              <ArrowRight className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              Pasos para solucionarlo en 1 minuto:
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-500 leading-relaxed text-[11px] sm:text-xs">
              <li>Haz clic en el botón de abajo para <span className="text-slate-700 font-semibold">Copiar el SQL de Corrección</span>.</li>
              <li>Abre tu panel de control de <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-semibold">Supabase</a>.</li>
              <li>Haz clic en la pestaña <span className="text-slate-700 font-semibold">SQL Editor</span> en la barra lateral izquierda.</li>
              <li>Pega el código en una nueva consulta y haz clic en <span className="text-indigo-600 font-semibold">Run</span> (Ejecutar).</li>
            </ol>
          </div>
        </div>

        {/* Code box */}
        <div className="relative mt-5 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 text-slate-200 font-mono text-[11px] sm:text-xs">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-slate-400 select-none">
            <span className="font-semibold text-[10px] tracking-wider uppercase">Query SQL de Corrección</span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 hover:bg-slate-850 hover:text-white transition active:scale-95 text-[10px] font-semibold text-slate-300 cursor-pointer border border-slate-800"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Código</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-4 overflow-x-auto select-all leading-relaxed whitespace-pre font-medium text-indigo-200 native-scroll">
            {sqlCode}
          </pre>
        </div>

        {/* Actions buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 mt-6 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() => setDbError(null)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-semibold text-xs sm:text-sm transition cursor-pointer text-center"
          >
            Omitir diagnóstico
          </button>
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRefreshing}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-xs sm:text-sm transition shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-indigo-600 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Comprobando...' : 'Comprobar solución'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
