"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { DataTable, ColumnDef } from "@/components/DataTable";
import { cn } from "@/lib/utils";
import { 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  IdentificationIcon, 
  ShieldCheckIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  KeyIcon
} from "@heroicons/react/24/outline";
import AdminGuard from "@/components/AdminGuard";
import api from '@/lib/api';
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

// --- TIPOS ---

interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_active: boolean;
  is_superuser: boolean;
}

// Tipo para el formulario (Create/Update)
interface UserFormData {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  password?: string; // Solo para crear o cambiar pass
  is_active: boolean;
  is_superuser: boolean;
}

const initialFormData: UserFormData = {
  email: "",
  first_name: "",
  last_name: "",
  phone: "",
  password: "",
  is_active: true,
  is_superuser: false,
};

export default function UsuariosPage() {
  const { token } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para Modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Usuario siendo editado/borrado
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- CARGA DE DATOS ---
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get<User[]>("/users/");
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Error cargando usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchUsers();
  }, [token]);

  // --- HANDLERS ---

  const handleOpenCreate = () => {
    setCurrentUser(null);
    setFormData(initialFormData);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setCurrentUser(user);
    setFormData({
      email: user.email,
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      phone: user.phone || "",
      password: "", // No traemos el pass, solo si se quiere cambiar
      is_active: user.is_active,
      is_superuser: user.is_superuser,
    });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (user: User) => {
    setCurrentUser(user);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Limpiar datos vacíos
      const payload: any = { ...formData };
      if (!payload.password) delete payload.password; // No enviar pass vacío al editar
      if (!payload.phone) payload.phone = null;

      if (currentUser) {
        // EDITAR (PUT)
        await api.put(`/users/${currentUser.id}`, payload);
        toast.success("Usuario actualizado correctamente");
      } else {
        // CREAR (POST)
        if (!payload.password) {
          toast.error("La contraseña es obligatoria para nuevos usuarios");
          setIsSubmitting(false);
          return;
        }
        await api.post("/users/", payload);
        toast.success("Usuario creado correctamente");
      }

      setIsFormOpen(false);
      fetchUsers(); // Recargar tabla
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.detail || "Error al guardar usuario";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!currentUser) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/users/${currentUser.id}`);
      toast.success("Usuario eliminado/desactivado");
      setIsDeleteOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error(error);
      toast.error("No se pudo eliminar el usuario");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- COLUMNAS ---
  const columns: ColumnDef<User>[] = [
    {
      header: "Usuario",
      cell: (user) => {
        const fullName = user.first_name && user.last_name 
            ? `${user.first_name} ${user.last_name}` 
            : "Sin Nombre";
        const initials = user.first_name 
          ? user.first_name[0].toUpperCase() 
          : user.email[0].toUpperCase();

        return (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex flex-shrink-0 items-center justify-center font-bold text-sm border border-primary/20">
              {initials}
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-foreground text-sm">{fullName}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{user.email}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: "Rol",
      accessorKey: "is_superuser",
      className: "text-center w-24",
      cell: (user) => user.is_superuser ? (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">ADMIN</span>
      ) : (
        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">USER</span>
      )
    },
    {
      header: "Estado",
      accessorKey: "is_active",
      type: "boolean",
      className: "text-center w-24",
    },
    {
      header: "Acciones",
      className: "text-right w-32",
      cell: (user) => (
        <div className="flex justify-end gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); handleOpenEdit(user); }}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="Editar"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleOpenDelete(user); }}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Eliminar"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <AdminGuard>
      <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gestión de Usuarios</h1>
            <p className="text-muted-foreground text-sm mt-1">Administra los accesos y roles del sistema.</p>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2">
            <PlusIcon className="h-4 w-4" /> Nuevo Usuario
          </Button>
        </div>

        {/* TABLA */}
        <DataTable 
          columns={columns} 
          data={users} 
          isLoading={loading}
          emptyMessage="No se encontraron usuarios."
          // Opcional: Si quieres ver detalles al hacer clic en la fila
          renderDetailModal={(user) => (
             <div className="space-y-4">
               <h2 className="text-xl font-bold text-center">{user.first_name} {user.last_name}</h2>
               <p className="text-center text-muted-foreground">{user.email}</p>
               <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/20 rounded-lg">
                 <div>
                    <p className="text-xs uppercase text-muted-foreground">Teléfono</p>
                    <p className="font-medium">{user.phone || "—"}</p>
                 </div>
                 <div>
                    <p className="text-xs uppercase text-muted-foreground">ID</p>
                    <p className="font-mono text-xs">{user.id}</p>
                 </div>
               </div>
             </div>
          )}
          modalTitle="Detalle Rápido"
        />

        {/* --- MODAL FORMULARIO (CREAR / EDITAR) --- */}
        <Modal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={currentUser ? "Editar Usuario" : "Nuevo Usuario"}
          className="max-w-2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre</label>
                <input 
                  type="text" 
                  required
                  className="w-full p-2 rounded-md border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none"
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Apellido</label>
                <input 
                  type="text" 
                  required
                  className="w-full p-2 rounded-md border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none"
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input 
                type="email" 
                required
                className="w-full p-2 rounded-md border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Teléfono (Opcional)</label>
              <input 
                type="tel" 
                className="w-full p-2 rounded-md border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <KeyIcon className="h-4 w-4" /> 
                {currentUser ? "Nueva Contraseña (Dejar en blanco para mantener)" : "Contraseña"}
              </label>
              <input 
                type="password" 
                className="w-full p-2 rounded-md border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none"
                placeholder={currentUser ? "••••••••" : "Mínimo 8 caracteres"}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <ShieldCheckIcon className="h-6 w-6 text-purple-500" />
                <div>
                  <p className="text-sm font-bold">Permisos de Administrador</p>
                  <p className="text-xs text-muted-foreground">Acceso total al sistema y logs.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={formData.is_superuser}
                  onChange={(e) => setFormData({...formData, is_superuser: e.target.checked})}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <IdentificationIcon className="h-6 w-6 text-green-500" />
                <div>
                  <p className="text-sm font-bold">Usuario Activo</p>
                  <p className="text-xs text-muted-foreground">Desactivar para bloquear acceso sin borrar.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : (currentUser ? "Actualizar" : "Crear Usuario")}
              </Button>
            </div>
          </form>
        </Modal>

        {/* --- MODAL CONFIRMACIÓN BORRAR --- */}
        <Modal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          title="Confirmar Eliminación"
          className="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-4 bg-red-50 text-red-900 rounded-lg border border-red-200 flex items-start gap-3">
              <TrashIcon className="h-6 w-6 flex-shrink-0" />
              <div>
                <h4 className="font-bold">¿Estás seguro?</h4>
                <p className="text-sm mt-1">
                  Estás a punto de desactivar/eliminar a <strong>{currentUser?.email}</strong>. 
                  Esta acción podría restringir su acceso inmediatamente.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
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
    </AdminGuard>
  );
}
