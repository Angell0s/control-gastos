//frontend\src\components\DataTable.tsx
"use client";

import { ReactNode, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Modal } from "./Modal"; 
import { 
  CheckBadgeIcon, 
  NoSymbolIcon, 
  ChevronUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";

// --- DEFINICIÓN DE TIPOS ---

export type ColumnType = "text" | "currency" | "date" | "badge" | "boolean";

export type ColumnDef<T> = {
  header: string;
  accessorKey?: keyof T;
  type?: ColumnType;
  badgeColors?: Record<string, string>;
  cell?: (item: T) => ReactNode;
  className?: string;
  sortable?: boolean; // ✅ Nueva propiedad opcional para activar ordenamiento por columna
};

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  renderDetailModal?: (item: T) => ReactNode;
  modalTitle?: string;
  rowsPerPage?: number; // ✅ Opcional: filas por página (default 10)
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
  rowsPerPage = 10, // Default 10 filas
}: DataTableProps<T>) {
  
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  
  // --- ESTADOS DE ORDENAMIENTO Y PAGINACIÓN ---
  const [sortConfig, setSortConfig] = useState<{ key: keyof T | null; direction: 'asc' | 'desc' }>({
    key: null,
    direction: 'asc',
  });
  const [currentPage, setCurrentPage] = useState(1);

  // --- MANEJADOR DE ORDENAMIENTO ---
  const handleSort = (key: keyof T) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Volver a la primera página al reordenar
  };

  // --- DATOS PROCESADOS (Memoizados para rendimiento) ---
  const processedData = useMemo(() => {
    if (!data) return [];
    
    // 1. Copiar array para no mutar original
    let sortedData = [...data];

    // 2. Ordenar
    if (sortConfig.key) {
      sortedData.sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];

        if (aValue === bValue) return 0;
        
        // Manejo especial para strings (case insensitive)
        if (typeof aValue === 'string' && typeof bValue === 'string') {
           return sortConfig.direction === 'asc' 
             ? aValue.localeCompare(bValue)
             : bValue.localeCompare(aValue);
        }
        
        // Manejo genérico (números, fechas, booleanos)
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return sortedData;
  }, [data, sortConfig]);

  // --- PAGINACIÓN SOBRE DATOS ORDENADOS ---
  const totalPages = Math.ceil(processedData.length / rowsPerPage);
  const paginatedData = processedData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

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
      <div className="rounded-lg border border-border overflow-hidden shadow-sm bg-card flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            {/* HEADER */}
            <thead className="bg-secondary/50 text-muted-foreground font-semibold border-b border-border uppercase tracking-wider text-[10px] sm:text-xs">
              <tr>
                {columns.map((col, idx) => {
                  const isSortable = col.sortable !== false && !!col.accessorKey; // Default true si tiene accessorKey
                  const isSorted = sortConfig.key === col.accessorKey;

                  return (
                    <th 
                      key={idx} 
                      className={cn(
                        "px-4 py-3 whitespace-nowrap select-none", 
                        col.className,
                        isSortable ? "cursor-pointer hover:bg-secondary/80 transition-colors" : ""
                      )}
                      onClick={() => isSortable && col.accessorKey && handleSort(col.accessorKey)}
                    >
                      <div className="flex items-center gap-1">
                        {col.header}
                        {isSortable && (
                          <span className="ml-1">
                            {isSorted ? (
                              sortConfig.direction === 'asc' ? (
                                <ChevronUpIcon className="h-3 w-3 text-primary" />
                              ) : (
                                <ChevronDownIcon className="h-3 w-3 text-primary" />
                              )
                            ) : (
                              <ChevronUpDownIcon className="h-3 w-3 opacity-30" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* BODY */}
            <tbody className="divide-y divide-border">
              {paginatedData.length > 0 ? (
                paginatedData.map((item) => (
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

                      // Prioridad de renderizado
                      if (col.cell) content = col.cell(item);
                      else if (col.type === "currency") content = formatCurrency(value);
                      else if (col.type === "date") content = formatDate(value);
                      else if (col.type === "boolean") content = renderBoolean(value);
                      else if (col.type === "badge" && typeof value === "string" && col.badgeColors) {
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

        {/* FOOTER DE PAGINACIÓN (Solo si hay más de una página) */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/10">
            <div className="text-xs text-muted-foreground">
              Mostrando <span className="font-medium">{(currentPage - 1) * rowsPerPage + 1}</span> a{" "}
              <span className="font-medium">{Math.min(currentPage * rowsPerPage, processedData.length)}</span> de{" "}
              <span className="font-medium">{processedData.length}</span> resultados
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-md hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <span className="text-xs font-medium bg-background border border-border px-2 py-1 rounded min-w-[2rem] text-center">
                {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-md hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE DETALLE */}
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
