import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { Search, Plus, Check, CheckCheck, Circle, MessageSquareDashed } from 'lucide-react';
import { NewChatModal } from './NewChatModal';

export const ChatListPanel: React.FC = () => {
  const { filteredChats, activeChatId, setActiveChatId, searchQuery, setSearchQuery, typingUsers } = useChat();
  const { user } = useAuth();
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  const displayedChats = filteredChats.filter(chat => {
    if (filterTab === 'unread') {
      return (chat.unread_count || 0) > 0;
    }
    return true;
  });

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

      {/* Search Bar */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            id="chat-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar mensajes o personas..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 flex items-center gap-1.5 border-b border-slate-200/80">
        <button
          type="button"
          onClick={() => setFilterTab('all')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
            filterTab === 'all'
              ? 'bg-indigo-50 text-indigo-700 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Todos ({filteredChats.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab('unread')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
            filterTab === 'unread'
              ? 'bg-indigo-50 text-indigo-700 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          No leídos
        </button>
      </div>

      {/* Chat List Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
        {displayedChats.length === 0 ? (
          <div className="py-16 px-4 text-center flex flex-col items-center justify-center text-slate-400">
            <MessageSquareDashed className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-700">No hay conversaciones</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {searchQuery ? 'Ningún chat coincide con la búsqueda.' : 'Inicia un nuevo chat con tus contactos.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => setIsNewChatModalOpen(true)}
                className="mt-4 px-3.5 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl text-xs font-medium hover:bg-indigo-100 transition cursor-pointer"
              >
                + Iniciar conversación
              </button>
            )}
          </div>
        ) : (
          displayedChats.map((chat) => {
            const isSelected = activeChatId === chat.id;
            const peer = chat.other_participant;
            const isTyping = Boolean(typingUsers[chat.id]);
            const isMine = chat.last_message?.sender_id === user?.id;

            return (
              <button
                key={chat.id}
                type="button"
                id={`chat-item-${chat.id}`}
                onClick={() => setActiveChatId(chat.id)}
                className={`w-full text-left p-3 rounded-2xl flex items-center gap-3 transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/80 border border-indigo-200/80 shadow-2xs'
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
                    <span className="text-sm font-semibold text-slate-900 truncate">
                      {peer?.name || 'Contacto BGX'}
                    </span>
                    <span className="text-[11px] text-slate-400 flex-shrink-0 ml-1">
                      {formatMessageTime(chat.last_message?.created_at || chat.updated_at)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="text-slate-500 truncate flex items-center gap-1">
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
                          <span className="truncate">
                            {chat.last_message?.content || 'Sin mensajes aún'}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Unread count badge */}
                    {(chat.unread_count || 0) > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 min-w-[18px] text-[10px] font-bold bg-indigo-600 text-white rounded-full flex items-center justify-center flex-shrink-0">
                        {chat.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* New Chat Modal */}
      {isNewChatModalOpen && (
        <NewChatModal onClose={() => setIsNewChatModalOpen(false)} />
      )}
    </aside>
  );
};
