import React from 'react';
import { LogOut, UploadCloud, User as UserIcon, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useDashboardStore } from '../../store/useDashboardStore';
import { cLabel } from '../../lib/formatters';

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { meta, cierre, setCierre, setUploadModalOpen } = useDashboardStore();

  const cierres = meta?.cierres || [];
  const sortedCierres = [...cierres].sort((a, b) => b.cierre.localeCompare(a.cierre));

  return (
    <header className="glass-header text-white px-4 md:px-6 py-3.5 sticky top-0 z-40 transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand Logo & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white flex flex-col items-center justify-center shadow-md shrink-0">
            <span className="font-extrabold text-[19px] tracking-wider text-[#014F84] leading-none">
              A<span className="text-[#F48437]">I</span>G
            </span>
            <span className="text-[6.5px] font-bold text-slate-500 tracking-wider mt-0.5">
              APOYO INTEGRAL
            </span>
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold tracking-tight leading-tight flex items-center gap-2">
              Dashboard de Cartera
              <span className="hidden sm:inline-flex items-center text-[10px] font-semibold uppercase tracking-wider bg-white/15 px-2 py-0.5 rounded-full border border-white/20">
                Grupo FUSAI
              </span>
            </h1>
            <p className="text-[11.5px] text-white/80 font-medium">
              Apoyo Integral Guatemala, S.A. · Riesgos &amp; Dirección
            </p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center flex-wrap gap-3 sm:gap-4 ml-auto">
          {/* Cierre Selector */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="cierre-selector"
              className="text-[10px] font-bold uppercase tracking-wider text-white/80"
            >
              Cierre de análisis
            </label>
            <select
              id="cierre-selector"
              value={cierre || ''}
              onChange={(e) => setCierre(e.target.value)}
              className="bg-white text-[#014F84] border-0 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold shadow-md cursor-pointer hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-[#F48437]"
            >
              {sortedCierres.map((item) => (
                <option key={item.cierre} value={item.cierre}>
                  {cLabel(item.cierre)} ({item.cierre})
                </option>
              ))}
            </select>
          </div>

          {/* Actualizar cierre (Upload) button */}
          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-2 bg-[#F48437] hover:bg-[#e0722a] text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-md transition-all duration-150 transform active:scale-95 cursor-pointer mt-auto"
            title="Cargar nuevo archivo de cartera (.xls / .xlsx)"
          >
            <UploadCloud size={15} />
            <span className="hidden sm:inline">Actualizar cierre</span>
            <span className="sm:hidden">Cargar</span>
          </button>

          {/* User profile / Logout */}
          <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-2.5 py-1.5 text-xs mt-auto">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <UserIcon size={14} className="text-white" />
              )}
            </div>
            <div className="hidden lg:block text-left leading-tight">
              <div className="font-semibold text-white truncate max-w-[140px] flex items-center gap-1">
                {user?.name}
                {user?.role === 'admin' && (
                  <span title="Administrador">
                    <ShieldCheck size={12} className="text-[#F48437]" />
                  </span>
                )}
              </div>
              <div className="text-[10px] text-white/70 capitalize">
                {user?.role === 'admin' ? 'Administrador' : 'Analista'}
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
    </header>
  );
};
