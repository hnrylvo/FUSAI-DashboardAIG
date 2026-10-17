import { create } from 'zustand';
import { api, ApiError } from '../api/client';
import type { User } from '../types/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  simulateGoogleLogin: (email: string, name?: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  clearError: () => set({ error: null }),

  checkAuth: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await api.auth.getMe();
      set({ user: res.user, isInitialized: true, isLoading: false });
    } catch {
      set({ user: null, isInitialized: true, isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const res = await api.auth.login({ email, password });
      set({ user: res.user, isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Error al iniciar sesión.';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true });
      await api.auth.logout();
    } finally {
      set({ user: null, isLoading: false, error: null });
    }
  },

  simulateGoogleLogin: async (email: string, name?: string) => {
    try {
      set({ isLoading: true, error: null });
      const res = await api.auth.simulateGoogle({ email, name });
      set({ user: res.user, isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Error en autenticación con Google.';
      set({ error: message, isLoading: false });
      throw err;
    }
  },
}));
