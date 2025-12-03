"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation"; // ✅ 1. IMPORTAR
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
  ShoppingBagIcon 
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

// --- TIPOS ---

interface Category {
  id: string;
  name: string;
}

interface ExpenseItem {
  id?: string; // Opcional porque al crear no tiene ID
  category_id: string;
  name: string;
  amount: number;
  quantity: number;
}

interface Expense {
  id: string;
  date: string;
  total: number;
  notes: string | null;
  items: ExpenseItem[];
}

// Tipo para el Formulario
interface ExpenseFormData {
  date: string;
  notes: string;
  items: ExpenseItem[];
}

const initialItem: ExpenseItem = {
  category_id: "",
  name: "",
  amount: 0,
  quantity: 1
};

const initialForm: ExpenseFormData = {
  date: new Date().toISOString().split('T')[0], // Hoy en formato YYYY-MM-DD
  notes: "",
  items: [{ ...initialItem }]
};

export default function GastosPage() {
  const { token } = useAuthStore();
  const searchParams = useSearchParams(); // ✅ 2. HOOKS DE NAVEGACIÓN
  const router = useRouter();

  // Estados de Datos
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de UI
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
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

  // --- ✅ 3. DETECTAR ACCIÓN EN URL ---
  useEffect(() => {
    // Solo ejecutar si ya tenemos categorías cargadas (para inicializar el item correctamente)
    if (searchParams.get("action") === "new" && !isFormOpen && categories.length > 0) {
      handleOpenCreate();
      // Limpiar la URL para que no se vuelva a abrir al recargar
      router.replace("/gastos", { scroll: false });
    }
  }, [searchParams, categories]); // Dependencia categories importante

  // --- HANDLERS ---

  const handleOpenCreate = () => {
    setCurrentExpense(null);
    // Asegurarnos de tener al menos un ítem vacío y la fecha de hoy
    // Usamos la primera categoría disponible si existe
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
      // Mapeamos items asegurando que tengan la estructura correcta
      items: expense.items.map(i => ({
        id: i.id,
        category_id: i.category_id,
        name: i.name,
        amount: i.amount,
        quantity: i.quantity
      }))
    });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (expense: Expense) => {
    setCurrentExpense(expense);
    setIsDeleteOpen(true);
  };

  // --- LÓGICA DEL FORMULARIO DE ITEMS ---
  
  const addItemRow = () => {
    const defaultCatId = categories.length > 0 ? categories[0].id : "";
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...initialItem, category_id: defaultCatId }]
    }));
  };

  const removeItemRow = (index: number) => {
    if (formData.items.length === 1) return; // No borrar el último
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: keyof ExpenseItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const calculateTotal = () => {
    return formData.items.reduce((acc, item) => acc + (item.amount * item.quantity), 0);
  };

  // --- SUBMIT ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validaciones básicas
      if (formData.items.some(i => !i.name || i.amount <= 0)) {
        toast.warning("Revisa los ítems: Nombre y Monto son obligatorios.");
        setIsSubmitting(false);
        return;
      }
      
      // Validar categorías
      if (formData.items.some(i => !i.category_id)) {
        toast.warning("Todos los ítems deben tener una categoría.");
        setIsSubmitting(false);
        return;
      }

      const payload = {
        ...formData,
        // Convertir fecha a ISO full si es necesario, o mandar YYYY-MM-DD si el backend lo soporta
        date: new Date(formData.date).toISOString()
      };

      if (currentExpense) {
        await api.put(`/expenses/${currentExpense.id}`, payload);
        toast.success("Gasto actualizado");
      } else {
        await api.post("/expenses/", payload);
        toast.success("Gasto registrado");
      }

      setIsFormOpen(false);
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error("Error al guardar gasto");
    } finally {
      setIsSubmitting(false);
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
      type: "date",
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
      type: "currency",
      className: "font-bold text-right",
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

      {/* TABLA */}
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
        className="max-w-3xl" // Más ancho para la tabla de items
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* CABECERA DEL FORMULARIO */}
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
              <table className="w-full text-sm text-left">
                <thead className="bg-secondary/20 text-xs uppercase font-semibold text-muted-foreground">
                  <tr>
                    <th className="p-2 pl-4">Producto</th>
                    <th className="p-2 w-32">Categoría</th>
                    <th className="p-2 w-20 text-center">Cant.</th>
                    <th className="p-2 w-24 text-right">Precio</th>
                    <th className="p-2 w-24 text-right">Subtotal</th>
                    <th className="p-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {formData.items.map((item, idx) => (
                    <tr key={idx} className="bg-background hover:bg-accent/5">
                      <td className="p-2 pl-4">
                        <input 
                          type="text" 
                          placeholder="Nombre..."
                          required
                          className="w-full bg-transparent outline-none border-b border-transparent focus:border-primary"
                          value={item.name}
                          onChange={(e) => updateItem(idx, "name", e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <select 
                          className="w-full bg-transparent outline-none text-xs"
                          value={item.category_id}
                          required
                          onChange={(e) => updateItem(idx, "category_id", e.target.value)}
                        >
                           {categories.length === 0 && <option value="">Sin categorías</option>}
                           {categories.map(cat => (
                             <option key={cat.id} value={cat.id}>{cat.name}</option>
                           ))}
                        </select>
                      </td>
                      <td className="p-2 text-center">
                        <input 
                          type="number" min="1"
                          className="w-12 text-center bg-transparent border border-border rounded px-1"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                        />
                      </td>
                      <td className="p-2 text-right">
                        <input 
                          type="number" min="0" step="0.01"
                          className="w-24 text-right bg-transparent border border-border rounded px-1"
                          value={item.amount}
                          onChange={(e) => updateItem(idx, "amount", parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="p-2 text-right font-mono text-muted-foreground">
                        ${(item.amount * item.quantity).toFixed(2)}
                      </td>
                      <td className="p-2 text-center">
                        {formData.items.length > 1 && (
                          <button 
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="text-red-400 hover:text-red-600 transition-colors"
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

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : (currentExpense ? "Actualizar Gasto" : "Registrar Gasto")}
            </Button>
          </div>
        </form>
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
