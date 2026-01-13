"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { useAuthStore } from "@/store/authStore";

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/Modal";

import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  TagIcon,
  BanknotesIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";

// -------------------- Tipos --------------------
interface CategoryRow {
  id: string;
  name: string;
  is_active: boolean;
  expenses_count: number;
  incomes_count: number;
  total_items_count: number;
}

interface TransactionItem {
  id: string;
  name?: string;
  descripcion?: string;
  amount?: number;
  monto?: number;
  quantity?: number;
}

type SortMetric = "incomes" | "expenses";
type SortDir = "desc" | "asc";
type ViewMode = "expenses" | "incomes";

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { token } = useAuthStore();

  const [loadingCats, setLoadingCats] = useState(true);
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  // Ordenamiento cliente
  const [sortMetric, setSortMetric] = useState<SortMetric>("incomes");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Modal drill-down
  const [selectedCategory, setSelectedCategory] = useState<CategoryRow | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("incomes");
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const handleApiError = useCallback(
    (error: any, defaultMsg: string) => {
      console.error(error);
      const msg = error?.response?.data?.detail || defaultMsg;
      if (typeof msg === "object") {
        toast.error({
          title: "Error",
          description: "Datos inválidos. Revisa el formulario.",
        });
      } else {
        toast.error({ title: "Ocurrió un error", description: String(msg) });
      }
    },
    [toast]
  );

  // -------------------- Fetch categorías (endpoint existente) --------------------
  const fetchCategories = useCallback(async () => {
    if (!token) return;
    setLoadingCats(true);
    try {
      const res = await api.get<CategoryRow[]>("/categories/", {
        params: { status: "active", skip: 0, limit: 200 },
      });

      // Para el dashboard queremos “con actividad” (si quieres mostrar también vacías, quita este filtro)
      const withActivity = res.data.filter(
        (c) => (c.expenses_count ?? 0) > 0 || (c.incomes_count ?? 0) > 0
      );

      setCategories(withActivity);
    } catch (err) {
      handleApiError(err, "Error cargando categorías");
    } finally {
      setLoadingCats(false);
    }
  }, [token, handleApiError]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // -------------------- Ordenamiento cliente --------------------
  const sortedCategories = useMemo(() => {
    const key = sortMetric === "incomes" ? "incomes_count" : "expenses_count";
    const dirMul = sortDir === "asc" ? 1 : -1;

    return [...categories].sort((a, b) => {
      const av = Number((a as any)[key] ?? 0);
      const bv = Number((b as any)[key] ?? 0);
      if (av !== bv) return (av - bv) * dirMul;
      return a.name.localeCompare(b.name);
    });
  }, [categories, sortMetric, sortDir]);

  const topCategories = useMemo(() => sortedCategories.slice(0, 12), [sortedCategories]);

  const toggleSort = (metric: SortMetric) => {
    if (sortMetric !== metric) {
      setSortMetric(metric);
      setSortDir("desc");
      return;
    }
    setSortDir((d) => (d === "desc" ? "asc" : "desc"));
  };

  // -------------------- Drill-down (detalle) --------------------
  const openDetails = (cat: CategoryRow) => {
    setSelectedCategory(cat);

    // default: si tiene ingresos, abre ingresos; si no, abre gastos
    if ((cat.incomes_count ?? 0) > 0) setViewMode("incomes");
    else setViewMode("expenses");
  };

  const closeDetails = () => {
    setSelectedCategory(null);
    setItems([]);
  };

  const getItemAmount = (item: TransactionItem) => item.amount ?? item.monto ?? 0;
  const getItemName = (item: TransactionItem) => item.name ?? item.descripcion ?? "Sin nombre";

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(val); // [web:107]

  useEffect(() => {
    if (!selectedCategory) return;

    const fetchItems = async () => {
      setLoadingItems(true);
      setItems([]);
      try {
        const endpoint =
          viewMode === "expenses"
            ? `/categories/${selectedCategory.id}/expenses`
            : `/categories/${selectedCategory.id}/incomes`;

        const res = await api.get<TransactionItem[]>(endpoint);
        setItems(res.data);
      } catch (err) {
        handleApiError(err, "No se pudieron cargar los detalles.");
      } finally {
        setLoadingItems(false);
      }
    };

    fetchItems();
  }, [selectedCategory, viewMode, handleApiError]);

  // -------------------- UI --------------------
  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Categorías con más ingresos/gastos (ordenamiento en cliente)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center w-full md:w-auto">
          <Button variant="outline" onClick={() => router.push("/categorias")}>
            Ver categorías
          </Button>
          <Button onClick={() => router.push("/gastos/nuevo")}>+ Nuevo gasto</Button>
        </div>
      </div>

      {/* Controles de orden */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TagIcon className="h-5 w-5 text-primary" />
            Categorías con más actividad
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              Orden actual:{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {sortMetric === "incomes" ? "Ingresos" : "Gastos"} ({sortDir === "desc" ? "↓" : "↑"})
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                variant={sortMetric === "expenses" ? "default" : "outline"}
                onClick={() => toggleSort("expenses")}
                className="gap-2"
              >
                <ArrowTrendingDownIcon className="h-5 w-5" />
                Gastos
              </Button>

              <Button
                variant={sortMetric === "incomes" ? "default" : "outline"}
                onClick={() => toggleSort("incomes")}
                className="gap-2"
              >
                <ArrowTrendingUpIcon className="h-5 w-5" />
                Ingresos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid de categorías */}
      {loadingCats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="h-40 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : topCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/20">
          <TagIcon className="h-16 w-16 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
            No hay actividad aún
          </h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mt-2 mb-6">
            Registra algunos movimientos para ver rankings por categoría.
          </p>
          <Button onClick={() => router.push("/categorias")}>Ir a categorías</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {topCategories.map((cat) => (
            <Card
              key={cat.id}
              onClick={() => openDetails(cat)}
              className={clsx(
                "group transition-all duration-300 cursor-pointer relative overflow-hidden bg-white dark:bg-slate-900 hover:border-primary/50 hover:shadow-md hover:-translate-y-1 border-slate-200 dark:border-slate-800"
              )}
            >
              <CardHeader className="pb-2 relative z-10">
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <TagIcon className="h-6 w-6" />
                  </div>

                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {cat.total_items_count ?? (cat.expenses_count + cat.incomes_count)} items
                  </span>
                </div>

                <CardTitle
                  className="text-lg truncate font-bold text-slate-900 dark:text-white"
                  title={cat.name}
                >
                  {cat.name}
                </CardTitle>
              </CardHeader>

              <CardContent className="relative z-10 pb-6">
                <div className="flex flex-wrap gap-2 mt-2 min-h-[28px]">
                  {(cat.expenses_count ?? 0) > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50">
                      <ArrowTrendingDownIcon className="h-3.5 w-3.5" />
                      <span>{cat.expenses_count}</span>
                    </div>
                  )}

                  {(cat.incomes_count ?? 0) > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50">
                      <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
                      <span>{cat.incomes_count}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs font-medium text-primary opacity-0 -translate-x-2 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 absolute bottom-4 right-4 flex items-center gap-1">
                  Ver detalles <ArrowTrendingUpIcon className="h-3 w-3 rotate-45" />
                </p>
              </CardContent>

              <div className="absolute -right-6 -bottom-8 transform rotate-12 pointer-events-none text-slate-100 dark:text-slate-800">
                <TagIcon className="h-32 w-32" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de detalle */}
      <Modal
        isOpen={!!selectedCategory}
        onClose={closeDetails}
        title={selectedCategory ? selectedCategory.name : "Detalles"}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-full">
            <button
              onClick={() => setViewMode("expenses")}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                viewMode === "expenses"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-600"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <ShoppingCartIcon
                className={clsx(
                  "h-4 w-4",
                  viewMode === "expenses" ? "text-orange-500" : "text-slate-400"
                )}
              />
              Gastos
            </button>

            <button
              onClick={() => setViewMode("incomes")}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                viewMode === "incomes"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-600"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <BanknotesIcon
                className={clsx(
                  "h-4 w-4",
                  viewMode === "incomes" ? "text-green-500" : "text-slate-400"
                )}
              />
              Ingresos
            </button>
          </div>

          <div className="min-h-[200px]">
            {loadingItems ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-14 bg-slate-100 dark:bg-slate-800 rounded-md animate-pulse"
                  />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center text-slate-400">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-full mb-3">
                  {viewMode === "expenses" ? (
                    <ShoppingCartIcon className="h-8 w-8 opacity-40" />
                  ) : (
                    <BanknotesIcon className="h-8 w-8 opacity-40" />
                  )}
                </div>
                <p>
                  No hay {viewMode === "expenses" ? "gastos" : "ingresos"} registrados en esta
                  categoría.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={clsx(
                          "p-2 rounded-full shrink-0",
                          viewMode === "expenses"
                            ? "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
                            : "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                        )}
                      >
                        {viewMode === "expenses" ? (
                          <ShoppingCartIcon className="h-5 w-5" />
                        ) : (
                          <BanknotesIcon className="h-5 w-5" />
                        )}
                      </div>

                      <div>
                        <p className="font-semibold text-sm text-slate-900 dark:text-white">
                          {getItemName(item)}
                        </p>
                        {item.quantity && item.quantity > 1 && (
                          <p className="text-xs text-slate-500">Cant: {item.quantity}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={clsx(
                          "font-bold text-sm",
                          viewMode === "incomes"
                            ? "text-green-600 dark:text-green-400"
                            : "text-slate-900 dark:text-white"
                        )}
                      >
                        {viewMode === "expenses" ? "-" : "+"} {formatCurrency(getItemAmount(item))}
                      </p>
                    </div>
                  </div>
                ))}

                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 flex justify-between items-center border-t border-slate-200 dark:border-slate-800">
                  <span className="font-semibold text-sm text-slate-500">
                    Total {viewMode === "expenses" ? "Gastado" : "Ingresado"}:
                  </span>
                  <span
                    className={clsx(
                      "font-bold text-lg",
                      viewMode === "incomes"
                        ? "text-green-600 dark:text-green-400"
                        : "text-slate-900 dark:text-white"
                    )}
                  >
                    {formatCurrency(items.reduce((acc, i) => acc + getItemAmount(i), 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
