import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useDashboardStore } from '../store/useDashboardStore';
import type { RankingBucket } from '../types/api';

/**
 * Custom hook unificado que expone consultas reactivas para las distintas
 * secciones del dashboard, sincronizadas con el cierre y filtros activos.
 */
export function usePortfolioData() {
  const {
    cierre,
    filters,
    colocTipo,
    diaPago,
    venc,
    desDe,
    desA,
    mtxDe,
    mtxA,
  } = useDashboardStore();

  const isEnabled = Boolean(cierre);

  // Overview (KPIs y Tendencias)
  const overviewQuery = useQuery({
    queryKey: ['overview', cierre, filters],
    queryFn: () => api.portfolio.getOverview(cierre!, filters),
    enabled: isEnabled,
  });

  // Colocación mensual
  const placementQuery = useQuery({
    queryKey: ['placement', colocTipo, filters],
    queryFn: () => api.portfolio.getPlacement(colocTipo, filters),
  });

  // Composición por producto y saldo
  const compositionQuery = useQuery({
    queryKey: ['composition', cierre, filters],
    queryFn: () => api.portfolio.getComposition(cierre!, filters),
    enabled: isEnabled,
  });

  // Días de pago (Operaciones)
  const paymentDaysQuery = useQuery({
    queryKey: ['paymentDays', cierre, diaPago, filters],
    queryFn: () => api.portfolio.getPaymentDays(cierre!, diaPago, filters),
    enabled: isEnabled,
  });

  // Vencimientos próximos
  const maturitiesQuery = useQuery({
    queryKey: ['maturities', cierre, venc, filters],
    queryFn: () => api.portfolio.getMaturities(cierre!, venc, filters),
    enabled: isEnabled,
  });

  // Precobro
  const preCollectionQuery = useQuery({
    queryKey: ['preCollection', cierre, filters],
    queryFn: () => api.portfolio.getPreCollection(cierre!, filters),
    enabled: isEnabled,
  });

  // Deserción de clientes
  const attritionQuery = useQuery({
    queryKey: ['attrition', desDe, desA, filters],
    queryFn: () => api.portfolio.getAttrition(desDe!, desA!, filters),
    enabled: Boolean(desDe && desA),
  });

  // Matriz de rodamiento
  const transitionQuery = useQuery({
    queryKey: ['transition', mtxDe, mtxA, filters],
    queryFn: () => api.portfolio.getTransition(mtxDe!, mtxA!, filters),
    enabled: Boolean(mtxDe && mtxA),
  });

  return {
    cierre,
    filters,
    overviewQuery,
    placementQuery,
    compositionQuery,
    paymentDaysQuery,
    maturitiesQuery,
    preCollectionQuery,
    attritionQuery,
    transitionQuery,
  };
}

/** Hook especializado para consultas de rankings con paginación */
export function useRankingBucket(bucket: RankingBucket, page = 1, pageSize = 10) {
  const { cierre, filters } = useDashboardStore();

  return useQuery({
    queryKey: ['ranking', bucket, cierre, filters, page, pageSize],
    queryFn: () => api.portfolio.getRanking(bucket, cierre!, filters, page, pageSize),
    enabled: Boolean(cierre),
  });
}
