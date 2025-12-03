//frontend\src\app\(dashboard)\categorias\admin\page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { DataTable, ColumnDef } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { 
  TagIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  PlusIcon, 
  ArrowLeftIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

// --- TIPOS ---
interface Category {
  id: string;
  name: string;
}

interface CategoryFormData {
  name: string;
}

const initialFormData: CategoryFormData = { name: "" };

export default function AdminCategoriasPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  
  // Estados de datos
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Modales y Formularios
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- CARGA DE DATOS ---
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get<Category[]>("/categories/");
      // Ordenar alfabéticamente
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
  }, [token]);

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
        // EDITAR
        await api.put(`/categories/${currentCategory.id}`, formData);
        toast.success("Categoría actualizada");
      } else {
        // CREAR
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
      await api.delete(`/categories/${currentCategory.id}`);
      toast.success("Categoría eliminada");
      setIsDeleteOpen(false);
      fetchCategories();
    } catch (error: any) {
      console.error(error);
      // El backend debe devolver 400 si tiene gastos asociados
      const msg = error.response?.data?.detail || "No se pudo eliminar";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- COLUMNAS ---
  const columns: ColumnDef<Category>[] = [
    {
      header: "Nombre de Categoría",
      accessorKey: "name",
      cell: (cat) => (
        <div className="flex items-center gap-3 font-medium text-foreground">
          <div className="p-1.5 bg-primary/10 rounded text-primary">
            <TagIcon className="h-4 w-4" />
          </div>
          {cat.name}
        </div>
      )
    },
    {
      header: "ID Sistema",
      accessorKey: "id",
      className: "text-muted-foreground text-xs font-mono w-32 truncate",
      cell: (cat) => cat.id.slice(0, 8)
    },
    {
      header: "Acciones",
      className: "text-right w-32",
      cell: (cat) => (
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
      )
    }
  ];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      
      {/* HEADER CON NAVEGACIÓN */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <button 
            onClick={() => router.back()} 
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-2"
          >
            <ArrowLeftIcon className="h-3 w-3" /> Volver a Galería
          </button>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Administrar Categorías
          </h1>
          <p className="text-muted-foreground text-sm">
            Crea, edita o elimina las categorías disponibles para gastos.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 shadow-sm">
          <PlusIcon className="h-4 w-4" /> Nueva Categoría
        </Button>
      </div>

      {/* CONTENEDOR PRINCIPAL (CARD) */}
      <Card>
        <CardHeader className="pb-3 border-b border-border mb-2">
          <CardTitle className="text-lg">Listado Maestro</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <DataTable 
            columns={columns} 
            data={categories} 
            isLoading={loading}
            emptyMessage="No hay categorías registradas."
            // Opcional: detalle al hacer click
            renderDetailModal={(cat) => (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-2">
                  <TagIcon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">{cat.name}</h3>
                <p className="text-xs text-muted-foreground font-mono">UUID: {cat.id}</p>
              </div>
            )}
            modalTitle="Detalle de Categoría"
          />
        </CardContent>
      </Card>

      {/* --- MODAL: FORMULARIO --- */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={currentCategory ? "Editar Categoría" : "Nueva Categoría"}
        className="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre de la Categoría</label>
            <input 
              type="text" 
              autoFocus
              placeholder="Ej: Alimentos, Transporte..."
              className="w-full p-2.5 rounded-md border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              value={formData.name}
              onChange={(e) => setFormData({ name: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Este nombre aparecerá en los reportes y selectores de gastos.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: ELIMINAR --- */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Eliminar Categoría"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-800 flex items-start gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 flex-shrink-0 text-red-600" />
            <div>
              <h4 className="font-bold">Acción Irreversible</h4>
              <p className="text-sm mt-1 leading-relaxed">
                ¿Estás seguro de eliminar la categoría <strong>{currentCategory?.name}</strong>?
                <br/>
                <span className="text-xs opacity-80 mt-1 block">
                  Nota: Si existen gastos asociados a esta categoría, no podrás eliminarla hasta que los reasignes o borres.
                </span>
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? "Eliminando..." : "Sí, Eliminar"}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
