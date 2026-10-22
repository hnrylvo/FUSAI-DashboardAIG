import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, googleLogin } = useAuthStore();

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // If already authenticated, redirect immediately to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Handle URL errors (e.g. from redirect OAuth callbacks if any)
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      if (errorParam === 'google_denied') {
        setGoogleError('Acceso con Google cancelado.');
      } else if (errorParam === 'google_domain') {
        setGoogleError('Tu cuenta de Google no pertenece a un dominio corporativo autorizado.');
      } else {
        setGoogleError('Error en autenticación con Google.');
      }
    }
  }, [searchParams]);

  /**
   * Manejador de éxito de Google Sign-In:
   * Recibe el ID Token emitido por Google y lo verifica contra el backend (POST /api/auth/google)
   */
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setGoogleError('No se recibió la credencial ID Token de Google.');
      return;
    }

    setIsGoogleLoading(true);
    setGoogleError(null);

    try {
      await googleLogin(credentialResponse.credential);
      setToastMessage('Credenciales validadas con éxito. Redirigiendo...');
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al autenticar con Google.';
      setGoogleError(msg);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setGoogleError('La ventana de Google se cerró o se canceló la autorización.');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
        {/* Left Panel: Clean Brand Side */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#014F84] via-[#023e68] to-[#012f50] p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle decorative circles */}
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-[#F48437]/10 pointer-events-none" />

          <div className="space-y-6 relative z-10">
            {/* Official AIG Logo */}
            <div className="w-14 h-14 rounded-2xl bg-white flex flex-col items-center justify-center shadow-lg shrink-0">
              <span className="font-extrabold text-[24px] tracking-wider text-[#014F84] leading-none">
                A<span className="text-[#F48437]">I</span>G
              </span>
              <span className="text-[7px] font-bold text-slate-500 tracking-wider mt-0.5">
                APOYO INTEGRAL
              </span>
            </div>

            {/* Concise Title & Subtitle */}
            <div className="space-y-1.5 pt-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight text-white">
                Dashboard de Cartera
              </h2>
              <p className="text-sm text-white/80 font-medium">
                Apoyo Integral Guatemala, S.A.
              </p>
            </div>
          </div>

          {/* Institutional footer */}
          <div className="text-[11px] text-white/60 pt-6 border-t border-white/10 relative z-10">
            Grupo FUSAI · Guatemala
          </div>
        </div>

        {/* Right Panel: Centered Distraction-Free Google Login */}
        <div className="md:col-span-7 p-8 sm:p-12 flex flex-col justify-center items-center">
          <div className="w-full max-w-sm flex flex-col items-center text-center">
            {/* Title & Subtitle */}
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
              Iniciar Sesión
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mb-8 max-w-xs leading-relaxed">
              Ingresa con tu cuenta corporativa de Google para continuar.
            </p>

            {/* Non-intrusive alert container with fixed min-height to prevent layout shifts */}
            <div className="min-h-[46px] w-full mb-3 flex items-center justify-center">
              {googleError && (
                <div className="w-full p-3 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-center justify-between gap-2 shadow-2xs animate-fade-in text-left">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={15} className="text-red-500 shrink-0" />
                    <span>{googleError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGoogleError(null)}
                    className="text-red-400 hover:text-red-700 transition-colors p-0.5 cursor-pointer shrink-0"
                    title="Cerrar"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {toastMessage && (
                <div className="w-full p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-2xs animate-fade-in text-left">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <span>{toastMessage}</span>
                </div>
              )}
            </div>

            {/* Prominent Official Google Sign-In Button */}
            <div className="w-full flex justify-center items-center py-2 min-h-[50px]">
              {isGoogleLoading ? (
                <div className="w-full max-w-[320px] py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center gap-3 text-xs font-semibold text-slate-600 shadow-2xs">
                  <div className="w-4 h-4 border-2 border-[#014F84]/30 border-t-[#014F84] rounded-full animate-spin" />
                  <span>Verificando credencial de Google...</span>
                </div>
              ) : (
                <div className="w-full flex justify-center overflow-hidden rounded-xl">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    theme="outline"
                    size="large"
                    text="continue_with"
                    shape="rectangular"
                    width="320"
                  />
                </div>
              )}
            </div>

            {/* Bottom Subtle Disclaimer Footer */}
            <p className="text-[11px] text-slate-400 text-center mt-10">
              Acceso autorizado para personal de Apoyo Integral Guatemala.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
