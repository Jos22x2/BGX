import React, { useState } from 'react';
import { Copy, Check, Database, ExternalLink, ShieldCheck, Zap } from 'lucide-react';

const SQL_CODE = `-- =========================================================
-- ESQUEMA DE BASE DE DATOS PARA "BGX" EN SUPABASE
-- =========================================================

-- 1. Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA: PROFILES (Perfiles de usuarios)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  status_message TEXT DEFAULT '¡Hola! Estoy usando BGX.',
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABLA: CHATS (Conversaciones directas y grupos)
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Asegurar columnas si la tabla chats ya existía previamente
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='chats' AND column_name='type') THEN
    ALTER TABLE public.chats ADD COLUMN type TEXT NOT NULL DEFAULT 'direct';
  END IF;
END $$;

-- 4. TABLA: CHAT_PARTICIPANTS (Participantes de cada chat)
CREATE TABLE IF NOT EXISTS public.chat_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

-- 5. TABLA: MESSAGES (Mensajes en tiempo real)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. TABLA: CALLS (Historial de llamadas WebRTC)
CREATE TABLE IF NOT EXISTS public.calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL,
  caller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'video' CHECK (type IN ('voice', 'video')),
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'accepted', 'rejected', 'missed', 'ended')),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0
);

-- Índices y Realtime
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON public.chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat ON public.chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON public.messages(chat_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_calls_participants ON public.calls(caller_id, callee_id, started_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver perfiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editar propio perfil" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Crear propio perfil" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Ver mis chats" ON public.chats FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_participants.chat_id = chats.id AND chat_participants.user_id = auth.uid())
);
CREATE POLICY "Crear chats" ON public.chats FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Ver participantes de mis chats" ON public.chat_participants FOR SELECT TO authenticated USING (
  true
);
CREATE POLICY "Unirse a chats" ON public.chat_participants FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Ver mensajes de mis chats" ON public.messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_participants.chat_id = messages.chat_id AND chat_participants.user_id = auth.uid())
);
CREATE POLICY "Enviar mensajes" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_participants.chat_id = messages.chat_id AND chat_participants.user_id = auth.uid())
);
CREATE POLICY "Actualizar estado de mensajes" ON public.messages FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_participants.chat_id = messages.chat_id AND chat_participants.user_id = auth.uid())
);

CREATE POLICY "Ver mis llamadas" ON public.calls FOR SELECT TO authenticated USING (auth.uid() = caller_id OR auth.uid() = callee_id);
CREATE POLICY "Crear llamada" ON public.calls FOR INSERT TO authenticated WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "Actualizar llamada" ON public.calls FOR UPDATE TO authenticated USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Trigger perfil automático
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/bottts/svg?seed=' || new.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();`;

export const SqlSchemaPanel: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex-1 bg-slate-50 flex flex-col h-full native-scroll p-4 sm:p-6 md:p-8 select-none text-slate-900 overscroll-contain safe-pb">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-6 h-6 text-indigo-600" />
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Esquema SQL de Supabase</h2>
            </div>
            <p className="text-sm text-slate-500">
              Estructura de tablas, publicaciones Realtime y políticas RLS para desplegar BGX.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer active:scale-95 ${
              copied
                ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>¡Copiado al portapapeles!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar SQL Completo</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Instructions Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center mb-2">
              1
            </span>
            <h4 className="text-sm font-semibold text-slate-900">Abre Supabase</h4>
            <p className="text-xs text-slate-500 mt-1">
              Crea o abre tu proyecto en <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-indigo-600 underline inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-3 h-3" /></a>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center mb-2">
              2
            </span>
            <h4 className="text-sm font-semibold text-slate-900">Ejecuta el Script</h4>
            <p className="text-xs text-slate-500 mt-1">
              Ve a la sección <strong>SQL Editor</strong>, pega el código de abajo y pulsa <strong>Run</strong>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center mb-2">
              3
            </span>
            <h4 className="text-sm font-semibold text-slate-900">Configura Variables</h4>
            <p className="text-xs text-slate-500 mt-1">
              Copia la URL y anon key de <strong>Project Settings &gt; API</strong> a tu .env o Ajustes.
            </p>
          </div>
        </div>

        {/* Code Snippet Container */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
          <div className="px-4 sm:px-5 py-3 bg-slate-800/90 border-b border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs font-mono text-slate-300 ml-2">bgx_schema_v1.sql</span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs text-slate-300 hover:text-white active:scale-95 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>

          <pre className="p-4 sm:p-5 font-mono text-xs text-slate-200 native-scroll native-scroll-x leading-relaxed max-h-[500px]">
            <code>{SQL_CODE}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
