import React from 'react';
import { useCall } from '../../context/CallContext';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { Phone, Video, PhoneMissed, PhoneIncoming, PhoneOutgoing, Clock } from 'lucide-react';
import { Profile } from '../../types';

export const CallHistoryPanel: React.FC = () => {
  const { callHistory, startCall } = useCall();
  const { user, availableProfiles } = useAuth();
  const { startDirectChat } = useChat();

  const handleCallBack = async (targetUser: Profile, type: 'voice' | 'video') => {
    const chatId = await startDirectChat(targetUser);
    await startCall(targetUser, type, chatId);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0 seg';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full bg-[#ffffff] border-r border-[#e9edef] flex flex-col h-full select-none">
      {/* Header */}
      <div className="px-4 py-3.5 bg-[#f0f2f5] border-b border-[#e9edef] flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#111b21] tracking-tight">Llamadas</h2>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 native-scroll divide-y divide-[#e9edef]/80 overscroll-contain">
        {callHistory.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center text-[#8696a0] px-4">
            <Clock className="w-10 h-10 text-[#aebac1] mb-2" />
            <p className="text-sm font-semibold text-[#111b21]">No hay llamadas recientes</p>
            <p className="text-xs text-[#667781] mt-1 max-w-xs">
              Las llamadas de voz y video que realices o recibas aparecerán aquí.
            </p>
          </div>
        ) : (
          callHistory.map((call) => {
            const isCaller = call.caller_id === user?.id;
            const peerId = isCaller ? call.callee_id : call.caller_id;
            const peer =
              (isCaller ? call.callee : call.caller) ||
              availableProfiles.find((p) => p.id === peerId) || {
                id: peerId,
                name: 'Usuario BGX',
                email: '',
                is_online: false,
                last_seen: '',
                created_at: '',
              };

            const isMissed = call.status === 'missed' || call.status === 'rejected';

            return (
              <div
                key={call.id}
                className="px-3.5 py-3 flex items-center justify-between hover:bg-[#f5f6f6] transition group gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="relative flex-shrink-0">
                    <img
                      src={peer.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${peer.id}`}
                      alt={peer.name}
                      className="w-12 h-12 rounded-full object-cover bg-[#dfe5e7]"
                    />
                    <span className="absolute bottom-0 right-0 p-0.5 rounded-full bg-white border border-[#e9edef] text-[#54656f] shadow-2xs">
                      {call.type === 'video' ? (
                        <Video className="w-3 h-3 text-[#00a884]" />
                      ) : (
                        <Phone className="w-3 h-3 text-[#00a884]" />
                      )}
                    </span>
                  </div>

                  <div className="overflow-hidden min-w-0">
                    <h4 className={`text-[15px] font-semibold truncate ${isMissed && !isCaller ? 'text-[#ea0038]' : 'text-[#111b21]'}`}>
                      {peer.name}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[13px] text-[#667781]">
                      {isCaller ? (
                        <PhoneOutgoing className="w-3.5 h-3.5 text-[#00a884]" />
                      ) : isMissed ? (
                        <PhoneMissed className="w-3.5 h-3.5 text-[#ea0038]" />
                      ) : (
                        <PhoneIncoming className="w-3.5 h-3.5 text-[#00a884]" />
                      )}
                      <span>{formatDate(call.started_at)}</span>
                      {call.duration_seconds ? (
                        <span className="text-[#8696a0]">• {formatDuration(call.duration_seconds)}</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Callback actions */}
                <div className="flex items-center gap-1 flex-shrink-0 text-[#54656f]">
                  <button
                    type="button"
                    onClick={() => handleCallBack(peer, 'voice')}
                    className="p-2 rounded-full hover:bg-[#e9edef] hover:text-[#00a884] transition cursor-pointer"
                    title="Llamada de voz"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCallBack(peer, 'video')}
                    className="p-2 rounded-full hover:bg-[#e9edef] hover:text-[#00a884] transition cursor-pointer"
                    title="Videollamada"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

