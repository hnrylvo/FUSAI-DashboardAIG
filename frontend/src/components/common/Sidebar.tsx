import React from 'react';
import {
  Activity,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  PieChart,
  Trophy,
  X,
  PanelLeftClose,
} from 'lucide-react';
import clsx from 'clsx';
import { type DashboardTab, useDashboardStore } from '../../store/useDashboardStore';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: DashboardTab;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'resumen',
    label: 'Resumen & Tendencias',
    icon: LayoutDashboard,
    description: 'KPIs globales, mora y colocación',
  },
  {
    id: 'composicion',
    label: 'Composición',
    icon: PieChart,
    description: 'Distribución por producto y saldo',
  },
  {
    id: 'rankings',
    label: 'Rankings',
    icon: Trophy,
    description: 'TOP concentraciones y mora',
  },
  {
    id: 'operacion',
    label: 'Operación & Cobro',
    icon: CalendarCheck,
    description: 'Días de pago y precobro',
  },
  {
    id: 'retencion',
    label: 'Retención & Riesgo',
    icon: Activity,
    description: 'Deserción y matriz de rodamiento',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const { activeTab, setActiveTab } = useDashboardStore();

  return (
    <>
      {/* ======================================================== */}
      {/* 1. DESKTOP SIDEBAR (Sticky / Fixed Drawer)               */}
      {/* ======================================================== */}
      <aside
        className={clsx(
          'hidden lg:flex flex-col bg-white border-r border-slate-200/90 shrink-0 sticky top-0 h-screen z-30 transition-all duration-300 ease-in-out select-none shadow-xs overflow-x-hidden overflow-y-hidden',
          isCollapsed ? 'w-16' : 'w-64',
        )}
      >
        {/* Brand / Logo Top Section */}
        <div
          className={clsx(
            'border-b border-slate-100 flex flex-col justify-center transition-all duration-200 overflow-x-hidden',
            isCollapsed ? 'h-16 items-center px-0' : 'py-3.5 px-4',
          )}
        >
          {isCollapsed ? (
            /* Collapsed view: Strictly centered corporate logo badge, no subtext or overflow */
            <div
              className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col items-center justify-center shrink-0 cursor-pointer hover:border-[#014F84]/40 transition-colors"
              onClick={onToggleCollapse}
              title="Expandir barra lateral"
            >
              <span className="font-extrabold text-[16px] tracking-wider text-[#014F84] leading-none">
                A<span className="text-[#F48437]">I</span>G
              </span>
              <span className="text-[5px] font-bold text-slate-500 tracking-wider mt-0.5">
                AIG
              </span>
            </div>
          ) : (
            /* Expanded view: Brand block + toggle, with full corporate subtitle directly underneath */
            <div className="w-full">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col items-center justify-center shrink-0">
                    <span className="font-extrabold text-[15px] tracking-wider text-[#014F84] leading-none">
                      A<span className="text-[#F48437]">I</span>G
                    </span>
                    <span className="text-[5px] font-bold text-slate-500 tracking-wider mt-0.5">
                      AIG
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 tracking-tight leading-tight truncate">
                      Apoyo Integral
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  title="Contraer barra lateral"
                  aria-label="Contraer barra lateral"
                >
                  <ChevronLeft size={17} />
                </button>
              </div>

              {/* Subtitle placed directly underneath brand name / logo block */}
              <div className="mt-2 text-[10.5px] font-medium text-slate-500 leading-tight">
                Apoyo Integral Guatemala, S.A.
              </div>
            </div>
          )}
        </div>

        {/* Navigation Category Label (Expanded only) */}
        {!isCollapsed && (
          <div className="px-5 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Navegación
          </div>
        )}

        {/* Nav Items List */}
        <nav
          className={clsx(
            'flex-1 py-3 overflow-y-auto overflow-x-hidden space-y-1.5',
            isCollapsed ? 'px-0 flex flex-col items-center' : 'px-3',
          )}
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                title={`${item.label} — ${item.description}`}
                className={clsx(
                  'flex items-center rounded-xl transition-all duration-150 cursor-pointer relative select-none',
                  isCollapsed
                    ? 'w-10 h-10 justify-center mx-auto'
                    : 'w-full gap-3 px-3.5 py-2.5 text-left',
                  isActive
                    ? 'bg-[#014F84] text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-[#014F84] hover:bg-slate-100/90 font-medium',
                )}
              >
                {/* Visual active indicator bar */}
                {isActive && (
                  <span
                    className={clsx(
                      'absolute bg-[#F48437] rounded-full transition-all duration-200',
                      isCollapsed
                        ? 'left-0.5 top-2.5 bottom-2.5 w-1'
                        : 'left-0 top-2 bottom-2 w-1.5 rounded-r-md',
                    )}
                  />
                )}

                {/* Icon */}
                <Icon
                  size={19}
                  strokeWidth={isActive ? 2.2 : 1.9}
                  className={clsx(
                    'shrink-0 transition-colors',
                    isActive
                      ? 'text-white'
                      : 'text-slate-400 hover:text-[#014F84]',
                  )}
                />

                {/* Label (Expanded only) */}
                {!isCollapsed && (
                  <div className="min-w-0 flex-1">
                    <span className="text-xs tracking-tight truncate leading-tight block">
                      {item.label}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="p-2.5 border-t border-slate-100 bg-slate-50/60 overflow-hidden shrink-0">
          {isCollapsed ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="w-10 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#014F84] hover:bg-slate-200/70 transition-colors cursor-pointer"
                title="Expandir barra lateral"
                aria-label="Expandir barra lateral"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          ) : (
            <div className="px-2 py-1 flex items-center justify-between text-slate-500">
              <div className="leading-tight">
                <div className="text-[11px] font-bold text-slate-700">
                  AIG Cartera
                </div>
                <div className="text-[9.5px] text-slate-400 font-normal">
                  Riesgos &amp; Dirección
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Contraer barra lateral"
                aria-label="Contraer barra lateral"
              >
                <PanelLeftClose size={15} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MOBILE DRAWER (Off-canvas with backdrop overlay)      */}
      {/* ======================================================== */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 lg:hidden transition-opacity duration-200"
          onClick={onCloseMobile}
        />
      )}

      <div
        className={clsx(
          'fixed inset-y-0 left-0 w-72 bg-white z-50 shadow-2xl flex flex-col lg:hidden transition-transform duration-300 ease-in-out overflow-x-hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Mobile Header */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col items-center justify-center shrink-0">
                <span className="font-extrabold text-[15px] tracking-wider text-[#014F84] leading-none">
                  A<span className="text-[#F48437]">I</span>G
                </span>
                <span className="text-[5px] font-bold text-slate-500 tracking-wider mt-0.5">
                  AIG
                </span>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">Apoyo Integral</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Cerrar menú"
            >
              <X size={18} />
            </button>
          </div>
          {/* Subtitle placed directly underneath brand name / logo block */}
          <div className="mt-2 text-[10.5px] font-medium text-slate-500 leading-tight">
            Apoyo Integral Guatemala, S.A.
          </div>
        </div>

        {/* Mobile Navigation Label */}
        <div className="px-5 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Navegación
        </div>

        {/* Mobile Nav Items */}
        <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  onCloseMobile();
                }}
                className={clsx(
                  'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 cursor-pointer text-left relative select-none',
                  isActive
                    ? 'bg-[#014F84] text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-[#014F84] hover:bg-slate-100/90 font-medium',
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1.5 bg-[#F48437] rounded-r-md" />
                )}

                <Icon
                  size={19}
                  strokeWidth={isActive ? 2.2 : 1.9}
                  className={clsx(
                    'shrink-0 transition-colors',
                    isActive ? 'text-white' : 'text-slate-400',
                  )}
                />

                <div className="min-w-0 flex-1">
                  <span className="text-xs tracking-tight truncate leading-tight block">
                    {item.label}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Mobile Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60 leading-tight text-center">
          <div className="text-xs font-semibold text-slate-700">AIG Cartera</div>
          <div className="text-[10px] text-slate-400 font-normal mt-0.5">
            Riesgos &amp; Dirección
          </div>
        </div>
      </div>
    </>
  );
};
