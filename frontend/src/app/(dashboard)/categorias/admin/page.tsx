//frontend\src\app\(dashboard)\categorias\admin\page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { DataTable, ColumnDef } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input"; // ✅ Importamos el nuevo Input
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { 
  TagIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  PlusIcon, 
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon
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

interface CategoryFormData {
  name: string;
}

const initialFormData: CategoryFormData = { name: "" };

export default function AdminCategoriasPage() {
  const { token, user } = useAuthStore();
  const router = useRouter();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdminView, setIsAdminView] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);
  const [targetCategoryId, setTargetCategoryId] = useState<string>(""); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- CARGA DE DATOS ---
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const endpoint = (isAdminView && user?.is_superuser) 
        ? "/categories/admin/all" 
        : "/categories/";

      const res = await api.get<Category[]>(endpoint);
      const sorted = res.data.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(sorted);
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar categorías");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdminView]); 

  // --- HANDLERS ---
  const handleOpenCreate = () => {
    setCurrentCategory(null);
    setFormData(initialFormData);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setCurrentCategory(category);
    setFormData({ name: category.name });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (category: Category) => {
    setCurrentCategory(category);
    setTargetCategoryId(""); 
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.warning("El nombre no puede estar vacío");
      return;
    }

    setIsSubmitting(true);
    try {
      if (currentCategory) {
        await api.put(`/categories/${currentCategory.id}`, formData);
        toast.success("Categoría actualizada");
      } else {
        await api.post("/categories/", formData);
        toast.success("Categoría creada");
      }
      setIsFormOpen(false);
      fetchCategories();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.detail || "Error al guardar";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!currentCategory) return;
    setIsSubmitting(true);
    
    try {
      let url = `/categories/${currentCategory.id}`;
      if (targetCategoryId) {
        url += `?target_category_id=${targetCategoryId}`;
      }

      await api.delete(url);
      
      toast.success(targetCategoryId 
        ? "Categoría eliminada y elementos reasignados." 
        : "Categoría eliminada (elementos movidos a 'Otros')."
      );
      
      setIsDeleteOpen(false);
      fetchCategories();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.detail || "No se pudo eliminar";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- COLUMNAS ---
  const columns: ColumnDef<Category>[] = [
    {
      header: "Categoría",
      accessorKey: "name",
      cell: (cat) => (
        <div className="flex flex-col gap-1 py-1">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <div className="p-1.5 bg-primary/10 rounded text-primary">
              <TagIcon className="h-4 w-4" />
            </div>
            {cat.name}
          </div>
          
          <div className="flex gap-2 mt-1 ml-8">
            {cat.expenses_count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-100 dark:border-orange-800 flex items-center gap-1">
                    <ArrowTrendingDownIcon className="h-3 w-3" />
                    {cat.expenses_count}
                </span>
            )}
            {cat.incomes_count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-100 dark:border-green-800 flex items-center gap-1">
                    <ArrowTrendingUpIcon className="h-3 w-3" />
                    {cat.incomes_count}
                </span>
            )}
            {cat.total_items_count === 0 && (
                <span className="text-[10px] text-muted-foreground italic">Sin uso</span>
            )}
          </div>
        </div>
      )
    },
    {
      header: "ID Sistema",
      accessorKey: "id",
      className: "text-muted-foreground text-xs font-mono w-24 sm:w-32 truncate hidden sm:table-cell",
      cell: (cat) => cat.id.slice(0, 8)
    },
    {
      header: "Acciones",
      className: "text-right w-28",
      cell: (cat) => {
        if (!user?.is_superuser) {
          return (
            <div className="flex justify-end pr-2 opacity-30" title="Solo administradores">
              <LockClosedIcon className="h-4 w-4" />
            </div>
          );
        }

        return (
          <div className="flex justify-end gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); handleOpenEdit(cat); }}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="Editar Nombre"
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleOpenDelete(cat); }}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Eliminar Categoría"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        );
      }
    }
  ];

  const availableCategories = categories.filter(c => c.id !== currentCategory?.id);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="space-y-1 w-full sm:w-auto">
          <button 
            onClick={() => router.push("/categorias")} 
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-2"
          >
            <ArrowLeftIcon className="h-3 w-3" /> Volver a Galería
          </button>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Administrar Categorías
          </h1>
          <p className="text-muted-foreground text-sm">
            Gestiona las categorías disponibles para gastos e ingresos.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          
          {user?.is_superuser && (
            <div 
              className="flex items-center gap-2 px-3 py-2 bg-secondary/20 rounded-lg border border-border cursor-pointer select-none hover:bg-secondary/30 transition-colors"
              onClick={() => setIsAdminView(!isAdminView)}
            >
              <div className={clsx(
                  "w-8 h-4 rounded-full relative transition-colors",
                  isAdminView ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
              )}>
                <div className={clsx(
                    "w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform",
                    isAdminView ? "left-4.5 translate-x-4" : "left-0.5 translate-x-0"
                )} />
              </div>
              <span className="text-xs font-medium flex items-center gap-1.5">
                {isAdminView ? (
                  <>
                    <EyeIcon className="h-3 w-3 text-primary" /> 
                    Global
                  </>
                ) : (
                  <>
                    <EyeSlashIcon className="h-3 w-3 text-muted-foreground" /> 
                    Personal
                  </>
                )}
              </span>
            </div>
          )}

          <Button onClick={handleOpenCreate} className="gap-2 shadow-sm w-full sm:w-auto">
            <PlusIcon className="h-4 w-4" /> Nueva
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b border-border mb-2 flex flex-row justify-between items-center">
          <CardTitle className="text-lg">Listado Maestro</CardTitle>
          <span className="text-xs text-muted-foreground font-normal bg-muted px-2 py-1 rounded">
            {isAdminView ? "Conteo Total (Global)" : "Tus registros (Personal)"}
          </span>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <DataTable 
            columns={columns} 
            data={categories} 
            isLoading={loading}
            emptyMessage="No hay categorías registradas."
            renderDetailModal={(cat) => (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-2">
                  <TagIcon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">{cat.name}</h3>
                <div className="flex justify-center gap-6 text-sm text-muted-foreground mt-2">
                    <div className="text-center">
                        <p className="text-xs uppercase tracking-wider">Gastos</p>
                        <p className="text-lg font-bold text-orange-600">{cat.expenses_count}</p>
                    </div>
                    <div className="w-px bg-border h-10"></div>
                    <div className="text-center">
                        <p className="text-xs uppercase tracking-wider">Ingresos</p>
                        <p className="text-lg font-bold text-green-600">{cat.incomes_count}</p>
                    </div>
                </div>
              </div>
            )}
            modalTitle="Resumen de Categoría"
          />
        </CardContent>
      </Card>

      {/* --- MODAL DE CREAR/EDITAR --- */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={currentCategory ? "Editar Categoría" : "Nueva Categoría"}
        className="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nombre</label>
            
            {/* ✅ NUEVO INPUT CON ICONO Y DISEÑO MODERNO */}
            <Input 
              type="text" 
              autoFocus
              placeholder="Ej: Alimentos"
              icon={<TagIcon className="h-4 w-4" />}
              value={formData.name}
              onChange={(e) => setFormData({ name: e.target.value })}
            />

          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL DE ELIMINAR --- */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Eliminar Categoría"
        className="max-w-md"
      >
        <div className="space-y-6">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-800 flex items-start gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 flex-shrink-0 text-red-600" />
            <div>
              <h4 className="font-bold">Atención</h4>
              <p className="text-sm mt-1 leading-relaxed">
                Vas a eliminar <strong>{currentCategory?.name}</strong>.
                {isAdminView && (
                  <span className="block mt-1 font-semibold text-red-700 dark:text-red-300">
                    ⚠️ Estás en modo admin: Esto afectará a TODOS los usuarios.
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="bg-secondary/10 p-4 rounded-lg border border-border space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ArrowPathIcon className="h-4 w-4 text-blue-500" />
              Reasignación de datos
            </div>
            
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground block">
                Destino para los <strong>{currentCategory?.total_items_count}</strong> registros afectados:
              </label>
              
              {/* Select estilizado para parecerse al Input moderno */}
              <select 
                className="flex h-10 w-full rounded-lg border-2 border-transparent bg-secondary px-4 py-2 text-sm text-foreground transition-all duration-300 outline-none focus:bg-background focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                value={targetCategoryId}
                onChange={(e) => setTargetCategoryId(e.target.value)}
              >
                <option value="">Mover a "Otros" (Automático)</option>
                {availableCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    Mover a: {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? "Eliminando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
