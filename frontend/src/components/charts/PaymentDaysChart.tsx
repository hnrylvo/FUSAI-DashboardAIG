import React from 'react';
import { Chart } from 'react-chartjs-2';
import { fN, fQ } from '../../utils/formatters';

export interface PaymentDaysChartProps {
  days: number[];
  monto: number[];
  cnt: number[];
}

export const PaymentDaysChart: React.FC<PaymentDaysChartProps> = ({
  days,
  monto,
  cnt,
}) => {
  const data = {
    labels: days,
    datasets: [
      {
        type: 'bar' as const,
        label: 'Monto de cartera (Q)',
        data: monto,
        backgroundColor: '#014F84',
        yAxisID: 'y',
        borderRadius: 4,
      },
      {
        type: 'line' as const,
        label: 'N° clientes',
        data: cnt,
        borderColor: '#F48437',
        backgroundColor: '#F48437',
        yAxisID: 'y1',
        tension: 0.3,
        borderWidth: 3,
        pointRadius: 2,
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
      x: {
        grid: { display: false },
        title: { display: true, text: 'Día de pago' },
      },
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
      <Chart type="bar" data={data} options={options} />
    </div>
  );
};
