"use client";

import { Sidebar } from "@/components/ui/Sidebar";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import AuthGuard from "@/components/providers/AuthGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSidebarCollapsed } = useUIStore();

  return (
    // Contenedor principal con fondo adaptable
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      
      {/* El Sidebar vive fijo a la izquierda */}
      <Sidebar />
      
      {/* Área de Contenido Principal */}
      <main 
        className={cn(
          "min-h-screen p-4 pt-20 lg:p-8 lg:pt-8",
          "smooth-transition", // <--- USAMOS LA CLASE CSS PURA
          isSidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        )}
      >
        {/* Contenedor interior para centrar contenido ancho */}
        <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-2 duration-700">
          <AuthGuard>
            {children}
          </AuthGuard>
        </div>
      </main>
    </div>
  );
}
