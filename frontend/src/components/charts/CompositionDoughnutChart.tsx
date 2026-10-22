import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { CHART_PALETTE } from '../../utils/formatters';
import type { KV } from '../../types/api';

export interface CompositionDoughnutChartProps {
  items: KV[];
  formatter: (val: number) => string;
}

export const CompositionDoughnutChart: React.FC<CompositionDoughnutChartProps> = ({
  items,
  formatter,
}) => {
  const labels = items.map((x) => x[0]);
  const values = items.map((x) => x[1]);
  const total = values.reduce((a, b) => a + b, 0) || 1;

  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: labels.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]),
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '54%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (c: { label: string; parsed: number }) => {
            const pct = ((c.parsed / total) * 100).toFixed(1) + '%';
            return ` ${c.label}: ${formatter(c.parsed)} (${pct})`;
          },
        },
      },
    },
  };

  return (
    <div className="h-full w-full relative">
      <Doughnut data={data} options={options} />
    </div>
  );
};
