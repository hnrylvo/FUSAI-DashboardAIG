import React from 'react';
import clsx from 'clsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'orange' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}) => {
  const variantStyles = {
    primary:
      'bg-[#014F84] hover:bg-[#023e68] text-white shadow-xs focus:ring-[#014F84]/30',
    orange:
      'bg-[#F48437] hover:bg-[#e0722a] text-white shadow-xs focus:ring-[#F48437]/30',
    secondary:
      'bg-slate-100 hover:bg-slate-200 text-slate-700 focus:ring-slate-400/20',
    ghost:
      'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900',
    outline:
      'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs',
  }[variant];

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 rounded-lg gap-1.5',
    md: 'text-xs px-3.5 py-2 rounded-xl gap-2 font-bold',
    lg: 'text-sm px-4 py-2.5 rounded-xl gap-2.5 font-bold',
  }[size];

  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-semibold transition-all duration-150 cursor-pointer select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none active:scale-[0.98]',
        'focus:outline-hidden focus:ring-2',
        variantStyles,
        sizeStyles,
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin shrink-0" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
};
