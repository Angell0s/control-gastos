//frontend\src\app\(dashboard)\categorias\admin\page.tsx
// frontend\src\app\(dashboard)\categorias\admin\page.tsx
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { DataTable, ColumnDef } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AsyncSearchSelect, AsyncOption } from "@/components/ui/AsyncSearchSelect";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent } from "@/components/ui/Card";
import { 
  TagIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  PlusIcon, 
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ArchiveBoxXMarkIcon,
  QuestionMarkCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  GlobeAmericasIcon,
  LockClosedIcon,
  InformationCircleIcon,
  UsersIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import clsx from "clsx";

// --- TIPOS ---
interface Category {
  id: string;
  name: string;
  is_active: boolean;
  expenses_count: number;
  incomes_count: number;
  total_items_count: number;
  user_id?: string | null; 
}

// Extensión para la vista agrupada
interface GroupedCategory extends Category {
  is_grouped?: boolean;     // Indica si es una fila virtual agrupada
  user_count?: number;      // Cuántos usuarios tienen esta categoría privada
  original_ids?: string[];  // IDs reales que conforman este grupo
}

interface CategoryFormData {
  name: string;
  is_active?: boolean;
  is_global: boolean; 
}

type TabView = "active" | "inactive";

const initialFormData: CategoryFormData = { name: "", is_global: false };

export default function AdminCategoriasPage() {
  const { token, user } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();
  
  // Estados de datos
  const [rawCategories, setRawCategories] = useState<Category[]>([]);
  const [displayedCategories, setDisplayedCategories] = useState<GroupedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de Vista
  const [isAdminView, setIsAdminView] = useState(false);
  const [currentTab, setCurrentTab] = useState<TabView>("active");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Estados de Modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isHardDelete, setIsHardDelete] = useState(false); 
  
  const [isMergeConfirmOpen, setIsMergeConfirmOpen] = useState(false);
  const [mergeStats, setMergeStats] = useState<{ count: number, expenses: number, incomes: number } | null>(null);

  const [targetCategoryId, setTargetCategoryId] = useState<string | null>(null);
  const [targetCategoryName, setTargetCategoryName] = useState<string>("");
  const [isCreateTargetConfirmOpen, setIsCreateTargetConfirmOpen] = useState(false);
  const [newTargetNameCandidate, setNewTargetNameCandidate] = useState("");

  const [currentCategory, setCurrentCategory] = useState<GroupedCategory | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- LOGICA DE AGRUPACIÓN (FRONTEND ONLY) ---
  const processCategories = useCallback((data: Category[], isSuperView: boolean) => {
      if (!isSuperView) return data; 

      const groupedMap = new Map<string, GroupedCategory>();

      // 1. Identificar Globales
      data.forEach(cat => {
          if (cat.user_id === null) {
              const key = `global::${cat.name.toLowerCase().trim()}`;
              groupedMap.set(key, { ...cat, is_grouped: false });
          }
      });

      // 2. Procesar Privadas
      data.forEach(cat => {
          if (cat.user_id !== null) {
              const normalizedName = cat.name.toLowerCase().trim();
              const key = `private::${normalizedName}`;
              
              if (groupedMap.has(key)) {
                  const existing = groupedMap.get(key)!;
                  existing.expenses_count += cat.expenses_count;
                  existing.incomes_count += cat.incomes_count;
                  existing.total_items_count += cat.total_items_count;
                  existing.user_count = (existing.user_count || 0) + 1;
                  existing.original_ids?.push(cat.id);
                  if (cat.is_active) existing.is_active = true; 
              } else {
                  groupedMap.set(key, {
                      ...cat,
                      id: `group::${normalizedName}`, // ID virtual
                      is_grouped: true,
                      user_count: 1,
                      original_ids: [cat.id]
                  });
              }
          }
      });

      return Array.from(groupedMap.values()).sort((a, b) => {
          const aGlobal = a.user_id === null;
          const bGlobal = b.user_id === null;
          if (aGlobal && !bGlobal) return -1;
          if (!aGlobal && bGlobal) return 1;
          return a.name.localeCompare(b.name);
      });
  }, []);


  // --- CARGA DE DATOS ---
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint = (isAdminView && user?.is_superuser) 
        ? "/categories/admin/all" 
        : "/categories/";

      const res = await api.get<Category[]>(endpoint, {
        params: { status: currentTab }
      });

      setRawCategories(res.data);
      const processed = processCategories(res.data, isAdminView && !!user?.is_superuser);
      setDisplayedCategories(processed);
      setSelectedIds(new Set());
    } catch (err: any) {
      console.error(err);
      toast.error("Error al cargar categorías");
    } finally {
      setLoading(false);
    }
  }, [currentTab, isAdminView, token, toast, user?.is_superuser, processCategories]);

  useEffect(() => {
    if (token) fetchCategories();
  }, [fetchCategories, token]);

  // --- HELPERS PARA SELECCIÓN MULTIPLE ---
  // Obtiene todos los IDs reales visibles actualmente (desagrupando los grupos)
  const getAllIdsInView = useMemo(() => {
    const ids: string[] = [];
    displayedCategories.forEach(cat => {
        if (cat.is_grouped && cat.original_ids) {
            ids.push(...cat.original_ids);
        } else {
            ids.push(cat.id);
        }
    });
    return ids;
  }, [displayedCategories]);

  // --- HANDLERS ACCIONES ---

  // 1. Soft Delete (Desactivar) - Solo 1 a 1
  const handleSoftDeleteRequest = (cat: GroupedCategory) => {
    setCurrentCategory(cat);
    setIsHardDelete(false);
    setTargetCategoryId(null);
    setIsDeleteOpen(true);
  };

  // 2. Hard Delete (Físico) - Botón "Borrar Seleccionados"
  const handleBulkHardDeleteRequest = () => {
    if (selectedIds.size === 0) return;
    setIsHardDelete(true);
    setTargetCategoryId(null);
    setIsDeleteOpen(true);
  };

  // 3. Hard Delete Individual (Desde la fila)
  const handleIndividualHardDelete = (cat: GroupedCategory) => {
      // Si es grupo, seleccionamos todos sus IDs ocultos. Si es single, su ID.
      const idsToDelete = cat.is_grouped && cat.original_ids ? cat.original_ids : [cat.id];
      
      // Sobreescribimos la selección actual para enfocarnos en este item(s)
      setSelectedIds(new Set(idsToDelete));
      
      setIsHardDelete(true);
      setTargetCategoryId(null);
      setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsSubmitting(true);
    try {
        const queryParams = targetCategoryId ? { target_category_id: targetCategoryId } : {};
        
        // Bloqueo de soft delete a grupos
        if (currentCategory?.is_grouped && !isHardDelete) {
            toast.warning("Por seguridad, debes eliminar categorías agrupadas individualmente o usando la Fusión Global.");
            setIsDeleteOpen(false); setIsSubmitting(false); return; 
        }

        if (isHardDelete) {
            // Eliminar selección (puede ser 1 o muchos)
            const ids = Array.from(selectedIds);
            await api.post("/categories/admin/bulk-delete", ids, { params: queryParams });
            toast.success({ title: "Eliminación Completa", description: `Se eliminaron ${ids.length} categorías permanentemente.` });
        } else {
            // Soft delete
            if (!currentCategory) return;
            await api.delete(`/categories/${currentCategory.id}`, { params: queryParams });
            toast.success({ title: "Categoría Desactivada", description: "Movida a papelera." });
        }
        setIsDeleteOpen(false);
        fetchCategories();
    } catch (error: any) {
        toast.error("No se pudo eliminar");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleRestore = async (cat: GroupedCategory) => {
    if (cat.is_grouped) {
         // Restaurar grupo implica iterar o tener endpoint bulk restore (no implementado aquí)
         toast.info("Restaura categorías individuales o selecciona 'Vista Personal' para verlas una por una.");
         return;
    }
    try {
        await api.put(`/categories/${cat.id}`, { name: cat.name, is_active: true });
        toast.success("Categoría restaurada");
        fetchCategories();
    } catch (error) { toast.error("Error al restaurar"); }
  };

  // --- HANDLER FORMULARIOS ---
  const handlePreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.warning("Nombre requerido"); return; }
    if (currentCategory?.is_grouped) { toast.info("No puedes editar grupos. Fusiónalos primero."); return; }
    
    if (currentCategory) { await executeSubmit(); return; }
    
    if (user?.is_superuser && formData.is_global) { await checkGlobalMergeRequirements(); } 
    else { await executeSubmit(); }
  };

  const checkGlobalMergeRequirements = async () => {
      setIsSubmitting(true);
      try {
          const matches = rawCategories.filter(c => 
              c.name.toLowerCase() === formData.name.trim().toLowerCase() && 
              c.user_id !== null && c.is_active
          );
          if (matches.length > 0) {
              const totalExp = matches.reduce((acc, c) => acc + c.expenses_count, 0);
              const totalInc = matches.reduce((acc, c) => acc + c.incomes_count, 0);
              setMergeStats({ count: matches.length, expenses: totalExp, incomes: totalInc });
              setIsMergeConfirmOpen(true);
          } else { await executeSubmit(); }
      } catch (error) { toast.error("Error verificando duplicados"); } 
      finally { setIsSubmitting(false); }
  };

  const executeSubmit = async (isGlobalMerge = false) => {
    setIsSubmitting(true);
    try {
      if (currentCategory) {
        await api.put(`/categories/${currentCategory.id}`, { name: formData.name, is_active: formData.is_active });
        toast.success("Categoría actualizada");
      } else {
        if (isGlobalMerge) {
            const res = await api.post("/categories/admin/create-global-merge", { name: formData.name });
            toast.success({ title: "Fusión Exitosa", description: `Migrados ${res.data.moved_expenses} gastos.` });
        } else {
            const payload = { name: formData.name, ...(user?.is_superuser ? { is_global: formData.is_global } : {}) };
            await api.post("/categories/", payload);
            toast.success("Categoría creada");
        }
      }
      setIsFormOpen(false); setIsMergeConfirmOpen(false); fetchCategories();
    } catch (error: any) {
      if (error.response?.status === 409) toast.warning({ title: "Duplicado", description: error.response?.data?.detail });
      else toast.error("Error al guardar");
    } finally { setIsSubmitting(false); }
  };

  // --- HELPERS SELECT TARGET ---
  const fetchTargetOptions = async (query: string): Promise<AsyncOption[]> => {
    try {
        const endpoint = (isAdminView && user?.is_superuser) ? "/categories/admin/all" : "/categories/";
        const res = await api.get<Category[]>(endpoint, { params: { status: "active", search: query } });
        return res.data.filter(c => c.id !== currentCategory?.id).map(c => ({ value: c.id, label: c.name, raw: c }));
    } catch (error) { return []; }
  };

  const handleCreateOptionRequest = (label: string) => { setNewTargetNameCandidate(label); setIsCreateTargetConfirmOpen(true); return null; };
  const confirmCreateTargetCategory = async () => {
      try {
          const res = await api.post<Category>("/categories/", { name: newTargetNameCandidate });
          toast.success("Categoría creada");
          setTargetCategoryId(res.data.id); setTargetCategoryName(res.data.name); setIsCreateTargetConfirmOpen(false);
          return { value: res.data.id, label: res.data.name, raw: res.data };
      } catch (error) { toast.error("Error al crear"); setIsCreateTargetConfirmOpen(false); return null; }
  };

  // --- MODALS OPENERS ---
  const handleOpenCreate = () => { setCurrentCategory(null); setFormData({ ...initialFormData, is_global: false }); setIsFormOpen(true); };
  const handleOpenEdit = (cat: GroupedCategory) => {
    if (cat.is_grouped) { toast.info("Edita categorías individuales."); return; }
    setCurrentCategory(cat); setFormData({ name: cat.name, is_active: cat.is_active, is_global: cat.user_id === null }); setIsFormOpen(true);
  };

  // --- COLUMNAS ---
  const columns: ColumnDef<GroupedCategory>[] = useMemo(() => [
    ...(isAdminView && user?.is_superuser ? [{
        header: "Select",
        id: "select",
        cell: (cat: GroupedCategory) => {
            // Determinamos si esta fila está seleccionada
            // - Si es simple: cat.id está en el set?
            // - Si es grupo: ¿Están todos sus original_ids en el set?
            const isSelected = cat.is_grouped 
                ? cat.original_ids?.every(id => selectedIds.has(id))
                : selectedIds.has(cat.id);

            return (
                <div className="flex justify-center w-8">
                    <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-primary border-gray-300 focus:ring-primary cursor-pointer" 
                        checked={isSelected || false} 
                        onChange={(e) => { 
                            e.stopPropagation(); 
                            const newSet = new Set(selectedIds);
                            const idsToToggle = cat.is_grouped ? (cat.original_ids || []) : [cat.id];
                            
                            if (isSelected) {
                                idsToToggle.forEach(id => newSet.delete(id));
                            } else {
                                idsToToggle.forEach(id => newSet.add(id));
                            }
                            setSelectedIds(newSet); 
                        }} 
                    />
                </div>
            );
        },
        headerComponent: () => {
            const allIds = getAllIdsInView;
            const isAllSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
            
            return (
                <div className="flex justify-center w-8">
                    <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-primary border-gray-300 focus:ring-primary cursor-pointer" 
                        checked={isAllSelected} 
                        onChange={() => {
                            if (isAllSelected) {
                                setSelectedIds(new Set());
                            } else {
                                setSelectedIds(new Set(allIds));
                            }
                        }} 
                    />
                </div>
            );
        }
    }] : []),
    {
      header: "Categoría",
      accessorKey: "name",
      cell: (cat) => (
        <div className="flex flex-col gap-2 py-1">
          <div className={clsx("flex items-center gap-2 font-medium", !cat.is_active && "text-muted-foreground line-through decoration-red-500/50")}>
            <div className={clsx("p-1.5 rounded", cat.is_active ? "bg-primary/10 text-primary" : "bg-red-100 text-red-500")}>
              {cat.is_active ? <TagIcon className="h-4 w-4" /> : <ArchiveBoxXMarkIcon className="h-4 w-4" />}
            </div>
            {cat.name}
            {user?.is_superuser && (
                <div className="flex gap-1 ml-2">
                    {cat.user_id === null ? (
                         <span className="text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 bg-purple-50 text-purple-700 border-purple-200"><GlobeAmericasIcon className="h-3 w-3" /> Global</span>
                    ) : cat.is_grouped ? (
                         // Badge de Grupo (visible también en papelera si hay coincidencias)
                         <span className="text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 bg-indigo-50 text-indigo-700 border-indigo-200" title="Agrupación de categorías"><UsersIcon className="h-3 w-3" /> {cat.user_count} Usuarios</span>
                    ) : (
                         <span className="text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 bg-slate-50 text-slate-600 border-slate-200"><LockClosedIcon className="h-3 w-3" /> Privada</span>
                    )}
                </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 ml-8">
             {/* Contadores (se muestran siempre si > 0) */}
             {cat.expenses_count > 0 && <div className="flex items-center gap-1 px-2 py-0.5 rounded text-xs border bg-orange-50 text-orange-700 border-orange-200"><ArrowTrendingDownIcon className="h-3 w-3" />{cat.expenses_count}</div>}
             {cat.incomes_count > 0 && <div className="flex items-center gap-1 px-2 py-0.5 rounded text-xs border bg-green-50 text-green-700 border-green-200"><ArrowTrendingUpIcon className="h-3 w-3" />{cat.incomes_count}</div>}
          </div>
        </div>
      )
    },
    {
      header: "Acciones",
      className: "text-right w-36",
      cell: (cat) => (
          <div className="flex justify-end gap-2">
            {!cat.is_grouped && currentTab === "active" && (
                <>
                    <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(cat); }} className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors" title="Editar"><PencilSquareIcon className="h-4 w-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleSoftDeleteRequest(cat); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Desactivar"><TrashIcon className="h-4 w-4" /></button>
                </>
            )}
            {/* Botones de Papelera */}
            {currentTab === "inactive" && (
                <>
                    {!cat.is_grouped && (
                        <button onClick={(e) => { e.stopPropagation(); handleRestore(cat); }} className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors" title="Restaurar"><ArrowPathIcon className="h-4 w-4" /></button>
                    )}
                    {/* Botón Borrado Físico Definitivo (Para grupos o individuales) */}
                    {(user?.is_superuser || !cat.is_grouped) && (
                         <button onClick={(e) => { e.stopPropagation(); handleIndividualHardDelete(cat); }} className="p-1.5 rounded-md text-red-700 hover:bg-red-100 border border-transparent hover:border-red-200 transition-colors" title="Borrar Definitivamente">
                             <XMarkIcon className="h-4 w-4" />
                         </button>
                    )}
                </>
            )}
            {/* Botón Fusión (Solo activos y grupos) */}
            {cat.is_grouped && currentTab === "active" && (
                <button onClick={() => { setFormData({ name: cat.name, is_active: true, is_global: true }); checkGlobalMergeRequirements(); }} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors text-xs flex items-center gap-1" title="Fusionar en Global">
                    <GlobeAmericasIcon className="h-4 w-4" /> Fusionar
                </button>
            )}
          </div>
        )
    }
  ], [displayedCategories, selectedIds, currentTab, isAdminView, user, getAllIdsInView]); 


  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="space-y-1 w-full lg:w-auto">
          <button onClick={() => router.push("/categorias")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-2"><ArrowLeftIcon className="h-3 w-3" /> Volver a Galería</button>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">Administrar Categorías</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {user?.is_superuser && (
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary/20 rounded-lg border border-border cursor-pointer select-none hover:bg-secondary/30 transition-colors" onClick={() => setIsAdminView(!isAdminView)}>
              <div className={clsx("w-8 h-4 rounded-full relative transition-colors", isAdminView ? "bg-primary" : "bg-gray-300 dark:bg-gray-600")}><div className={clsx("w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform", isAdminView ? "left-4.5 translate-x-4" : "left-0.5 translate-x-0")} /></div>
              <span className="text-xs font-medium flex items-center gap-1.5">{isAdminView ? "Vista Global" : "Vista Personal"}</span>
            </div>
          )}
          <Button onClick={handleOpenCreate} className="gap-2 shadow-sm"><PlusIcon className="h-4 w-4" /> Nueva</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border bg-muted/40 px-4 pt-2 flex justify-between items-center">
            <div className="flex gap-1">
                <button onClick={() => setCurrentTab("active")} className={clsx("px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2", currentTab === "active" ? "border-primary text-primary bg-background rounded-t-md" : "border-transparent text-muted-foreground")}>Activas</button>
                <button onClick={() => setCurrentTab("inactive")} className={clsx("px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2", currentTab === "inactive" ? "border-red-500 text-red-600 bg-red-50/50 dark:bg-red-900/10 rounded-t-md" : "border-transparent text-muted-foreground")}><TrashIcon className="h-4 w-4" /> Papelera</button>
            </div>
            {currentTab === "inactive" && isAdminView && selectedIds.size > 0 && (
                <div className="pb-2 animate-in fade-in"><Button variant="destructive" size="sm" onClick={handleBulkHardDeleteRequest} className="gap-2"><TrashIcon className="h-4 w-4" /> Eliminar ({selectedIds.size})</Button></div>
            )}
        </div>
        <CardContent className="p-0">
          <DataTable columns={columns} data={displayedCategories} isLoading={loading} emptyMessage={currentTab === "active" ? "No hay categorías activas." : "La papelera está vacía."} />
        </CardContent>
      </Card>

      {/* --- MODALES --- */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={currentCategory ? "Editar Categoría" : "Nueva Categoría"} className="max-w-md">
        <form onSubmit={handlePreSubmit} className="space-y-4 pt-2">
          <div className="space-y-2"><label className="text-sm font-medium">Nombre</label><Input type="text" autoFocus placeholder="Ej: Alimentos" icon={<TagIcon className="h-4 w-4" />} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
          {user?.is_superuser && !currentCategory && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/10">
                  <div className="flex items-center gap-2"><GlobeAmericasIcon className="h-5 w-5 text-purple-500" /><div className="flex flex-col"><span className="text-sm font-medium">Categoría Global</span><span className="text-xs text-muted-foreground">Visible para todos</span></div></div>
                  <div className={clsx("w-10 h-5 rounded-full relative cursor-pointer transition-colors", formData.is_global ? "bg-purple-600" : "bg-gray-300 dark:bg-gray-600")} onClick={() => setFormData({ ...formData, is_global: !formData.is_global })}><div className={clsx("w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform", formData.is_global ? "left-5.5 translate-x-0" : "left-0.5 translate-x-0")} /></div>
              </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6"><Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Guardando..." : "Guardar"}</Button></div>
        </form>
      </Modal>

      <Modal isOpen={isMergeConfirmOpen} onClose={() => setIsMergeConfirmOpen(false)} title="Fusionar Categorías" className="max-w-md">
          <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-4 rounded-lg flex items-start gap-3 border border-blue-200 dark:border-blue-800"><InformationCircleIcon className="h-6 w-6 flex-shrink-0" /><div className="text-sm"><p className="font-bold mb-1">Se detectaron coincidencias</p><p>Existen <strong>{mergeStats?.count} categorías</strong> privadas llamadas <em>"{formData.name}"</em>.</p></div></div>
              <div className="grid grid-cols-2 gap-3 text-center"><div className="p-3 bg-muted rounded-lg border border-border"><span className="block text-2xl font-bold">{mergeStats?.expenses}</span><span className="text-xs text-muted-foreground font-bold">GASTOS</span></div><div className="p-3 bg-muted rounded-lg border border-border"><span className="block text-2xl font-bold">{mergeStats?.incomes}</span><span className="text-xs text-muted-foreground font-bold">INGRESOS</span></div></div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border"><Button variant="outline" onClick={() => setIsMergeConfirmOpen(false)}>Cancelar</Button><Button onClick={() => executeSubmit(true)} disabled={isSubmitting}>Confirmar Fusión</Button></div>
          </div>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title={isHardDelete ? "Eliminar Definitivamente" : "Desactivar Categoría"} className="max-w-md overflow-visible">
        <div className="space-y-6">
          <div className={clsx("p-4 rounded-lg border flex items-start gap-3", isHardDelete ? "bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200 border-red-200" : "bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 border-amber-200")}><ExclamationTriangleIcon className="h-6 w-6 flex-shrink-0" /><div><h4 className="font-bold">{isHardDelete ? "¡Acción Irreversible!" : "Confirmar Desactivación"}</h4><p className="text-sm mt-1 leading-relaxed">{isHardDelete ? `Eliminarás ${selectedIds.size} categorías permanentemente.` : `Desactivarás '${currentCategory?.name}'.`}</p></div></div>
          <div className="space-y-3"><label className="text-sm font-medium flex items-center gap-2"><ArrowPathIcon className="h-4 w-4 text-blue-500" /> ¿Dónde mover los items existentes?</label><AsyncSearchSelect value={targetCategoryId} onChange={(val, opt) => { setTargetCategoryId(val); setTargetCategoryName(opt?.label || ""); }} fetchOptions={fetchTargetOptions} placeholder="Buscar o crear categoría..." creatable={true} onCreateOption={handleCreateOptionRequest} /></div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border"><Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={handleConfirmDelete} disabled={isSubmitting}>{isHardDelete ? "Eliminar" : "Confirmar"}</Button></div>
        </div>
      </Modal>

      <Modal isOpen={isCreateTargetConfirmOpen} onClose={() => setIsCreateTargetConfirmOpen(false)} title="Crear nueva categoría" className="max-w-sm">
         <div className="space-y-4"><div className="flex items-center gap-3 text-primary"><QuestionMarkCircleIcon className="h-8 w-8" /><p className="text-sm">Crear <strong>"{newTargetNameCandidate}"</strong> y mover items ahí. <br/>¿Correcto?</p></div><div className="flex justify-end gap-2 pt-2"><Button variant="ghost" onClick={() => setIsCreateTargetConfirmOpen(false)}>No</Button><Button onClick={confirmCreateTargetCategory}>Sí, crear</Button></div></div>
      </Modal>
    </div>
  );
}
