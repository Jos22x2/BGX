import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Chat, Message, Profile } from '../types';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured, LocalDataStore, sendSignalingMessage } from '../lib/supabase';
import { soundEffects } from '../lib/audio';

interface ChatContextType {
  chats: Chat[];
  activeChatId: string | null;
  activeChat: Chat | null;
  messages: Message[];
  isLoadingMessages: boolean;
  typingUsers: Record<string, boolean>; // chatId -> boolean (other user typing)
  setActiveChatId: (chatId: string | null) => void;
  sendMessage: (content: string) => Promise<void>;
  markMessagesAsRead: (chatId: string) => Promise<void>;
  startDirectChat: (targetUser: Profile) => Promise<string>;
  sendTyping: (isTyping: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredChats: Chat[];
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, availableProfiles } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const typingTimeoutRef = useRef<Record<string, number>>({});

  // Generate / Load Chats based on participants
  const loadChats = useCallback(() => {
    if (!user) return;

    if (isSupabaseConfigured && supabase) {
      const fetchSupabaseChats = async () => {
        try {
          const { data: participations, error: pErr } = await supabase
            .from('chat_participants')
            .select('chat_id')
            .eq('user_id', user.id);

          if (!pErr && participations) {
            const chatIds = participations.map(p => p.chat_id);
            if (chatIds.length === 0) {
              setChats([]);
              return;
            }

            const { data: chatsData } = await supabase
              .from('chats')
              .select('*')
              .in('id', chatIds)
              .order('updated_at', { ascending: false });

            if (chatsData) {
              // Populate other participant and last message
              const detailedChats: Chat[] = await Promise.all(
                chatsData.map(async (c) => {
                  const { data: otherPart } = await supabase
                    .from('chat_participants')
                    .select('user_id, profiles(*)')
                    .eq('chat_id', c.id)
                    .neq('user_id', user.id)
                    .single();

                  const { data: lastMsg } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('chat_id', c.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                  const otherProfile = otherPart?.profiles as unknown as Profile | undefined;

                  return {
                    ...c,
                    other_participant: otherProfile,
                    last_message: (lastMsg as unknown as Message) || undefined,
                    unread_count: 0,
                  };
                })
              );

              setChats(detailedChats);
              return;
            }
          }
        } catch {
          // fallback
        }
      };

      fetchSupabaseChats();
      return;
    }

    // Local Mock / Demo Chats
    const storedChatsData = localStorage.getItem('bgx_local_chats');
    let localChats: Chat[] = [];
    if (storedChatsData) {
      try {
        localChats = JSON.parse(storedChatsData);
      } catch {
        localChats = [];
      }
    }

    // If empty, generate starter chats with available profiles
    if (localChats.length === 0 && availableProfiles.length > 0) {
      const otherProfiles = availableProfiles.filter(p => p.id !== user.id);
      localChats = otherProfiles.map(peer => {
        const chatId = `chat_${[user.id, peer.id].sort().join('_')}`;
        const chatMsgs = LocalDataStore.getMessages(chatId);
        const lastMsg = chatMsgs.length > 0 ? chatMsgs[chatMsgs.length - 1] : undefined;

        return {
          id: chatId,
          type: 'direct',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          updated_at: lastMsg?.created_at || new Date().toISOString(),
          other_participant: peer,
          last_message: lastMsg,
          unread_count: lastMsg && lastMsg.sender_id !== user.id && lastMsg.status !== 'read' ? 1 : 0,
        };
      });
      localStorage.setItem('bgx_local_chats', JSON.stringify(localChats));
    } else {
      // Re-link other_participant and last messages
      localChats = localChats.map(c => {
        const peer = availableProfiles.find(p => p.id === c.other_participant?.id) || c.other_participant;
        const chatMsgs = LocalDataStore.getMessages(c.id);
        const lastMsg = chatMsgs.length > 0 ? chatMsgs[chatMsgs.length - 1] : c.last_message;
        const unreadCount = chatMsgs.filter(m => m.sender_id !== user.id && m.status !== 'read').length;

        return {
          ...c,
          other_participant: peer,
          last_message: lastMsg,
          unread_count: unreadCount,
        };
      });
    }

    // Sort by last message / update time
    localChats.sort((a, b) => {
      const timeA = new Date(a.last_message?.created_at || a.updated_at).getTime();
      const timeB = new Date(b.last_message?.created_at || b.updated_at).getTime();
      return timeB - timeA;
    });

    setChats(localChats);
  }, [user, availableProfiles]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Set default active chat if none selected on desktop
  useEffect(() => {
    if (!activeChatId && chats.length > 0 && typeof window !== 'undefined' && window.innerWidth > 768) {
      setActiveChatId(chats[0].id);
    }
  }, [chats, activeChatId]);

  // Load messages when activeChatId changes
  useEffect(() => {
    if (!activeChatId || !user) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setIsLoadingMessages(true);

      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', activeChatId)
            .order('created_at', { ascending: true });

          if (!error && data) {
            setMessages(data as Message[]);
            setIsLoadingMessages(false);
            markMessagesAsRead(activeChatId);
            return;
          }
        } catch {
          // fallback
        }
      }

      // Local store messages
      const msgs = LocalDataStore.getMessages(activeChatId);
      setMessages(msgs);
      setIsLoadingMessages(false);
      markMessagesAsRead(activeChatId);
    };

    fetchMessages();
  }, [activeChatId, user]);

  // Mark messages as read
  const markMessagesAsRead = async (chatId: string) => {
    if (!user) return;

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('messages')
        .update({ status: 'read' })
        .eq('chat_id', chatId)
        .neq('sender_id', user.id)
        .neq('status', 'read');
    } else {
      const msgs = LocalDataStore.getMessages(chatId);
      let changed = false;
      msgs.forEach(m => {
        if (m.sender_id !== user.id && m.status !== 'read') {
          m.status = 'read';
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem(`bgx_messages_${chatId}`, JSON.stringify(msgs));
        LocalDataStore.broadcast('messages_read', { chatId, readerId: user.id });
      }
    }

    // Update unread badges in local chat list
    setChats(prev =>
      prev.map(c => (c.id === chatId ? { ...c, unread_count: 0 } : c))
    );
  };

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;

    // 1. Supabase Realtime Postgres Changes
    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('public:messages')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const newMsg = payload.new as Message;
            if (newMsg.chat_id === activeChatId) {
              setMessages(prev => (prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]));
              if (newMsg.sender_id !== user.id) {
                soundEffects.playMessageReceived();
                markMessagesAsRead(newMsg.chat_id);
              }
            } else if (newMsg.sender_id !== user.id) {
              soundEffects.playMessageReceived();
            }
            loadChats();
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages' },
          (payload) => {
            const updatedMsg = payload.new as Message;
            setMessages(prev => prev.map(m => (m.id === updatedMsg.id ? updatedMsg : m)));
            loadChats();
          }
        )
        .subscribe();

      // Realtime Typing Broadcast
      const typingChannel = supabase
        .channel('bgx_typing_channel')
        .on('broadcast', { event: 'typing' }, (event) => {
          const { chatId, userId, isTyping } = event.payload;
          if (userId !== user.id) {
            setTypingUsers(prev => ({ ...prev, [chatId]: isTyping }));
            if (isTyping) {
              if (typingTimeoutRef.current[chatId]) {
                window.clearTimeout(typingTimeoutRef.current[chatId]);
              }
              typingTimeoutRef.current[chatId] = window.setTimeout(() => {
                setTypingUsers(prev => ({ ...prev, [chatId]: false }));
              }, 3000);
            }
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(typingChannel);
      };
    }

    // 2. BroadcastChannel fallback for multi-tab testing
    const unsubscribe = LocalDataStore.subscribe((type, payload) => {
      if (type === 'message_inserted') {
        const msg = payload as Message;
        if (msg.chat_id === activeChatId) {
          setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]));
          if (msg.sender_id !== user.id) {
            soundEffects.playMessageReceived();
            markMessagesAsRead(msg.chat_id);
          }
        } else if (msg.sender_id !== user.id) {
          soundEffects.playMessageReceived();
        }
        loadChats();
      } else if (type === 'message_updated' || type === 'messages_read') {
        if (activeChatId) {
          const msgs = LocalDataStore.getMessages(activeChatId);
          setMessages(msgs);
        }
        loadChats();
      } else if (type === 'webrtc-signal') {
        const signal = payload as { type: string; chatId?: string; userId?: string; isTyping?: boolean };
        if (signal.type === 'typing' && signal.chatId && signal.userId !== user.id) {
          const cId = signal.chatId;
          const isTyping = Boolean(signal.isTyping);
          setTypingUsers(prev => ({ ...prev, [cId]: isTyping }));
          if (isTyping) {
            if (typingTimeoutRef.current[cId]) {
              window.clearTimeout(typingTimeoutRef.current[cId]);
            }
            typingTimeoutRef.current[cId] = window.setTimeout(() => {
              setTypingUsers(prev => ({ ...prev, [cId]: false }));
            }, 3000);
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user, activeChatId, loadChats]);

  // Send message
  const sendMessage = async (content: string) => {
    if (!user || !activeChatId || !content.trim()) return;

    const newMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      chat_id: activeChatId,
      sender_id: user.id,
      content: content.trim(),
      status: 'sent',
      created_at: new Date().toISOString(),
    };

    // Play sent sound
    soundEffects.playMessageSent();

    // Optimistic UI update
    setMessages(prev => [...prev, newMsg]);

    // Send typing off
    sendTyping(false);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('messages').insert({
          id: newMsg.id,
          chat_id: newMsg.chat_id,
          sender_id: newMsg.sender_id,
          content: newMsg.content,
          status: 'sent',
        });
        await supabase
          .from('chats')
          .update({ updated_at: newMsg.created_at })
          .eq('id', activeChatId);
      } catch {
        // save locally
        LocalDataStore.saveMessage(newMsg);
      }
    } else {
      LocalDataStore.saveMessage(newMsg);
    }

    // Update local chat list
    setChats(prev =>
      prev.map(c =>
        c.id === activeChatId
          ? { ...c, last_message: newMsg, updated_at: newMsg.created_at }
          : c
      )
    );
  };

  // Broadcast typing status
  const sendTyping = (isTyping: boolean) => {
    if (!user || !activeChatId) return;

    sendSignalingMessage(`chat:${activeChatId}`, {
      type: 'typing',
      chatId: activeChatId,
      userId: user.id,
      isTyping,
    });
  };

  // Start direct chat with a profile
  const startDirectChat = async (targetUser: Profile): Promise<string> => {
    if (!user) return '';

    // Check if chat already exists
    const existing = chats.find(c => c.other_participant?.id === targetUser.id);
    if (existing) {
      setActiveChatId(existing.id);
      return existing.id;
    }

    const chatId = `chat_${[user.id, targetUser.id].sort().join('_')}`;
    const newChat: Chat = {
      id: chatId,
      type: 'direct',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      other_participant: targetUser,
      unread_count: 0,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('chats').upsert({ id: chatId, type: 'direct' });
        await supabase.from('chat_participants').upsert([
          { chat_id: chatId, user_id: user.id },
          { chat_id: chatId, user_id: targetUser.id },
        ]);
      } catch {
        // fallback
      }
    }

    const updatedChats = [newChat, ...chats];
    setChats(updatedChats);
    localStorage.setItem('bgx_local_chats', JSON.stringify(updatedChats));
    setActiveChatId(chatId);
    return chatId;
  };

  const activeChat = chats.find(c => c.id === activeChatId) || null;

  // Filtered chats by search query
  const filteredChats = chats.filter(c => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const nameMatch = c.other_participant?.name.toLowerCase().includes(query);
    const msgMatch = c.last_message?.content.toLowerCase().includes(query);
    return nameMatch || msgMatch;
  });

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChatId,
        activeChat,
        messages,
        isLoadingMessages,
        typingUsers,
        setActiveChatId,
        sendMessage,
        markMessagesAsRead,
        startDirectChat,
        sendTyping,
        searchQuery,
        setSearchQuery,
        filteredChats,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};
