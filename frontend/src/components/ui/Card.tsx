import React from 'react';
import clsx from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  description,
  action,
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={clsx(
        'bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col',
        className,
      )}
      {...props}
    >
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            {title && (
              <h3 className="text-sm font-bold text-[#014F84] tracking-tight">{title}</h3>
            )}
            {description && (
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
