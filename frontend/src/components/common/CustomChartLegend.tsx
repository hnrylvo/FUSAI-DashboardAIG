import React from 'react';
import { CHART_PALETTE, fPct } from '../../lib/formatters';
import type { KV } from '../../types/api';

interface CustomChartLegendProps {
  items: KV[];
  formatter: (val: number) => string;
}

export const CustomChartLegend: React.FC<CustomChartLegendProps> = ({ items, formatter }) => {
  const total = items.reduce((acc, curr) => acc + curr[1], 0) || 1;

  return (
    <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 mt-3 text-[11px] text-slate-600">
      {items.map(([label, val], idx) => {
        const color = CHART_PALETTE[idx % CHART_PALETTE.length];
        const pct = fPct(val / total);
        return (
          <div key={label} className="inline-flex items-center gap-1.5 shrink-0">
            <span
              className="w-2.5 h-2.5 rounded-xs shrink-0 shadow-2xs"
              style={{ backgroundColor: color }}
            />
            <span className="truncate max-w-[170px]" title={label}>
              {label}
            </span>
            <span>·</span>
            <span className="font-bold text-slate-900 tabular-nums">
              {formatter(val)}
            </span>
            <span className="text-slate-400 font-medium tabular-nums">
              ({pct})
            </span>
          </div>
        );
      })}
    </div>
  );
};
