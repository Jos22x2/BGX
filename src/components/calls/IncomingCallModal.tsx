import React from 'react';
import { useCall } from '../../context/CallContext';
import { PhoneIncoming, Check, X } from 'lucide-react';

export const IncomingCallModal: React.FC = () => {
  const { callState, activeCall, peerProfile, acceptIncomingCall, rejectIncomingCall } = useCall();

  if (callState !== 'incoming_ringing' || !activeCall) {
    return null;
  }

  const isVideo = activeCall.type === 'video';

  return (
    <div
      id="incoming-call-toast"
      className="fixed bottom-4 sm:bottom-6 inset-x-4 sm:inset-x-auto sm:right-6 z-50 bg-[#111b21] text-white border border-[#222e35] rounded-2xl p-4 sm:p-5 shadow-2xl max-w-sm sm:w-96 mx-auto sm:mx-0 animate-in slide-in-from-bottom duration-200 safe-pb"
    >
      <div className="flex items-center gap-3.5">
        {/* Caller Avatar with Ringing Pulse */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 rounded-full bg-[#00a884]/40 animate-ping" />
          <img
            src={peerProfile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${peerProfile?.id}`}
            alt={peerProfile?.name || 'Llamada entrante'}
            className="w-13 h-13 rounded-full object-cover border-2 border-[#00a884] relative z-10 bg-[#202c33]"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#00a884] mb-0.5">
            <PhoneIncoming className="w-3.5 h-3.5 animate-pulse" />
            <span>Llamada entrante de {isVideo ? 'video' : 'voz'}</span>
          </div>
          <h4 className="text-base font-bold text-white truncate">
            {peerProfile?.name || 'Contacto BGX'}
          </h4>
          <p className="text-xs text-[#8696a0] truncate">
            {peerProfile?.status_message || peerProfile?.email || 'BGX en tiempo real'}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[#222e35]">
        <button
          type="button"
          id="reject-call-btn"
          onClick={rejectIncomingCall}
          className="flex-1 py-2.5 px-4 rounded-xl bg-[#ea0038] hover:bg-[#c90030] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 shadow-xs"
        >
          <X className="w-4 h-4" />
          Rechazar
        </button>

        <button
          type="button"
          id="accept-call-btn"
          onClick={acceptIncomingCall}
          className="flex-1 py-2.5 px-4 rounded-xl bg-[#00a884] hover:bg-[#008f6f] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
        >
          <Check className="w-4 h-4" />
          Aceptar
        </button>
      </div>
    </div>
  );
};

