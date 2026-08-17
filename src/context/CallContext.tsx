import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Call, CallType, Profile, WebRTCSignalingPayload } from '../types';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured, sendSignalingMessage } from '../lib/supabase';
import { WebRTCManager } from '../lib/webrtc';
import { soundEffects } from '../lib/audio';

export type CallState = 'idle' | 'outgoing_ringing' | 'incoming_ringing' | 'connected' | 'ended';

interface CallContextType {
  callState: CallState;
  activeCall: Call | null;
  callType: CallType;
  peerProfile: Profile | null;
  durationSeconds: number;
  isMuted: boolean;
  isCameraOff: boolean;
  errorMessage: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callHistory: Call[];
  startCall: (targetUser: Profile, type: CallType, chatId?: string) => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  rejectIncomingCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  clearError: () => void;
  loadCallHistory: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [callState, setCallState] = useState<CallState>('idle');
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [callType, setCallType] = useState<CallType>('video');
  const [peerProfile, setPeerProfile] = useState<Profile | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callHistory, setCallHistory] = useState<Call[]>([]);

  const rtcManagerRef = useRef<WebRTCManager | null>(null);
  const timerRef = useRef<number | null>(null);
  const signalingChannelRef = useRef<string | null>(null);
  const callStartTimeRef = useRef<number>(0);

  const activeCallRef = useRef<Call | null>(null);
  const callStateRef = useRef<CallState>('idle');

  // Keep refs in sync with current state values
  activeCallRef.current = activeCall;
  callStateRef.current = callState;

  // Load call history from Supabase
  const loadCallHistory = useCallback(() => {
    if (!user || !isSupabaseConfigured || !supabase) {
      setCallHistory([]);
      return;
    }

    const fetchHistory = async () => {
      try {
        const { data } = await supabase
          .from('calls')
          .select('*, caller:caller_id(*), callee:callee_id(*)')
          .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
          .order('started_at', { ascending: false });

        if (data) {
          setCallHistory(data as Call[]);
        }
      } catch (err) {
        console.error('Error fetching call history:', err);
      }
    };

    fetchHistory();
  }, [user]);

  useEffect(() => {
    loadCallHistory();
  }, [loadCallHistory]);

  // Clean up timer on state change
  useEffect(() => {
    if (callState === 'connected') {
      callStartTimeRef.current = Date.now();
      setDurationSeconds(0);
      timerRef.current = window.setInterval(() => {
        setDurationSeconds(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [callState]);

  // Teardown WebRTC & Audio
  const cleanupCall = useCallback(() => {
    soundEffects.stopRinging();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (rtcManagerRef.current) {
      rtcManagerRef.current.cleanup();
      rtcManagerRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsCameraOff(false);
    signalingChannelRef.current = null;
  }, []);

  // Save Call Record to Supabase
  const saveCallRecord = useCallback(async (status: Call['status'], duration: number) => {
    if (!user || !activeCall || !isSupabaseConfigured || !supabase) return;

    const completedCall: Call = {
      ...activeCall,
      status,
      ended_at: new Date().toISOString(),
      duration_seconds: duration,
    };

    try {
      await supabase
        .from('calls')
        .upsert({
          id: completedCall.id,
          chat_id: completedCall.chat_id || null,
          caller_id: completedCall.caller_id,
          callee_id: completedCall.callee_id,
          type: completedCall.type,
          status: completedCall.status,
          started_at: completedCall.started_at,
          ended_at: completedCall.ended_at,
          duration_seconds: completedCall.duration_seconds,
        });

      // Format duration helper
      const formatDuration = (sec: number) => {
        if (sec <= 0) return '';
        const mins = Math.floor(sec / 60);
        const remainingSecs = sec % 60;
        if (mins > 0) {
          return `${mins} min ${remainingSecs > 0 ? `${remainingSecs} s` : ''}`;
        }
        return `${sec} s`;
      };

      // Resolve chat_id for direct call logs
      let targetChatId = completedCall.chat_id;
      if (!targetChatId) {
        const { data: myParts } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .eq('user_id', completedCall.caller_id);

        if (myParts && myParts.length > 0) {
          const myChatIds = myParts.map(p => p.chat_id);
          const { data: targetParts } = await supabase
            .from('chat_participants')
            .select('chat_id')
            .in('chat_id', myChatIds)
            .eq('user_id', completedCall.callee_id)
            .limit(1);

          if (targetParts && targetParts.length > 0) {
            targetChatId = targetParts[0].chat_id;
          }
        }
      }

      // If still no chat exists, create one
      if (!targetChatId) {
        targetChatId = crypto.randomUUID();
        await supabase.from('chats').insert({ id: targetChatId, type: 'direct' });
        await supabase.from('chat_participants').insert([
          { chat_id: targetChatId, user_id: completedCall.caller_id },
          { chat_id: targetChatId, user_id: completedCall.callee_id }
        ]);
      }

      const durationStr = formatDuration(duration);
      const messageContent = JSON.stringify({
        type: 'call',
        callType: completedCall.type,
        callStatus: status,
        duration: durationStr,
        callerId: completedCall.caller_id,
        calleeId: completedCall.callee_id,
      });

      // Insert message log of call (using call ID as message ID to avoid duplicates)
      await supabase
        .from('messages')
        .insert({
          id: completedCall.id,
          chat_id: targetChatId,
          sender_id: user.id,
          content: messageContent,
          status: 'sent',
          created_at: new Date().toISOString(),
        });

      // Update chat's updated_at timestamp to bubble it up
      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', targetChatId);

      loadCallHistory();
    } catch (err) {
      console.error('Error saving call record:', err);
    }
  }, [user, activeCall, loadCallHistory]);

  // End Call Handler
  const endCall = useCallback(() => {
    if (signalingChannelRef.current && activeCall) {
      sendSignalingMessage(signalingChannelRef.current, {
        type: 'call:end',
        callId: activeCall.id,
      });
    }

    soundEffects.playCallEnded();

    if (callState === 'connected') {
      saveCallRecord('ended', durationSeconds);
    } else if (callState === 'outgoing_ringing') {
      saveCallRecord('missed', 0);
    }

    cleanupCall();
    setCallState('idle');
    setActiveCall(null);
    setPeerProfile(null);
  }, [activeCall, callState, durationSeconds, saveCallRecord, cleanupCall]);

  // Reject Incoming Call
  const rejectIncomingCall = useCallback(() => {
    if (signalingChannelRef.current && activeCall) {
      sendSignalingMessage(signalingChannelRef.current, {
        type: 'call:reject',
        callId: activeCall.id,
        reason: 'declined',
      });
    }

    soundEffects.stopRinging();
    saveCallRecord('rejected', 0);
    cleanupCall();
    setCallState('idle');
    setActiveCall(null);
    setPeerProfile(null);
  }, [activeCall, saveCallRecord, cleanupCall]);

  // Initialize WebRTC Peer connection
  const setupWebRTC = useCallback((type: CallType, callId: string, onOfferCreated?: (offer: RTCSessionDescriptionInit) => void) => {
    const manager = new WebRTCManager({
      onRemoteStream: (stream) => {
        setRemoteStream(stream);
      },
      onIceCandidate: (candidate) => {
        if (signalingChannelRef.current) {
          sendSignalingMessage(signalingChannelRef.current, {
            type: 'call:ice-candidate',
            callId: callId,
            candidate: candidate.toJSON(),
          });
        }
      },
      onConnectionStateChange: (state) => {
        if (state === 'connected') {
          soundEffects.stopRinging();
          soundEffects.playCallConnected();
          setCallState('connected');
        } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          // WebRTC closed
        }
      },
    });

    rtcManagerRef.current = manager;

    // Start local media stream
    manager.startLocalStream(type === 'video', true)
      .then((stream) => {
        setLocalStream(stream);
        manager.initPeerConnection();
        if (onOfferCreated) {
          manager.createOffer().then(offer => onOfferCreated(offer));
        }
      })
      .catch((err: Error) => {
        setErrorMessage(err.message || 'Error al inicializar cámara y micrófono.');
        endCall();
      });
  }, [endCall]);

  // Start Outgoing Call
  const startCall = async (targetUser: Profile, type: CallType, chatId?: string) => {
    if (!user) return;
    setErrorMessage(null);
    setCallType(type);
    setPeerProfile(targetUser);

    const callId = crypto.randomUUID();
    const channelName = `user_calls_${targetUser.id}`;
    signalingChannelRef.current = channelName;

    const newCall: Call = {
      id: callId,
      chat_id: chatId,
      caller_id: user.id,
      callee_id: targetUser.id,
      type,
      status: 'ringing',
      started_at: new Date().toISOString(),
      caller: user,
      callee: targetUser,
    };

    setActiveCall(newCall);
    setCallState('outgoing_ringing');
    soundEffects.startRinging();

    // Setup WebRTC and create SDP offer
    setupWebRTC(type, callId, (offer) => {
      // Send call request with SDP offer
      sendSignalingMessage(channelName, {
        type: 'call:request',
        callId,
        callerId: user.id,
        calleeId: targetUser.id,
        callType: type,
        callerProfile: user,
        sdp: offer,
      });
    });
  };

  // Accept Incoming Call
  const acceptIncomingCall = async () => {
    if (!user || !activeCall || !signalingChannelRef.current) return;
    const currentCallId = activeCall.id;
    soundEffects.stopRinging();

    const manager = new WebRTCManager({
      onRemoteStream: (stream) => {
        setRemoteStream(stream);
      },
      onIceCandidate: (candidate) => {
        if (signalingChannelRef.current) {
          sendSignalingMessage(signalingChannelRef.current, {
            type: 'call:ice-candidate',
            callId: currentCallId,
            candidate: candidate.toJSON(),
          });
        }
      },
      onConnectionStateChange: (state) => {
        if (state === 'connected') {
          soundEffects.playCallConnected();
          setCallState('connected');
        }
      },
    });

    rtcManagerRef.current = manager;

    try {
      const stream = await manager.startLocalStream(activeCall.type === 'video', true);
      setLocalStream(stream);
      manager.initPeerConnection();

      // Retrieve stored offer
      const offer = (window as unknown as { __bgx_pending_offer?: RTCSessionDescriptionInit }).__bgx_pending_offer;
      if (offer) {
        const answer = await manager.handleOfferAndCreateAnswer(offer);
        sendSignalingMessage(signalingChannelRef.current, {
          type: 'call:accept',
          callId: activeCall.id,
          sdp: answer,
        });
        setCallState('connected');
        soundEffects.playCallConnected();
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Error al activar cámara/micrófono para responder.');
      rejectIncomingCall();
    }
  };

  // Toggle Mute
  const toggleMute = () => {
    if (rtcManagerRef.current) {
      const newState = !isMuted;
      rtcManagerRef.current.toggleAudio(!newState);
      setIsMuted(newState);
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (rtcManagerRef.current) {
      const newState = !isCameraOff;
      rtcManagerRef.current.toggleVideo(!newState);
      setIsCameraOff(newState);
    }
  };

  const clearError = () => setErrorMessage(null);

  // Realtime signaling listener (Supabase Realtime Channel)
  useEffect(() => {
    if (!user || !isSupabaseConfigured || !supabase) return;

    const handleSignal = async (signal: WebRTCSignalingPayload) => {
      const currentCallState = callStateRef.current;
      const currentActiveCall = activeCallRef.current;

      // 1. Incoming Call Request
      if (signal.type === 'call:request' && signal.calleeId === user.id) {
        if (currentCallState !== 'idle') {
          // Busy
          sendSignalingMessage(`user_calls_${signal.callerId}`, {
            type: 'call:reject',
            callId: signal.callId,
            reason: 'busy',
          });
          return;
        }

        const caller = signal.callerProfile || {
          id: signal.callerId || '',
          name: 'Usuario BGX',
          email: '',
          is_online: true,
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };

        const incomingCall: Call = {
          id: signal.callId || `call_${Date.now()}`,
          caller_id: signal.callerId || '',
          callee_id: user.id,
          type: signal.callType || 'video',
          status: 'ringing',
          started_at: new Date().toISOString(),
          caller,
          callee: user,
        };

        (window as unknown as { __bgx_pending_offer?: RTCSessionDescriptionInit }).__bgx_pending_offer = signal.sdp;
        signalingChannelRef.current = `user_calls_${signal.callerId}`;

        setActiveCall(incomingCall);
        setCallType(signal.callType || 'video');
        setPeerProfile(caller);
        setCallState('incoming_ringing');
        soundEffects.startRinging();
      }

      // 2. Call Accepted (by callee)
      else if (signal.type === 'call:accept' && signal.callId === currentActiveCall?.id) {
        soundEffects.stopRinging();
        if (signal.sdp && rtcManagerRef.current) {
          await rtcManagerRef.current.handleAnswer(signal.sdp);
          setCallState('connected');
          soundEffects.playCallConnected();
        }
      }

      // 3. Call Rejected
      else if (signal.type === 'call:reject' && signal.callId === currentActiveCall?.id) {
        soundEffects.stopRinging();
        setErrorMessage(
          signal.reason === 'busy'
            ? 'El usuario se encuentra en otra llamada.'
            : 'Llamada rechazada.'
        );
        cleanupCall();
        setCallState('idle');
        setActiveCall(null);
        setPeerProfile(null);
      }

      // 4. ICE Candidate exchange
      else if (signal.type === 'call:ice-candidate' && signal.callId === currentActiveCall?.id) {
        if (signal.candidate && rtcManagerRef.current) {
          await rtcManagerRef.current.addIceCandidate(signal.candidate);
        }
      }

      // 5. Call Ended / Hangup
      else if (signal.type === 'call:end' && signal.callId === currentActiveCall?.id) {
        soundEffects.playCallEnded();
        cleanupCall();
        setCallState('idle');
        setActiveCall(null);
        setPeerProfile(null);
      }
    };

    // Supabase Channel Realtime broadcast on user's own channel
    const channel = supabase
      .channel(`user_calls_${user.id}`)
      .on('broadcast', { event: 'webrtc-signal' }, (event) => {
        handleSignal(event.payload as WebRTCSignalingPayload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, cleanupCall]);

  return (
    <CallContext.Provider
      value={{
        callState,
        activeCall,
        callType,
        peerProfile,
        durationSeconds,
        isMuted,
        isCameraOff,
        errorMessage,
        localStream,
        remoteStream,
        callHistory,
        startCall,
        acceptIncomingCall,
        rejectIncomingCall,
        endCall,
        toggleMute,
        toggleCamera,
        clearError,
        loadCallHistory,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within a CallProvider');
  return context;
};
