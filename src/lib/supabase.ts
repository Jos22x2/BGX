import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Profile, Chat, Message, Call, WebRTCSignalingPayload } from '../types';

// Default / fallback keys from Vite environment
const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Stored in localStorage for instant testing if user enters custom config in settings
const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('bgx_supabase_url') || '' : '';
const storedKey = typeof window !== 'undefined' ? localStorage.getItem('bgx_supabase_key') || '' : '';

export const SUPABASE_URL = storedUrl || envUrl;
export const SUPABASE_ANON_KEY = storedKey || envKey;

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_ANON_KEY && 
  SUPABASE_URL.startsWith('http') &&
  !SUPABASE_URL.includes('your-project')
);

// Create real client if valid URL and key exist
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

// =========================================================================
// Real-Time Demo / Cross-Tab Signaling Engine (when Supabase env is empty)
// =========================================================================
// Uses BroadcastChannel + WebRTC + localStorage so 2 tabs or demo accounts
// can chat, send realtime events, and make voice/video calls immediately!
const DEMO_CHANNEL_NAME = 'bgx_realtime_broadcast';
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(DEMO_CHANNEL_NAME);
  } catch {
    // ignore
  }
}

// Initial mock profiles for instant testing
export const DEMO_PROFILES: Profile[] = [
  {
    id: 'usr_sofia_001',
    name: 'Sofía Valenzuela',
    email: 'sofia@bgx.dev',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    status_message: '✨ Trabajando en el nuevo diseño de BGX',
    is_online: true,
    last_seen: new Date().toISOString(),
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 'usr_carlos_002',
    name: 'Carlos Mendoza',
    email: 'carlos@bgx.dev',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    status_message: '⚡ En reunión, responderé pronto.',
    is_online: true,
    last_seen: new Date().toISOString(),
    created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
  },
  {
    id: 'usr_elena_003',
    name: 'Elena Rostova',
    email: 'elena@bgx.dev',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    status_message: '🎵 Escuchando música y programando',
    is_online: false,
    last_seen: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'usr_mateo_004',
    name: 'Mateo Morales',
    email: 'mateo@bgx.dev',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    status_message: '🚀 ¡Todo listo para el lanzamiento!',
    is_online: true,
    last_seen: new Date().toISOString(),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

// Initial starter messages
export const DEMO_INITIAL_MESSAGES: Message[] = [
  {
    id: 'msg_001',
    chat_id: 'chat_sofia_user',
    sender_id: 'usr_sofia_001',
    content: '¡Hola! ¿Cómo vas con la integración de las videollamadas WebRTC?',
    status: 'read',
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: 'msg_002',
    chat_id: 'chat_sofia_user',
    sender_id: 'usr_current',
    content: '¡Hola Sofía! Ya está lista la señalización con Supabase Realtime y la calidad de video es genial.',
    status: 'read',
    created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: 'msg_003',
    chat_id: 'chat_sofia_user',
    sender_id: 'usr_sofia_001',
    content: '¡Excelente! Hazme una videollamada para probar el audio y el video en tiempo real 🎥✨',
    status: 'delivered',
    created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
  },
];

// In-memory demo storage helper
export class LocalDataStore {
  static getProfiles(): Profile[] {
    const data = localStorage.getItem('bgx_profiles');
    if (!data) {
      localStorage.setItem('bgx_profiles', JSON.stringify(DEMO_PROFILES));
      return DEMO_PROFILES;
    }
    try {
      return JSON.parse(data);
    } catch {
      return DEMO_PROFILES;
    }
  }

  static saveProfile(profile: Profile) {
    const list = this.getProfiles();
    const idx = list.findIndex(p => p.id === profile.id);
    if (idx >= 0) {
      list[idx] = profile;
    } else {
      list.push(profile);
    }
    localStorage.setItem('bgx_profiles', JSON.stringify(list));
    this.broadcast('profile_updated', profile);
  }

  static getMessages(chatId: string): Message[] {
    const key = `bgx_messages_${chatId}`;
    const data = localStorage.getItem(key);
    if (!data) {
      if (chatId.includes('sofia')) {
        localStorage.setItem(key, JSON.stringify(DEMO_INITIAL_MESSAGES));
        return DEMO_INITIAL_MESSAGES;
      }
      return [];
    }
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  static saveMessage(message: Message) {
    const key = `bgx_messages_${message.chat_id}`;
    const list = this.getMessages(message.chat_id);
    // Prevent duplicate
    if (!list.some(m => m.id === message.id)) {
      list.push(message);
      localStorage.setItem(key, JSON.stringify(list));
      this.broadcast('message_inserted', message);
    }
  }

  static updateMessageStatus(messageId: string, chatId: string, status: Message['status']) {
    const key = `bgx_messages_${chatId}`;
    const list = this.getMessages(chatId);
    const msg = list.find(m => m.id === messageId);
    if (msg) {
      msg.status = status;
      localStorage.setItem(key, JSON.stringify(list));
      this.broadcast('message_updated', msg);
    }
  }

  static getCalls(): Call[] {
    const data = localStorage.getItem('bgx_calls');
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  static saveCall(call: Call) {
    const list = this.getCalls();
    const idx = list.findIndex(c => c.id === call.id);
    if (idx >= 0) {
      list[idx] = call;
    } else {
      list.unshift(call);
    }
    localStorage.setItem('bgx_calls', JSON.stringify(list));
    this.broadcast('call_updated', call);
  }

  static broadcast(type: string, payload: unknown) {
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type, payload });
    }
  }

  static subscribe(callback: (type: string, payload: unknown) => void) {
    if (!broadcastChannel) return () => {};
    const handler = (event: MessageEvent) => {
      if (event.data && event.data.type) {
        callback(event.data.type, event.data.payload);
      }
    };
    broadcastChannel.addEventListener('message', handler);
    return () => {
      broadcastChannel?.removeEventListener('message', handler);
    };
  }
}

// Function to send WebRTC signaling payload either via Supabase Realtime channel or fallback BroadcastChannel
export function sendSignalingMessage(targetChannel: string, payload: WebRTCSignalingPayload) {
  if (isSupabaseConfigured && supabase) {
    const channel = supabase.channel(targetChannel);
    channel.send({
      type: 'broadcast',
      event: 'webrtc-signal',
      payload,
    });
  } else {
    LocalDataStore.broadcast('webrtc-signal', {
      channel: targetChannel,
      ...payload,
    });
  }
}
