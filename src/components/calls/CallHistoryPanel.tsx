import React from 'react';
import { useCall } from '../../context/CallContext';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { Phone, Video, PhoneMissed, PhoneIncoming, PhoneOutgoing, Clock, Plus } from 'lucide-react';
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
    <div className="w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col h-full select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Llamadas</h2>
          <p className="text-xs text-slate-500">Historial de llamadas WebRTC</p>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 native-scroll p-2 space-y-1 divide-y divide-slate-100 overscroll-contain">
        {callHistory.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center text-slate-400 px-4">
            <Clock className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-700">No hay llamadas recientes</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
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
                className="p-3 rounded-2xl flex items-center justify-between hover:bg-slate-50 active:bg-slate-100/80 transition group gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative flex-shrink-0">
                    <img
                      src={peer.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${peer.id}`}
                      alt={peer.name}
                      className="w-11 h-11 rounded-2xl object-cover border border-slate-200 bg-slate-100"
                    />
                    <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-white border border-slate-200 text-slate-600 shadow-2xs">
                      {call.type === 'video' ? (
                        <Video className="w-3 h-3 text-indigo-600" />
                      ) : (
                        <Phone className="w-3 h-3 text-emerald-600" />
                      )}
                    </span>
                  </div>

                  <div className="overflow-hidden min-w-0">
                    <h4 className={`text-sm font-semibold truncate ${isMissed && !isCaller ? 'text-rose-600' : 'text-slate-900'}`}>
                      {peer.name}
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      {isCaller ? (
                        <PhoneOutgoing className="w-3 h-3 text-indigo-600" />
                      ) : isMissed ? (
                        <PhoneMissed className="w-3 h-3 text-rose-600" />
                      ) : (
                        <PhoneIncoming className="w-3 h-3 text-emerald-600" />
                      )}
                      <span>{formatDate(call.started_at)}</span>
                      {call.duration_seconds ? (
                        <span className="text-slate-400">• {formatDuration(call.duration_seconds)}</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Callback actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCallBack(peer, 'voice')}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-emerald-600 active:scale-95 text-slate-600 hover:text-white transition cursor-pointer"
                    title="Llamada de voz"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCallBack(peer, 'video')}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-indigo-600 active:scale-95 text-slate-600 hover:text-white transition cursor-pointer"
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
