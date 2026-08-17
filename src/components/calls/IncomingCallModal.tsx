import React from 'react';
import { useCall } from '../../context/CallContext';
import { Phone, Video, PhoneIncoming, PhoneOff, Check, X } from 'lucide-react';

export const IncomingCallModal: React.FC = () => {
  const { callState, activeCall, peerProfile, acceptIncomingCall, rejectIncomingCall } = useCall();

  if (callState !== 'incoming_ringing' || !activeCall) {
    return null;
  }

  const isVideo = activeCall.type === 'video';

  return (
    <div
      id="incoming-call-toast"
      className="fixed bottom-6 right-6 z-50 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl p-5 shadow-2xl max-w-sm w-full animate-bounce duration-1000"
    >
      <div className="flex items-center gap-4">
        {/* Caller Avatar with Ringing Pulse */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-indigo-500/30 animate-ping" />
          <img
            src={peerProfile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${peerProfile?.id}`}
            alt={peerProfile?.name || 'Llamada entrante'}
            className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-600 relative z-10"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 mb-0.5">
            <PhoneIncoming className="w-3.5 h-3.5 animate-pulse" />
            <span>Llamada entrante de {isVideo ? 'video' : 'voz'}</span>
          </div>
          <h4 className="text-base font-bold text-slate-900 truncate">
            {peerProfile?.name || 'Alguien'}
          </h4>
          <p className="text-xs text-slate-500 truncate">
            {peerProfile?.status_message || 'BGX en tiempo real'}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-slate-100">
        <button
          type="button"
          id="reject-call-btn"
          onClick={rejectIncomingCall}
          className="flex-1 py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white text-xs font-semibold border border-rose-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
          Rechazar
        </button>

        <button
          type="button"
          id="accept-call-btn"
          onClick={acceptIncomingCall}
          className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Check className="w-4 h-4" />
          Aceptar
        </button>
      </div>
    </div>
  );
};
