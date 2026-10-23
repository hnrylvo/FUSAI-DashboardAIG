import React from 'react';
import { cierreLabel } from './cosechasCore';

interface TechnicalNotesProps {
  mode: 'vintage' | 'trans';
  firstCierre: string;
}

export const TechnicalNotes: React.FC<TechnicalNotesProps> = ({ mode, firstCierre }) => {
  const cLabel = firstCierre ? cierreLabel(firstCierre) : '2025-01-31';

  if (mode === 'trans') {
    return (
      <section className="card note" id="notes">
        <h2>Cómo leer las matrices de transición</h2>
        <ul>
          <li>
            <b>Qué mide:</b> se toma cada crédito vigente en un cierre inicial y se mira en qué tramo de mora quedó en el cierre final (según el horizonte: 1, 2, 3, 6 o 12 meses). Cada fila suma 100%.
          </li>
          <li>
            <b>Tramos:</b> Al día (0), 1–30, 31–60, 61–90, 91–180 y &gt;180 días de mora. “Empeoran” = suben a un tramo peor; “Mejoran” = bajan de tramo o se ponen al día.
          </li>
          <li>
            <b>Salió de cartera:</b> el crédito estaba vigente al inicio y ya no aparece al final. Puede ser cancelación o castigo: los cierres solo incluyen créditos vigentes y no hay forma de separarlos. Se muestra aparte y no se interpreta como mejora ni como deterioro.
          </li>
          <li>
            <b>Nuevos créditos:</b> no existían al inicio del período (desembolsos posteriores). No cuentan como transición.
          </li>
          <li>
            <b>Detalle por clic:</b> aplica a los movimientos ascendentes (de un tramo a uno peor, incluido de Al día a mora) y a las salidas desde tramos con mora. Los créditos que permanecen al día o en el mismo tramo no tienen detalle.
          </li>
          <li>
            <b>Período acumulado:</b> suma todos los pares de cierres disponibles; un mismo crédito puede contarse varias veces, una por cada mes. Los filtros y la opción de asesor de arriba aplican igual que en el vintage.
          </li>
          <li>Este archivo contiene datos de clientes: manéjelo como información interna.</li>
        </ul>
      </section>
    );
  }

  return (
    <section className="card note" id="notes">
      <h2>Cómo leer este análisis</h2>
      <ul>
        <li>
          <b>Cosecha</b> = mes de desembolso del crédito. <b>M1</b> = cierre del mismo mes del desembolso; M2 = el mes siguiente, y así sucesivamente.
        </li>
        <li>
          <b>PAR 1</b> = créditos con mora ≥ 1 día; <b>PAR 30</b> = mora &gt; 30 días (umbrales configurables en <code>PAR_DEFS</code> del código). Se mide con el saldo capital total del crédito en mora sobre el saldo capital de la cosecha en ese corte; la versión por número usa conteo de créditos.
        </li>
        <li>
          <b>Alguna vez en mora (acumulada)</b>: del universo presente en el corte, la parte que ya había alcanzado el umbral en ese corte o en uno anterior (desde el primer cierre cargado).
        </li>
        <li>
          <b>Alcance de los datos:</b> los reportes traen solo créditos vigentes. Un crédito cancelado o castigado sale de los cortes siguientes, por lo que la base de cada cosecha son los créditos que sobreviven. La historia observable empieza en el cierre {cLabel}: las cosechas anteriores a esa fecha no tienen M1…Mn tempranos y muestran únicamente créditos que seguían vigentes en {cLabel}. Los créditos en cobro jurídico (&gt;180 días) siguen vigentes en el reporte y sí cuentan en el PAR.
        </li>
        <li>
          <b>Asesor:</b> “colocación” = primer asesor del crédito que no sea Gestor de Cobro; “actual” = asesor en el último cierre. Garantías con nombres casi iguales (p. ej. PRENDARIA y GARANTIA PRENDARIA) se respetan tal como vienen en el sistema.
        </li>
        <li>Este archivo contiene datos de clientes: manéjelo como información interna.</li>
      </ul>
    </section>
  );
};
