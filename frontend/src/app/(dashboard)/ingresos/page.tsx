//frontend\src\app\(dashboard)\ingresos\page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { DataTable, ColumnDef } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { AsyncSearchSelect, AsyncOption } from "@/components/ui/AsyncSearchSelect";
import { 
  BanknotesIcon, 
  PlusIcon, 
  TrashIcon, 
  PencilSquareIcon, 
  BriefcaseIcon, 
  XMarkIcon,
  TagIcon,
  ExclamationTriangleIcon 
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

// --- TIPOS ---

interface Category {
  id: string;
  name: string;
}

interface IngresoItem {
  id?: string;
  // ✅ CORRECCIÓN: Permitimos null explícitamente en el tipo
  category_id: string | null;
  descripcion: string;
  monto: number;
  new_category_name?: string; 
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
  category_id: "", // Se mantiene string vacío para el input, se limpia al enviar
  descripcion: "",
  monto: 0,
  new_category_name: ""
};

const initialForm: IngresoFormData = {
  fecha: new Date().toISOString().split('T')[0],
  descripcion: "",
  fuente: "",
  items: [{ ...initialItem }]
};

// ID ficticio usado por el componente AsyncSearchSelect
const NEW_CATEGORY_OPTION_ID = "NEW_CATEGORY_OPTION";

export default function IngresosPage() {
  const { token } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Estados
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados UI
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCategoryConfirmOpen, setIsCategoryConfirmOpen] = useState(false);
  
  const [currentIngreso, setCurrentIngreso] = useState<Ingreso | null>(null);
  const [formData, setFormData] = useState<IngresoFormData>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- CARGA DE DATOS ---
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resIngresos, resCats] = await Promise.all([
        api.get<Ingreso[]>("/incomes/"), 
        api.get<Category[]>("/categories/")
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
  }, [token]);

  const action = searchParams.get("action");

  useEffect(() => {
    if (action === "new" && !isFormOpen) {
      handleOpenCreate();
      router.replace("/ingresos", { scroll: false });
    }
  }, [action]);

  // --- HANDLERS ---

  const handleOpenCreate = () => {
    setCurrentIngreso(null);
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      descripcion: "",
      fuente: "",
      items: [{ ...initialItem }] 
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (ingreso: Ingreso) => {
    setCurrentIngreso(ingreso);
    setFormData({
      fecha: ingreso.fecha.split('T')[0],
      descripcion: ingreso.descripcion,
      fuente: ingreso.fuente || "",
      items: ingreso.items.map(i => ({
        id: i.id,
        category_id: i.category_id,
        descripcion: i.descripcion,
        monto: i.monto,
        new_category_name: ""
      }))
    });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (ingreso: Ingreso) => {
    setCurrentIngreso(ingreso);
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
  };

  const updateItem = (index: number, field: keyof IngresoItem, value: any) => {
    const newItems = [...formData.items];

    // Si cambiamos la categoría (y no es la opción de "crear nueva"), limpiamos el nombre temporal
    if (field === "category_id" && value !== NEW_CATEGORY_OPTION_ID) {
        newItems[index].new_category_name = "";
    }

    // @ts-ignore
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const calculateTotal = () => {
    return formData.items.reduce((acc, item) => acc + (item.monto || 0), 0);
  };

  // --- SUBMIT E INTERCEPCIÓN ---

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.descripcion) {
        toast.warning("La descripción general es obligatoria.");
        return;
    }
    
    const hasNewCategories = formData.items.some(
        item => item.category_id === NEW_CATEGORY_OPTION_ID && item.new_category_name?.trim()
    );

    if (hasNewCategories) {
        setIsCategoryConfirmOpen(true);
    } else {
        processFinalSubmit();
    }
  };

  // 2. Proceso real de guardado
  const processFinalSubmit = async () => {
    setIsSubmitting(true);
    setIsCategoryConfirmOpen(false);

    try {
        // A. Crear categorías
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
                setCategories(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
            } catch (err) {
                console.error(`Error creando categoría ${catName}`, err);
                toast.error(`Error al crear categoría "${catName}".`);
                setIsSubmitting(false);
                return;
            }
        }

        // B. Reemplazar IDs y LIMPIAR DATOS
        const itemsProcessed = itemsToProcess.map(item => {
            let updatedItem = { ...item };
            
            // Si hay solo 1 item y no tiene descripción, usa la general
            if (itemsToProcess.length === 1 && !updatedItem.descripcion.trim()) {
                updatedItem.descripcion = formData.descripcion;
            }

            if (updatedItem.category_id === NEW_CATEGORY_OPTION_ID && updatedItem.new_category_name) {
                const realId = newCategoriesMap.get(updatedItem.new_category_name.trim());
                if (realId) {
                    updatedItem.category_id = realId;
                    updatedItem.new_category_name = undefined;
                }
            }

            // ✅ CORRECCIÓN CRÍTICA: Convertir cadena vacía a NULL
            // Pydantic lanzará 422 si recibe "" en un campo UUID, debe ser null.
            if (updatedItem.category_id === "") {
                updatedItem.category_id = null;
            }

            return updatedItem;
        });

        if (itemsProcessed.some(i => !i.descripcion.trim())) {
            toast.warning("Describe cada concepto.");
            setIsSubmitting(false);
            return;
        }
        if (itemsProcessed.some(i => i.monto <= 0)) {
            toast.warning("El monto debe ser mayor a 0.");
            setIsSubmitting(false);
            return;
        }
        // Nota: ya no verificamos category_id === NEW... porque ya se debieron procesar arriba

        // C. Guardar
        const payload = {
            ...formData,
            items: itemsProcessed,
            fecha: new Date(formData.fecha).toISOString(),
            // Enviamos null si la fuente está vacía
            fuente: formData.fuente.trim() === "" ? null : formData.fuente
        };

        if (currentIngreso) {
            await api.put(`/incomes/${currentIngreso.id}`, payload);
            toast.success("Ingreso actualizado");
        } else {
            await api.post("/incomes/", payload);
            toast.success("Ingreso y categorías registrados");
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
      cell: (row) => new Date(row.fecha).toLocaleDateString()
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
      )
    },
    {
      header: "Total",
      accessorKey: "monto_total",
      className: "font-bold text-right text-green-600",
      cell: (row) => `$${row.monto_total.toLocaleString("es-MX", {minimumFractionDigits: 2})}`
    },
    {
      header: "Acciones",
      className: "text-right w-32",
      cell: (row) => (
        <div className="flex justify-end gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); handleOpenEdit(row); }}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleOpenDelete(row); }}
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
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-green-700">
            <BanknotesIcon className="h-6 w-6" /> Mis Ingresos
          </h1>
          <p className="text-muted-foreground text-sm">Administra tus entradas de dinero.</p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
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
                   <span className="text-sm text-muted-foreground">{new Date(ing.fecha).toLocaleDateString()}</span>
                </div>
                {ing.fuente && <p className="text-sm text-muted-foreground">Fuente: {ing.fuente}</p>}
                <div className="space-y-2 mt-2">
                  {ing.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm p-2 bg-green-50/50 rounded border border-green-100">
                      <span className="font-medium">{item.descripcion}</span>
                      <span className="font-mono font-semibold text-green-700">
                        ${item.monto.toLocaleString("es-MX", {minimumFractionDigits: 2})}
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
        title={currentIngreso ? "Editar Ingreso" : "Nuevo Ingreso"}
        className="max-w-xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-5">
          
          {/* DATOS GENERALES */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1 space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Fecha</label>
              <input 
                type="date" 
                required
                className="w-full p-2 rounded-md border border-input bg-background focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                value={formData.fecha}
                onChange={(e) => setFormData({...formData, fecha: e.target.value})}
              />
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Fuente (Opcional)</label>
              <input 
                type="text" 
                placeholder="Ej: Cliente, Banco..."
                className="w-full p-2 rounded-md border border-input bg-background focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                value={formData.fuente}
                onChange={(e) => setFormData({...formData, fuente: e.target.value})}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Descripción General</label>
              <input 
                type="text" 
                required
                autoFocus
                placeholder="Ej: Pago de Proyecto Web"
                className="w-full p-2 rounded-md border border-input bg-background focus:ring-2 focus:ring-green-500/20 outline-none transition-all font-medium"
                value={formData.descripcion}
                onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              />
            </div>
          </div>

          {/* ÁREA DE CONCEPTOS */}
          <div className="space-y-3 bg-slate-50 dark:bg-white/5 p-4 rounded-lg border border-slate-100 dark:border-white/10">
            
            <div className="flex justify-between items-end mb-2">
              <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                {formData.items.length > 1 ? "Desglose de Conceptos" : "Monto y Categoría"}
              </label>
              {formData.items.length === 1 && (
                 <button type="button" onClick={addItemRow} className="text-xs text-green-600 dark:text-green-400 font-medium hover:underline flex items-center gap-1">
                    <PlusIcon className="h-3 w-3" /> Desglosar en varios conceptos
                 </button>
              )}
            </div>

            {formData.items.map((item, idx) => (
              <div key={idx} className="relative bg-white dark:bg-slate-900 p-3 rounded-md shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-3 animate-in slide-in-from-left-2 duration-300">
                
                <div className="flex gap-3 items-start w-full">
                    {/* INPUT DE DESCRIPCIÓN (Solo si hay > 1 item) */}
                    {formData.items.length > 1 && (
                        <div className="flex-1">
                            <input 
                            type="text" 
                            placeholder="Descripción del concepto..."
                            className="w-full text-sm border-b border-slate-200 dark:border-slate-700 focus:border-green-500 dark:focus:border-green-400 outline-none pb-1 bg-transparent dark:text-white placeholder:text-slate-400"
                            value={item.descripcion}
                            onChange={(e) => updateItem(idx, "descripcion", e.target.value)}
                            />
                        </div>
                    )}

                    {/* INPUT DE MONTO */}
                    <div className={`relative ${formData.items.length === 1 ? "flex-1" : "w-32"}`}>
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">$</span>
                        <input 
                            type="number" min="0" step="0.01"
                            placeholder="0.00"
                            className="w-full pl-8 pr-3 py-2 text-right text-xl font-bold text-slate-700 dark:text-white bg-slate-50 dark:bg-slate-800/50 rounded-md outline-none focus:ring-2 focus:ring-green-500/20 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                            value={item.monto === 0 ? "" : item.monto}
                            onChange={(e) => {
                                const val = e.target.value;
                                updateItem(idx, "monto", val === "" ? 0 : parseFloat(val));
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
                    
                    <AsyncSearchSelect
                        className="flex-1"
                        value={item.category_id || null}
                        onChange={(newVal) => updateItem(idx, "category_id", newVal)}
                        
                        fetchUrl="/categories/"
                        queryParam="search"
                        placeholder="Categoría (o crea una nueva...)"
                        
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
                </div>

              </div>
            ))}

            {formData.items.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={addItemRow} className="w-full text-slate-500 dark:text-slate-400 border-dashed border border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-800 hover:text-green-600">
                <PlusIcon className="h-4 w-4 mr-2" /> Agregar otro concepto
              </Button>
            )}

            {/* TOTAL */}
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-200 dark:border-slate-700">
               <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Estimado</span>
               <span className="text-xl font-bold text-green-700 dark:text-green-400">
                  ${calculateTotal().toLocaleString("es-MX", {minimumFractionDigits: 2})}
               </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white px-8">
              {isSubmitting ? "Guardando..." : "Guardar Ingreso"}
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

      {/* MODAL ELIMINAR */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirmar Eliminación" className="max-w-md">
        <div className="space-y-4">
           <p className="text-slate-600">¿Eliminar ingreso de <strong>{currentIngreso?.descripcion}</strong>?</p>
           <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>No, cancelar</Button>
              <Button variant="destructive" onClick={handleDelete}>Sí, eliminar</Button>
           </div>
        </div>
      </Modal>

    </div>
  );
}
