import type {
  AttritionResponse,
  CompositionResponse,
  FilterPayload,
  MaturitiesResponse,
  MatrixResponse,
  MetaResponse,
  OverviewResponse,
  PaymentDaysResponse,
  PlacementResponse,
  PreCollectionResponse,
  ProvidersResponse,
  RankingBucket,
  RankingResponse,
  SyncResponse,
  UploadResponse,
  User,
} from '../types/api';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = localStorage.getItem('aig_token');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  let data: unknown;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const errorEnvelope = data as { error?: { code?: string; message?: string; details?: unknown } } | undefined;
    const code = errorEnvelope?.error?.code || 'UNKNOWN_ERROR';
    const message = errorEnvelope?.error?.message || (typeof data === 'string' ? data : res.statusText);
    throw new ApiError(res.status, code, message, errorEnvelope?.error?.details);
  }

  return data as T;
}

export const api = {
  auth: {
    getProviders: () => request<ProvidersResponse>('/api/auth/providers'),
    login: (body: { email: string; password: string }) =>
      request<{ user: User; token?: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    googleLogin: (credential: string) =>
      request<{ user: User; token?: string }>('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential }),
      }),
    logout: () =>
      request<void>('/api/auth/logout', {
        method: 'POST',
      }),
    getMe: () => request<{ user: User }>('/api/auth/me'),
    simulateGoogle: (body: { email: string; name?: string }) =>
      request<{ user: User; token?: string }>('/api/auth/google/simulate', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },

  portfolio: {
    getMeta: () => request<MetaResponse>('/api/portfolio/meta'),
    syncPortfolio: () =>
      request<SyncResponse>('/api/portfolio/sync', {
        method: 'POST',
      }),

    getOverview: (cierre: string, filters: FilterPayload) =>
      request<OverviewResponse>('/api/portfolio/overview', {
        method: 'POST',
        body: JSON.stringify({ cierre, filters }),
      }),

    getPlacement: (tipo: string, filters: FilterPayload) =>
      request<PlacementResponse>('/api/portfolio/placement', {
        method: 'POST',
        body: JSON.stringify({ tipo, filters }),
      }),

    getComposition: (cierre: string, filters: FilterPayload) =>
      request<CompositionResponse>('/api/portfolio/composition', {
        method: 'POST',
        body: JSON.stringify({ cierre, filters }),
      }),

    getRanking: (bucket: RankingBucket, cierre: string, filters: FilterPayload, page = 1, pageSize = 10) =>
      request<RankingResponse>(`/api/portfolio/rankings/${bucket}`, {
        method: 'POST',
        body: JSON.stringify({ cierre, filters, page, pageSize }),
      }),

    getPaymentDays: (cierre: string, mode: 'all' | 'dia', filters: FilterPayload) =>
      request<PaymentDaysResponse>('/api/portfolio/operations/payment-days', {
        method: 'POST',
        body: JSON.stringify({ cierre, mode, filters }),
      }),

    getMaturities: (cierre: string, window: '30' | '90', filters: FilterPayload) =>
      request<MaturitiesResponse>('/api/portfolio/operations/maturities', {
        method: 'POST',
        body: JSON.stringify({ cierre, window, filters }),
      }),

    getPreCollection: (cierre: string, filters: FilterPayload) =>
      request<PreCollectionResponse>('/api/portfolio/operations/pre-collection', {
        method: 'POST',
        body: JSON.stringify({ cierre, filters }),
      }),

    getAttrition: (de: string, a: string, filters: FilterPayload) =>
      request<AttritionResponse>('/api/portfolio/retention/attrition', {
        method: 'POST',
        body: JSON.stringify({ de, a, filters }),
      }),

    getTransition: (de: string, a: string, filters: FilterPayload) =>
      request<MatrixResponse>('/api/portfolio/retention/transition', {
        method: 'POST',
        body: JSON.stringify({ de, a, filters }),
      }),
  },

  upload: {
    uploadFiles: (files: File[], overrides?: Record<string, string>) => {
      const form = new FormData();
      for (const f of files) {
        form.append('files', f);
      }
      if (overrides && Object.keys(overrides).length > 0) {
        form.append('overrides', JSON.stringify(overrides));
      }
      return request<UploadResponse>('/api/upload', {
        method: 'POST',
        body: form,
      });
    },
  },
};
