//frontend\src\app\(dashboard)\bitacora\page.tsx
"use client";

import { useEffect, useState } from "react";
import { DataTable, ColumnDef } from "@/components/DataTable";
import api from "@/lib/api"; 
import { 
  ComputerDesktopIcon, 
  DevicePhoneMobileIcon, 
  ShieldCheckIcon,
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon
} from "@heroicons/react/24/outline";
import { toast } from "sonner"; 

// --- TIPOS ---

interface AuditLog {
  id: string;
  action: string;
  source: string;
  details: string | null;
  timestamp: string;
  // Campos del usuario
  user_name?: string | null;
  user_email?: string | null;
  user_phone?: string | null;
}

// --- HELPER PARA ICONOS DE FUENTE ---

const getSourceIcon = (source: string) => {
  const normalized = source.toUpperCase();
  if (normalized.includes("TELEGRAM")) {
    return <DevicePhoneMobileIcon className="h-5 w-5 text-blue-500" />;
  }
  if (normalized.includes("WEB")) {
    return <ComputerDesktopIcon className="h-5 w-5 text-purple-500" />;
  }
  return <ShieldCheckIcon className="h-5 w-5 text-gray-500" />;
};

// --- COMPONENTE DE PÁGINA ---

export default function BitacoraPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Cargar Datos
  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get<AuditLog[]>("/users/logs/all");
      setLogs(data);
    } catch (error) {
      console.error("Error cargando bitácora:", error);
      toast.error("No se pudo cargar el historial de actividad.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // 2. Definir Columnas
  const columns: ColumnDef<AuditLog>[] = [
    {
      header: "Fuente",
      accessorKey: "source",
      className: "w-16 text-center",
      cell: (item) => (
        <div className="flex justify-center" title={item.source}>
          {getSourceIcon(item.source)}
        </div>
      ),
    },
    {
      header: "Usuario",
      accessorKey: "user_email", // Key de respaldo para sort
      cell: (item) => (
        <div className="flex flex-col max-w-[180px]">
          <span className="font-medium text-foreground truncate">
            {item.user_name || "Usuario Desconocido"}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {item.user_email || "Sin email"}
          </span>
        </div>
      )
    },
    {
      header: "Acción",
      accessorKey: "action",
      type: "badge",
      // ✅ AQUÍ AGREGAMOS TODOS LOS TIPOS DE ACCIONES
      badgeColors: {
        // Accesos
        "login": "bg-green-100 text-green-800 border-green-200",
        "login_silent": "bg-gray-100 text-gray-600 border-gray-200",
        "signup": "bg-green-100 text-green-800 border-green-200",
        
        // Telegram
        "unlink_telegram": "bg-orange-100 text-orange-800 border-orange-200",
        "unlink_telegram_failed": "bg-red-100 text-red-800 border-red-200",
        
        // Usuarios
        "create_user": "bg-purple-100 text-purple-800 border-purple-200",
        "update_user": "bg-blue-100 text-blue-800 border-blue-200",
        "update_profile": "bg-blue-50 text-blue-700 border-blue-100",
        "delete_user": "bg-red-100 text-red-800 border-red-200",
        
        // Gastos
        "create_expense": "bg-yellow-100 text-yellow-800 border-yellow-200",
        "update_expense": "bg-yellow-50 text-yellow-700 border-yellow-100",
        "delete_expense": "bg-red-50 text-red-700 border-red-100",
        
        // Categorías
        "create_category": "bg-indigo-100 text-indigo-800 border-indigo-200",
        "auto_create_category": "bg-indigo-50 text-indigo-600 border-indigo-100",
        "update_category": "bg-indigo-50 text-indigo-700 border-indigo-100",
        "delete_category": "bg-red-100 text-red-800 border-red-200",
        "delete_category_failed": "bg-red-200 text-red-900 border-red-300",

        // Errores genéricos / Accesos denegados
        "access_denied": "bg-red-200 text-red-900 border-red-300",
      },
    },
    {
      header: "Fecha y Hora",
      accessorKey: "timestamp",
      type: "date",
      cell: (item) => {
        const date = new Date(item.timestamp);
        return (
          <div className="flex flex-col">
            <span className="font-medium">
              {date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
            <span className="text-xs text-muted-foreground">
              {date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        );
      }
    },
    {
      header: "Resumen",
      accessorKey: "details",
      className: "max-w-xs truncate hidden md:table-cell",
      cell: (item) => (
        <span className="text-muted-foreground truncate block max-w-[200px]" title={item.details || ""}>
          {item.details || "Sin detalles adicionales"}
        </span>
      )
    }
  ];

  // 3. Renderizado del Modal de Detalles
  const renderModalContent = (log: AuditLog) => (
    <div className="space-y-6">
      {/* Encabezado del Detalle */}
      <div className="flex items-center gap-4 p-4 bg-accent/10 rounded-lg border border-border">
        <div className="p-3 bg-background rounded-full shadow-sm border border-border">
          {getSourceIcon(log.source)}
        </div>
        <div>
          <h4 className="font-bold text-lg text-foreground break-all">{log.action}</h4>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">ID: {log.id}</p>
        </div>
      </div>

      {/* SECCIÓN DE USUARIO (Card) */}
      <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
        <div className="bg-secondary/30 px-4 py-2 border-b border-border flex items-center gap-2">
          <UserCircleIcon className="h-4 w-4 text-primary" />
          <h5 className="text-xs font-bold text-foreground uppercase tracking-wide">Usuario Responsable</h5>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="col-span-1 sm:col-span-2">
             <p className="text-xs text-muted-foreground uppercase">Nombre Completo</p>
             <p className="font-semibold text-base">{log.user_name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase flex items-center gap-1 mb-1">
              <EnvelopeIcon className="h-3 w-3" /> Email
            </p>
            <p className="font-medium text-sm truncate" title={log.user_email || ""}>{log.user_email || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase flex items-center gap-1 mb-1">
              <PhoneIcon className="h-3 w-3" /> Teléfono
            </p>
            <p className="font-medium text-sm">{log.user_phone || "—"}</p>
          </div>
        </div>
      </div>

      {/* Lista de Detalles Técnicos */}
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="bg-card p-3 rounded-md border border-border/50">
          <dt className="text-xs font-medium text-muted-foreground uppercase">Fecha</dt>
          <dd className="mt-1 text-sm font-semibold">
            {new Date(log.timestamp).toLocaleDateString("es-MX", { 
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            })}
          </dd>
        </div>
        
        <div className="bg-card p-3 rounded-md border border-border/50">
          <dt className="text-xs font-medium text-muted-foreground uppercase">Hora</dt>
          <dd className="mt-1 text-sm font-semibold">
            {new Date(log.timestamp).toLocaleTimeString("es-MX", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </dd>
        </div>

        <div className="bg-card p-3 rounded-md border border-border/50">
          <dt className="text-xs font-medium text-muted-foreground uppercase">Plataforma</dt>
          <dd className="mt-1 text-sm font-semibold">{log.source}</dd>
        </div>

        {/* Detalles Completos */}
        <div className="col-span-1 sm:col-span-2 bg-accent/5 p-4 rounded-lg border border-border">
          <dt className="text-xs font-medium text-muted-foreground uppercase mb-2">Detalles del Evento</dt>
          <dd className="text-sm text-foreground whitespace-pre-wrap font-mono text-xs leading-relaxed">
            {log.details || "No hay información adicional registrada para este evento."}
          </dd>
        </div>
      </dl>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Encabezado de Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bitácora Global</h1>
          <p className="text-muted-foreground">
            Historial completo de accesos y acciones de todos los usuarios.
          </p>
        </div>
      </div>

      {/* Tabla */}
      <DataTable
        data={logs}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No se encontraron registros de actividad reciente."
        renderDetailModal={renderModalContent}
        modalTitle="Detalle de Auditoría"
      />
    </div>
  );
}
