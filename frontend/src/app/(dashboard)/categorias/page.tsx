// frontend\src\app\(dashboard)\categorias\page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/Card"; 
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/Modal"; // ✅ Importamos tu Modal
import { 
  TagIcon, 
  Cog6ToothIcon, 
  PlusCircleIcon,
  ArchiveBoxIcon,
  BanknotesIcon,
  CalendarIcon,
  ShoppingCartIcon
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

// --- TIPOS ---
interface Category {
  id: string;
  name: string;
  items_count: number; 
}

interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  quantity: number;
  expense_id: string;
  // Podrías traer fecha si hicieras join en backend, 
  // pero por ahora el endpoint devuelve items puros.
}

export default function CategoriasPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // --- ESTADOS PARA EL MODAL ---
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryItems, setCategoryItems] = useState<ExpenseItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // --- CARGA DE CATEGORÍAS ---
  useEffect(() => {
    const fetchCategories = async () => {
      if (!token) return;
      try {
        const res = await api.get<Category[]>("/categories/");
        setCategories(res.data);
      } catch (err) {
        console.error(err);
        toast.error("Error al cargar categorías");
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [token]);

  // --- MANEJADOR DE CLICK EN CATEGORÍA ---
  const handleCategoryClick = async (category: Category) => {
    setSelectedCategory(category);
    setLoadingItems(true);
    setCategoryItems([]); // Limpiar anterior

    try {
      // Llamada al nuevo endpoint
      const res = await api.get<ExpenseItem[]>(`/categories/${category.id}/items`);
      setCategoryItems(res.data);
    } catch (error) {
      console.error(error);
      toast.error("No se pudieron cargar los detalles.");
    } finally {
      setLoadingItems(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedCategory(null);
    setCategoryItems([]);
  };

  // Formateador de moneda
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <TagIcon className="h-8 w-8 text-primary" />
            Categorías de Gastos
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Visualiza y explora tus gastos por categoría.
          </p>
        </div>
        
        <Button 
          onClick={() => router.push("/categorias/admin")}
          className="gap-2 shadow-lg hover:shadow-primary/25 transition-all"
          size="lg"
        >
          <Cog6ToothIcon className="h-5 w-5" />
          Administrar Categorías
        </Button>
      </div>

      {/* --- LISTADO --- */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <ArchiveBoxIcon className="h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900">No hay categorías aún</h3>
          <p className="text-gray-500 max-w-sm mt-2 mb-6">
            Comienza creando categorías para organizar tus finanzas.
          </p>
          <Button variant="outline" onClick={() => router.push("/categorias/admin")}>
            <PlusCircleIcon className="h-5 w-5 mr-2" />
            Crear mi primera categoría
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <Card 
              key={cat.id} 
              // ✅ Agregamos onClick y cursor-pointer
              onClick={() => handleCategoryClick(cat)}
              className="hover:border-primary/50 hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer group bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-900/50 relative overflow-hidden"
            >
              <CardHeader className="pb-2 relative z-10">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                    <TagIcon className="h-6 w-6" />
                  </div>

                  <div className={`
                    flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
                    ${cat.items_count > 0 
                      ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" 
                      : "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                    }
                  `}>
                    <BanknotesIcon className="h-3 w-3" />
                    <span>
                      {cat.items_count} {cat.items_count === 1 ? 'ítem' : 'ítems'}
                    </span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="relative z-10">
                <CardTitle className="text-xl mb-1 truncate" title={cat.name}>
                    {cat.name}
                </CardTitle>
                
                <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider opacity-60">
                    Click para ver detalles
                    </p>
                </div>
              </CardContent>

              <div className="absolute -right-4 -bottom-4 opacity-[0.03] transform rotate-12 pointer-events-none">
                <TagIcon className="h-24 w-24" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* --- MODAL DE DETALLES --- */}
      <Modal
        isOpen={!!selectedCategory}
        onClose={handleCloseModal}
        title={selectedCategory ? `Gastos en: ${selectedCategory.name}` : "Detalles"}
        className="max-w-2xl" // Hacemos el modal un poco más ancho
      >
        <div className="space-y-4">
          {loadingItems ? (
            // Skeleton loader simple para el modal
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-md animate-pulse" />
              ))}
            </div>
          ) : categoryItems.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ShoppingCartIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No tienes gastos registrados en esta categoría.</p>
            </div>
          ) : (
            // Lista de Items
            <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
              {categoryItems.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary/20 rounded-full text-secondary-foreground">
                        <ShoppingCartIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Cantidad: {item.quantity}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">
                      {formatCurrency(item.amount)}
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-[10px] text-muted-foreground">
                        ({formatCurrency(item.amount / item.quantity)} c/u)
                      </p>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Totalizador del Modal */}
              <div className="bg-muted/30 p-4 flex justify-between items-center">
                <span className="font-semibold text-sm">Total en esta vista:</span>
                <span className="font-bold text-lg text-primary">
                    {formatCurrency(categoryItems.reduce((acc, item) => acc + item.amount, 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
}
