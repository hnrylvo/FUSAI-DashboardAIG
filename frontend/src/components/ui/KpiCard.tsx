import React from 'react';
import clsx from 'clsx';

export interface KpiCardProps {
  label: string;
  value: string;
  detail?: string;
  trend?: 'up' | 'down' | 'flat';
  accent?: 'navy' | 'orange' | 'red' | 'green';
  icon?: React.ReactNode;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  detail,
  trend = 'flat',
  accent = 'navy',
  icon,
}) => {
  const accentBorder = {
    navy: 'border-l-[#014F84]',
    orange: 'border-l-[#F48437]',
    red: 'border-l-[#d9534f]',
    green: 'border-l-[#2e9e6b]',
  }[accent];

  const trendColor = {
    up: 'text-[#d9534f]',
    down: 'text-[#2e9e6b]',
    flat: 'text-slate-500',
  }[trend];

  const iconAccentClasses = {
    navy: 'text-[#014F84] bg-slate-50 border-slate-100',
    orange: 'text-[#F48437] bg-orange-50/50 border-orange-100/50',
    red: 'text-[#d9534f] bg-red-50/50 border-red-100/50',
    green: 'text-[#2e9e6b] bg-emerald-50/50 border-emerald-100/50',
  }[accent];

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-xl bg-white p-4 shadow-xs border border-slate-200/80',
        'border-l-[4px] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group',
        accentBorder,
      )}
    >
      {/* Top Header: Label + Discreet Top-Right Monochrome SVG Icon */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-500 truncate">
          {label}
        </span>
        {icon && (
          <div
            className={clsx(
              'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-200',
              'opacity-75 group-hover:opacity-100',
              iconAccentClasses,
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Numeric Value */}
      <div className="mt-2 text-2xl sm:text-[26px] font-extrabold tracking-tight text-slate-900 tabular-nums leading-none">
        {value}
      </div>

      {/* Delta Detail */}
      {detail && (
        <div
          className={clsx(
            'mt-2.5 text-[11px] font-semibold tabular-nums truncate flex items-center gap-1',
            trendColor,
          )}
        >
          {trend === 'up' && <span className="text-[10px] leading-none">▲</span>}
          {trend === 'down' && <span className="text-[10px] leading-none">▼</span>}
          <span>{detail}</span>
        </div>
      )}
    </div>
  );
};
