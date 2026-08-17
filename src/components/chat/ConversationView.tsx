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
  Lock,
  Laptop,
  X,
} from 'lucide-react';

interface ConversationViewProps {
  onBack?: () => void;
}

const COMMON_EMOJIS = ['😀', '😂', '😍', '👍', '🙏', '🔥', '🎉', '❤️', '👏', '🚀', '💯', '✨'];

export const ConversationView: React.FC<ConversationViewProps> = ({ onBack }) => {
  const { activeChat, activeChatId, messages, isLoadingMessages, sendMessage, sendTyping, typingUsers } = useChat();
  const { user } = useAuth();
  const { startCall } = useCall();
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Adjust textarea height automatically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
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
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
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
            <div className="flex items-center justify-center my-3">
              <span className="px-3 py-1 bg-[#ffffff] rounded-md text-[12px] font-normal text-[#54656f] wa-bubble-shadow select-none">
                {msgDate}
              </span>
            </div>
          )}

          <div
            className={`flex w-full mb-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`relative max-w-[85%] sm:max-w-[70%] px-3 py-1.5 rounded-lg text-[14.2px] leading-relaxed wa-bubble-shadow break-words select-text ${
                isMe
                  ? 'bg-[#d9fdd3] text-[#111b21] rounded-tr-none'
                  : 'bg-[#ffffff] text-[#111b21] rounded-tl-none'
              }`}
            >
              <p className="whitespace-pre-wrap pb-0.5">{msg.content}</p>

              {/* Timestamp & Status Check in Bottom Right */}
              <div className="flex items-center justify-end gap-1 -mb-0.5 float-right ml-3 text-[11px] text-[#667781] select-none">
                <span>{formatMessageTime(msg.created_at)}</span>
                {isMe && (
                  <span className="inline-flex items-center ml-0.5">
                    {msg.status === 'read' ? (
                      <CheckCheck className="w-4 h-4 text-[#53bdeb]" title="Leído" />
                    ) : msg.status === 'delivered' ? (
                      <CheckCheck className="w-4 h-4 text-[#8696a0]" title="Entregado" />
                    ) : (
                      <Check className="w-4 h-4 text-[#8696a0]" title="Enviado" />
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        </React.Fragment>
      );
    });
  };

  // WhatsApp Web Empty State when no chat is selected at all
  if (!activeChatId) {
    return (
      <main className="flex-1 bg-[#f0f2f5] border-b-[6px] border-[#00a884] hidden md:flex flex-col items-center justify-center p-8 text-center select-none h-full">
        <div className="max-w-md flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-[#dfe5e7]/60 flex items-center justify-center mb-6 text-[#54656f]">
            <Laptop className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-light text-[#41525d] mb-3">BGX para Web</h3>
          <p className="text-[14px] text-[#667781] leading-relaxed mb-8">
            Envía y recibe mensajes, fotos y realiza llamadas de voz o video en tiempo real sin salir de tu navegador.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-[#8696a0]">
            <Lock className="w-3.5 h-3.5" />
            <span>Cifrado de extremo a extremo en tiempo real</span>
          </div>
        </div>
      </main>
    );
  }

  // Loading chat state if activeChat is resolving
  if (!activeChat) {
    return (
      <main className="flex-1 flex flex-col h-full bg-[#efeae2] relative w-full">
        <header className="px-3 sm:px-4 py-2.5 bg-[#f0f2f5] border-b border-[#e9edef] flex items-center justify-between z-20 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Volver a los chats"
                className="md:hidden p-1.5 -ml-1 rounded-full text-[#54656f] hover:text-[#111b21] hover:bg-[#e9edef] transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.5px]" />
              </button>
            )}
            <div className="w-10 h-10 rounded-full bg-[#dfe5e7] animate-pulse" />
            <div className="space-y-1">
              <div className="w-24 h-3.5 bg-[#dfe5e7] rounded-sm animate-pulse" />
              <div className="w-16 h-2.5 bg-[#dfe5e7] rounded-sm animate-pulse" />
            </div>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-[#54656f]">
          <span className="w-7 h-7 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-semibold">Cargando conversación...</p>
        </div>
      </main>
    );
  }

  return (
    <main
      id="conversation-panel"
      aria-label="Conversación activa"
      className="flex-1 flex flex-col h-full overflow-hidden relative w-full"
    >
      {/* Header (WhatsApp style) */}
      <header className="px-3 sm:px-4 py-2.5 bg-[#f0f2f5] border-b border-[#e9edef] flex items-center justify-between z-20 flex-shrink-0 select-none">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Back button on mobile */}
          {onBack && (
            <button
              type="button"
              id="mobile-back-to-chats-btn"
              onClick={onBack}
              aria-label="Volver a los chats"
              className="md:hidden p-1.5 -ml-1 rounded-full text-[#54656f] hover:text-[#111b21] hover:bg-[#e9edef] transition cursor-pointer active:scale-90"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5px]" />
            </button>
          )}

          {/* Peer Avatar */}
          <div
            className="relative flex-shrink-0 cursor-pointer"
            onClick={() => setShowInfoDrawer(!showInfoDrawer)}
          >
            <img
              src={peer?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${peer?.id}`}
              alt={peer?.name || 'Contacto'}
              className="w-10 h-10 rounded-full object-cover bg-[#dfe5e7]"
            />
            {peer?.is_online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#25d366] border-2 border-white" />
            )}
          </div>

          {/* Peer Info */}
          <div className="overflow-hidden min-w-0 cursor-pointer" onClick={() => setShowInfoDrawer(!showInfoDrawer)}>
            <h3
              className="text-[15px] font-semibold text-[#111b21] truncate hover:text-[#00a884] transition"
            >
              {peer?.name || 'Contacto BGX'}
            </h3>
            <div className="text-[12px] text-[#667781] truncate">
              {isPeerTyping ? (
                <span className="text-[#25d366] font-semibold">
                  escribiendo...
                </span>
              ) : peer?.is_online ? (
                <span>en línea</span>
              ) : (
                <span>desconectado</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls (Video Call, Voice Call, Info) */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 text-[#54656f]">
          <button
            type="button"
            id="video-call-btn"
            onClick={() => peer && startCall(peer, 'video', activeChat.id)}
            className="p-2 sm:p-2.5 rounded-full hover:bg-[#e9edef] hover:text-[#111b21] transition cursor-pointer active:scale-95"
            title="Videollamada"
          >
            <Video className="w-5 h-5" />
          </button>

          <button
            type="button"
            id="voice-call-btn"
            onClick={() => peer && startCall(peer, 'voice', activeChat.id)}
            className="p-2 sm:p-2.5 rounded-full hover:bg-[#e9edef] hover:text-[#111b21] transition cursor-pointer active:scale-95"
            title="Llamada de voz"
          >
            <Phone className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setShowInfoDrawer(!showInfoDrawer)}
            className="p-2 sm:p-2.5 rounded-full hover:bg-[#e9edef] hover:text-[#111b21] transition cursor-pointer active:scale-95"
            title="Información del contacto"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Messages Scroll Area with WhatsApp Wallpaper Pattern */}
      <div className="flex-1 wa-chat-wallpaper native-scroll px-3 sm:px-8 py-3 space-y-1 overscroll-contain">
        {/* End-to-End Encryption Banner at top */}
        <div className="flex justify-center mb-4">
          <div className="max-w-md bg-[#ffeecd] border border-[#f5c368]/40 rounded-lg px-3 py-1.5 text-center text-[11px] text-[#54656f] shadow-2xs select-none flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3 text-[#f59e0b] flex-shrink-0" />
            <span>Los mensajes y las llamadas están cifrados de extremo a extremo. Nadie fuera de este chat puede verlos ni escucharlos.</span>
          </div>
        </div>

        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-3 border-[#00a884] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center text-[#667781] select-none">
            <p className="text-sm font-semibold text-[#111b21]">¡Inicia la conversación!</p>
            <p className="text-xs text-[#667781] mt-1">
              Envía un mensaje para comenzar a chatear en tiempo real.
            </p>
          </div>
        ) : (
          renderMessageGroups()
        )}

        {/* Typing indicator bubble */}
        {isPeerTyping && (
          <div className="flex items-center gap-2 mb-2">
            <div className="px-3.5 py-2 rounded-lg rounded-tl-none bg-[#ffffff] wa-bubble-shadow flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8696a0] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#8696a0] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#8696a0] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Bar Popover */}
      {showEmojiPicker && (
        <div className="px-3 sm:px-4 py-2 bg-[#f0f2f5] border-t border-[#e9edef] flex items-center gap-2 native-scroll-x z-10">
          <span className="text-xs text-[#54656f] mr-1 font-semibold flex-shrink-0 select-none">Emojis:</span>
          <div className="flex items-center gap-1 flex-nowrap">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleInsertEmoji(emoji)}
                className="p-1.5 hover:bg-[#e9edef] active:scale-125 rounded-lg text-lg transition cursor-pointer flex-shrink-0"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Composer Footer (WhatsApp style) */}
      <form
        onSubmit={handleSend}
        id="message-form"
        className="px-2 sm:px-4 py-2.5 bg-[#f0f2f5] border-t border-[#e9edef] flex items-end gap-1.5 sm:gap-2 z-20 safe-pb"
      >
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 text-[#54656f]">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2 rounded-full active:scale-90 transition cursor-pointer ${
              showEmojiPicker ? 'text-[#00a884] bg-[#d9fdd3]' : 'hover:text-[#111b21] hover:bg-[#e9edef]'
            }`}
            title="Emojis"
          >
            <Smile className="w-5 h-5" />
          </button>
          <button
            type="button"
            id="attach-btn"
            onClick={() => handleInsertEmoji('📎 ')}
            className="p-2 rounded-full hover:text-[#111b21] hover:bg-[#e9edef] active:scale-90 transition cursor-pointer"
            title="Adjuntar"
          >
            <Paperclip className="w-5 h-5" />
          </button>
        </div>

        {/* Text Input Area */}
        <div className="flex-1 relative min-w-0">
          <textarea
            ref={textareaRef}
            id="message-input"
            rows={1}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje"
            className="w-full max-h-28 min-h-[40px] px-3.5 py-2 bg-[#ffffff] rounded-lg text-[14.5px] text-[#111b21] placeholder-[#54656f] focus:outline-none transition resize-none shadow-2xs border border-transparent focus:border-[#00a884]"
          />
        </div>

        {/* Send Button (WhatsApp green circle) */}
        <button
          type="submit"
          id="send-btn"
          disabled={!inputText.trim()}
          className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#008f6f] active:scale-95 text-white disabled:opacity-40 disabled:hover:bg-[#00a884] transition-all shadow-xs cursor-pointer flex-shrink-0 flex items-center justify-center"
          title="Enviar mensaje"
        >
          <Send className="w-4 h-4 ml-0.5" />
        </button>
      </form>

      {/* Info Drawer Modal */}
      {showInfoDrawer && peer && (
        <div className="absolute inset-0 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-80 bg-[#ffffff] border-l border-[#e9edef] p-6 z-30 shadow-2xl native-scroll animate-in slide-in-from-right duration-150 flex flex-col">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-[#e9edef]">
            <h4 className="font-bold text-[#111b21]">Información del Contacto</h4>
            <button
              type="button"
              onClick={() => setShowInfoDrawer(false)}
              className="p-1.5 rounded-full text-[#54656f] hover:text-[#111b21] hover:bg-[#f0f2f5] active:scale-95 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col items-center text-center mb-6">
            <img
              src={peer.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${peer.id}`}
              alt={peer.name}
              className="w-24 h-24 rounded-full object-cover bg-[#dfe5e7] mb-3"
            />
            <h3 className="text-lg font-bold text-[#111b21]">{peer.name}</h3>
            <p className="text-xs text-[#667781] mt-0.5">{peer.email}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#f0f2f5] text-[#54656f]">
              <span className={`w-2 h-2 rounded-full ${peer.is_online ? 'bg-[#25d366]' : 'bg-[#8696a0]'}`} />
              {peer.is_online ? 'En línea' : 'Desconectado'}
            </div>
          </div>

          <div className="space-y-4 flex-1">
            <div className="p-3 bg-[#f0f2f5] rounded-xl">
              <span className="text-[11px] font-bold text-[#54656f] block mb-1">Info / Estado</span>
              <p className="text-xs text-[#111b21]">{peer.status_message || '¡Hola! Estoy usando BGX.'}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowInfoDrawer(false);
                  startCall(peer, 'voice', activeChat.id);
                }}
                className="p-3 rounded-xl bg-[#f0f2f5] hover:bg-[#e9edef] active:scale-95 text-[#111b21] flex flex-col items-center gap-1 text-xs font-semibold transition cursor-pointer"
              >
                <Phone className="w-5 h-5 text-[#00a884]" />
                Llamar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowInfoDrawer(false);
                  startCall(peer, 'video', activeChat.id);
                }}
                className="p-3 rounded-xl bg-[#d9fdd3] hover:bg-[#c2f7b8] active:scale-95 text-[#008069] flex flex-col items-center gap-1 text-xs font-semibold transition cursor-pointer"
              >
                <Video className="w-5 h-5 text-[#00a884]" />
                Videollamada
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
