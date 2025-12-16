// frontend/src/app/(dashboard)/ingresos/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { DataTable, ColumnDef } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { CategorySelector } from "@/components/CategorySelector";
import type { Category as CategoryWithStatus } from "@/hooks/useCategorySelector";

import {
  BanknotesIcon,
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  BriefcaseIcon,
  XMarkIcon,
  TagIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import clsx from "clsx";

// Importaciones del sistema de modales (ayuda + eliminar)
import { MODAL_REGISTRY, ModalKey } from "@/lib/modalRegistry";

// --- TIPOS ---
interface IngresoItem {
  id?: string;
  category_id: string | null;
  descripcion: string;
  monto: number;
}

interface Ingreso {
  id: string;
  fecha: string;
  monto_total: number;
  descripcion: string;
  fuente: string | null;
  items: IngresoItem[];
}

interface IngresoFormData {
  fecha: string;
  descripcion: string;
  fuente: string;
  items: IngresoItem[];
}

const initialItem: IngresoItem = {
  category_id: "",
  descripcion: "",
  monto: 0,
};

const initialForm: IngresoFormData = {
  fecha: new Date().toISOString().split("T")[0],
  descripcion: "",
  fuente: "",
  items: [{ ...initialItem }],
};

export default function IngresosPage() {
  const { token } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Estados de datos
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [categories, setCategories] = useState<CategoryWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados UI
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Estado para modales de ayuda genéricos
  const [activeHelpModal, setActiveHelpModal] = useState<ModalKey | null>(null);

  const [currentIngreso, setCurrentIngreso] = useState<Ingreso | null>(null);
  const [formData, setFormData] = useState<IngresoFormData>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- CARGA DE DATOS ---
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resIngresos, resCats] = await Promise.all([
        api.get<Ingreso[]>("/incomes/"),
        api.get<CategoryWithStatus[]>("/categories/?status=all"),
      ]);

      setIngresos(resIngresos.data);
      setCategories(resCats.data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error(err);
      toast.error("Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const action = searchParams.get("action");

  useEffect(() => {
    if (action === "new" && !isFormOpen) {
      handleOpenCreate();
      router.replace("/ingresos", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  // --- HANDLERS ---
  const handleOpenCreate = () => {
    setCurrentIngreso(null);
    setFormData({
      fecha: new Date().toISOString().split("T")[0],
      descripcion: "",
      fuente: "",
      items: [{ ...initialItem }],
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (ingreso: Ingreso) => {
    setCurrentIngreso(ingreso);
    setFormData({
      fecha: ingreso.fecha.split("T")[0],
      descripcion: ingreso.descripcion,
      fuente: ingreso.fuente || "",
      items: ingreso.items.map((i) => ({
        id: i.id,
        category_id: i.category_id,
        descripcion: i.descripcion,
        monto: i.monto,
      })),
    });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (ingreso: Ingreso) => {
    setCurrentIngreso(ingreso);
    setIsDeleteOpen(true);
  };

  // --- LÓGICA DE ITEMS ---
  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { ...initialItem }],
    }));
  };

  const removeItemRow = (index: number) => {
    if (formData.items.length === 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: keyof IngresoItem, value: any) => {
    const newItems = [...formData.items];
    // @ts-ignore
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const calculateTotal = () => {
    return formData.items.reduce((acc, item) => acc + (item.monto || 0), 0);
  };

  // --- SUBMIT ---
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.descripcion.trim()) {
      toast.warning("La descripción general es obligatoria.");
      return;
    }

    processFinalSubmit();
  };

  const processFinalSubmit = async () => {
    setIsSubmitting(true);

    try {
      const itemsToProcess = [...formData.items];

      // A) Normalizar items (copiar descripción general si solo hay 1 item)
      const itemsProcessed = itemsToProcess.map((item) => {
        let descripcion = item.descripcion;

        if (itemsToProcess.length === 1 && !descripcion.trim()) {
          descripcion = formData.descripcion;
        }

        return {
          id: item.id,
          category_id: item.category_id === "" ? null : item.category_id,
          descripcion,
          monto: item.monto,
        };
      });

      // B) Validaciones
      if (itemsProcessed.some((i) => !i.descripcion.trim())) {
        toast.warning("Describe cada concepto.");
        setIsSubmitting(false);
        return;
      }
      if (itemsProcessed.some((i) => i.monto <= 0)) {
        toast.warning("El monto debe ser mayor a 0.");
        setIsSubmitting(false);
        return;
      }

      // C) Reactivar categorías inactivas usadas (misma lógica que Gastos)
      const usedCategoryIds = new Set(
        itemsProcessed
          .map((i) => i.category_id)
          .filter((id): id is string => !!id)
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
          prev.map((c) =>
            usedCategoryIds.has(c.id) ? { ...c, is_active: true } : c
          )
        );
      }

      // D) Enviar payload
      const payload = {
        descripcion: formData.descripcion,
        fecha: new Date(formData.fecha).toISOString(),
        fuente: formData.fuente.trim() === "" ? null : formData.fuente,
        items: itemsProcessed.map((i) => ({
          id: i.id,
          category_id: i.category_id,
          descripcion: i.descripcion,
          monto: i.monto,
        })),
      };

      if (currentIngreso) {
        await api.put(`/incomes/${currentIngreso.id}`, payload);
        toast.success("Ingreso actualizado");
      } else {
        await api.post("/incomes/", payload);
        toast.success("Ingreso registrado");
      }

      setIsFormOpen(false);
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error("Error al guardar ingreso");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!currentIngreso) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/incomes/${currentIngreso.id}`);
      toast.success("Ingreso eliminado");
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
  const columns: ColumnDef<Ingreso>[] = [
    {
      header: "Fecha",
      accessorKey: "fecha",
      cell: (row) => new Date(row.fecha).toLocaleDateString(),
    },
    {
      header: "Descripción",
      accessorKey: "descripcion",
      cell: (row) => (
        <div>
          <p className="font-medium truncate max-w-[200px]">{row.descripcion}</p>
          {row.fuente && (
            <div className="flex items-center text-xs text-muted-foreground gap-1">
              <BriefcaseIcon className="h-3 w-3" /> {row.fuente}
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Total",
      accessorKey: "monto_total",
      className: "font-bold text-right text-green-600",
      cell: (row) =>
        `$${row.monto_total.toLocaleString("es-MX", {
          minimumFractionDigits: 2,
        })}`,
    },
    {
      header: "Acciones",
      className: "text-right w-32",
      cell: (row) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(row);
            }}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDelete(row);
            }}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  // ✅ HELPER: Renderizado de Modal Genérico
  const GenericModal = () => {
    if (!activeHelpModal) return null;
    const def = MODAL_REGISTRY[activeHelpModal];
    const Icon = def.icon;

    const colorClasses: Record<string, string> = {
      indigo:
        "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
      red: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
      blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
      yellow:
        "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
      green:
        "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
      emerald:
        "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
      slate:
        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    };

    const headerTheme = colorClasses[def.colorClass] || colorClasses.slate;

    const headerContent = (
      <div className="flex items-center gap-2">
        <div className={clsx("p-1.5 rounded-md", headerTheme)}>
          <Icon className="h-5 w-5" />
        </div>
        <span>{def.title}</span>
      </div>
    );

    return (
      <Modal
        isOpen={!!activeHelpModal}
        onClose={() => setActiveHelpModal(null)}
        title={headerContent}
        className={`max-w-md border-l-4 border-l-${def.colorClass}-500`}
      >
        <div className="space-y-4 pt-2">
          <div className="text-sm text-muted-foreground">{def.content({})}</div>

          <div className="flex justify-end pt-4 mt-2 border-t border-border/50">
            <Button onClick={() => setActiveHelpModal(null)}>Entendido</Button>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-green-700">
            <BanknotesIcon className="h-6 w-6" /> Mis Ingresos
            <button
              onClick={() => setActiveHelpModal("INFO_PAGE_INGRESOS")}
              className="text-slate-400 hover:text-green-600 transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              title="¿Cómo funciona?"
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
            </button>
          </h1>
          <p className="text-muted-foreground text-sm">
            Administra tus entradas de dinero.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="gap-2 bg-green-600 hover:bg-green-700 text-white"
        >
          <PlusIcon className="h-4 w-4" /> Nuevo Ingreso
        </Button>
      </div>

      {/* TABLA */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={ingresos}
            isLoading={loading}
            emptyMessage="No hay ingresos registrados."
            renderDetailModal={(ing) => (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="text-lg font-bold">{ing.descripcion}</h3>
                  <span className="text-sm text-muted-foreground">
                    {new Date(ing.fecha).toLocaleDateString()}
                  </span>
                </div>

                {ing.fuente && (
                  <p className="text-sm text-muted-foreground">
                    Fuente: {ing.fuente}
                  </p>
                )}

                <div className="space-y-2 mt-2">
                  {ing.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between text-sm p-2 bg-green-50/50 rounded border border-green-100"
                    >
                      <span className="font-medium">{item.descripcion}</span>
                      <span className="font-mono font-semibold text-green-700">
                        $
                        {item.monto.toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            modalTitle="Detalle"
          />
        </CardContent>
      </Card>

      {/* --- MODAL FORMULARIO --- */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <span>{currentIngreso ? "Editar Ingreso" : "Nuevo Ingreso"}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveHelpModal("INFO_FORM_INGRESOS");
              }}
              className="text-slate-400 hover:text-green-600 transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Ayuda del formulario"
              type="button"
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
            </button>
          </div>
        }
        className="max-w-xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-5">
          {/* DATOS GENERALES */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1 space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Fecha
              </label>
              <input
                type="date"
                required
                className="w-full p-2 rounded-md border border-input bg-background focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                value={formData.fecha}
                onChange={(e) =>
                  setFormData({ ...formData, fecha: e.target.value })
                }
              />
            </div>

            <div className="col-span-2 sm:col-span-1 space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Fuente (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Cliente, Banco..."
                className="w-full p-2 rounded-md border border-input bg-background focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                value={formData.fuente}
                onChange={(e) =>
                  setFormData({ ...formData, fuente: e.target.value })
                }
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Descripción General
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ej: Pago de Proyecto Web"
                className="w-full p-2 rounded-md border border-input bg-background focus:ring-2 focus:ring-green-500/20 outline-none transition-all font-medium"
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
              />
            </div>
          </div>

          {/* ÁREA DE CONCEPTOS */}
          <div className="space-y-3 bg-slate-50 dark:bg-white/5 p-4 rounded-lg border border-slate-100 dark:border-white/10">
            <div className="flex justify-between items-end mb-2">
              <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                {formData.items.length > 1
                  ? "Desglose de Conceptos"
                  : "Monto y Categoría"}
              </label>

              {formData.items.length === 1 && (
                <button
                  type="button"
                  onClick={addItemRow}
                  className="text-xs text-green-600 dark:text-green-400 font-medium hover:underline flex items-center gap-1"
                >
                  <PlusIcon className="h-3 w-3" /> Desglosar en varios conceptos
                </button>
              )}
            </div>

            {formData.items.map((item, idx) => (
              <div
                key={idx}
                className="relative bg-white dark:bg-slate-900 p-3 rounded-md shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-3 animate-in slide-in-from-left-2 duration-300"
              >
                <div className="flex gap-3 items-start w-full">
                  {/* INPUT DE DESCRIPCIÓN */}
                  {formData.items.length > 1 && (
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Descripción del concepto..."
                        className="w-full text-sm border-b border-slate-200 dark:border-slate-700 focus:border-green-500 dark:focus:border-green-400 outline-none pb-1 bg-transparent dark:text-white placeholder:text-slate-400"
                        value={item.descripcion}
                        onChange={(e) =>
                          updateItem(idx, "descripcion", e.target.value)
                        }
                      />
                    </div>
                  )}

                  {/* INPUT DE MONTO */}
                  <div
                    className={`relative ${
                      formData.items.length === 1 ? "flex-1" : "w-32"
                    }`}
                  >
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 text-right text-xl font-bold text-slate-700 dark:text-white bg-slate-50 dark:bg-slate-800/50 rounded-md outline-none focus:ring-2 focus:ring-green-500/20 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                      value={item.monto === 0 ? "" : item.monto}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateItem(
                          idx,
                          "monto",
                          val === "" ? 0 : parseFloat(val)
                        );
                      }}
                    />
                  </div>

                  {/* BOTÓN BORRAR */}
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 border dark:border-slate-600 shadow-sm rounded-full p-2 transition-colors self-center"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* SELECTOR DE CATEGORÍA */}
                <div className="w-full flex items-center gap-2 px-1">
                  <TagIcon className="h-3 w-3 text-slate-400" />

                  <CategorySelector
                    className="flex-1"
                    value={item.category_id || null}
                    onSelect={(id) => updateItem(idx, "category_id", id)}
                    categories={categories}
                    setCategories={setCategories}
                    fetchUrl="/categories/?status=all"
                    allowReactivatePrompt={true}
                    placeholder="Buscar..."
                  />
                </div>
              </div>
            ))}

            {formData.items.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addItemRow}
                className="w-full text-slate-500 dark:text-slate-400 border-dashed border border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-800 hover:text-green-600"
              >
                <PlusIcon className="h-4 w-4 mr-2" /> Agregar otro concepto
              </Button>
            )}

            {/* TOTAL */}
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Total Estimado
              </span>
              <span className="text-xl font-bold text-green-700 dark:text-green-400">
                $
                {calculateTotal().toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsFormOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white px-8"
            >
              {isSubmitting ? "Guardando..." : "Guardar Ingreso"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL ELIMINAR */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <TrashIcon className="h-5 w-5" />
            </div>
            <span>Confirmar Eliminación</span>
          </div>
        }
        className="max-w-md border-l-4 border-l-red-500"
      >
        <div className="space-y-4 pt-2">
          <div className="text-sm text-muted-foreground">
            {MODAL_REGISTRY.DELETE_INGRESO_HELP.content({
              descripcion: currentIngreso?.descripcion,
            })}
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-border/50">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? "Eliminando..." : "Sí, eliminar"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal genérico de ayuda */}
      <GenericModal />
    </div>
  );
}
