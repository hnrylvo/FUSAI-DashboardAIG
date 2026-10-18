import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  TrendingUp,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import type { DemoAccount, ProvidersResponse } from '../types/api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, login, googleLogin, simulateGoogleLogin, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [providers, setProviders] = useState<ProvidersResponse | null>(null);
  const [isSimulatingGoogle, setIsSimulatingGoogle] = useState(false);
  const [googleSimEmail, setGoogleSimEmail] = useState('director.riesgos@apoyointegral.com.gt');
  const [googleSimName, setGoogleSimName] = useState('Lic. Carlos Morales');

  // Estados locales para feedback de Google OAuth
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Load available auth providers & demo accounts
  useEffect(() => {
    api.auth
      .getProviders()
      .then(setProviders)
      .catch((err) => console.error('Failed to load auth providers', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setGoogleError(null);
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch {
      // error is stored in useAuthStore
    }
  };

  /**
   * Manejador de éxito de Google Sign-In: recibe el ID Token criptográfico emitido por Google,
   * y lo envía al backend para verificación estricta con google-auth-library.
   */
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setGoogleError('No se recibió la credencial ID Token de Google.');
      return;
    }

    setIsGoogleLoading(true);
    setGoogleError(null);
    clearError();

    try {
      await googleLogin(credentialResponse.credential);
      setToastMessage('Credenciales de Google validadas con éxito. Redirigiendo...');
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al autenticar con Google.';
      setGoogleError(msg);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setGoogleError('La ventana de Google se cerró o se rechazó la autorización.');
  };

  const handleGoogleSimulateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await simulateGoogleLogin(googleSimEmail, googleSimName);
      setIsSimulatingGoogle(false);
      navigate('/dashboard', { replace: true });
    } catch {
      // error handled in store
    }
  };

  const handleFillDemo = (demo: DemoAccount) => {
    setEmail(demo.email);
    setPassword(demo.password);
    clearError();
    setGoogleError(null);
  };

  const oauthError = searchParams.get('error');

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        {/* Left Side: Brand Hero presentation */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#014F84] via-[#023e68] to-[#012f50] p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle decorative circles */}
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-[#F48437]/10 pointer-events-none" />

          <div>
            {/* Brand Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-white flex flex-col items-center justify-center shadow-lg shrink-0">
                <span className="font-extrabold text-[22px] tracking-wider text-[#014F84] leading-none">
                  A<span className="text-[#F48437]">I</span>G
                </span>
                <span className="text-[7px] font-bold text-slate-500 tracking-wider mt-0.5">
                  APOYO INTEGRAL
                </span>
              </div>
              <div>
                <div className="text-lg font-bold tracking-tight">Apoyo Integral</div>
                <div className="text-xs text-white/70 font-semibold tracking-wider uppercase">
                  Grupo FUSAI · Guatemala
                </div>
              </div>
            </div>

            {/* Platform Headline */}
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight mb-4">
              Gestión Integral de Riesgo de Cartera
            </h2>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-normal mb-8">
              Monitoreo analítico de colocación, indicadores de morosidad temprana (PAR 1 / PAR 30),
              matrices de transición y deserciones para la toma de decisiones directiva.
            </p>

            {/* Value bullets */}
            <div className="space-y-3.5 text-xs text-white/90">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-white/10 text-[#F48437]">
                  <TrendingUp size={16} />
                </div>
                <span>Evolución mensual de cartera y colocación</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-white/10 text-emerald-400">
                  <Shield size={16} />
                </div>
                <span>Matriz de rodamiento de mora y riesgo crediticio</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-white/10 text-sky-400">
                  <Zap size={16} />
                </div>
                <span>Ingesta dinámica de reportes de cartera (.xlsx)</span>
              </div>
            </div>
          </div>

          {/* Confidentiality Footer note */}
          <div className="text-[11px] text-white/60 mt-8 pt-4 border-t border-white/10">
            Apoyo Integral Guatemala, S.A. · Uso exclusivo autorizado para Riesgos, Gerencia y Junta
            Directiva.
          </div>
        </div>

        {/* Right Side: Clean Authentication Form */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                Iniciar Sesión
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Ingresa con tus credenciales corporativas para acceder al dashboard.
              </p>
            </div>

            {/* Feedback Toast (Éxito) */}
            {toastMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 shadow-2xs animate-fade-in">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span className="font-medium">{toastMessage}</span>
              </div>
            )}

            {/* Error alerts */}
            {(googleError || error || oauthError) && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-start gap-2.5 shadow-2xs">
                <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">
                  {googleError ||
                    error ||
                    (oauthError === 'google_denied'
                      ? 'Acceso con Google cancelado.'
                      : oauthError === 'google_domain'
                        ? 'Tu cuenta de Google no pertenece a un dominio corporativo autorizado.'
                        : 'Error en autenticación.')}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearError();
                    setGoogleError(null);
                  }}
                  className="text-red-400 hover:text-red-700 transition-colors p-0.5 cursor-pointer"
                  title="Cerrar"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Social Authentication: Sign in with Google */}
            <div className="mb-5">
              {isGoogleLoading ? (
                <div className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center gap-3 text-xs font-semibold text-slate-600 shadow-2xs">
                  <div className="w-4 h-4 border-2 border-[#014F84]/30 border-t-[#014F84] rounded-full animate-spin" />
                  <span>Verificando credencial de Google con el servidor...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-full flex justify-center items-center overflow-hidden rounded-xl">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      theme="outline"
                      size="large"
                      text="continue_with"
                      shape="rectangular"
                      width="380"
                    />
                  </div>

                  {providers?.google === 'simulated' && (
                    <button
                      type="button"
                      onClick={() => setIsSimulatingGoogle(true)}
                      className="w-full text-center text-[11px] text-slate-500 hover:text-[#014F84] underline underline-offset-2 transition-colors cursor-pointer"
                    >
                      O usar selector simulado de cuentas demo
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-5">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                o con correo institucional
              </span>
            </div>

            {/* Traditional Form following autofill-sign-in-form standards */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail size={16} />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    spellCheck={false}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@apoyointegral.com.gt"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-[#014F84] focus:ring-2 focus:ring-[#014F84]/15 text-xs text-slate-800 placeholder:text-slate-400 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Contraseña
                  </label>
                  <span className="text-[11px] text-slate-400 select-none">Mínimo 8 caracteres</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-[#014F84] focus:ring-2 focus:ring-[#014F84]/15 text-xs text-slate-800 placeholder:text-slate-400 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-[#014F84] hover:bg-[#023e68] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all duration-150 transform active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  <span>Iniciar Sesión</span>
                )}
              </button>
            </form>

            {/* Demo Quick-Fill Accounts (Shown in development mode) */}
            {providers?.demoAccounts && providers.demoAccounts.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <UserCheck size={13} className="text-[#F48437]" />
                  <span>Cuentas Demo de prueba rápida:</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {providers.demoAccounts.map((demo) => (
                    <button
                      key={demo.email}
                      type="button"
                      onClick={() => handleFillDemo(demo)}
                      className="p-2 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-left transition-colors cursor-pointer group"
                    >
                      <div className="text-[11px] font-bold text-slate-800 group-hover:text-[#014F84] truncate">
                        {demo.name}
                      </div>
                      <div className="text-[10px] text-slate-400 capitalize truncate">
                        Rol: {demo.role}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simulated Google Login Modal */}
      {isSimulatingGoogle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 text-slate-800">
            <h4 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Acceso Simulado con Google</span>
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Simulación de flujo OAuth2 en entorno de desarrollo.
            </p>
            <form onSubmit={handleGoogleSimulateSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Nombre completo:
                </label>
                <input
                  type="text"
                  required
                  value={googleSimName}
                  onChange={(e) => setGoogleSimName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Correo Google Workspace:
                </label>
                <input
                  type="email"
                  required
                  value={googleSimEmail}
                  onChange={(e) => setGoogleSimEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSimulatingGoogle(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#014F84] hover:bg-[#023e68] text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                >
                  Ingresar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
