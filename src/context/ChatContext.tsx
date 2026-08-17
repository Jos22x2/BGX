import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
  dbError: string | null;
  setDbError: (error: string | null) => void;
  refreshChats: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, availableProfiles } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, Message[]>>({});
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [dbError, setDbError] = useState<string | null>(null);
  const typingTimeoutRef = useRef<Record<string, number>>({});
  const activeChatIdRef = useRef<string | null>(null);
  activeChatIdRef.current = activeChatId;

  // Load real chats from Supabase
  const loadChats = useCallback(async () => {
    if (!user || !isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { data: participations, error: pErr } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', user.id);

      if (pErr) {
        console.error('Error fetching participations:', pErr);
        if (pErr.message?.toLowerCase().includes('recursion') || pErr.message?.toLowerCase().includes('policy')) {
          setDbError('recursive_policy');
        } else {
          setDbError(pErr.message || 'database_error');
        }
        return;
      }

      if (!participations || participations.length === 0) {
        setDbError(null);
        return;
      }

      const chatIds = participations.map(p => p.chat_id);
      const { data: chatsData, error: cErr } = await supabase
        .from('chats')
        .select('*')
        .in('id', chatIds)
        .order('updated_at', { ascending: false });

      if (cErr) {
        console.error('Error fetching chats:', cErr);
        if (cErr.message?.toLowerCase().includes('recursion') || cErr.message?.toLowerCase().includes('policy')) {
          setDbError('recursive_policy');
        } else {
          setDbError(cErr.message || 'database_error');
        }
        return;
      }

      if (!chatsData || chatsData.length === 0) {
        setDbError(null);
        return;
      }

      setDbError(null);

      // Populate participant details and last message for each chat
      const detailedChats: Chat[] = await Promise.all(
        chatsData.map(async (c) => {
          // Find other participant's user_id safely
          const { data: otherParts } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('chat_id', c.id)
            .neq('user_id', user.id)
            .limit(1);

          const otherUserId = otherParts?.[0]?.user_id;
          let otherProfile: Profile | undefined = undefined;

          if (otherUserId) {
            // Check availableProfiles cache from AuthContext first
            otherProfile = availableProfiles.find(p => p.id === otherUserId);

            if (!otherProfile) {
              const { data: prof } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', otherUserId)
                .maybeSingle();
              if (prof) otherProfile = prof as Profile;
            }

            if (!otherProfile) {
              otherProfile = {
                id: otherUserId,
                name: 'Contacto BGX',
                email: '',
                avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${otherUserId}`,
                status_message: '¡Hola! Estoy usando BGX.',
                is_online: false,
                last_seen: new Date().toISOString(),
                created_at: new Date().toISOString(),
              };
            }
          }

          // Get last message in this chat
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', c.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Count unread messages from other user
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', c.id)
            .neq('sender_id', user.id)
            .neq('status', 'read');

          return {
            ...c,
            other_participant: otherProfile,
            last_message: (lastMsg as unknown as Message) || undefined,
            unread_count: unreadCount || 0,
          };
        })
      );

      // Merge with existing state so optimistic chats are preserved
      setChats(prev => {
        const merged = [...detailedChats];
        // Keep any active optimistic chat not yet returned by Supabase
        prev.forEach(existing => {
          if (!merged.some(m => m.id === existing.id)) {
            merged.push(existing);
          }
        });

        // Sort chats by most recent message or update
        merged.sort((a, b) => {
          const timeA = new Date(a.last_message?.created_at || a.updated_at).getTime();
          const timeB = new Date(b.last_message?.created_at || b.updated_at).getTime();
          return timeB - timeA;
        });

        return merged;
      });
    } catch (err) {
      console.error('Error loading chats:', err);
    }
  }, [user, availableProfiles]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Set default active chat on desktop if chats exist and none selected
  useEffect(() => {
    if (!activeChatId && chats.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 768) {
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
    if (!activeChatId || !user) {
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    let isCancelled = false;

    const fetchMessages = async () => {
      // If we don't have cached messages for this chat, show loader
      if (!messagesByChat[activeChatId] || messagesByChat[activeChatId].length === 0) {
        setIsLoadingMessages(true);
      }

      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', activeChatId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching messages:', error);
          if (error.message?.toLowerCase().includes('recursion') || error.message?.toLowerCase().includes('policy')) {
            setDbError('recursive_policy');
          } else {
            setDbError(error.message || 'database_error');
          }
        } else if (!isCancelled && data) {
          setDbError(null);
          setMessagesByChat(prev => ({
            ...prev,
            [activeChatId]: data as Message[],
          }));
          markMessagesAsRead(activeChatId);
        }
        setIsLoadingMessages(false);
      } catch (err) {
        if (!isCancelled) {
          console.error('Error fetching messages:', err);
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
          setMessagesByChat(prev => {
            const currentList = prev[newMsg.chat_id] || [];
            if (currentList.some(m => m.id === newMsg.id)) {
              return prev;
            }
            return {
              ...prev,
              [newMsg.chat_id]: [...currentList, newMsg],
            };
          });

          if (newMsg.chat_id === activeChatIdRef.current) {
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
          setMessagesByChat(prev => {
            const currentList = prev[updatedMsg.chat_id] || [];
            return {
              ...prev,
              [updatedMsg.chat_id]: currentList.map(m => (m.id === updatedMsg.id ? updatedMsg : m)),
            };
          });
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
  }, [user, loadChats, markMessagesAsRead]);

  // Send message
  const sendMessage = async (content: string) => {
    if (!user || !activeChatId || !content.trim()) return;

    const messageContent = content.trim();
    const newMsgId = crypto.randomUUID();
    const newMsg: Message = {
      id: newMsgId,
      chat_id: activeChatId,
      sender_id: user.id,
      content: messageContent,
      status: 'sent',
      created_at: new Date().toISOString(),
    };

    soundEffects.playMessageSent();

    // Optimistic UI update
    setMessagesByChat(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMsg],
    }));

    setChats(prev =>
      prev.map(c =>
        c.id === activeChatId
          ? { ...c, last_message: newMsg, updated_at: newMsg.created_at }
          : c
      )
    );
    sendTyping(false);

    if (!isSupabaseConfigured || !supabase) return;

    try {
      const { error: msgErr } = await supabase.from('messages').insert({
        id: newMsg.id,
        chat_id: newMsg.chat_id,
        sender_id: newMsg.sender_id,
        content: newMsg.content,
        status: 'sent',
      });

      if (msgErr) {
        if (msgErr.code === '23503' && (msgErr.message?.includes('chat_id') || msgErr.details?.includes('chats'))) {
          // Chat row missing in DB, insert chat and retry message
          await supabase.from('chats').insert({ id: activeChatId });
          await supabase.from('chat_participants').insert({ chat_id: activeChatId, user_id: user.id });
          const { error: retryErr } = await supabase.from('messages').insert({
            id: newMsg.id,
            chat_id: newMsg.chat_id,
            sender_id: newMsg.sender_id,
            content: newMsg.content,
            status: 'sent',
          });
          if (retryErr) {
            console.error('Error inserting message on retry:', retryErr);
            if (retryErr.message?.toLowerCase().includes('recursion') || retryErr.message?.toLowerCase().includes('policy')) {
              setDbError('recursive_policy');
            } else {
              setDbError(retryErr.message || 'database_error');
            }
          } else {
            setDbError(null);
          }
        } else {
          console.error('Error inserting message into Supabase:', msgErr);
          if (msgErr.message?.toLowerCase().includes('recursion') || msgErr.message?.toLowerCase().includes('policy')) {
            setDbError('recursive_policy');
          } else {
            setDbError(msgErr.message || 'database_error');
          }
        }
      } else {
        setDbError(null);
      }

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
    if (!user) return '';

    // 1. Check if chat already exists in state
    const existingInState = chats.find(c => c.other_participant?.id === targetUser.id);
    if (existingInState) {
      setActiveChatId(existingInState.id);
      return existingInState.id;
    }

    // 2. If Supabase is not configured, operate locally
    if (!isSupabaseConfigured || !supabase) {
      const localChatId = crypto.randomUUID();
      const localChat: Chat = {
        id: localChatId,
        type: 'direct',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        other_participant: targetUser,
        unread_count: 0,
      };
      setChats(prev => [localChat, ...prev]);
      setActiveChatId(localChatId);
      return localChatId;
    }

    try {
      // 3. Check if chat already exists in Supabase DB
      const { data: myParts } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', user.id);

      if (myParts && myParts.length > 0) {
        const myChatIds = myParts.map(p => p.chat_id);
        const { data: targetParts } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .in('chat_id', myChatIds)
          .eq('user_id', targetUser.id)
          .limit(1);

        if (targetParts && targetParts.length > 0) {
          const existingChatId = targetParts[0].chat_id;
          const foundChat: Chat = {
            id: existingChatId,
            type: 'direct',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            other_participant: targetUser,
            unread_count: 0,
          };
          setChats(prev => [foundChat, ...prev.filter(c => c.id !== existingChatId)]);
          setActiveChatId(existingChatId);
          loadChats();
          return existingChatId;
        }
      }

      // 4. Create new chat with standard valid UUID
      const newChatId = crypto.randomUUID();
      const optimisticChat: Chat = {
        id: newChatId,
        type: 'direct',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        other_participant: targetUser,
        unread_count: 0,
      };

      // Optimistically show active conversation immediately
      setChats(prev => [optimisticChat, ...prev.filter(c => c.id !== newChatId)]);
      setActiveChatId(newChatId);

      // Persist to Supabase
      let chatCreated = false;
      const { error: chatErr } = await supabase
        .from('chats')
        .insert({ id: newChatId, type: 'direct' });

      if (!chatErr) {
        chatCreated = true;
      } else {
        // If 'type' column does not exist in user's Supabase schema (PGRST204), retry with just id
        if (chatErr.code === 'PGRST204' || chatErr.message?.toLowerCase().includes('type')) {
          const { error: retryErr } = await supabase
            .from('chats')
            .insert({ id: newChatId });
          if (!retryErr) {
            chatCreated = true;
          } else {
            console.error('Error inserting chat (retry without type):', retryErr);
          }
        } else {
          console.error('Error inserting chat:', chatErr);
        }
      }

      if (chatCreated) {
        const { error: partErr } = await supabase
          .from('chat_participants')
          .insert([
            { chat_id: newChatId, user_id: user.id },
            { chat_id: newChatId, user_id: targetUser.id },
          ]);

        if (partErr) {
          console.error('Error inserting participants:', partErr);
        }
      }

      loadChats();
      return newChatId;
    } catch (err) {
      console.error('Error starting direct chat:', err);
      const fallbackChatId = crypto.randomUUID();
      const fallbackChat: Chat = {
        id: fallbackChatId,
        type: 'direct',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        other_participant: targetUser,
        unread_count: 0,
      };
      setChats(prev => [fallbackChat, ...prev]);
      setActiveChatId(fallbackChatId);
      return fallbackChatId;
    }
  };

  // Find active chat or resolve from available profiles
  const activeChat = useMemo(() => {
    if (!activeChatId) return null;
    const found = chats.find(c => c.id === activeChatId);
    if (found) return found;

    const profileMatch = availableProfiles.find(p => p.id === activeChatId);
    if (profileMatch) {
      return {
        id: activeChatId,
        type: 'direct' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        other_participant: profileMatch,
        unread_count: 0,
      };
    }
    return null;
  }, [chats, activeChatId, availableProfiles]);

  const currentMessages = useMemo(() => {
    if (!activeChatId) return [];
    return messagesByChat[activeChatId] || [];
  }, [activeChatId, messagesByChat]);

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
        messages: currentMessages,
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
        dbError,
        setDbError,
        refreshChats: loadChats,
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

