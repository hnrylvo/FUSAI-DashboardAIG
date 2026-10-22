import React from 'react';
import { usePortfolioData } from '../../../hooks/usePortfolioData';
import { Card } from '../../../components/ui/Card';
import { CompositionDoughnutChart } from '../../../components/charts/CompositionDoughnutChart';
import { CustomChartLegend } from '../../../components/ui/CustomChartLegend';
import { fN, fQ } from '../../../utils/formatters';

export const CompositionSection: React.FC = () => {
  const { compositionQuery } = usePortfolioData();

  if (compositionQuery.isLoading || !compositionQuery.data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-80 bg-slate-200/60 rounded-xl" />
        ))}
      </div>
    );
  }

  const { prodCart, prodCli, moraProdCart, moraProdCli, saldoCart, saldoCli } =
    compositionQuery.data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 5 · Cartera por producto */}
      <Card
        title="5 · Cartera por producto"
        description="Participación del saldo de capital por producto."
        className="justify-between"
      >
        <div className="h-56 relative my-1">
          <CompositionDoughnutChart items={prodCart} formatter={fQ} />
        </div>
        <CustomChartLegend items={prodCart} formatter={fQ} />
      </Card>

      {/* 5 · Clientes por producto */}
      <Card
        title="5 · Clientes por producto"
        description="Participación de clientes por producto."
        className="justify-between"
      >
        <div className="h-56 relative my-1">
          <CompositionDoughnutChart items={prodCli} formatter={fN} />
        </div>
        <CustomChartLegend items={prodCli} formatter={fN} />
      </Card>

      {/* 6 · Mora por producto — cartera */}
      <Card
        title="6 · Mora por producto — cartera"
        description="Saldo en riesgo (mora ≥ 1 día) por producto."
        className="justify-between"
      >
        <div className="h-56 relative my-1">
          <CompositionDoughnutChart items={moraProdCart} formatter={fQ} />
        </div>
        <CustomChartLegend items={moraProdCart} formatter={fQ} />
      </Card>

      {/* 6 · Mora por producto — clientes */}
      <Card
        title="6 · Mora por producto — clientes"
        description="Clientes en mora (≥ 1 día) por producto."
        className="justify-between"
      >
        <div className="h-56 relative my-1">
          <CompositionDoughnutChart items={moraProdCli} formatter={fN} />
        </div>
        <CustomChartLegend items={moraProdCli} formatter={fN} />
      </Card>

      {/* 7 · Cartera por bloque de saldo */}
      <Card
        title="7 · Cartera por bloque de saldo"
        description="Distribución del saldo de capital por rangos."
        className="justify-between"
      >
        <div className="h-56 relative my-1">
          <CompositionDoughnutChart items={saldoCart} formatter={fQ} />
        </div>
        <CustomChartLegend items={saldoCart} formatter={fQ} />
      </Card>

      {/* 7 · Clientes por bloque de saldo */}
      <Card
        title="7 · Clientes por bloque de saldo"
        description="Distribución de clientes por rango de saldo."
        className="justify-between"
      >
        <div className="h-56 relative my-1">
          <CompositionDoughnutChart items={saldoCli} formatter={fN} />
        </div>
        <CustomChartLegend items={saldoCli} formatter={fN} />
      </Card>
    </div>
  );
};
