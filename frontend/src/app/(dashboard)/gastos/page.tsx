//frontend\src\app\(dashboard)\gastos\page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { cn } from "@/lib/utils"; 
import { DataTable, ColumnDef } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input"; 
import { Tooltip } from "@/components/ui/Tooltip"; 
import { Card, CardContent } from "@/components/ui/Card";
import { AsyncSearchSelect } from "@/components/ui/AsyncSearchSelect"; 
import { 
  BanknotesIcon, 
  PlusIcon, 
  TrashIcon, 
  PencilSquareIcon, 
  CalendarIcon, 
  ShoppingBagIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

// --- TIPOS ---
interface Category {
  id: string;
  name: string;
}

interface ExpenseItem {
  id?: string;
  // ✅ CORRECCIÓN: Permitir null explícitamente
  category_id: string | null;
  name: string;
  amount: number;
  quantity: number;
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
  category_id: "", // Se mantiene string vacío para el input, se limpia al enviar
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
  
  const [isCategoryConfirmOpen, setIsCategoryConfirmOpen] = useState(false);
  const [pendingSubmitEvent, setPendingSubmitEvent] = useState<React.FormEvent | null>(null);

  // Estados para errores
  const [priceErrors, setPriceErrors] = useState<Set<number>>(new Set());
  const [nameErrors, setNameErrors]   = useState<Set<number>>(new Set());

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
    setPriceErrors(new Set());
    setNameErrors(new Set());
    // Inicializamos con string vacío
    setFormData({
      date: new Date().toISOString().split('T')[0],
      notes: "",
      items: [{ ...initialItem, category_id: "" }]
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (expense: Expense) => {
    setCurrentExpense(expense);
    setPriceErrors(new Set());
    setNameErrors(new Set());
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
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...initialItem }]
    }));
  };

  const removeItemRow = (index: number) => {
    if (formData.items.length === 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
    
    setPriceErrors(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
    });
    setNameErrors(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
    });
  };

  const updateItem = (index: number, field: keyof ExpenseItem, value: any) => {
    const newItems = [...formData.items];
    
    if (field === "category_id" && value !== NEW_CATEGORY_OPTION_ID) {
        newItems[index].new_category_name = "";
    }

    if (field === "amount" && value > 0) {
         setPriceErrors(prev => {
            if (!prev.has(index)) return prev;
            const next = new Set(prev);
            next.delete(index);
            return next;
         });
    }

    if (field === "name" && value.toString().trim() !== "") {
         setNameErrors(prev => {
            if (!prev.has(index)) return prev;
            const next = new Set(prev);
            next.delete(index);
            return next;
         });
    }

    // @ts-ignore
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const calculateTotal = () => {
    return formData.items.reduce((acc, item) => acc + (item.amount * item.quantity), 0);
  };

  // --- SUBMIT ---
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let hasErrors = false;

    const newNameErrors = new Set<number>();
    formData.items.forEach((item, idx) => {
        if (!item.name.trim()) {
            newNameErrors.add(idx);
            hasErrors = true;
        }
    });
    setNameErrors(newNameErrors);

    const newPriceErrors = new Set<number>();
    formData.items.forEach((item, idx) => {
        if (item.amount <= 0) {
            newPriceErrors.add(idx);
            hasErrors = true;
        }
    });
    setPriceErrors(newPriceErrors);

    if (hasErrors) {
        toast.error("Por favor, completa los campos requeridos.");
        return; 
    }

    const hasNewCategories = formData.items.some(
        item => item.category_id === NEW_CATEGORY_OPTION_ID && item.new_category_name?.trim()
    );

    if (hasNewCategories) {
        setPendingSubmitEvent(e); 
        setIsCategoryConfirmOpen(true);
    } else {
        processFinalSubmit();
    }
  };

  const processFinalSubmit = async () => {
    setIsSubmitting(true);
    setIsCategoryConfirmOpen(false);

    try {
        const itemsToProcess = [...formData.items];
        const newCategoriesMap = new Map<string, string>();

        const uniqueNewNames = Array.from(new Set(
            itemsToProcess
                .filter(i => i.category_id === NEW_CATEGORY_OPTION_ID && i.new_category_name)
                .map(i => i.new_category_name!.trim())
        ));

        for (const catName of uniqueNewNames) {
            try {
                const res = await api.post<Category>("/categories/", { name: catName });
                newCategoriesMap.set(catName, res.data.id);
                setCategories(prev => [...prev, res.data]);
            } catch (err) {
                console.error(`Error creando categoría ${catName}`, err);
                toast.error(`Error al crear categoría "${catName}".`);
                setIsSubmitting(false);
                return;
            }
        }

        const finalItems = itemsToProcess.map(item => {
            let updatedItem = { ...item };

            // 1. Manejo de Nueva Categoría
            if (updatedItem.category_id === NEW_CATEGORY_OPTION_ID && updatedItem.new_category_name) {
                const realId = newCategoriesMap.get(updatedItem.new_category_name.trim());
                if (realId) {
                    updatedItem.category_id = realId;
                    updatedItem.new_category_name = undefined;
                }
            }

            // 2. ✅ CORRECCIÓN CRÍTICA: Convertir cadena vacía a NULL
            if (updatedItem.category_id === "") {
                updatedItem.category_id = null;
            }

            return updatedItem;
        });

        const payload = {
            ...formData,
            items: finalItems,
            date: new Date(formData.date).toISOString(),
            // Opcional: limpiar notes si está vacío también
            notes: formData.notes.trim() === "" ? null : formData.notes
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
              <Input 
                type="date" 
                required
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notas (Opcional)</label>
              <Input 
                type="text" 
                placeholder="Ej: Compras de la semana..."
                icon={<DocumentTextIcon className="h-4 w-4" />}
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
                      <th className="p-2 w-48 min-w-[180px]">Categoría</th>
                      <th className="p-2 w-20 text-center">Cant.</th>
                      <th className="p-2 w-28 text-right">Precio U.</th>
                      <th className="p-2 w-24 text-right">Subtotal</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {formData.items.map((item, idx) => (
                      <tr key={idx} className="bg-background hover:bg-accent/5 align-top">
                        
                        {/* INPUT PRODUCTO CON TOOLTIP */}
                        <td className="p-2 pl-4 relative">
                          <Tooltip 
                                text="¡Nombre requerido!" 
                                show={nameErrors.has(idx)} 
                                variant="error"
                                className="mb-1"
                            >
                              <input 
                                type="text" 
                                placeholder="Nombre..."
                                className={cn(
                                    "w-full bg-transparent outline-none border-b border-transparent focus:border-primary placeholder:text-muted-foreground/50 py-2 transition-colors",
                                    nameErrors.has(idx) && "border-b-red-500 bg-red-50/10"
                                )}
                                value={item.name}
                                onChange={(e) => updateItem(idx, "name", e.target.value)}
                                onFocus={() => {
                                    if(nameErrors.has(idx)) {
                                        setNameErrors(prev => {
                                            const next = new Set(prev);
                                            next.delete(idx);
                                            return next;
                                        });
                                    }
                                }}
                              />
                          </Tooltip>
                        </td>

                        <td className="p-2">
                          <AsyncSearchSelect
                            value={item.category_id || null}
                            onChange={(newVal) => updateItem(idx, "category_id", newVal)}
                            fetchUrl="/categories/"
                            queryParam="search"
                            placeholder="Buscar categoría..."
                            initialOptions={categories.map(c => ({
                              value: c.id,
                              label: c.name,
                            }))}
                            creatable={true}
                            onCreateOption={(label) => {
                                updateItem(idx, "new_category_name", label);
                                return {
                                    value: NEW_CATEGORY_OPTION_ID,
                                    label: `(Nueva) ${label}`,
                                };
                            }}
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input 
                            type="number" min="1"
                            className="w-12 text-center bg-transparent border border-border rounded px-1 py-1"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                          />
                        </td>
                        
                        {/* INPUT PRECIO CON TOOLTIP */}
                        <td className="p-2 text-right relative">
                            <Tooltip 
                                text="¡Precio requerido!" 
                                show={priceErrors.has(idx)} 
                                variant="error"
                                className="mb-1"
                            >
                                <Input 
                                    isCurrency
                                    prefixText="$"
                                    placeholder="0.00"
                                    className={cn(
                                        "w-24 h-auto py-1 px-1 text-right bg-transparent border border-border rounded hover:border-primary/50 focus:border-primary focus:ring-0 text-sm",
                                        priceErrors.has(idx) && "border-red-500 focus:border-red-500 bg-red-50/10"
                                    )}
                                    value={item.amount === 0 ? "" : item.amount} 
                                    onValueChange={(val) => updateItem(idx, "amount", val)}
                                    
                                    onFocus={() => {
                                        if(priceErrors.has(idx)) {
                                            setPriceErrors(prev => {
                                                const next = new Set(prev);
                                                next.delete(idx);
                                                return next;
                                            });
                                        }
                                    }}
                                />
                            </Tooltip>
                        </td>

                        <td className="p-2 text-right font-mono text-muted-foreground py-2 align-middle">
                          ${(item.amount * item.quantity).toLocaleString("es-MX", {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </td>
                        <td className="p-2 text-center align-middle">
                          {formData.items.length > 1 && (
                            <button 
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              className="text-red-400 hover:text-red-600 transition-colors p-1"
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

      {/* --- MODAL CONFIRMACIÓN --- */}
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
                onClick={processFinalSubmit} 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creando..." : "Confirmar y Guardar"}
              </Button>
            </div>
        </div>
      </Modal>

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
