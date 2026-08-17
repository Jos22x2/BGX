import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, ShieldCheck, Zap, Sparkles, ArrowRight, UserPlus, LogIn, Eye, EyeOff } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { signInWithEmail, signUpWithEmail, signInAsDemoUser, availableProfiles, isConfigured } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          setError('Por favor ingresa tu nombre completo.');
          setIsSubmitting(false);
          return;
        }
        const { error: signUpError } = await signUpWithEmail(email, password, name);
        if (signUpError) {
          setError(signUpError.message || 'Error al crear la cuenta.');
        }
      } else {
        const { error: signInError } = await signInWithEmail(email, password);
        if (signInError) {
          setError(signInError.message || 'Credenciales inválidas.');
        }
      }
    } catch {
      setError('Ocurrió un error inesperado al procesar la solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="auth-container" className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 sm:p-6 text-slate-900">
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
            Mensajería instantánea y llamadas WebRTC en tiempo real
          </p>

          {/* Supabase Status Pill */}
          <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 border border-slate-200 text-slate-700">
            {isConfigured ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Supabase Conectado</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>Modo Local / Demo Activo</span>
              </>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
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
                placeholder="••••••••"
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

        {/* Quick Demo Access */}
        <div className="mt-7 pt-6 border-t border-slate-100 relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Acceso Rápido de Prueba (Demo)
            </span>
            <span className="text-[10px] text-slate-400">1-clic</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {availableProfiles.slice(0, 4).map((prof) => (
              <button
                key={prof.id}
                type="button"
                id={`demo-user-${prof.id}`}
                onClick={() => signInAsDemoUser(prof.id)}
                className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-200 text-left transition group cursor-pointer"
              >
                <img
                  src={prof.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${prof.id}`}
                  alt={prof.name}
                  className="w-8 h-8 rounded-full object-cover border border-slate-200 flex-shrink-0"
                />
                <div className="overflow-hidden min-w-0">
                  <div className="text-xs font-medium text-slate-800 truncate group-hover:text-indigo-600">
                    {prof.name.split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                    Entrar <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition text-indigo-600" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
