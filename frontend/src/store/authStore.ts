import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

// Interfaz basada en tu esquema UserResponse de Pydantic
interface User {
  id: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

interface AuthState {
  token: string | null;
  isAuth: boolean;
  user: User | null; // Aquí guardaremos la respuesta de /users/me
  setToken: (token: string) => void;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      isAuth: false,
      user: null,

      setToken: (token: string) => set({ token, isAuth: true }),

      logout: () => {
        set({ token: null, isAuth: false, user: null });
        localStorage.removeItem('auth-storage');
      },

      fetchUser: async () => {
        try {
          const response = await api.get("/users/me");
          set({ user: response.data });
        } catch (error: any) {
          if (error.response?.status === 401) {
            get().logout();
          }
          console.error("Error fetching user:", error);
        }
      },

    }),
    {
      name: 'auth-storage', // Nombre de la key en localStorage
    }
  )
);
