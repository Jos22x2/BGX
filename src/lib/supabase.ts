import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { WebRTCSignalingPayload } from '../types';

// Default / fallback keys from Vite environment
const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Stored in localStorage if user enters custom config in settings
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

// Function to send WebRTC signaling payload via Supabase Realtime channel
export function sendSignalingMessage(targetChannel: string, payload: WebRTCSignalingPayload) {
  if (!isSupabaseConfigured || !supabase) return;

  let channel = supabase.getChannels().find(ch => ch.topic === `realtime:${targetChannel}`);
  if (!channel) {
    channel = supabase.channel(targetChannel);
  }

  if (channel.state === 'joined') {
    channel.send({
      type: 'broadcast',
      event: 'webrtc-signal',
      payload,
    });
  } else {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel!.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload,
        });
      }
    });
  }
}

