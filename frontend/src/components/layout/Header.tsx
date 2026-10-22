import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  LogOut,
  Menu,
  RefreshCw,
  User as UserIcon,
  X,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import { useDashboardStore } from '../../store/useDashboardStore';
import { cLabel } from '../../utils/formatters';

export interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const { meta, setMeta, cierre, setCierre } = useDashboardStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const cierres = meta?.cierres || [];
  const sortedCierres = [...cierres].sort((a, b) => b.cierre.localeCompare(a.cierre));

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setToast(null);

    try {
      // 1. Trigger direct server/database synchronization
      const syncResult = await api.portfolio.syncPortfolio();

      // 2. Refresh metadata from backend to get updated cierres catalog
      const freshMeta = await api.portfolio.getMeta();
      setMeta(freshMeta);

      // 3. Update active closure to newly synchronized closure
      if (syncResult.cierre) {
        setCierre(syncResult.cierre);
      }

      // 4. Invalidate all cached queries across the dashboard to trigger seamless recalculation
      await queryClient.invalidateQueries();

      // 5. Success feedback toast
      setToast({
        type: 'success',
        message: 'Cierre actualizado exitosamente desde el servidor',
      });
      setTimeout(() => {
        setToast((curr) => (curr?.type === 'success' ? null : curr));
      }, 4000);
    } catch (err: unknown) {
      console.error('Error during portfolio synchronization:', err);
      setToast({
        type: 'error',
        message: 'Error al sincronizar con el servidor de base de datos',
      });
      setTimeout(() => {
        setToast((curr) => (curr?.type === 'error' ? null : curr));
      }, 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="glass-header text-white px-4 md:px-6 lg:px-8 py-3 sticky top-0 z-30 transition-all min-h-[68px] flex items-center relative">
      <div className="w-full max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand Section */}
        <div className="flex items-center gap-3">
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 -ml-1 text-white/90 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="Abrir menú de navegación"
            >
              <Menu size={22} />
            </button>
          )}
          <div>
            <h1 className="text-base md:text-lg font-bold tracking-tight leading-tight text-white">
              Dashboard de Cartera
            </h1>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center flex-wrap gap-3 sm:gap-4 ml-auto">
          {/* Cierre Selector & Generation Timestamp */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="cierre-selector"
                className="text-[10px] font-bold uppercase tracking-wider text-white/80"
              >
                Cierre de análisis
              </label>
              {meta?.generated && (
                <span
                  className="hidden md:inline-flex items-center gap-1 text-[9.5px] text-white/70 font-medium"
                  title="Fecha y hora de generación de datos"
                >
                  <Clock size={10} />
                  <span>Generado: {meta.generated}</span>
                </span>
              )}
            </div>
            <select
              id="cierre-selector"
              value={cierre || ''}
              onChange={(e) => setCierre(e.target.value)}
              disabled={isSyncing}
              className="bg-white text-[#014F84] border-0 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold shadow-md cursor-pointer hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-[#F48437] disabled:opacity-60"
            >
              {sortedCierres.map((item) => (
                <option key={item.cierre} value={item.cierre}>
                  {cLabel(item.cierre)} ({item.cierre})
                </option>
              ))}
            </select>
          </div>

          {/* Actualizar cierre (Direct DB/Server Sync) Button */}
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 bg-[#F48437] hover:bg-[#e0722a] disabled:bg-orange-400 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-md transition-all duration-150 transform active:scale-95 disabled:scale-100 disabled:cursor-not-allowed cursor-pointer mt-auto"
            title="Sincronizar directamente con el servidor de base de datos"
          >
            <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Actualizando...' : 'Actualizar cierre'}</span>
          </button>

          {/* User profile / Logout */}
          <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-2.5 py-1.5 text-xs mt-auto">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0 overflow-hidden">
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.name || user.email}
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <UserIcon size={14} className="text-white" />
              )}
            </div>
            <div className="hidden lg:block text-left leading-tight">
              <div className="font-semibold text-white truncate max-w-[150px]">
                {user?.name || user?.email}
              </div>
              <div className="text-[10px] text-white/70 truncate max-w-[150px]">
                {user?.email}
              </div>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="p-1 hover:bg-white/20 rounded-md text-white/80 hover:text-white transition-colors ml-1 cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Floating feedback toast */}
      {toast && (
        <div className="absolute right-4 md:right-8 top-[calc(100%+10px)] z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-medium ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 p-0.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
              title="Cerrar notificación"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
