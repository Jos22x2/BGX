import React, { useEffect, useRef } from 'react';
import { useCall } from '../../context/CallContext';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Maximize2,
  Volume2,
  AlertCircle,
  Activity,
} from 'lucide-react';

export const ActiveCallOverlay: React.FC = () => {
  const {
    callState,
    activeCall,
    peerProfile,
    callType,
    durationSeconds,
    isMuted,
    isCameraOff,
    localStream,
    remoteStream,
    endCall,
    toggleMute,
    toggleCamera,
    errorMessage,
    clearError,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (callState === 'idle' || callState === 'incoming_ringing') {
    return null;
  }

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isVideo = callType === 'video';
  const isOutgoingRinging = callState === 'outgoing_ringing';
  const isConnected = callState === 'connected';

  return (
    <div
      id="call-overlay"
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-8 animate-in fade-in duration-200"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <img
            src={peerProfile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${peerProfile?.id}`}
            alt={peerProfile?.name || 'Contacto'}
            className="w-12 h-12 rounded-2xl object-cover border-2 border-slate-700 shadow-md"
          />
          <div>
            <h3 id="call-peer-name" className="text-lg font-bold text-white">
              {peerProfile?.name || 'Contacto BGX'}
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
              <span>
                {isOutgoingRinging ? 'Llamando...' : isConnected ? 'Llamada activa' : 'Conectando señal...'}
              </span>
              {isConnected && (
                <span className="text-slate-500 font-mono">| Calidad HD WebRTC</span>
              )}
            </div>
          </div>
        </div>

        {/* Timer Pill */}
        <div className="px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-white font-mono text-sm font-semibold tracking-wider flex items-center gap-2 shadow-lg">
          <Activity className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          <span id="call-timer">{formatTimer(durationSeconds)}</span>
        </div>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="my-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="text-xs font-semibold text-rose-400 hover:text-white"
          >
            Entendido
          </button>
        </div>
      )}

      {/* Main Call Stage */}
      <div className="relative flex-1 my-4 rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center shadow-2xl">
        {/* If Video Call and Connected with Remote Video */}
        {isVideo && isConnected && remoteStream ? (
          <video
            id="remote-video"
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          /* Voice Call Stage or Waiting for Video */
          <div className="flex flex-col items-center justify-center p-8 text-center">
            {/* Visualizer Circle */}
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-full bg-blue-600/20 animate-ping absolute inset-0" />
              <div className="w-32 h-32 rounded-full bg-indigo-600/30 animate-pulse absolute inset-0" />
              <img
                src={peerProfile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${peerProfile?.id}`}
                alt={peerProfile?.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-slate-700 shadow-2xl relative z-10"
              />
            </div>

            <h4 className="text-2xl font-bold text-white mb-1">
              {peerProfile?.name || 'Contacto'}
            </h4>
            <p className="text-sm text-slate-400">
              {isOutgoingRinging ? 'Esperando que responda...' : 'Llamada de voz en curso'}
            </p>

            {/* Audio Wave Visualizer Simulation */}
            {isConnected && (
              <div className="flex items-center gap-1.5 mt-6 h-8">
                {[40, 75, 100, 60, 90, 45, 80, 55, 95, 30].map((height, i) => (
                  <div
                    key={i}
                    className="w-1 bg-blue-500 rounded-full animate-pulse"
                    style={{
                      height: `${height}%`,
                      animationDuration: `${0.4 + (i % 4) * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Local Video PIP (Picture-In-Picture Thumbnail) */}
        {isVideo && (
          <div className="absolute bottom-4 right-4 w-36 sm:w-48 aspect-video bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl z-30">
            {isCameraOff ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 text-xs gap-1">
                <VideoOff className="w-5 h-5 text-slate-500" />
                <span>Cámara desactivada</span>
              </div>
            ) : (
              <video
                id="local-video"
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            )}
            <span className="absolute bottom-1 left-2 text-[10px] font-medium bg-black/60 px-1.5 py-0.5 rounded text-white backdrop-blur-xs">
              Tú
            </span>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-center gap-4 z-20">
        {/* Toggle Mute */}
        <button
          type="button"
          id="toggle-mic-btn"
          onClick={toggleMute}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white transition shadow-lg cursor-pointer ${
            isMuted ? 'bg-rose-600 hover:bg-rose-500' : 'bg-slate-800 hover:bg-slate-700'
          }`}
          title={isMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {/* Toggle Camera (if Video Call) */}
        {isVideo && (
          <button
            type="button"
            id="toggle-cam-btn"
            onClick={toggleCamera}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white transition shadow-lg cursor-pointer ${
              isCameraOff ? 'bg-rose-600 hover:bg-rose-500' : 'bg-slate-800 hover:bg-slate-700'
            }`}
            title={isCameraOff ? 'Activar cámara' : 'Apagar cámara'}
          >
            {isCameraOff ? <VideoOff className="w-6 h-6" /> : <VideoIcon className="w-6 h-6" />}
          </button>
        )}

        {/* Hang Up Button */}
        <button
          type="button"
          id="end-call-btn"
          onClick={endCall}
          className="w-16 h-14 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white flex items-center justify-center transition shadow-lg shadow-rose-600/30 cursor-pointer"
          title="Colgar llamada"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
