import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Chat, Message, Profile } from '../types';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
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
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const typingTimeoutRef = useRef<Record<string, number>>({});

  // Load real chats from Supabase
  const loadChats = useCallback(async () => {
    if (!user || !isSupabaseConfigured || !supabase) {
      setChats([]);
      return;
    }

    try {
      const { data: participations, error: pErr } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', user.id);

      if (pErr || !participations || participations.length === 0) {
        setChats([]);
        return;
      }

      const chatIds = participations.map(p => p.chat_id);
      const { data: chatsData, error: cErr } = await supabase
        .from('chats')
        .select('*')
        .in('id', chatIds)
        .order('updated_at', { ascending: false });

      if (cErr || !chatsData || chatsData.length === 0) {
        setChats([]);
        return;
      }

      // Populate participant details and last message for each chat
      const detailedChats: Chat[] = await Promise.all(
        chatsData.map(async (c) => {
          // Find other participant's profile
          const { data: otherPart } = await supabase
            .from('chat_participants')
            .select('user_id, profiles(*)')
            .eq('chat_id', c.id)
            .neq('user_id', user.id)
            .single();

          // Get last message in this chat
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', c.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Count unread messages from other user
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', c.id)
            .neq('sender_id', user.id)
            .neq('status', 'read');

          const otherProfile = otherPart?.profiles as unknown as Profile | undefined;

          return {
            ...c,
            other_participant: otherProfile,
            last_message: (lastMsg as unknown as Message) || undefined,
            unread_count: unreadCount || 0,
          };
        })
      );

      // Sort chats by most recent message or update
      detailedChats.sort((a, b) => {
        const timeA = new Date(a.last_message?.created_at || a.updated_at).getTime();
        const timeB = new Date(b.last_message?.created_at || b.updated_at).getTime();
        return timeB - timeA;
      });

      setChats(detailedChats);
    } catch (err) {
      console.error('Error loading chats:', err);
      setChats([]);
    }
  }, [user]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Set default active chat on desktop if chats exist
  useEffect(() => {
    if (!activeChatId && chats.length > 0 && typeof window !== 'undefined' && window.innerWidth > 768) {
      setActiveChatId(chats[0].id);
    }
  }, [chats, activeChatId]);

  // Mark messages as read in Supabase
  const markMessagesAsRead = useCallback(async (chatId: string) => {
    if (!user || !isSupabaseConfigured || !supabase) return;

    try {
      await supabase
        .from('messages')
        .update({ status: 'read' })
        .eq('chat_id', chatId)
        .neq('sender_id', user.id)
        .neq('status', 'read');

      setChats(prev =>
        prev.map(c => (c.id === chatId ? { ...c, unread_count: 0 } : c))
      );
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, [user]);

  // Load messages when activeChatId changes
  useEffect(() => {
    if (!activeChatId || !user || !isSupabaseConfigured || !supabase) {
      setMessages([]);
      return;
    }

    let isCancelled = false;

    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', activeChatId)
          .order('created_at', { ascending: true });

        if (!isCancelled) {
          if (!error && data) {
            setMessages(data as Message[]);
            markMessagesAsRead(activeChatId);
          } else {
            setMessages([]);
          }
          setIsLoadingMessages(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Error fetching messages:', err);
          setMessages([]);
          setIsLoadingMessages(false);
        }
      }
    };

    fetchMessages();

    return () => {
      isCancelled = true;
    };
  }, [activeChatId, user, markMessagesAsRead]);

  // Realtime subscriptions for Supabase messages and typing
  useEffect(() => {
    if (!user || !isSupabaseConfigured || !supabase) return;

    // 1. Supabase Postgres Realtime for messages
    const messagesChannel = supabase
      .channel('public:messages_realtime')
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
          } else {
            if (newMsg.sender_id !== user.id) {
              soundEffects.playMessageReceived();
              // Optimistically bump unread count and latest message for this chat
              setChats(prev =>
                prev.map(c => {
                  if (c.id === newMsg.chat_id) {
                    return {
                      ...c,
                      unread_count: (c.unread_count || 0) + 1,
                      last_message: newMsg,
                      updated_at: newMsg.created_at,
                    };
                  }
                  return c;
                })
              );
            }
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

    // 2. Realtime Typing Broadcast channel
    const typingChannel = supabase
      .channel('bgx_typing_channel')
      .on('broadcast', { event: 'typing' }, (event) => {
        const { chatId, userId, isTyping } = event.payload || {};
        if (userId && userId !== user.id && chatId) {
          setTypingUsers(prev => ({ ...prev, [chatId]: Boolean(isTyping) }));
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
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(typingChannel);
    };
  }, [user, activeChatId, loadChats, markMessagesAsRead]);

  // Send message
  const sendMessage = async (content: string) => {
    if (!user || !activeChatId || !content.trim() || !isSupabaseConfigured || !supabase) return;

    const messageContent = content.trim();
    const newMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      chat_id: activeChatId,
      sender_id: user.id,
      content: messageContent,
      status: 'sent',
      created_at: new Date().toISOString(),
    };

    soundEffects.playMessageSent();

    // Optimistic UI update
    setMessages(prev => [...prev, newMsg]);
    sendTyping(false);

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

      loadChats();
    } catch (err) {
      console.error('Error inserting message into Supabase:', err);
    }
  };

  // Broadcast typing status
  const sendTyping = (isTyping: boolean) => {
    if (!user || !activeChatId || !isSupabaseConfigured || !supabase) return;

    let channel = supabase.getChannels().find(ch => ch.topic === 'realtime:bgx_typing_channel');
    if (!channel) {
      channel = supabase.channel('bgx_typing_channel');
    }

    const payload = {
      chatId: activeChatId,
      userId: user.id,
      isTyping,
    };

    if (channel.state === 'joined') {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload,
      });
    } else {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel!.send({
            type: 'broadcast',
            event: 'typing',
            payload,
          });
        }
      });
    }
  };

  // Start direct chat with a profile
  const startDirectChat = async (targetUser: Profile): Promise<string> => {
    if (!user || !isSupabaseConfigured || !supabase) return '';

    // Check if chat already exists in state
    const existing = chats.find(c => c.other_participant?.id === targetUser.id);
    if (existing) {
      setActiveChatId(existing.id);
      return existing.id;
    }

    const chatId = `chat_${[user.id, targetUser.id].sort().join('_')}`;

    try {
      await supabase.from('chats').upsert({ id: chatId, type: 'direct' });
      await supabase.from('chat_participants').upsert([
        { chat_id: chatId, user_id: user.id },
        { chat_id: chatId, user_id: targetUser.id },
      ]);

      await loadChats();
      setActiveChatId(chatId);
      return chatId;
    } catch (err) {
      console.error('Error starting direct chat:', err);
      return chatId;
    }
  };

  const activeChat = chats.find(c => c.id === activeChatId) || null;

  // Filtered chats by search query
  const filteredChats = chats.filter(c => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const nameMatch = c.other_participant?.name?.toLowerCase().includes(query);
    const msgMatch = c.last_message?.content?.toLowerCase().includes(query);
    return Boolean(nameMatch || msgMatch);
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
