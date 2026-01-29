//frontend\src\components\providers\AuthGuard.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuth } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Esperamos a que Zustand lea del localStorage
    // El truco es usar useAuthStore.persist.onFinishHydration si existe,
    // pero la forma más simple y compatible es un pequeño useEffect
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Solo ejecutamos la lógica si ya estamos hidratados
    if (!isHydrated) return;

    // Si NO está autenticado y NO está en login
    if (!isAuth && pathname !== "/login") {
      router.push("/login");
    }

    // Si SÍ está autenticado y está en login
    if (isAuth && pathname === "/login") {
      router.push("/dashboard");
    }
  }, [isAuth, pathname, router, isHydrated]);

  // Si no ha hidratado, mostramos NADA (o un spinner de carga global)
  // para evitar que renderice contenido protegido por error o parpadee
  if (!isHydrated) {
    return null; // O return <div className="h-screen bg-white dark:bg-black" />
  }

  return <>{children}</>;
}
