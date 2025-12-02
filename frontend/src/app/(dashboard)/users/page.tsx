"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { DataTable, ColumnDef } from "@/components/DataTable";
import { cn } from "@/lib/utils";
import { 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  IdentificationIcon, 
  ShieldCheckIcon,
  CalendarDaysIcon
} from "@heroicons/react/24/outline";

// Interfaz exacta segun tu respuesta JSON del backend
interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_active: boolean;
  is_superuser: boolean;
}

export default function UsuariosPage() {
  const { token } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --- DEFINICIÓN DE COLUMNAS DE LA TABLA ---
  const columns: ColumnDef<User>[] = [
    {
      header: "Usuario",
      cell: (user) => {
        const fullName = user.first_name && user.last_name 
            ? `${user.first_name} ${user.last_name}` 
            : "Sin Nombre";
        
        // Generar iniciales o usar iconos
        const initials = user.first_name 
          ? user.first_name[0].toUpperCase() 
          : user.email[0].toUpperCase();

        return (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex flex-shrink-0 items-center justify-center font-bold text-sm border border-primary/20">
              {initials}
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-foreground text-sm">{fullName}</span>
              {/* Mostrar el ID corto en gris para referencia técnica rápida */}
              <span className="text-[10px] text-muted-foreground font-mono">
                {user.id.slice(0, 8)}...
              </span>
            </div>
          </div>
        );
      },
    },
    {
      header: "Email",
      accessorKey: "email",
      type: "text",
      className: "text-muted-foreground",
    },
    {
      header: "Teléfono",
      accessorKey: "phone",
      cell: (user) => user.phone || <span className="text-muted-foreground/50 italic">--</span>,
      className: "text-muted-foreground",
    },
    {
      header: "Estado",
      accessorKey: "is_active",
      type: "boolean", // Usa el renderizador automático con iconos Check/X
      className: "text-center w-24",
    },
    {
      header: "Rol",
      className: "text-center w-32",
      cell: (user) => (
        <div className="flex justify-center">
          {user.is_superuser ? (
            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
              Admin
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wide bg-secondary text-secondary-foreground border border-border">
              User
            </span>
          )}
        </div>
      ),
    },
  ];

  // --- CARGA DE DATOS ---
  useEffect(() => {
    const fetchUsers = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!res.ok) throw new Error("Error al cargar usuarios");
        
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        setError("No se pudo conectar con el servidor.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [token]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* HEADER DE PAGINA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios del Sistema</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Consulta y gestiona los accesos a la plataforma.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full border border-border">
          <UserIcon className="h-4 w-4" />
          Total: <span className="text-foreground font-bold">{users.length}</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* TABLA CON MODAL INTEGRADO */}
      <DataTable 
        columns={columns} 
        data={users} 
        isLoading={loading}
        modalTitle="Perfil de Usuario"
        
        // --- RENDERIZADO DEL MODAL DE DETALLES ---
        renderDetailModal={(user) => (
          <div className="space-y-6">
            
            {/* 1. Cabecera del Modal (Avatar Gigante) */}
            <div className="flex flex-col items-center justify-center pb-6 border-b border-border relative">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-4xl font-bold text-primary mb-4 shadow-inner">
                {user.first_name ? user.first_name[0].toUpperCase() : user.email[0].toUpperCase()}
              </div>
              <h2 className="text-2xl font-bold text-center">
                {user.first_name} {user.last_name}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
              
              {/* Badge de ID flotante */}
              <span className="absolute top-0 right-0 text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-1 rounded border border-border">
                ID: {user.id.slice(0, 8)}
              </span>
            </div>

            {/* 2. Grid de Información */}
            <div className="grid grid-cols-1 gap-4">
              
              {/* Grupo de Contacto */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                  Información de Contacto
                </h3>
                
                <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors border border-transparent hover:border-border">
                  <div className="p-2 rounded-full bg-background shadow-sm">
                    <EnvelopeIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">Correo Electrónico</p>
                    <p className="text-sm font-medium text-foreground break-all">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors border border-transparent hover:border-border">
                  <div className="p-2 rounded-full bg-background shadow-sm">
                    <PhoneIcon className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">Teléfono Móvil</p>
                    <p className="text-sm font-medium text-foreground">
                      {user.phone || "No registrado"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Grupo de Sistema (Grid 2 columnas) */}
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="p-4 rounded-lg border border-border bg-card shadow-sm flex flex-col items-center text-center gap-2">
                  <ShieldCheckIcon className={cn("h-8 w-8", user.is_superuser ? "text-purple-500" : "text-gray-400")} />
                  <div>
                    <p className="text-xs text-muted-foreground font-bold uppercase">Nivel de Acceso</p>
                    <p className="text-sm font-medium mt-1">{user.is_superuser ? "Administrador" : "Usuario"}</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-border bg-card shadow-sm flex flex-col items-center text-center gap-2">
                  <IdentificationIcon className={cn("h-8 w-8", user.is_active ? "text-green-500" : "text-red-400")} />
                  <div>
                    <p className="text-xs text-muted-foreground font-bold uppercase">Estado de Cuenta</p>
                    <p className="text-sm font-medium mt-1">{user.is_active ? "Activa" : "Suspendida"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
}
