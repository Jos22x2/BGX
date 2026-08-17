-- =========================================================
-- ESQUEMA DE BASE DE DATOS PARA "BGX" EN SUPABASE
-- Mensajería Instantánea y Llamadas WebRTC en Tiempo Real
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

-- 3. TABLA: CHATS (Conversaciones 1 a 1 y grupos futuros)
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Asegurar columna 'type' si la tabla 'chats' ya existía previamente
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

-- 6. TABLA: CALLS (Historial de llamadas de voz y video)
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

-- =========================================================
-- ÍNDICES PARA RENDIMIENTO ÓPTIMO
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON public.chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat ON public.chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON public.messages(chat_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_calls_participants ON public.calls(caller_id, callee_id, started_at DESC);

-- =========================================================
-- ACTIVAR PUBLICACIONES EN TIEMPO REAL (Supabase Realtime)
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;

-- =========================================================
-- ROW LEVEL SECURITY (RLS) - SEGURIDAD POR FILAS
-- =========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Políticas de PROFILES
CREATE POLICY "Cualquier usuario autenticado puede ver perfiles" 
  ON public.profiles FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil" 
  ON public.profiles FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden insertar su propio perfil" 
  ON public.profiles FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);

-- Políticas de CHATS
CREATE POLICY "Los usuarios pueden ver los chats donde participan" 
  ON public.chats FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants 
      WHERE chat_participants.chat_id = chats.id 
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Cualquier usuario autenticado puede crear un chat" 
  ON public.chats FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Los participantes pueden actualizar el chat" 
  ON public.chats FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants 
      WHERE chat_participants.chat_id = chats.id 
      AND chat_participants.user_id = auth.uid()
    )
  );

-- Políticas de CHAT_PARTICIPANTS
CREATE POLICY "Los usuarios pueden ver participantes de sus chats" 
  ON public.chat_participants FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants AS cp
      WHERE cp.chat_id = chat_participants.chat_id 
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Los usuarios pueden agregarse o invitar a chats" 
  ON public.chat_participants FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Los usuarios pueden actualizar su propio registro de participante" 
  ON public.chat_participants FOR UPDATE 
  TO authenticated 
  USING (user_id = auth.uid());

-- Políticas de MESSAGES
CREATE POLICY "Los usuarios pueden ver mensajes de sus chats" 
  ON public.messages FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants 
      WHERE chat_participants.chat_id = messages.chat_id 
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Los participantes pueden enviar mensajes en sus chats" 
  ON public.messages FOR INSERT 
  TO authenticated 
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.chat_participants 
      WHERE chat_participants.chat_id = messages.chat_id 
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "El remitente puede actualizar el estado de mensajes" 
  ON public.messages FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants 
      WHERE chat_participants.chat_id = messages.chat_id 
      AND chat_participants.user_id = auth.uid()
    )
  );

-- Políticas de CALLS
CREATE POLICY "Los usuarios pueden ver llamadas donde son caller o callee" 
  ON public.calls FOR SELECT 
  TO authenticated 
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "Los usuarios pueden iniciar llamadas" 
  ON public.calls FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Los participantes de la llamada pueden actualizar su estado" 
  ON public.calls FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- =========================================================
-- TRIGGER AUTOMÁTICO: Crear Profile al registrarse en Auth
-- =========================================================
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
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
