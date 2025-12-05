// frontend/src/app/(dashboard)/categorias/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { Switch } from "@headlessui/react"; 
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/Card"; 
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/Modal";
import { 
  TagIcon, 
  Cog6ToothIcon, 
  PlusCircleIcon,
  BanknotesIcon,
  ShoppingCartIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  FunnelIcon
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import clsx from "clsx";

// --- TIPOS ---
interface Category {
  id: string;
  name: string;
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

type ViewMode = "expenses" | "incomes";

export default function CategoriasPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false); 

  // --- ESTADOS PARA EL MODAL ---
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("expenses");

  // --- CARGA DE CATEGORÍAS ---
  useEffect(() => {
    const fetchCategories = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const endpoint = showAll ? "/categories/" : "/categories/active";
        const res = await api.get<Category[]>(endpoint);
        setCategories(res.data);
      } catch (err) {
        console.error(err);
        toast.error("Error al cargar categorías");
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [token, showAll]);

  // --- CARGA DE ITEMS ---
  useEffect(() => {
    if (!selectedCategory) return;

    const fetchItems = async () => {
      setLoadingItems(true);
      setItems([]);
      try {
        const endpoint = viewMode === "expenses" 
            ? `/categories/${selectedCategory.id}/expenses`
            : `/categories/${selectedCategory.id}/incomes`;
            
        const res = await api.get<TransactionItem[]>(endpoint);
        setItems(res.data);
      } catch (error) {
        console.error(error);
        toast.error("No se pudieron cargar los detalles.");
      } finally {
        setLoadingItems(false);
      }
    };

    fetchItems();
  }, [selectedCategory, viewMode]);

  // --- HANDLERS ---
  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category);
    // Prioridad visual al abrir el modal
    if (category.expenses_count > 0) setViewMode("expenses");
    else if (category.incomes_count > 0) setViewMode("incomes");
    else setViewMode("expenses");
  };

  const handleCloseModal = () => {
    setSelectedCategory(null);
    setItems([]);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
  };

  const getItemAmount = (item: TransactionItem) => item.amount || item.monto || 0;
  const getItemName = (item: TransactionItem) => item.name || item.descripcion || "Sin nombre";

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-border pb-6">
        <div>
          {/* Corrección de ícono header: Text-slate-800 para contraste fuerte en claro */}
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-slate-900 dark:text-white">
            <TagIcon className="h-8 w-8 text-primary" />
            Categorías
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Gestión global de tus clasificaciones financieras.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center w-full md:w-auto">
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-full shadow-sm">
                <span className={clsx("text-sm font-medium transition-colors cursor-pointer", !showAll ? "text-primary font-bold" : "text-slate-500")} onClick={() => setShowAll(false)}>
                    Mis Activas
                </span>
                
                <Switch
                    checked={showAll}
                    onChange={setShowAll}
                    className={`${
                        showAll ? 'bg-slate-600' : 'bg-primary'
                    } relative inline-flex h-[24px] w-[48px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75`}
                >
                    <span className="sr-only">Ver todas</span>
                    <span
                        aria-hidden="true"
                        className={`${showAll ? 'translate-x-6' : 'translate-x-0'}
                        pointer-events-none inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
                    />
                </Switch>

                <span className={clsx("text-sm font-medium transition-colors cursor-pointer", showAll ? "text-slate-900 dark:text-white font-bold" : "text-slate-500")} onClick={() => setShowAll(true)}>
                    Ver Todas
                </span>
            </div>

            <Button 
                onClick={() => router.push("/categorias/admin")}
                className="gap-2 shadow-lg transition-all w-full sm:w-auto"
                size="lg"
            >
                <Cog6ToothIcon className="h-5 w-5" />
                Administrar
            </Button>
        </div>
      </div>

      {/* --- LISTADO --- */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/20 animate-in zoom-in-95 duration-300">
          <FunnelIcon className="h-16 w-16 text-slate-300 dark:text-slate-600 mb-4" />
          
          {showAll ? (
             <>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Sistema sin categorías</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm mt-2 mb-6">
                    Parece que no hay ninguna categoría en la base de datos.
                </p>
                <Button variant="outline" onClick={() => router.push("/categorias/admin")}>
                    <PlusCircleIcon className="h-5 w-5 mr-2" />
                    Crear la primera
                </Button>
             </>
          ) : (
            <>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Aún no tienes actividad</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm mt-2 mb-6">
                    No tienes categorías con gastos o ingresos registrados. 
                    <br/>Activa "Ver Todas" para explorar el catálogo disponible.
                </p>
                <Button onClick={() => setShowAll(true)} className="bg-slate-800 text-white hover:bg-slate-700">
                    Ver todas las categorías
                </Button>
            </>
          )}
        </div>

      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <Card 
              key={cat.id} 
              onClick={() => handleCategoryClick(cat)}
              className="group hover:border-primary/50 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            >
              <CardHeader className="pb-2 relative z-10">
                <div className="flex justify-between items-start mb-3">
                  {/* Corrección Ícono Card: Fondo más oscuro en modo claro para contraste */}
                  <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                    <TagIcon className="h-6 w-6" />
                  </div>
                </div>
                
                <CardTitle className="text-lg truncate font-bold text-slate-900 dark:text-white" title={cat.name}>
                    {cat.name}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="relative z-10 pb-6">
                <div className="flex flex-wrap gap-2 mt-2 min-h-[28px]"> {/* min-h para evitar saltos si está vacío */}
                    
                    {/* ✅ Renderizado Condicional de Badges */}
                    
                    {cat.expenses_count > 0 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50">
                            <ArrowTrendingDownIcon className="h-3.5 w-3.5" />
                            <span>{cat.expenses_count}</span>
                        </div>
                    )}

                    {cat.incomes_count > 0 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50">
                            <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
                            <span>{cat.incomes_count}</span>
                        </div>
                    )}

                    {/* Si está vacía (ej: vista Admin), mostramos un placeholder sutil */}
                    {cat.expenses_count === 0 && cat.incomes_count === 0 && (
                         <span className="text-xs text-slate-400 italic px-1">Sin actividad</span>
                    )}
                </div>

                <p className="text-xs font-medium text-primary opacity-0 -translate-x-2 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 absolute bottom-4 right-4 flex items-center gap-1">
                   Ver detalles <ArrowTrendingUpIcon className="h-3 w-3 rotate-45" />
                </p>
              </CardContent>

              {/* Decoración de fondo ajustada */}
              <div className="absolute -right-6 -bottom-8 text-slate-100 dark:text-slate-800 transform rotate-12 pointer-events-none">
                <TagIcon className="h-32 w-32" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* --- MODAL DE DETALLES --- */}
      <Modal
        isOpen={!!selectedCategory}
        onClose={handleCloseModal}
        title={selectedCategory ? selectedCategory.name : "Detalles"}
        className="max-w-2xl"
      >
        <div className="space-y-4">
            
          {/* Tabs Switcher */}
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
                <ArrowTrendingDownIcon className={clsx("h-4 w-4", viewMode === "expenses" ? "text-orange-500" : "text-slate-400")} />
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
                <ArrowTrendingUpIcon className={clsx("h-4 w-4", viewMode === "incomes" ? "text-green-500" : "text-slate-400")} />
                Ingresos
            </button>
          </div>

          {/* Contenido Dinámico */}
          <div className="min-h-[200px]">
            {loadingItems ? (
                <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-md animate-pulse" />
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
                    <p>No hay {viewMode === "expenses" ? "gastos" : "ingresos"} registrados en esta categoría.</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                {items.map((item) => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className={clsx(
                                "p-2 rounded-full shrink-0",
                                viewMode === "expenses" 
                                    ? "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
                                    : "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                            )}>
                                {viewMode === "expenses" ? <ShoppingCartIcon className="h-5 w-5" /> : <BanknotesIcon className="h-5 w-5" />}
                            </div>
                            <div>
                                <p className="font-semibold text-sm text-slate-900 dark:text-white">{getItemName(item)}</p>
                                {item.quantity && item.quantity > 1 && (
                                    <p className="text-xs text-slate-500">Cant: {item.quantity}</p>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className={clsx(
                                "font-bold text-sm",
                                viewMode === "incomes" ? "text-green-600 dark:text-green-400" : "text-slate-900 dark:text-white"
                            )}>
                                {viewMode === "expenses" ? "-" : "+"} {formatCurrency(getItemAmount(item))}
                            </p>
                        </div>
                    </div>
                ))}
                
                {/* Totalizador */}
                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 flex justify-between items-center border-t border-slate-200 dark:border-slate-800">
                    <span className="font-semibold text-sm text-slate-500">Total {viewMode === "expenses" ? "Gastado" : "Ingresado"}:</span>
                    <span className={clsx(
                        "font-bold text-lg",
                        viewMode === "incomes" ? "text-green-600 dark:text-green-400" : "text-slate-900 dark:text-white"
                    )}>
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
