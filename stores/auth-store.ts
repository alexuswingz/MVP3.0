import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, type UserResponse } from '@/lib/api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, passwordConfirm: string, firstName?: string, lastName?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  /** Clear auth state without calling API (e.g. when API returns 401 / invalid token) */
  setSessionExpired: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

const mapUserResponse = (response: UserResponse): User => ({
  id: response.id,
  email: response.email,
  first_name: response.first_name,
  last_name: response.last_name,
  name: [response.first_name, response.last_name].filter(Boolean).join(' ') || response.email,
  amazon_seller_id: response.amazon_seller_id,
  marketplace_id: response.marketplace_id,
  subscription_tier: response.subscription_tier,
  timezone: response.timezone,
  date_joined: response.date_joined,
});

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const { user } = await api.login(email, password);
          set({ 
            user: mapUserResponse(user), 
            isAuthenticated: true, 
            isLoading: false 
          });
          return true;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed';
          const isNetworkError = message === 'Failed to fetch';
          set({ 
            error: isNetworkError 
              ? 'Cannot reach server. Start the Django backend (e.g. run `python manage.py runserver` in the backend folder).' 
              : message, 
            isLoading: false 
          });
          return false;
        }
      },

      register: async (email: string, password: string, passwordConfirm: string, firstName?: string, lastName?: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const { user } = await api.register(email, password, passwordConfirm, firstName, lastName);
          set({ 
            user: mapUserResponse(user), 
            isAuthenticated: true, 
            isLoading: false 
          });
          return true;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Registration failed';
          const isNetworkError = message === 'Failed to fetch';
          set({ 
            error: isNetworkError 
              ? 'Cannot reach server. Start the Django backend (e.g. run `python manage.py runserver` in the backend folder).' 
              : message, 
            isLoading: false 
          });
          return false;
        }
      },

      logout: async () => {
        try {
          await api.logout();
        } finally {
          set({ 
            user: null, 
            isAuthenticated: false 
          });
        }
      },

      setSessionExpired: () => {
        set({ user: null, isAuthenticated: false, error: null });
      },

      checkAuth: async () => {
        if (!api.isAuthenticated()) {
          set({ user: null, isAuthenticated: false });
          return;
        }

        try {
          const user = await api.getUser();
          set({ 
            user: mapUserResponse(user), 
            isAuthenticated: true 
          });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
