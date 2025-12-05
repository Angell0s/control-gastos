//frontend\src\app\(dashboard)\gastos\page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { DataTable, ColumnDef } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { 
  BanknotesIcon, 
  PlusIcon, 
  TrashIcon, 
  PencilSquareIcon, 
  CalendarIcon, 
  ShoppingBagIcon,
  ExclamationTriangleIcon // Para la advertencia
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

// --- TIPOS ---

interface Category {
  id: string;
  name: string;
}

interface ExpenseItem {
  id?: string;
  category_id: string;
  name: string;
  amount: number;
  quantity: number;
  // ✅ Campo temporal para guardar el nombre de la nueva categoría si se está creando
  new_category_name?: string; 
}

interface Expense {
  id: string;
  date: string;
  total: number;
  notes: string | null;
  items: ExpenseItem[];
}

interface ExpenseFormData {
  date: string;
  notes: string;
  items: ExpenseItem[];
}

const initialItem: ExpenseItem = {
  category_id: "",
  name: "",
  amount: 0,
  quantity: 1,
  new_category_name: ""
};

const initialForm: ExpenseFormData = {
  date: new Date().toISOString().split('T')[0],
  notes: "",
  items: [{ ...initialItem }]
};

// ID ficticio para identificar la acción de crear nueva
const NEW_CATEGORY_OPTION_ID = "NEW_CATEGORY_OPTION";

export default function GastosPage() {
  const { token } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Estados de Datos
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de UI
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // ✅ Estado para modal de confirmación de creación de categoría
  const [isCategoryConfirmOpen, setIsCategoryConfirmOpen] = useState(false);
  const [pendingSubmitEvent, setPendingSubmitEvent] = useState<React.FormEvent | null>(null);

  const [currentExpense, setCurrentExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- CARGA DE DATOS ---
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resExpenses, resCats] = await Promise.all([
        api.get<Expense[]>("/expenses/"),
        api.get<Category[]>("/categories/")
      ]);
      setExpenses(resExpenses.data);
      setCategories(resCats.data);
    } catch (err) {
      console.error(err);
      toast.error("Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  useEffect(() => {
    if (searchParams.get("action") === "new" && !isFormOpen && categories.length > 0) {
      handleOpenCreate();
      router.replace("/gastos", { scroll: false });
    }
  }, [searchParams, categories]);

  // --- HANDLERS ---

  const handleOpenCreate = () => {
    setCurrentExpense(null);
    const defaultCatId = categories.length > 0 ? categories[0].id : "";
    setFormData({
      date: new Date().toISOString().split('T')[0],
      notes: "",
      items: [{ ...initialItem, category_id: defaultCatId }]
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (expense: Expense) => {
    setCurrentExpense(expense);
    setFormData({
      date: expense.date.split('T')[0],
      notes: expense.notes || "",
      items: expense.items.map(i => ({
        id: i.id,
        category_id: i.category_id,
        name: i.name,
        amount: i.amount,
        quantity: i.quantity,
        new_category_name: ""
      }))
    });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (expense: Expense) => {
    setCurrentExpense(expense);
    setIsDeleteOpen(true);
  };

  // --- LÓGICA DE ITEMS ---
  
  const addItemRow = () => {
    const defaultCatId = categories.length > 0 ? categories[0].id : "";
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...initialItem, category_id: defaultCatId }]
    }));
  };

  const removeItemRow = (index: number) => {
    if (formData.items.length === 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: keyof ExpenseItem, value: any) => {
    const newItems = [...formData.items];
    
    // Lógica especial para resetear new_category_name si cambian a una categoría existente
    if (field === "category_id" && value !== NEW_CATEGORY_OPTION_ID) {
        newItems[index].new_category_name = "";
    }

    // @ts-ignore
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const calculateTotal = () => {
    return formData.items.reduce((acc, item) => acc + (item.amount * item.quantity), 0);
  };

  // --- LÓGICA DE SUBMIT E INTERCEPCIÓN ---

  // 1. Interceptor del Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (formData.items.some(i => !i.name || i.amount <= 0)) {
        toast.warning("Nombre y Monto son obligatorios.");
        return;
    }

    // Verificar si hay categorías nuevas pendientes
    const hasNewCategories = formData.items.some(
        item => item.category_id === NEW_CATEGORY_OPTION_ID && item.new_category_name?.trim()
    );

    if (hasNewCategories) {
        // Si hay nuevas, detenemos el proceso y pedimos confirmación
        setPendingSubmitEvent(e); // Guardamos el evento (simbólico, realmente el estado formData)
        setIsCategoryConfirmOpen(true);
    } else {
        // Si no hay nuevas, procedemos directo
        processFinalSubmit();
    }
  };

  // 2. Proceso real de guardado (llamado tras confirmar o directo)
  const processFinalSubmit = async () => {
    setIsSubmitting(true);
    setIsCategoryConfirmOpen(false); // Cerrar modal de confirmación si estaba abierto

    try {
        // A. Crear categorías nuevas si existen
        // Necesitamos un mapa para actualizar los items con los nuevos IDs reales
        const itemsToProcess = [...formData.items];
        const newCategoriesMap = new Map<string, string>(); // nombre -> id_real

        // Identificamos nombres únicos para no crear duplicados si el usuario puso la misma nueva cat 2 veces
        const uniqueNewNames = Array.from(new Set(
            itemsToProcess
                .filter(i => i.category_id === NEW_CATEGORY_OPTION_ID && i.new_category_name)
                .map(i => i.new_category_name!.trim())
        ));

        // Creamos las categorías en el backend una por una
        for (const catName of uniqueNewNames) {
            try {
                const res = await api.post<Category>("/categories/", { name: catName });
                newCategoriesMap.set(catName, res.data.id);
                // Actualizamos la lista local de categorías para que ya aparezcan
                setCategories(prev => [...prev, res.data]);
            } catch (err) {
                console.error(`Error creando categoría ${catName}`, err);
                toast.error(`Error al crear categoría "${catName}".`);
                setIsSubmitting(false);
                return; // Abortamos todo si falla la creación de categoría
            }
        }

        // B. Reemplazar los IDs temporales por los reales en los items
        const finalItems = itemsToProcess.map(item => {
            if (item.category_id === NEW_CATEGORY_OPTION_ID && item.new_category_name) {
                const realId = newCategoriesMap.get(item.new_category_name.trim());
                if (realId) {
                    return {
                        ...item,
                        category_id: realId,
                        new_category_name: undefined // Limpiamos
                    };
                }
            }
            return item;
        });

        // Validar que no haya quedado ningún ID temporal (por si acaso)
        if (finalItems.some(i => i.category_id === NEW_CATEGORY_OPTION_ID)) {
            toast.error("Error interno asignando categorías.");
            setIsSubmitting(false);
            return;
        }

        // C. Guardar el Gasto
        const payload = {
            ...formData,
            items: finalItems, // Usamos la lista con IDs corregidos
            date: new Date(formData.date).toISOString()
        };

        if (currentExpense) {
            await api.put(`/expenses/${currentExpense.id}`, payload);
            toast.success("Gasto actualizado");
        } else {
            await api.post("/expenses/", payload);
            toast.success("Gasto y categorías registrados");
        }

        setIsFormOpen(false);
        fetchData();

    } catch (error: any) {
        console.error(error);
        toast.error("Error al guardar gasto");
    } finally {
        setIsSubmitting(false);
        setPendingSubmitEvent(null);
    }
  };

  const handleDelete = async () => {
    if (!currentExpense) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/expenses/${currentExpense.id}`);
      toast.success("Gasto eliminado");
      setIsDeleteOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("No se pudo eliminar");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- COLUMNAS ---
  const columns: ColumnDef<Expense>[] = [
    {
      header: "Fecha",
      accessorKey: "date",
      cell: (exp) => new Date(exp.date).toLocaleDateString()
    },
    {
      header: "Descripción / Notas",
      accessorKey: "notes",
      cell: (exp) => (
        <div>
          <p className="font-medium truncate max-w-[200px]">{exp.notes || "Sin notas"}</p>
          <p className="text-xs text-muted-foreground">{exp.items.length} ítems</p>
        </div>
      )
    },
    {
      header: "Total",
      accessorKey: "total",
      className: "font-bold text-right",
      cell: (exp) => `$${exp.total.toLocaleString("es-MX", {minimumFractionDigits: 2})}`
    },
    {
      header: "Acciones",
      className: "text-right w-32",
      cell: (exp) => (
        <div className="flex justify-end gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); handleOpenEdit(exp); }}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleOpenDelete(exp); }}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BanknotesIcon className="h-6 w-6" /> Mis Gastos
          </h1>
          <p className="text-muted-foreground text-sm">Registro detallado de tus compras.</p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <PlusIcon className="h-4 w-4" /> Registrar Gasto
        </Button>
      </div>

      {/* TABLA PRINCIPAL */}
      <Card>
        <CardContent className="p-0">
          <DataTable 
            columns={columns} 
            data={expenses} 
            isLoading={loading}
            emptyMessage="No tienes gastos registrados aún."
            renderDetailModal={(exp) => (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="text-lg font-bold">Detalle de Compra</h3>
                  <span className="text-sm text-muted-foreground">{new Date(exp.date).toLocaleDateString()}</span>
                </div>
                <div className="space-y-2">
                  {exp.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm p-2 bg-secondary/10 rounded">
                      <div>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">x{item.quantity}</span>
                      </div>
                      <span className="font-mono">${(item.amount * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2 border-t font-bold text-lg">
                  <span>Total Pagado</span>
                  <span>${exp.total.toLocaleString("es-MX", {minimumFractionDigits: 2})}</span>
                </div>
                {exp.notes && (
                   <p className="text-sm text-muted-foreground italic bg-gray-50 p-2 rounded">"{exp.notes}"</p>
                )}
              </div>
            )}
            modalTitle="Resumen del Gasto"
          />
        </CardContent>
      </Card>

      {/* --- MODAL FORMULARIO --- */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={currentExpense ? "Editar Gasto" : "Nuevo Gasto"}
        className="max-w-4xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-6">
          
          {/* CABECERA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-secondary/10 p-4 rounded-lg border border-border">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" /> Fecha
              </label>
              <input 
                type="date" 
                required
                className="w-full p-2 rounded border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notas (Opcional)</label>
              <input 
                type="text" 
                placeholder="Ej: Compras de la semana..."
                className="w-full p-2 rounded border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>
          </div>

          {/* LISTA DE ITEMS */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
                <ShoppingBagIcon className="h-4 w-4" /> Ítems de Compra
              </h4>
              <Button type="button" size="sm" variant="outline" onClick={addItemRow}>
                <PlusIcon className="h-3 w-3 mr-1" /> Agregar Ítem
              </Button>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[600px]">
                  <thead className="bg-secondary/20 text-xs uppercase font-semibold text-muted-foreground">
                    <tr>
                      <th className="p-2 pl-4 min-w-[160px]">Producto</th>
                      <th className="p-2 w-36 min-w-[150px]">Categoría</th>
                      <th className="p-2 w-20 text-center">Cant.</th>
                      <th className="p-2 w-28 text-right">Precio U.</th>
                      <th className="p-2 w-24 text-right">Subtotal</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {formData.items.map((item, idx) => (
                      <tr key={idx} className="bg-background hover:bg-accent/5 align-top">
                        <td className="p-2 pl-4">
                          <input 
                            type="text" 
                            placeholder="Nombre..."
                            required
                            className="w-full bg-transparent outline-none border-b border-transparent focus:border-primary placeholder:text-muted-foreground/50 py-1"
                            value={item.name}
                            onChange={(e) => updateItem(idx, "name", e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <div className="flex flex-col gap-1">
                              <select 
                                className="w-full bg-transparent outline-none text-xs truncate border-b border-transparent focus:border-primary py-1"
                                value={item.category_id}
                                required
                                onChange={(e) => updateItem(idx, "category_id", e.target.value)}
                              >
                                 {categories.length === 0 && <option value="">Sin categorías</option>}
                                 {categories.map(cat => (
                                   <option key={cat.id} value={cat.id}>{cat.name}</option>
                                 ))}
                                 <option disabled>──────────</option>
                                 {/* ✅ Opción Especial */}
                                 <option value={NEW_CATEGORY_OPTION_ID}>✨ + Nueva Categoría</option>
                              </select>
                              
                              {/* ✅ Input Condicional para Nueva Categoría */}
                              {item.category_id === NEW_CATEGORY_OPTION_ID && (
                                  <input 
                                    type="text"
                                    autoFocus
                                    placeholder="Nombre nueva categoría..."
                                    className="text-xs w-full p-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-blue-700 dark:text-blue-300 placeholder:text-blue-300 outline-none animate-in slide-in-from-top-1 duration-200"
                                    value={item.new_category_name}
                                    onChange={(e) => updateItem(idx, "new_category_name", e.target.value)}
                                  />
                              )}
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          <input 
                            type="number" min="1"
                            className="w-12 text-center bg-transparent border border-border rounded px-1 py-1"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input 
                            type="number" min="0" step="0.01"
                            placeholder="0.00"
                            className="w-24 text-right bg-transparent border border-border rounded px-1 py-1 placeholder:text-muted-foreground/40"
                            value={item.amount === 0 ? "" : item.amount} 
                            onChange={(e) => {
                                const val = e.target.value;
                                updateItem(idx, "amount", val === "" ? 0 : parseFloat(val));
                            }}
                          />
                        </td>
                        <td className="p-2 text-right font-mono text-muted-foreground py-2">
                          ${(item.amount * item.quantity).toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          {formData.items.length > 1 && (
                            <button 
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              className="text-red-400 hover:text-red-600 transition-colors py-1"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-secondary/10 font-bold">
                    <tr>
                      <td colSpan={4} className="p-3 text-right text-sm">TOTAL ESTIMADO:</td>
                      <td className="p-3 text-right text-lg text-primary">
                        ${calculateTotal().toLocaleString("es-MX", {minimumFractionDigits: 2})}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : (currentExpense ? "Actualizar Gasto" : "Registrar Gasto")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL CONFIRMACIÓN DE NUEVA CATEGORÍA --- */}
      <Modal
        isOpen={isCategoryConfirmOpen}
        onClose={() => setIsCategoryConfirmOpen(false)}
        title="Crear Nuevas Categorías"
        className="max-w-md border-l-4 border-l-yellow-500"
      >
        <div className="space-y-4">
           <div className="flex items-start gap-3 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg text-yellow-800 dark:text-yellow-200 text-sm">
              <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
              <p>Estás a punto de crear nuevas categorías en el sistema global. Esta acción <strong>solo puede ser revertida por un administrador</strong>.</p>
           </div>

           <p className="text-sm font-medium">Se crearán las siguientes categorías:</p>
           <ul className="list-disc list-inside text-sm text-muted-foreground bg-muted p-3 rounded-md">
              {/* Listamos las categorías únicas que se van a crear */}
              {Array.from(new Set(
                  formData.items
                    .filter(i => i.category_id === NEW_CATEGORY_OPTION_ID && i.new_category_name?.trim())
                    .map(i => i.new_category_name)
              )).map((name, i) => (
                  <li key={i}>{name}</li>
              ))}
           </ul>

           <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsCategoryConfirmOpen(false)}>Revisar</Button>
              <Button 
                className="bg-yellow-600 hover:bg-yellow-700 text-white" 
                onClick={processFinalSubmit} // Llamada directa al proceso final
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creando..." : "Confirmar y Guardar"}
              </Button>
           </div>
        </div>
      </Modal>

      {/* --- MODAL ELIMINAR --- */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Eliminar Gasto"
        className="max-w-md"
      >
        <div className="space-y-4">
           <p>¿Estás seguro de eliminar este registro? Se perderá toda la información de los ítems comprados.</p>
           <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
                {isSubmitting ? "Eliminando..." : "Sí, Eliminar"}
              </Button>
           </div>
        </div>
      </Modal>

    </div>
  );
}
