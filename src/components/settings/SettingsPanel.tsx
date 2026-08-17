import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { soundEffects } from '../../lib/audio';
import {
  User,
  Shield,
  Camera,
  Mic,
  Volume2,
  Check,
  Save,
  Trash2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

const AVATAR_SEEDS = ['Felix', 'Aneka', 'Bandit', 'Coco', 'Jack', 'Luna', 'Mimi', 'Oliver'];

export const SettingsPanel: React.FC = () => {
  const { user, updateProfile, isConfigured } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [statusMsg, setStatusMsg] = useState(user?.status_message || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [profileSaved, setProfileSaved] = useState(false);

  // Supabase Custom Config
  const [supabaseUrl, setSupabaseUrl] = useState(
    localStorage.getItem('bgx_supabase_url') || import.meta.env.VITE_SUPABASE_URL || ''
  );
  const [supabaseKey, setSupabaseKey] = useState(
    localStorage.getItem('bgx_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  );
  const [configSaved, setConfigSaved] = useState(false);

  // Sound effects
  const [soundEnabled, setSoundEnabled] = useState(soundEffects.enabled);

  // Hardware Test
  const [isTestingCamera, setIsTestingCamera] = useState(false);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const testVideoRef = useRef<HTMLVideoElement>(null);
  const testStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setStatusMsg(user.status_message || '');
      setAvatarUrl(user.avatar_url || '');
    }
  }, [user]);

  // Handle Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await updateProfile({
      name,
      status_message: statusMsg,
      avatar_url: avatarUrl,
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  // Handle Supabase Save
  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    if (supabaseUrl.trim()) {
      localStorage.setItem('bgx_supabase_url', supabaseUrl.trim());
    } else {
      localStorage.removeItem('bgx_supabase_url');
    }
    if (supabaseKey.trim()) {
      localStorage.setItem('bgx_supabase_key', supabaseKey.trim());
    } else {
      localStorage.removeItem('bgx_supabase_key');
    }
    setConfigSaved(true);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleClearSupabase = () => {
    localStorage.removeItem('bgx_supabase_url');
    localStorage.removeItem('bgx_supabase_key');
    setSupabaseUrl('');
    setSupabaseKey('');
    window.location.reload();
  };

  // Toggle Sound
  const handleToggleSound = () => {
    const next = !soundEnabled;
    soundEnabled ? soundEffects.enabled = false : soundEffects.enabled = true;
    setSoundEnabled(next);
    if (next) soundEffects.playMessageSent();
  };

  // Test Camera
  const toggleTestCamera = async () => {
    if (isTestingCamera) {
      if (testStreamRef.current) {
        testStreamRef.current.getTracks().forEach(t => t.stop());
        testStreamRef.current = null;
      }
      setIsTestingCamera(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      testStreamRef.current = stream;
      if (testVideoRef.current) {
        testVideoRef.current.srcObject = stream;
      }
      setIsTestingCamera(true);
    } catch {
      alert('No se pudo acceder a la cámara. Revisa los permisos de tu navegador.');
    }
  };

  // Test Mic
  const toggleTestMic = async () => {
    if (isTestingMic) {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      setMicLevel(0);
      setIsTestingMic(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      audioContextRef.current = ctx;
      setIsTestingMic(true);

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setMicLevel(Math.min(100, Math.round((average / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch {
      alert('No se pudo acceder al micrófono. Revisa los permisos de tu navegador.');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (testStreamRef.current) {
        testStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="flex-1 bg-slate-50 flex flex-col h-full overflow-y-auto p-4 sm:p-8 select-none text-slate-900">
      <div className="max-w-3xl mx-auto w-full space-y-8">
        {/* Header */}
        <div className="pb-4 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Ajustes</h2>
          <p className="text-sm text-slate-500">Gestiona tu perfil, credenciales de Supabase y dispositivos</p>
        </div>

        {/* Section 1: User Profile */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Mi Perfil</h3>
              <p className="text-xs text-slate-500">Información visible para tus contactos en chats y llamadas</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 pb-4 border-b border-slate-100">
              <img
                src={avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id}`}
                alt="Avatar"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200 bg-slate-100"
              />
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-xs font-semibold text-slate-700">Elegir avatar prediseñado:</span>
                <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
                  {AVATAR_SEEDS.map((seed) => {
                    const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
                    return (
                      <button
                        key={seed}
                        type="button"
                        onClick={() => setAvatarUrl(url)}
                        className={`w-8 h-8 rounded-xl overflow-hidden border transition hover:scale-110 cursor-pointer ${
                          avatarUrl === url ? 'border-indigo-600 ring-2 ring-indigo-500/30' : 'border-slate-200'
                        }`}
                      >
                        <img src={url} alt={seed} className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Correo electrónico</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mensaje de estado</label>
              <input
                type="text"
                value={statusMsg}
                onChange={(e) => setStatusMsg(e.target.value)}
                placeholder="Ej. Disponible para llamadas"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-xs"
              >
                {profileSaved ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>¡Guardado!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Section 2: Audio & Video Hardware Testing */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Dispositivos y Sonido</h3>
              <p className="text-xs text-slate-500">Comprueba tu cámara y micrófono para llamadas WebRTC</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Camera Test Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-indigo-600" />
                    Prueba de Cámara
                  </span>
                  <span className="text-[10px] text-slate-500">{isTestingCamera ? 'Activa' : 'Inactiva'}</span>
                </div>
                <div className="w-full aspect-video bg-slate-200 rounded-xl overflow-hidden mb-3 border border-slate-300 flex items-center justify-center">
                  {isTestingCamera ? (
                    <video ref={testVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
                  ) : (
                    <span className="text-xs text-slate-500">Vista previa desactivada</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={toggleTestCamera}
                className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                {isTestingCamera ? 'Detener cámara' : 'Probar cámara'}
              </button>
            </div>

            {/* Mic & Sound Effects */}
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Mic className="w-4 h-4 text-emerald-600" />
                    Prueba de Micrófono
                  </span>
                  <span className="text-[10px] text-slate-500">{micLevel}%</span>
                </div>
                {/* Level Meter */}
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden mb-3 p-0.5 border border-slate-300">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-indigo-600 rounded-full transition-all duration-75"
                    style={{ width: `${micLevel}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={toggleTestMic}
                  className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-medium transition cursor-pointer"
                >
                  {isTestingMic ? 'Detener micrófono' : 'Probar micrófono'}
                </button>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-indigo-600" />
                    Efectos de Sonido
                  </h4>
                  <p className="text-[11px] text-slate-500">Timbre de llamada y alertas de mensajes</p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleSound}
                  className={`w-11 h-6 rounded-full transition p-1 cursor-pointer flex items-center ${
                    soundEnabled ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Supabase Configuration */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Configuración de Supabase Backend</h3>
              <p className="text-xs text-slate-500">
                {isConfigured ? 'Conexión activa con Supabase' : 'Modo local/demo activo'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSupabase} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">VITE_SUPABASE_URL</label>
              <input
                type="url"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">VITE_SUPABASE_ANON_KEY</label>
              <input
                type="password"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleClearSupabase}
                className="px-3 py-2 text-rose-600 hover:text-rose-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Restablecer Modo Demo
              </button>

              <button
                type="submit"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-xs"
              >
                {configSaved ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>¡Guardado! Reiniciando...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Guardar y Conectar</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
