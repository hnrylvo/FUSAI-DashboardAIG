import React from 'react';
import { Line } from 'react-chartjs-2';
import { fN, fQ } from '../../utils/formatters';

export interface MoraTrendChartProps {
  labels: string[];
  monto: number[];
  clientes: number[];
  montoLabel: string;
  clientesLabel: string;
  accentColor?: string;
  fillColor?: string;
}

export const MoraTrendChart: React.FC<MoraTrendChartProps> = ({
  labels,
  monto,
  clientes,
  montoLabel,
  clientesLabel,
  accentColor = '#F48437',
  fillColor = 'rgba(244,132,55,0.10)',
}) => {
  const data = {
    labels,
    datasets: [
      {
        label: montoLabel,
        data: monto,
        borderColor: accentColor,
        backgroundColor: fillColor,
        fill: true,
        tension: 0.3,
        yAxisID: 'y',
        borderWidth: 3,
        pointRadius: 3,
      },
      {
        label: clientesLabel,
        data: clientes,
        borderColor: '#014F84',
        tension: 0.3,
        yAxisID: 'y1',
        borderWidth: 3,
        pointRadius: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle' as const,
          boxWidth: 8,
          padding: 14,
          font: { weight: 'bold' as const },
        },
      },
      tooltip: {
        callbacks: {
          label: (c: { dataset?: { yAxisID?: string; label?: string }; parsed?: { y: number | null } }) => {
            const isMoney = c.dataset?.yAxisID === 'y';
            const val = c.parsed?.y ?? 0;
            return `${c.dataset?.label || ''}: ${isMoney ? fQ(val) : fN(val)}`;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        position: 'left' as const,
        ticks: { callback: (v: number | string) => 'Q' + (Number(v) / 1e6).toFixed(1) + 'M' },
      },
      y1: {
        position: 'right' as const,
        grid: { drawOnChartArea: false },
      },
    },
  };

  return (
    <div className="h-full w-full">
      <Line data={data} options={options} />
    </div>
  );
};
