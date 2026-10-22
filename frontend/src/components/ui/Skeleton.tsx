import React from 'react';
import clsx from 'clsx';

export interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div
      className={clsx(
        'animate-pulse bg-slate-200/70 rounded-md',
        className,
      )}
    />
  );
};

export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 8 }) => {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }, (_, i) => (
        <td key={i} className="py-2.5 px-3">
          <div className="h-4 bg-slate-200/70 rounded w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
};
