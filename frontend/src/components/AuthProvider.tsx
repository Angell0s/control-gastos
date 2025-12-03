"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { fetchUser, token, user } = useAuthStore();

  useEffect(() => {
    // Solo hacemos fetch si hay token PERO no hay datos de usuario cargados
    if (token && !user) {
      fetchUser();
    }
  }, [token, user, fetchUser]);

  return <>{children}</>;
}
