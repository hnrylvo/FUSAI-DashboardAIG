import React from 'react';
import { Line } from 'react-chartjs-2';
import { fN, fQ } from '../../utils/formatters';

export interface CarteraTrendChartProps {
  labels: string[];
  cartera: number[];
  ncli: number[];
}

export const CarteraTrendChart: React.FC<CarteraTrendChartProps> = ({
  labels,
  cartera,
  ncli,
}) => {
  const data = {
    labels,
    datasets: [
      {
        label: 'Cartera (Q)',
        data: cartera,
        borderColor: '#014F84',
        backgroundColor: 'rgba(1,79,132,0.08)',
        fill: true,
        tension: 0.3,
        yAxisID: 'y',
        pointRadius: 3,
        borderWidth: 3,
      },
      {
        label: 'Clientes',
        data: ncli,
        borderColor: '#F48437',
        backgroundColor: '#F48437',
        tension: 0.3,
        yAxisID: 'y1',
        pointRadius: 3,
        borderWidth: 3,
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
        title: { display: true, text: 'Cartera (Q)' },
      },
      y1: {
        position: 'right' as const,
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Clientes' },
      },
    },
  };

  return (
    <div className="h-full w-full">
      <Line data={data} options={options} />
    </div>
  );
};
