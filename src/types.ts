export type MessageStatus = 'sent' | 'delivered' | 'read';
export type ChatType = 'direct' | 'group';
export type CallType = 'voice' | 'video';
export type CallStatus = 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended';

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  status_message?: string;
  is_online: boolean;
  last_seen: string;
  created_at: string;
}

export interface Chat {
  id: string;
  type: ChatType;
  name?: string;
  created_at: string;
  updated_at: string;
  // Augmented properties for UI
  other_participant?: Profile;
  last_message?: Message;
  unread_count?: number;
  is_typing?: boolean;
}

export interface ChatParticipant {
  id: string;
  chat_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
  profile?: Profile;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  status: MessageStatus;
  created_at: string;
  // Local/UI helper
  sender?: Profile;
}

export interface Call {
  id: string;
  chat_id?: string;
  caller_id: string;
  callee_id: string;
  type: CallType;
  status: CallStatus;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  caller?: Profile;
  callee?: Profile;
}

export interface WebRTCSignalingPayload {
  type: 'call:request' | 'call:accept' | 'call:reject' | 'call:offer' | 'call:answer' | 'call:ice-candidate' | 'call:end' | 'typing';
  callId?: string;
  callerId?: string;
  calleeId?: string;
  callType?: CallType;
  callerProfile?: Profile;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  reason?: string;
  userId?: string;
  chatId?: string;
  isTyping?: boolean;
}
