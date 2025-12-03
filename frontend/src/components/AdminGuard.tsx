"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuth } = useAuthStore();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Si no está autenticado, o está autenticado pero NO es superuser
    if (isAuth && user && !user.is_superuser) {
      router.push("/dashboard"); // Redirigir a zona segura
    } else {
      setIsChecking(false);
    }
  }, [user, isAuth, router]);

  // Mientras verificamos, mostramos nada o un spinner para evitar "flasheos"
  if (isChecking) {
    return null; 
  }

  // Si pasó la validación (o no hay usuario cargado aún y esperamos que authStore reaccione), renderizamos
  // Nota: Si quieres seguridad estricta, valida también que 'user' exista aquí.
  return <>{children}</>;
}
