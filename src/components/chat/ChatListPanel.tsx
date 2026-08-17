import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { Search, Plus, Check, CheckCheck, Circle, MessageSquareDashed, X, UserPlus } from 'lucide-react';
import { NewChatModal } from './NewChatModal';

export const ChatListPanel: React.FC = () => {
  const { filteredChats, chats, activeChatId, setActiveChatId, searchQuery, setSearchQuery, typingUsers, startDirectChat } = useChat();
  const { user, availableProfiles } = useAuth();
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

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
      className="w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col h-full select-none"
    >
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Chats</h2>
          <p className="text-xs text-slate-500">Mensajes instantáneos</p>
        </div>
        <button
          type="button"
          id="new-chat-btn"
          onClick={() => setIsNewChatModalOpen(true)}
          className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white flex items-center justify-center shadow-xs transition cursor-pointer"
          title="Iniciar nuevo chat"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Functional Search Bar */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            id="chat-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSearchQuery('');
            }}
            placeholder="Buscar mensajes o personas..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
          {searchQuery && (
            <button
              type="button"
              id="chat-search-clear-btn"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
              title="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live Search Status Info */}
        {searchQuery.trim() && (
          <div className="flex items-center justify-between mt-1.5 px-1 text-[11px] text-slate-500">
            <span>
              {displayedChats.length + matchingOtherProfiles.length}{' '}
              {displayedChats.length + matchingOtherProfiles.length === 1 ? 'resultado' : 'resultados'} para &ldquo;{searchQuery}&rdquo;
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-indigo-600 hover:underline font-medium cursor-pointer"
            >
              Limpiar
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 flex items-center gap-1.5 border-b border-slate-200/80">
        <button
          type="button"
          id="chat-tab-all"
          onClick={() => setFilterTab('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
            filterTab === 'all'
              ? 'bg-indigo-50 text-indigo-700 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Todos</span>
          <span className="px-1.5 py-0.2 bg-slate-200/70 text-slate-700 text-[10px] font-bold rounded-full">
            {filteredChats.length}
          </span>
        </button>

        <button
          type="button"
          id="chat-tab-unread"
          onClick={() => setFilterTab('unread')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
            filterTab === 'unread'
              ? 'bg-indigo-50 text-indigo-700 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>No leídos</span>
          {unreadChatsCount > 0 && (
            <span
              id="unread-filter-badge"
              className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-bold rounded-full shadow-2xs animate-in zoom-in-50"
            >
              {unreadChatsCount}
            </span>
          )}
        </button>
      </div>

      {/* Chat List Items & Search Results */}
      <div className="flex-1 native-scroll divide-y divide-slate-100 p-2 space-y-1 overscroll-contain">
        {displayedChats.length === 0 && matchingOtherProfiles.length === 0 ? (
          <div className="py-16 px-4 text-center flex flex-col items-center justify-center text-slate-400">
            <MessageSquareDashed className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-700">No hay conversaciones</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {searchQuery ? 'Ningún chat coincide con la búsqueda.' : 'Inicia un nuevo chat con tus contactos.'}
            </p>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 px-3 py-1.5 text-xs text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition cursor-pointer"
              >
                Ver todos los chats
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsNewChatModalOpen(true)}
                className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl text-xs font-semibold hover:bg-indigo-100 active:scale-95 transition cursor-pointer"
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
                  className={`w-full text-left p-3 rounded-2xl flex items-center gap-3 transition-all duration-150 cursor-pointer active:scale-[0.99] relative ${
                    isSelected
                      ? 'bg-indigo-50/90 border border-indigo-200/80 shadow-2xs'
                      : hasUnread
                      ? 'bg-slate-50/80 hover:bg-slate-100/90 border border-indigo-100 font-medium'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  {/* Avatar with Online Indicator */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={peer?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${peer?.id || chat.id}`}
                      alt={peer?.name || 'Contacto'}
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-200 bg-slate-100"
                    />
                    {peer?.is_online && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-300"
                        title="En línea"
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm truncate ${hasUnread ? 'font-bold text-slate-950' : 'font-semibold text-slate-900'}`}>
                        {peer?.name || 'Contacto BGX'}
                      </span>
                      <span className={`text-[11px] flex-shrink-0 ml-1 ${hasUnread ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
                        {formatMessageTime(chat.last_message?.created_at || chat.updated_at)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs gap-1.5">
                      <div className="truncate flex items-center gap-1 min-w-0">
                        {isTyping ? (
                          <span className="text-indigo-600 font-medium flex items-center gap-1 animate-pulse">
                            <Circle className="w-1.5 h-1.5 fill-indigo-600 text-indigo-600" />
                            Escribiendo...
                          </span>
                        ) : (
                          <>
                            {isMine && (
                              <span className="inline-flex flex-shrink-0">
                                {chat.last_message?.status === 'read' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-indigo-600" />
                                ) : chat.last_message?.status === 'delivered' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-slate-400" />
                                )}
                              </span>
                            )}
                            <span className={`truncate ${hasUnread ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
                              {chat.last_message?.content || 'Sin mensajes aún'}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Unread count badge */}
                      {hasUnread && (
                        <span
                          id={`chat-unread-badge-${chat.id}`}
                          className="px-2 py-0.5 min-w-[20px] h-[20px] text-[11px] font-bold bg-indigo-600 text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-xs ring-2 ring-indigo-200 animate-in zoom-in-50"
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
              <div className="pt-3 pb-2">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Otros contactos del directorio ({matchingOtherProfiles.length})</span>
                </div>
                {matchingOtherProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => handleStartChatWithContact(profile)}
                    className="w-full text-left p-3 rounded-2xl flex items-center gap-3 hover:bg-slate-50 transition cursor-pointer group"
                  >
                    <img
                      src={profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.id}`}
                      alt={profile.name}
                      className="w-10 h-10 rounded-2xl object-cover border border-slate-200 bg-slate-100 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition truncate">
                          {profile.name}
                        </span>
                        <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-semibold">
                          Iniciar chat
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{profile.email}</p>
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
