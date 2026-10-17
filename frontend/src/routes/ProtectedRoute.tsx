import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isInitialized, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      checkAuth();
    }
  }, [isInitialized, checkAuth]);

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-[#014F84] text-white flex items-center justify-center font-extrabold text-xl shadow-lg mb-4 animate-pulse">
          A<span className="text-[#F48437]">I</span>G
        </div>
        <div className="text-xs font-semibold text-slate-500 flex items-center gap-2">
          <div className="w-3.5 h-3.5 border-2 border-[#014F84]/30 border-t-[#014F84] rounded-full animate-spin" />
          <span>Verificando sesión segura...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
