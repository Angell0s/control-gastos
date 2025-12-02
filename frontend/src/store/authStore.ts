import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
        const { token, logout } = get();
        if (!token) return;

        try {
          // Ajusta la URL si tu prefijo de API es diferente (ej: /api/v1)
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            // Si el token expiró o es inválido (401), cerramos sesión
            if (response.status === 401) {
              logout();
            }
            throw new Error("Error al obtener usuario");
          }

          const userData: User = await response.json();
          set({ user: userData });
        } catch (error) {
          console.error("Error fetching user:", error);
        }
      },
    }),
    {
      name: 'auth-storage', // Nombre de la key en localStorage
    }
  )
);
