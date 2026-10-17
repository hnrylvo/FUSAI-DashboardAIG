import React from 'react';
import clsx from 'clsx';

export interface KpiCardProps {
  label: string;
  value: string;
  detail?: string;
  trend?: 'up' | 'down' | 'flat';
  accent?: 'navy' | 'orange' | 'red' | 'green';
  icon?: string;
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

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-xl bg-gradient-to-br from-white to-slate-50/70 p-3.5 sm:p-4 shadow-sm border border-slate-200/80',
        'border-l-[5px] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        accentBorder,
      )}
    >
      {/* Background icon badge */}
      {icon && (
        <span className="absolute right-3 top-3 text-2xl opacity-15 select-none pointer-events-none">
          {icon}
        </span>
      )}

      {/* Label */}
      <div className="text-[10.5px] uppercase font-bold tracking-wider text-slate-500 truncate pr-6">
        {label}
      </div>

      {/* Numeric Value */}
      <div className="mt-1 text-2xl sm:text-[26px] font-extrabold tracking-tight text-slate-900 tabular-nums leading-none">
        {value}
      </div>

      {/* Delta Detail */}
      {detail && (
        <div className={clsx('mt-1.5 text-[11px] font-semibold tabular-nums truncate', trendColor)}>
          {detail}
        </div>
      )}
    </div>
  );
};
