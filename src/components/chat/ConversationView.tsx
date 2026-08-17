import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import {
  Phone,
  Video,
  Send,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  ArrowLeft,
  Info,
  MoreVertical,
  Circle,
  Clock,
  Sparkles,
} from 'lucide-react';

interface ConversationViewProps {
  onBack?: () => void;
}

const COMMON_EMOJIS = ['👋', '👍', '❤️', '🔥', '✨', '😂', '🎉', '🚀', '💯', '🙏'];

export const ConversationView: React.FC<ConversationViewProps> = ({ onBack }) => {
  const { activeChat, messages, isLoadingMessages, sendMessage, sendTyping, typingUsers } = useChat();
  const { user } = useAuth();
  const { startCall } = useCall();
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<number | null>(null);

  const peer = activeChat?.other_participant;
  const isPeerTyping = activeChat ? Boolean(typingUsers[activeChat.id]) : false;

  // Auto scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('auto');
  }, [activeChat?.id]);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, isPeerTyping]);

  // Handle typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    sendTyping(true);

    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = window.setTimeout(() => {
      sendTyping(false);
    }, 1500);
  };

  // Submit message
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const content = inputText;
    setInputText('');
    setShowEmojiPicker(false);
    await sendMessage(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInsertEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Group messages by day
  const renderMessageGroups = () => {
    let lastDate = '';

    return messages.map((msg, index) => {
      const msgDate = new Date(msg.created_at).toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      const showDateDivider = msgDate !== lastDate;
      lastDate = msgDate;

      const isMe = msg.sender_id === user?.id;

      return (
        <React.Fragment key={msg.id || index}>
          {showDateDivider && (
            <div className="flex items-center justify-center my-4">
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[11px] font-medium text-slate-500 shadow-2xs">
                {msgDate}
              </span>
            </div>
          )}

          <div
            className={`flex w-full mb-2 ${isMe ? 'justify-end' : 'justify-start'} group`}
          >
            <div className={`flex items-end gap-2 max-w-[80%] sm:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Receiver small avatar on first of sequence or hover */}
              {!isMe && (
                <img
                  src={peer?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${peer?.id}`}
                  alt={peer?.name || 'Contacto'}
                  className="w-6 h-6 rounded-full object-cover mb-1 border border-slate-200 flex-shrink-0"
                />
              )}

              {/* Speech Bubble (iMessage Inspired Aesthetic) */}
              <div
                className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-2xs break-words ${
                  isMe
                    ? 'bg-indigo-600 text-white rounded-br-xs'
                    : 'bg-white text-slate-900 border border-slate-200/90 rounded-bl-xs'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* Timestamp & Status Icon */}
                <div
                  className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                    isMe ? 'text-indigo-100' : 'text-slate-400'
                  }`}
                >
                  <span>{formatMessageTime(msg.created_at)}</span>
                  {isMe && (
                    <span>
                      {msg.status === 'read' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-indigo-200 inline" title="Leído" />
                      ) : msg.status === 'delivered' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-indigo-200 inline" title="Entregado" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-indigo-200 inline" title="Enviado" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </React.Fragment>
      );
    });
  };

  if (!activeChat) {
    return (
      <main className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="w-16 h-16 rounded-3xl bg-white border border-slate-200 flex items-center justify-center mb-4 text-indigo-600 shadow-xs">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Bienvenido a BGX</h3>
        <p className="text-sm text-slate-500 max-w-sm">
          Selecciona una conversación del panel lateral o inicia un nuevo chat para enviar mensajes y hacer llamadas en tiempo real.
        </p>
      </main>
    );
  }

  return (
    <main
      id="conversation-panel"
      aria-label="Conversación activa"
      className="flex-1 bg-slate-50 flex flex-col h-full overflow-hidden relative"
    >
      {/* Header */}
      <header className="px-4 sm:px-6 py-3.5 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center justify-between z-20 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button on mobile */}
          {onBack && (
            <button
              type="button"
              id="mobile-back-to-chats-btn"
              onClick={onBack}
              className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Peer Avatar */}
          <div className="relative flex-shrink-0 cursor-pointer" onClick={() => setShowInfoDrawer(!showInfoDrawer)}>
            <img
              src={peer?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${peer?.id}`}
              alt={peer?.name || 'Contacto'}
              className="w-10 h-10 rounded-2xl object-cover border border-slate-200 bg-slate-100"
            />
            {peer?.is_online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-300" />
            )}
          </div>

          {/* Peer Info */}
          <div className="overflow-hidden min-w-0">
            <h3
              className="text-sm sm:text-base font-bold text-slate-900 truncate cursor-pointer hover:text-indigo-600 transition"
              onClick={() => setShowInfoDrawer(!showInfoDrawer)}
            >
              {peer?.name || 'Contacto BGX'}
            </h3>
            <div className="text-xs text-slate-500 truncate flex items-center gap-1.5">
              {isPeerTyping ? (
                <span className="text-indigo-600 font-medium flex items-center gap-1 animate-pulse">
                  <Circle className="w-1.5 h-1.5 fill-indigo-600 text-indigo-600" />
                  Escribiendo...
                </span>
              ) : peer?.is_online ? (
                <span className="text-emerald-600 font-medium">En línea</span>
              ) : (
                <span>Desconectado</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls (Voice Call & Video Call) */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <button
            type="button"
            id="voice-call-btn"
            onClick={() => peer && startCall(peer, 'voice', activeChat.id)}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-100 hover:text-emerald-600 text-slate-700 border border-slate-200 transition shadow-2xs cursor-pointer"
            title="Iniciar llamada de voz"
          >
            <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            type="button"
            id="video-call-btn"
            onClick={() => peer && startCall(peer, 'video', activeChat.id)}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition cursor-pointer"
            title="Iniciar videollamada"
          >
            <Video className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            type="button"
            onClick={() => setShowInfoDrawer(!showInfoDrawer)}
            className="p-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Información del contacto"
          >
            <Info className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-1">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center text-slate-400">
            <p className="text-sm font-medium text-slate-600">¡Sé el primero en escribir!</p>
            <p className="text-xs text-slate-400 mt-1">
              Los mensajes en este chat están protegidos y sincronizados en tiempo real.
            </p>
          </div>
        ) : (
          renderMessageGroups()
        )}

        {/* Typing indicator bubble */}
        {isPeerTyping && (
          <div className="flex items-center gap-2 mb-2">
            <img
              src={peer?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${peer?.id}`}
              alt=""
              className="w-6 h-6 rounded-full object-cover border border-slate-200"
            />
            <div className="px-4 py-2.5 rounded-2xl rounded-bl-xs bg-white border border-slate-200 flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Bar Popover */}
      {showEmojiPicker && (
        <div className="px-4 py-2 bg-white border-t border-slate-200 flex items-center gap-2 overflow-x-auto z-10 shadow-sm">
          <span className="text-xs text-slate-500 mr-1 font-medium">Reacciones rápidas:</span>
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleInsertEmoji(emoji)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-lg transition cursor-pointer hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Message Composer Footer */}
      <form
        onSubmit={handleSend}
        id="message-form"
        className="p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-end gap-2 z-20"
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            id="attach-btn"
            onClick={() => handleInsertEmoji('📷 ')}
            className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            title="Adjuntar archivo o imagen"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2.5 rounded-xl transition cursor-pointer ${
              showEmojiPicker ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            title="Insertar emoji"
          >
            <Smile className="w-5 h-5" />
          </button>
        </div>

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            id="message-input"
            rows={1}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje... (Enter para enviar)"
            className="w-full max-h-32 min-h-[42px] px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          id="send-btn"
          disabled={!inputText.trim()}
          className="p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition shadow-xs cursor-pointer flex-shrink-0"
          title="Enviar mensaje"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>

      {/* Info Drawer Modal */}
      {showInfoDrawer && peer && (
        <div className="absolute top-0 right-0 bottom-0 w-80 bg-white border-l border-slate-200 p-6 z-30 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold text-slate-900">Detalles del Contacto</h4>
            <button
              type="button"
              onClick={() => setShowInfoDrawer(false)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col items-center text-center mb-6">
            <img
              src={peer.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${peer.id}`}
              alt={peer.name}
              className="w-20 h-20 rounded-3xl object-cover border-2 border-slate-200 shadow-md mb-3"
            />
            <h3 className="text-lg font-bold text-slate-900">{peer.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{peer.email}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 border border-slate-200 text-slate-700">
              <span className={`w-2 h-2 rounded-full ${peer.is_online ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {peer.is_online ? 'En línea' : 'Desconectado'}
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">Estado</span>
              <p className="text-xs text-slate-800">{peer.status_message || 'Sin mensaje de estado.'}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowInfoDrawer(false);
                  startCall(peer, 'voice', activeChat.id);
                }}
                className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex flex-col items-center gap-1 text-xs font-medium transition cursor-pointer"
              >
                <Phone className="w-5 h-5 text-emerald-600" />
                Llamar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowInfoDrawer(false);
                  startCall(peer, 'video', activeChat.id);
                }}
                className="p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex flex-col items-center gap-1 text-xs font-medium border border-indigo-200 transition cursor-pointer"
              >
                <Video className="w-5 h-5 text-indigo-600" />
                Videollamada
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
