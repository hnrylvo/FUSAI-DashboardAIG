import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="py-5 px-4 md:px-6 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="font-semibold text-slate-700">
          Apoyo Integral Guatemala, S.A. · Grupo FUSAI
        </p>
        <p className="text-slate-400 text-[11px]">
          Plataforma de Monitoreo de Cartera &amp; Riesgo Crediticio · Uso Interno Confidencial
        </p>
      </div>
    </footer>
  );
};
