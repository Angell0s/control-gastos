// frontend/src/app/(dashboard)/gastos/page.tsx
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
import { useModal } from "@/components/providers/ModalProvider";
import { CategorySelector } from "@/components/CategorySelector";
import type { Category } from "@/hooks/useCategorySelector";

import {
  BanknotesIcon,
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  CalendarIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

// --- TIPOS ---
interface ExpenseItem {
  id?: string;
  category_id: string | null;
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
};

const initialForm: ExpenseFormData = {
  date: new Date().toISOString().split("T")[0],
  notes: "",
  items: [{ ...initialItem }],
};

export default function GastosPage() {
  const { token } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Hook del Gestor de Modales
  const { openModal, closeModal } = useModal();

  // Estados de Datos
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de UI
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Estados para errores
  const [priceErrors, setPriceErrors] = useState<Set<number>>(new Set());
  const [nameErrors, setNameErrors] = useState<Set<number>>(new Set());

  const [currentExpense, setCurrentExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado local para spinner dentro de acciones modales
  const [isModalActionLoading, setIsModalActionLoading] = useState(false);

  // --- CARGA DE DATOS ---
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resExpenses, resCats] = await Promise.all([
        api.get<Expense[]>("/expenses/"),
        api.get<Category[]>("/categories/?status=all"),
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
    if (
      searchParams.get("action") === "new" &&
      !isFormOpen &&
      categories.length > 0
    ) {
      handleOpenCreate();
      router.replace("/gastos", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, categories]);

  // --- HANDLERS ---
  const handleOpenCreate = () => {
    setCurrentExpense(null);
    setPriceErrors(new Set());
    setNameErrors(new Set());
    setFormData({
      date: new Date().toISOString().split("T")[0],
      notes: "",
      items: [{ ...initialItem, category_id: "" }],
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (expense: Expense) => {
    setCurrentExpense(expense);
    setPriceErrors(new Set());
    setNameErrors(new Set());
    setFormData({
      date: expense.date.split("T")[0],
      notes: expense.notes || "",
      items: expense.items.map((i) => ({
        id: i.id,
        category_id: i.category_id,
        name: i.name,
        amount: i.amount,
        quantity: i.quantity,
      })),
    });
    setIsFormOpen(true);
  };

  const showPageInfo = () => {
    openModal("INFO_PAGE_GASTOS", {
      cancelText: "Entendido",
    });
  };

  const handleOpenDelete = (expense: Expense) => {
    openModal("DELETE_CONFIRMATION", {
      itemName: "este gasto",
      confirmText: "Sí, eliminar",
      cancelText: "Cancelar",
      isSubmitting: isModalActionLoading,
      onConfirm: async () => {
        setIsModalActionLoading(true);
        try {
          await api.delete(`/expenses/${expense.id}`);
          toast.success("Gasto eliminado");
          fetchData();
          closeModal();
        } catch (error) {
          toast.error("No se pudo eliminar");
        } finally {
          setIsModalActionLoading(false);
        }
      },
    });
  };

  // --- LÓGICA DE ITEMS ---
  const addItemRow = () => {
    setFormData((prev) => ({ ...prev, items: [...prev.items, { ...initialItem }] }));
  };

  const removeItemRow = (index: number) => {
    if (formData.items.length === 1) return;

    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));

    setPriceErrors((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });

    setNameErrors((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const updateItem = (index: number, field: keyof ExpenseItem, value: any) => {
    const newItems = [...formData.items];

    if (field === "amount" && value > 0) {
      setPriceErrors((prev) => {
        if (!prev.has(index)) return prev;
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }

    if (field === "name" && value.toString().trim() !== "") {
      setNameErrors((prev) => {
        if (!prev.has(index)) return prev;
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }

    // @ts-ignore
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const calculateTotal = () => {
    return formData.items.reduce((acc, item) => acc + item.amount * item.quantity, 0);
  };

  // --- SUBMIT ---
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let hasErrors = false;
    const newNameErrors = new Set<number>();
    const newPriceErrors = new Set<number>();

    formData.items.forEach((item, idx) => {
      if (!item.name.trim()) {
        newNameErrors.add(idx);
        hasErrors = true;
      }
      if (item.amount <= 0) {
        newPriceErrors.add(idx);
        hasErrors = true;
      }
    });

    setNameErrors(newNameErrors);
    setPriceErrors(newPriceErrors);

    if (hasErrors) {
      toast.error("Por favor, completa los campos requeridos.");
      return;
    }

    processFinalSubmit();
  };

  const processFinalSubmit = async () => {
    setIsSubmitting(true);

    try {
      const itemsToProcess = [...formData.items];
      const usedCategoryIds = new Set(
        itemsToProcess.map((i) => i.category_id).filter((id): id is string => !!id)
      );

      const categoriesToReactivate = categories.filter(
        (c) => usedCategoryIds.has(c.id) && !c.is_active
      );

      if (categoriesToReactivate.length > 0) {
        await Promise.all(
          categoriesToReactivate.map((cat) =>
            api.put(`/categories/${cat.id}`, { name: cat.name, is_active: true })
          )
        );

        setCategories((prev) =>
          prev.map((c) => (usedCategoryIds.has(c.id) ? { ...c, is_active: true } : c))
        );
      }

      const finalItems = itemsToProcess.map((item) => ({
        category_id: item.category_id || null,
        name: item.name.trim(),
        amount: item.amount,
        quantity: item.quantity,
      }));

      const payload = {
        ...formData,
        items: finalItems,
        date: new Date(formData.date).toISOString(),
        notes: formData.notes.trim() === "" ? null : formData.notes,
      };

      if (currentExpense) {
        await api.put(`/expenses/${currentExpense.id}`, payload);
        toast.success("Gasto actualizado");
      } else {
        await api.post("/expenses/", payload);
        toast.success("Gasto registrado exitosamente");
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

  const columns: ColumnDef<Expense>[] = [
    {
      header: "Fecha",
      accessorKey: "date",
      cell: (exp) => new Date(exp.date).toLocaleDateString(),
    },
    {
      header: "Descripción / Notas",
      accessorKey: "notes",
      cell: (exp) => (
        <div>
          <p className="font-medium truncate max-w-[200px]">
            {exp.notes || "Sin notas"}
          </p>
          <p className="text-xs text-muted-foreground">{exp.items.length} ítems</p>
        </div>
      ),
    },
    {
      header: "Total",
      accessorKey: "total",
      className: "font-bold text-right",
      cell: (exp) =>
        `$${exp.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
    },
    {
      header: "Acciones",
      className: "text-right w-32",
      cell: (exp) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(exp);
            }}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDelete(exp);
            }}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BanknotesIcon className="h-6 w-6" /> Mis Gastos
            </h1>
            <button
              onClick={showPageInfo}
              className="text-muted-foreground hover:text-emerald-600 transition-colors p-1 hover:bg-emerald-50 rounded-full"
              title="Ver guía de esta sección"
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
            </button>
          </div>
          <p className="text-muted-foreground text-sm">
            Registro detallado de tus compras.
          </p>
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
                  <span className="text-sm text-muted-foreground">
                    {new Date(exp.date).toLocaleDateString()}
                  </span>
                </div>

                <div className="space-y-2">
                  {exp.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between text-sm p-2 bg-secondary/10 rounded"
                    >
                      <div>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          x{item.quantity}
                        </span>
                      </div>
                      <span className="font-mono">
                        ${(item.amount * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2 border-t font-bold text-lg">
                  <span>Total Pagado</span>
                  <span>
                    ${exp.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {exp.notes && (
                  <p className="text-sm text-muted-foreground italic bg-gray-50 p-2 rounded">
                    "{exp.notes}"
                  </p>
                )}
              </div>
            )}
            modalTitle="Resumen del Gasto"
          />
        </CardContent>
      </Card>

      {/* MODAL FORMULARIO PRINCIPAL */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={
          <div className="flex items-center gap-3">
            <span>{currentExpense ? "Editar Gasto" : "Nuevo Gasto"}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openModal("INFO_FORM_GASTOS", { cancelText: "Entendido" });
              }}
              className="text-muted-foreground hover:text-blue-500 transition-colors rounded-full hover:bg-blue-50 p-1"
              title="Ver guía rápida"
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
            </button>
          </div>
        }
        className="max-w-4xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-secondary/10 p-4 rounded-lg border border-border">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" /> Fecha
              </label>
              <Input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notas (Opcional)</label>
              <Input
                type="text"
                placeholder="Ej: Compras de la semana..."
                icon={<DocumentTextIcon className="h-4 w-4" />}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

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
                                nameErrors.has(idx) &&
                                  "border-b-red-500 bg-red-50/10"
                              )}
                              value={item.name}
                              onChange={(e) => updateItem(idx, "name", e.target.value)}
                            />
                          </Tooltip>
                        </td>

                        <td className="p-2">
                          <CategorySelector
                            value={item.category_id || null}
                            onSelect={(id) => updateItem(idx, "category_id", id)}
                            categories={categories}
                            setCategories={setCategories}
                            fetchUrl="/categories/?status=all"
                            allowReactivatePrompt={true}
                            isModalActionLoading={isModalActionLoading}
                            placeholder="Buscar..."
                          />
                        </td>

                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="1"
                            className="w-12 text-center bg-transparent border border-border rounded px-1 py-1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(idx, "quantity", parseInt(e.target.value) || 1)
                            }
                          />
                        </td>

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
                                priceErrors.has(idx) &&
                                  "border-red-500 focus:border-red-500 bg-red-50/10"
                              )}
                              value={item.amount === 0 ? "" : item.amount}
                              onValueChange={(val) => updateItem(idx, "amount", val)}
                            />
                          </Tooltip>
                        </td>

                        <td className="p-2 text-right font-mono text-muted-foreground py-2 align-middle">
                          $
                          {(item.amount * item.quantity).toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
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
                      <td colSpan={4} className="p-3 text-right text-sm">
                        TOTAL ESTIMADO:
                      </td>
                      <td className="p-3 text-right text-lg text-primary">
                        $
                        {calculateTotal().toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Guardando..."
                : currentExpense
                ? "Actualizar Gasto"
                : "Registrar Gasto"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
