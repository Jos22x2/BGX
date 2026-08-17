import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, ShieldCheck, AlertTriangle, ArrowRight, UserPlus, LogIn, Eye, EyeOff, KeyRound, Database, RefreshCw } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { signInWithEmail, signUpWithEmail, isConfigured } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Setup form state for when Supabase is not configured
  const [customUrl, setCustomUrl] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('bgx_supabase_url') || '' : ''
  );
  const [customKey, setCustomKey] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('bgx_supabase_key') || '' : ''
  );
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const formatAuthError = (errMessage: string): string => {
    const lower = errMessage.toLowerCase();
    if (lower.includes('invalid login credentials')) {
      return 'Correo o contraseña incorrectos. Verifica tus credenciales.';
    }
    if (lower.includes('user already registered') || lower.includes('already exists')) {
      return 'Este correo electrónico ya está registrado. Inicia sesión.';
    }
    if (lower.includes('password should be at least')) {
      return 'La contraseña debe tener al menos 6 caracteres.';
    }
    if (lower.includes('email not confirmed')) {
      return 'Por favor confirma tu correo electrónico antes de iniciar sesión.';
    }
    if (lower.includes('invalid email')) {
      return 'El formato del correo electrónico no es válido.';
    }
    return errMessage;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          setError('Por favor ingresa tu nombre completo.');
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres.');
          setIsSubmitting(false);
          return;
        }
        const { error: signUpError } = await signUpWithEmail(email, password, name);
        if (signUpError) {
          setError(formatAuthError(signUpError.message || 'Error al crear la cuenta.'));
        } else {
          setSuccessMessage('¡Cuenta creada con éxito! Si tu proyecto requiere confirmación por correo, revisa tu bandeja de entrada.');
        }
      } else {
        const { error: signInError } = await signInWithEmail(email, password);
        if (signInError) {
          setError(formatAuthError(signInError.message || 'Credenciales inválidas.'));
        }
      }
    } catch {
      setError('Ocurrió un error inesperado al procesar la solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim() || !customKey.trim()) {
      setError('Por favor ingresa tanto la URL de Supabase como la clave anónima (Anon Key).');
      return;
    }
    setIsSavingConfig(true);
    localStorage.setItem('bgx_supabase_url', customUrl.trim());
    localStorage.setItem('bgx_supabase_key', customKey.trim());
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  // If Supabase is not configured, show mandatory configuration screen
  if (!isConfigured) {
    return (
      <div id="auth-unconfigured-screen" className="min-h-[100dvh] w-full bg-slate-50 flex items-center justify-center p-4 sm:p-6 text-slate-900 native-scroll safe-pb safe-pt">
        <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          {/* Accent decoration */}
          <div className="absolute -top-24 -right-24 w-52 h-52 bg-amber-100/50 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center shadow-md shadow-amber-500/20 mb-3 text-white">
              <Database className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Configuración de Supabase Requerida
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 max-w-sm">
              BGX requiere una instancia real de Supabase para autenticación segura, base de datos y WebRTC.
            </p>
          </div>

          <div className="p-4 mb-6 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Faltan variables de entorno</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              Define <code className="px-1.5 py-0.5 rounded bg-amber-100 font-mono text-[11px]">VITE_SUPABASE_URL</code> y <code className="px-1.5 py-0.5 rounded bg-amber-100 font-mono text-[11px]">VITE_SUPABASE_ANON_KEY</code> en tu archivo <code className="px-1.5 py-0.5 rounded bg-amber-100 font-mono text-[11px]">.env</code> o configúralas aquí directamente para conectar:
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supabase Project URL (VITE_SUPABASE_URL)
              </label>
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supabase Anon Key (VITE_SUPABASE_ANON_KEY)
              </label>
              <input
                type="password"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingConfig}
              className="w-full mt-2 py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSavingConfig ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Conectando...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Guardar y Conectar Supabase</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div id="auth-container" className="min-h-[100dvh] w-full bg-slate-50 flex items-center justify-center p-4 sm:p-6 text-slate-900 native-scroll safe-pb safe-pt">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Subtle accent highlight */}
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8 relative z-10">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-md shadow-indigo-500/20 mb-3">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            BGX
            <span className="text-xs uppercase px-2 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Live
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Mensajería instantánea y videollamadas WebRTC en tiempo real
          </p>

          {/* Supabase Status Pill */}
          <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Supabase Auth & Database</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2">
            <span>✓</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nombre completo</label>
              <input
                type="text"
                id="register-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Sofía Valenzuela"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Correo electrónico</label>
            <input
              type="email"
              id="auth-email-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@ejemplo.com"
              required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="auth-password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••••• (mínimo 6 caracteres)"
                required
                minLength={6}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition pr-10"
              />
              <button
                type="button"
                id="auth-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="auth-submit-button"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold rounded-xl text-sm transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isRegister ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Crear Cuenta</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Iniciar Sesión</span>
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-5 text-center relative z-10">
          <button
            type="button"
            id="auth-toggle-mode-btn"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
              setSuccessMessage(null);
            }}
            className="text-xs text-slate-500 hover:text-indigo-600 transition cursor-pointer"
          >
            {isRegister ? (
              <>¿Ya tienes una cuenta? <span className="font-semibold text-indigo-600">Inicia sesión</span></>
            ) : (
              <>¿No tienes cuenta? <span className="font-semibold text-indigo-600">Regístrate gratis</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

