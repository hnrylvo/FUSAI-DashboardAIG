import React from 'react';
import clsx from 'clsx';

export interface BadgeProps {
  variant?: 'dia' | 'b1' | 'b2' | 'b3' | 'b4' | 'navy' | 'orange' | 'slate';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'slate',
  size = 'md',
  children,
  className,
}) => {
  const variantStyles = {
    dia: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    b1: 'bg-orange-50 text-orange-700 border-orange-200/80',
    b2: 'bg-amber-50 text-amber-800 border-amber-200/80',
    b3: 'bg-rose-50 text-rose-700 border-rose-200/80',
    b4: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200/80',
    navy: 'bg-[#014F84]/10 text-[#014F84] border-[#014F84]/20',
    orange: 'bg-[#F48437]/15 text-[#e0722a] border-[#F48437]/30',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  }[variant];

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-[11px] px-2.5 py-0.5 font-bold',
  }[size];

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-full border font-semibold tabular-nums leading-none select-none',
        variantStyles,
        sizeStyles,
        className,
      )}
    >
      {children}
    </span>
  );
};
