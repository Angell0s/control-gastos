//frontend\src\components\DataTable.tsx
"use client";

import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { Modal } from "./Modal"; 
import { 
  CheckBadgeIcon, 
  NoSymbolIcon, 
  ChevronUpDownIcon 
} from "@heroicons/react/24/outline";

// --- DEFINICIÓN DE TIPOS ---

export type ColumnType = "text" | "currency" | "date" | "badge" | "boolean";

export type ColumnDef<T> = {
  header: string;
  accessorKey?: keyof T;
  type?: ColumnType;
  
  // Para badges automáticos: { "activo": "bg-green-100", "error": "bg-red-100" }
  badgeColors?: Record<string, string>;
  
  // Renderizado personalizado (tiene prioridad sobre 'type')
  cell?: (item: T) => ReactNode;
  
  className?: string;
};

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  // Función opcional: Si se pasa, habilita el click en la fila y el modal
  renderDetailModal?: (item: T) => ReactNode;
  modalTitle?: string;
}

// --- HELPERS DE FORMATO ---

const formatCurrency = (value: any) => {
  const num = Number(value);
  return isNaN(num) ? value : `$${num.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
};

const formatDate = (value: any) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", year: "numeric"
  });
};

const renderBoolean = (value: any) => {
  return value ? (
    <div className="flex justify-center">
      <span className="inline-flex items-center text-green-700 bg-green-50 ring-1 ring-inset ring-green-600/20 px-2 py-1 rounded-full text-xs font-medium">
        <CheckBadgeIcon className="h-3 w-3 mr-1" /> Sí
      </span>
    </div>
  ) : (
    <div className="flex justify-center">
      <span className="inline-flex items-center text-red-700 bg-red-50 ring-1 ring-inset ring-red-600/10 px-2 py-1 rounded-full text-xs font-medium">
        <NoSymbolIcon className="h-3 w-3 mr-1" /> No
      </span>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  isLoading = false,
  emptyMessage = "No hay datos disponibles",
  renderDetailModal,
  modalTitle = "Detalles del Registro",
}: DataTableProps<T>) {
  
  const [selectedItem, setSelectedItem] = useState<T | null>(null);

  // Estado de carga
  if (isLoading) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center border border-border rounded-lg bg-card">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
        <p className="text-sm text-muted-foreground">Cargando datos...</p>
      </div>
    );
  }

  return (
    <>
      {/* TABLA */}
      <div className="rounded-lg border border-border overflow-hidden shadow-sm bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            {/* HEADER */}
            <thead className="bg-secondary/50 text-muted-foreground font-semibold border-b border-border uppercase tracking-wider text-[10px] sm:text-xs">
              <tr>
                {columns.map((col, idx) => (
                  <th 
                    key={idx} 
                    className={cn("px-4 py-3 whitespace-nowrap", col.className)}
                  >
                    <div className="flex items-center gap-1">
                      {col.header}
                      {/* Icono decorativo de ordenamiento (visual) */}
                      <ChevronUpDownIcon className="h-3 w-3 opacity-50" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* BODY */}
            <tbody className="divide-y divide-border">
              {data.length > 0 ? (
                data.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => renderDetailModal && setSelectedItem(item)}
                    className={cn(
                      "transition-all duration-200 group",
                      renderDetailModal 
                        ? "cursor-pointer hover:bg-accent/50 active:bg-accent/80" 
                        : "hover:bg-accent/20"
                    )}
                  >
                    {columns.map((col, idx) => {
                      const value = col.accessorKey ? item[col.accessorKey] : null;
                      let content: ReactNode = value as ReactNode;

                      // 1. Prioridad: Función Cell personalizada
                      if (col.cell) {
                        content = col.cell(item);
                      } 
                      // 2. Renderizado por Tipo
                      else if (col.type === "currency") {
                        content = formatCurrency(value);
                      } else if (col.type === "date") {
                        content = formatDate(value);
                      } else if (col.type === "boolean") {
                        content = renderBoolean(value);
                      } else if (col.type === "badge" && typeof value === "string" && col.badgeColors) {
                        const colorClass = col.badgeColors[value.toLowerCase()] || "bg-gray-100 text-gray-800";
                        content = (
                          <span className={cn("px-2 py-0.5 rounded text-xs font-semibold border border-transparent", colorClass)}>
                            {value}
                          </span>
                        );
                      }

                      return (
                        <td key={idx} className={cn("px-4 py-3", col.className)}>
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <NoSymbolIcon className="h-8 w-8 opacity-20" />
                      <p>{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE DETALLE (Se renderiza solo si hay item seleccionado y función modal) */}
      {renderDetailModal && (
        <Modal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          title={modalTitle}
        >
          {selectedItem && renderDetailModal(selectedItem)}
        </Modal>
      )}
    </>
  );
}
