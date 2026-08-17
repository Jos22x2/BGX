import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { Search, Plus, Check, CheckCheck, Circle, MessageSquareDashed, X, UserPlus, AlertTriangle, Copy, CheckCircle } from 'lucide-react';
import { NewChatModal } from './NewChatModal';

export const ChatListPanel: React.FC = () => {
  const { filteredChats, chats, activeChatId, setActiveChatId, searchQuery, setSearchQuery, typingUsers, startDirectChat, dbError, setDbError } = useChat();
  const { user, availableProfiles } = useAuth();
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  // Unread chats count
  const unreadChatsCount = chats.filter(c => (c.unread_count || 0) > 0).length;

  const displayedChats = filteredChats.filter(chat => {
    if (filterTab === 'unread') {
      return (chat.unread_count || 0) > 0;
    }
    return true;
  });

  // If searching, find other directory contacts that match but aren't in matching chats yet
  const matchingOtherProfiles = searchQuery.trim()
    ? availableProfiles.filter(p => {
        if (p.id === user?.id) return false;
        const inChats = filteredChats.some(c => c.other_participant?.id === p.id);
        if (inChats) return false;
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
      })
    : [];

  const handleStartChatWithContact = async (contact: (typeof availableProfiles)[0]) => {
    await startDirectChat(contact);
    setSearchQuery('');
  };

  const formatMessageTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <aside
      id="chat-list-panel"
      aria-label="Lista de chats"
      className="w-full bg-[#ffffff] border-r border-[#e9edef] flex flex-col h-full select-none"
    >
      {/* Panel Header (WhatsApp style) */}
      <div className="px-4 py-3.5 bg-[#f0f2f5] border-b border-[#e9edef] flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#111b21] tracking-tight">Chats</h2>
        </div>
        <button
          type="button"
          id="new-chat-btn"
          onClick={() => setIsNewChatModalOpen(true)}
          className="w-9 h-9 rounded-full bg-[#00a884] hover:bg-[#008f6f] active:scale-95 text-white flex items-center justify-center shadow-xs transition-all cursor-pointer"
          title="Nuevo chat"
        >
          <Plus className="w-5 h-5 stroke-[2.5px]" />
        </button>
      </div>

      {/* Search Bar & Filter (WhatsApp style) */}
      <div className="px-3 pt-2.5 pb-2 bg-[#ffffff] border-b border-[#e9edef]/60">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#54656f] absolute left-3 pointer-events-none" />
          <input
            type="text"
            id="chat-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSearchQuery('');
            }}
            placeholder="Buscar o empezar un nuevo chat"
            className="w-full pl-9 pr-8 py-1.5 bg-[#f0f2f5] hover:bg-[#e9edef] focus:bg-[#ffffff] border border-transparent focus:border-[#00a884] rounded-lg text-sm text-[#111b21] placeholder-[#54656f] focus:outline-none transition"
          />
          {searchQuery && (
            <button
              type="button"
              id="chat-search-clear-btn"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 p-1 rounded-full text-[#54656f] hover:text-[#111b21] hover:bg-[#d1d7db]/50 transition cursor-pointer"
              title="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live Search Status Info */}
        {searchQuery.trim() && (
          <div className="flex items-center justify-between mt-1.5 px-1 text-[11px] text-[#54656f]">
            <span>
              {displayedChats.length + matchingOtherProfiles.length}{' '}
              {displayedChats.length + matchingOtherProfiles.length === 1 ? 'resultado' : 'resultados'} para &ldquo;{searchQuery}&rdquo;
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[#00a884] hover:underline font-semibold cursor-pointer"
            >
              Limpiar
            </button>
          </div>
        )}

        {/* Filter Pills (WhatsApp filter tags) */}
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            id="chat-tab-all"
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'all'
                ? 'bg-[#d9fdd3] text-[#008069] font-bold'
                : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]'
            }`}
          >
            <span>Todos</span>
            <span className="text-[10px] opacity-80">
              ({filteredChats.length})
            </span>
          </button>

          <button
            type="button"
            id="chat-tab-unread"
            onClick={() => setFilterTab('unread')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'unread'
                ? 'bg-[#d9fdd3] text-[#008069] font-bold'
                : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]'
            }`}
          >
            <span>No leídos</span>
            {unreadChatsCount > 0 && (
              <span
                id="unread-filter-badge"
                className="px-1.5 py-0.2 bg-[#25d366] text-white text-[10px] font-bold rounded-full"
              >
                {unreadChatsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* RLS Policy Warning Banner */}
      {dbError && (
        <div className="mx-3 my-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 select-text">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold">Error de Base de Datos (RLS)</p>
              <p className="text-[11px] text-red-700 mt-0.5">
                {dbError === 'recursive_policy' 
                  ? 'Se detectó una recursión infinita en la política RLS de "chat_participants". Esto causa que Supabase devuelva errores 500 y bloquee la mensajería.'
                  : `Error de base de datos: ${dbError}`}
              </p>
              
              <div className="mt-2 flex flex-col gap-1 bg-white p-2 rounded-lg border border-red-100 font-mono text-[9px] text-slate-850 select-all whitespace-pre-wrap leading-relaxed">
                <p className="font-bold text-slate-500 select-none">CÓDIGO CORRECTOR SQL (COPIABLE):</p>
                {`DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_participants' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_participants', pol.policyname);
  END LOOP;
END $$;
CREATE POLICY "Ver participantes de mis chats" ON public.chat_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Los usuarios pueden agregarse o invitar a chats" ON public.chat_participants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Los usuarios pueden actualizar su propio registro de participante" ON public.chat_participants FOR UPDATE TO authenticated USING (user_id = auth.uid());

DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages', pol.policyname);
  END LOOP;
END $$;
CREATE POLICY "Ver mensajes de mis chats" ON public.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enviar mensajes en mis chats" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Actualizar estado de mensajes" ON public.messages FOR UPDATE TO authenticated USING (true);`}
              </div>

              <div className="mt-2.5 flex items-center gap-2 select-none">
                <button
                  type="button"
                  onClick={() => {
                    const sql = `DO $$ DECLARE pol RECORD; BEGIN\n  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_participants' LOOP\n    EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_participants', pol.policyname);\n  END LOOP;\nEND $$;\nCREATE POLICY "Ver participantes de mis chats" ON public.chat_participants FOR SELECT TO authenticated USING (true);\nCREATE POLICY "Los usuarios pueden agregarse o invitar a chats" ON public.chat_participants FOR INSERT TO authenticated WITH CHECK (true);\nCREATE POLICY "Los usuarios pueden actualizar su propio registro de participante" ON public.chat_participants FOR UPDATE TO authenticated USING (user_id = auth.uid());\n\nDO $$ DECLARE pol RECORD; BEGIN\n  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages' LOOP\n    EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages', pol.policyname);\n  END LOOP;\nEND $$;\nCREATE POLICY "Ver mensajes de mis chats" ON public.messages FOR SELECT TO authenticated USING (true);\nCREATE POLICY "Enviar mensajes en mis chats" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);\nCREATE POLICY "Actualizar estado de mensajes" ON public.messages FOR UPDATE TO authenticated USING (true);`;
                    navigator.clipboard.writeText(sql);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 2500);
                  }}
                  className="px-2.5 py-1 bg-red-600 text-white rounded font-semibold text-[10px] hover:bg-red-700 transition flex items-center gap-1 cursor-pointer"
                >
                  {copiedSql ? (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar SQL de Corrección</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setDbError(null)}
                  className="px-2 py-1 bg-transparent text-slate-500 hover:text-slate-700 font-semibold text-[10px] transition cursor-pointer"
                >
                  Ocultar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat List Items & Search Results */}
      <div className="flex-1 native-scroll divide-y divide-[#e9edef]/80 overscroll-contain">
        {displayedChats.length === 0 && matchingOtherProfiles.length === 0 ? (
          <div className="py-16 px-4 text-center flex flex-col items-center justify-center text-[#8696a0]">
            <MessageSquareDashed className="w-10 h-10 text-[#aebac1] mb-2" />
            <p className="text-sm font-semibold text-[#111b21]">No hay conversaciones</p>
            <p className="text-xs text-[#667781] mt-1 max-w-xs">
              {searchQuery ? 'Ningún chat coincide con la búsqueda.' : 'Inicia un nuevo chat con tus contactos.'}
            </p>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 px-3 py-1.5 text-xs text-[#00a884] bg-[#d9fdd3] rounded-full font-medium hover:bg-[#c2f7b8] transition cursor-pointer"
              >
                Ver todos los chats
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsNewChatModalOpen(true)}
                className="mt-4 px-4 py-2 bg-[#00a884] text-white rounded-full text-xs font-semibold hover:bg-[#008f6f] active:scale-95 transition cursor-pointer shadow-xs"
              >
                + Iniciar conversación
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Existing Conversations */}
            {displayedChats.map((chat) => {
              const isSelected = activeChatId === chat.id;
              const peer = chat.other_participant;
              const isTyping = Boolean(typingUsers[chat.id]);
              const isMine = chat.last_message?.sender_id === user?.id;
              const unreadCount = chat.unread_count || 0;
              const hasUnread = unreadCount > 0;

              return (
                <button
                  key={chat.id}
                  type="button"
                  id={`chat-item-${chat.id}`}
                  onClick={() => setActiveChatId(chat.id)}
                  className={`w-full text-left px-3.5 py-3 flex items-center gap-3.5 transition-colors duration-100 cursor-pointer ${
                    isSelected
                      ? 'bg-[#f0f2f5]'
                      : hasUnread
                      ? 'bg-[#ffffff] hover:bg-[#f5f6f6]'
                      : 'bg-[#ffffff] hover:bg-[#f5f6f6]'
                  }`}
                >
                  {/* WhatsApp style Avatar with Online Indicator */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={peer?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${peer?.id || chat.id}`}
                      alt={peer?.name || 'Contacto'}
                      className="w-12 h-12 rounded-full object-cover bg-[#dfe5e7]"
                    />
                    {peer?.is_online && (
                      <span
                        className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#25d366] border-2 border-white"
                        title="En línea"
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-[15px] truncate ${hasUnread ? 'font-bold text-[#111b21]' : 'font-normal text-[#111b21]'}`}>
                        {peer?.name || 'Contacto BGX'}
                      </span>
                      <span className={`text-[11px] flex-shrink-0 ml-2 ${hasUnread ? 'text-[#25d366] font-bold' : 'text-[#667781]'}`}>
                        {formatMessageTime(chat.last_message?.created_at || chat.updated_at)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs gap-1.5">
                      <div className="truncate flex items-center gap-1 min-w-0">
                        {isTyping ? (
                          <span className="text-[#25d366] font-semibold flex items-center gap-1">
                            <Circle className="w-1.5 h-1.5 fill-[#25d366] text-[#25d366] animate-pulse" />
                            escribiendo...
                          </span>
                        ) : (
                          <>
                            {isMine && (
                              <span className="inline-flex flex-shrink-0 mr-0.5">
                                {chat.last_message?.status === 'read' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                                ) : chat.last_message?.status === 'delivered' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-[#8696a0]" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-[#8696a0]" />
                                )}
                              </span>
                            )}
                            <span className={`truncate text-[13px] ${hasUnread ? 'font-medium text-[#111b21]' : 'text-[#667781]'}`}>
                              {chat.last_message?.content || 'Sin mensajes aún'}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Unread count badge (WhatsApp green pill) */}
                      {hasUnread && (
                        <span
                          id={`chat-unread-badge-${chat.id}`}
                          className="px-1.5 min-w-[20px] h-[20px] text-[11px] font-bold bg-[#25d366] text-white rounded-full flex items-center justify-center flex-shrink-0"
                        >
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Additional Directory Contacts matching search query */}
            {searchQuery.trim() && matchingOtherProfiles.length > 0 && (
              <div className="pt-2 pb-2 bg-[#f0f2f5]/50">
                <div className="px-4 py-2 text-[11px] font-bold text-[#54656f] uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Otros contactos del directorio ({matchingOtherProfiles.length})</span>
                </div>
                {matchingOtherProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => handleStartChatWithContact(profile)}
                    className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-[#e9edef] transition cursor-pointer group"
                  >
                    <img
                      src={profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.id}`}
                      alt={profile.name}
                      className="w-10 h-10 rounded-full object-cover bg-[#dfe5e7] flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[#111b21] group-hover:text-[#00a884] transition truncate">
                          {profile.name}
                        </span>
                        <span className="text-[10px] text-[#008069] bg-[#d9fdd3] px-2 py-0.5 rounded-full font-bold">
                          Iniciar chat
                        </span>
                      </div>
                      <p className="text-xs text-[#667781] truncate">{profile.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* New Chat Modal */}
      {isNewChatModalOpen && (
        <NewChatModal onClose={() => setIsNewChatModalOpen(false)} />
      )}
    </aside>
  );
};
