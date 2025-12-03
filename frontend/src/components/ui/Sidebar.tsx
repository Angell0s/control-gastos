//frontend\src\components\ui\Sidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { Modal } from "./../Modal";
import {
  HomeIcon,
  UsersIcon,
  BanknotesIcon,
  TagIcon,
  ChartPieIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowLeftStartOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EnvelopeIcon,
  PhoneIcon,
  ShieldCheckIcon,
  IdentificationIcon,
  ClipboardDocumentListIcon,
  ChevronDownIcon,
  PlusIcon,
  ListBulletIcon
} from "@heroicons/react/24/outline";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { ThemeToggle } from "./ThemeToggle";

// --- TIPOS DE NAVEGACIÓN ---
type NavItem = {
  name: string;
  href: string;
  icon: (props: React.ComponentProps<'svg'>) => JSX.Element;
  requiredPermission?: 'superuser';
  // ✅ NUEVO: Soporte para sub-menús
  children?: {
    name: string;
    href: string;
    icon?: (props: React.ComponentProps<'svg'>) => JSX.Element;
    action?: string; // Para identificar acciones especiales (abrir modal)
  }[];
};

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { 
    name: "Mis Gastos", 
    href: "/gastos", 
    icon: BanknotesIcon,
    // ✅ AÑADIMOS HIJOS A GASTOS
    children: [
      { name: "Ver Listado", href: "/gastos", icon: ListBulletIcon },
      { name: "Registrar Nuevo", href: "/gastos?action=new", icon: PlusIcon, action: "new-expense" }
    ]
  },
  { name: "Usuarios", href: "/users", icon: UsersIcon, requiredPermission: 'superuser' },
  { name: "Categorías", href: "/categorias", icon: TagIcon },
  { name: "Reportes", href: "/reportes", icon: ChartPieIcon },
  { name: "Bitácora", href: "/bitacora", icon: ClipboardDocumentListIcon, requiredPermission: 'superuser' },
];

// --- COMPONENTE DE DETALLE DE USUARIO (SIN CAMBIOS) ---
const UserProfileDetail = ({ user }: { user: any }) => (
  <div className="space-y-6">
    {/* Header Avatar */}
    <div className="flex flex-col items-center justify-center pb-6 border-b border-border relative">
      <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-4xl font-bold text-primary mb-4 shadow-inner">
        {user.first_name ? user.first_name[0].toUpperCase() : user.email[0].toUpperCase()}
      </div>
      <h2 className="text-2xl font-bold text-center">
        {user.first_name} {user.last_name}
      </h2>
      <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
      <span className="absolute top-0 right-0 text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-1 rounded border border-border">
        ID: {user.id.slice(0, 8)}
      </span>
    </div>

    {/* Detalles */}
    <div className="grid grid-cols-1 gap-4">
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
          Información de Contacto
        </h3>
        <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 border border-transparent">
          <div className="p-2 rounded-full bg-background shadow-sm">
            <EnvelopeIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase">Correo</p>
            <p className="text-sm font-medium text-foreground break-all">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 border border-transparent">
          <div className="p-2 rounded-full bg-background shadow-sm">
            <PhoneIcon className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase">Teléfono</p>
            <p className="text-sm font-medium text-foreground">{user.phone || "No registrado"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="p-4 rounded-lg border border-border bg-card shadow-sm flex flex-col items-center text-center gap-2">
          <ShieldCheckIcon className={cn("h-8 w-8", user.is_superuser ? "text-purple-500" : "text-gray-400")} />
          <div>
            <p className="text-xs text-muted-foreground font-bold uppercase">Rol</p>
            <p className="text-sm font-medium mt-1">{user.is_superuser ? "Admin" : "Usuario"}</p>
          </div>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card shadow-sm flex flex-col items-center text-center gap-2">
          <IdentificationIcon className={cn("h-8 w-8", user.is_active ? "text-green-500" : "text-red-400")} />
          <div>
            <p className="text-xs text-muted-foreground font-bold uppercase">Estado</p>
            <p className="text-sm font-medium mt-1">{user.is_active ? "Activo" : "Inactivo"}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// --- SIDEBAR PRINCIPAL ---
export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  
  // Estados UI
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // ✅ NUEVO: Estado para controlar qué submenú está abierto
  // Guardamos el 'name' del item padre desplegado.
  const [openSubmenu, setOpenSubmenu] = useState<string | null>("Mis Gastos"); 

  const { setTheme } = useTheme();
  const { logout, user } = useAuthStore();
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();

  const handleLogout = () => {
    logout();
    setTheme("system");
    router.push("/login");
  };

  // --- LÓGICA DE USUARIO ---
  const displayName = user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.email || "Cargando...";

  const initials = user?.first_name && user?.last_name
      ? (user.first_name[0] + user.last_name[0]).toUpperCase()
      : user?.email?.slice(0, 2).toUpperCase() || "US";

  // --- FILTRADO DE NAVEGACIÓN ---
  const filteredNavigation = navigation.filter(item => {
    if (!item.requiredPermission) return true;
    if (item.requiredPermission === 'superuser') return user?.is_superuser === true;
    return false;
  });

  // --- TOGGLE SUBMENU ---
  const toggleSubmenu = (itemName: string) => {
    if (isSidebarCollapsed) {
      toggleSidebar(); // Si está colapsado, abrir sidebar para ver submenú
      setOpenSubmenu(itemName);
    } else {
      setOpenSubmenu(prev => (prev === itemName ? null : itemName));
    }
  };

  return (
    <>
      {/* --- MOBILE TOGGLE --- */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-card shadow-md border-border"
        >
          {isMobileOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
        </Button>
      </div>

      {/* --- MOBILE OVERLAY --- */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* --- SIDEBAR ASIDE --- */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen bg-card border-r border-border shadow-xl lg:shadow-none",
          "transition-all duration-300 ease-in-out flex flex-col",
          isSidebarCollapsed ? "w-20" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Botón Colapsar Desktop */}
        <div className="hidden lg:flex absolute -right-3 top-9 z-50">
          <Button
            onClick={toggleSidebar}
            size="icon"
            variant="outline"
            className="h-6 w-6 rounded-full bg-card border border-border shadow-sm hover:bg-accent p-0"
          >
            {isSidebarCollapsed ? <ChevronRightIcon className="h-3 w-3" /> : <ChevronLeftIcon className="h-3 w-3" />}
          </Button>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="flex flex-col h-full py-4 overflow-y-auto overflow-x-hidden custom-scrollbar">
          
          {/* LOGO */}
          <div className={cn("mb-6 flex items-center px-4 h-10 transition-all duration-500", isSidebarCollapsed ? "justify-center" : "justify-start")}>
            <div className="h-8 w-8 rounded-lg bg-primary flex flex-shrink-0 items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/30">
              $
            </div>
            <div className={cn("ml-3 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out", isSidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100 delay-200")}>
              <h1 className="text-lg font-bold text-foreground">MisGastos</h1>
            </div>
          </div>

          {/* NAVEGACIÓN */}
          <nav className="flex-1 space-y-1 px-3">
            <p className={cn("px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 whitespace-nowrap transition-all duration-300", isSidebarCollapsed ? "w-0 opacity-0 translate-x-[-10px]" : "w-auto opacity-100 translate-x-0 delay-200")}>
              Menu Principal
            </p>
            
            <ul className="space-y-1">
              {filteredNavigation.map((item) => {
                const isActive = pathname === item.href;
                const hasChildren = !!item.children;
                const isOpen = openSubmenu === item.name;

                return (
                  <li key={item.name}>
                    {/* --- ÍTEM PADRE --- */}
                    {hasChildren ? (
                      // Si tiene hijos, es un botón desplegable
                      <button
                        onClick={() => toggleSubmenu(item.name)}
                        className={cn(
                          "w-full group flex items-center rounded-md transition-all duration-200 relative overflow-hidden",
                          isSidebarCollapsed ? "justify-center p-2" : "px-3 py-2 justify-between",
                          isActive || isOpen ? "text-foreground bg-accent/50" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                        title={isSidebarCollapsed ? item.name : ""}
                      >
                        <div className="flex items-center">
                          <item.icon className={cn("flex-shrink-0 transition-all", isSidebarCollapsed ? "h-6 w-6" : "h-5 w-5 mr-3", (isActive || isOpen) ? "text-primary" : "")} />
                          <span className={cn("text-sm whitespace-nowrap transition-all duration-300", isSidebarCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 block")}>
                            {item.name}
                          </span>
                        </div>
                        {/* Flecha de desplegable (solo visible si no está colapsado) */}
                        {!isSidebarCollapsed && (
                          <ChevronDownIcon className={cn("h-3 w-3 transition-transform duration-200", isOpen ? "rotate-180" : "")} />
                        )}
                      </button>
                    ) : (
                      // Si no tiene hijos, es un Link normal
                      <Link
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={cn(
                          "group flex items-center rounded-md transition-all duration-300 relative overflow-hidden",
                          isSidebarCollapsed ? "justify-center p-2" : "px-3 py-2",
                          isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                        title={isSidebarCollapsed ? item.name : ""}
                      >
                        {isActive && !isSidebarCollapsed && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />}
                        <item.icon className={cn("flex-shrink-0 transition-all", isSidebarCollapsed ? "h-6 w-6" : "h-5 w-5 mr-3", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                        <span className={cn("text-sm whitespace-nowrap transition-all duration-300", isSidebarCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 block")}>
                          {item.name}
                        </span>
                      </Link>
                    )}

                    {/* --- SUBMENÚ DESPLEGABLE --- */}
                    {hasChildren && isOpen && !isSidebarCollapsed && (
                      <div className="mt-1 ml-4 pl-2 border-l border-border space-y-1 animate-in slide-in-from-top-1 duration-200">
                        {item.children!.map((subItem) => {
                          const isSubActive = pathname === subItem.href.split('?')[0] && (!subItem.action || pathname.includes("action")); // Lógica simple
                          return (
                            <Link
                              key={subItem.name}
                              href={subItem.href}
                              onClick={() => setIsMobileOpen(false)}
                              className={cn(
                                "flex items-center px-3 py-1.5 text-sm rounded-md transition-colors",
                                isSubActive 
                                  ? "text-primary font-medium bg-primary/5" 
                                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                              )}
                            >
                              {subItem.icon && <subItem.icon className="h-4 w-4 mr-2 opacity-70" />}
                              {subItem.name}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* FOOTER */}
          <div className="mt-auto border-t border-border px-3 pt-3 pb-2 space-y-1 bg-card">
            <div className={cn("flex transition-all duration-500", isSidebarCollapsed ? "justify-center mb-2" : "mb-1")}>
              <ThemeToggle showLabel={!isSidebarCollapsed} />
            </div>

            <Button
              variant="ghost"
              size="sm"
              className={cn("w-full group text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-9", isSidebarCollapsed ? "justify-center px-0" : "justify-start px-2")}
              onClick={handleLogout}
              title={isSidebarCollapsed ? "Cerrar Sesión" : ""}
            >
              <ArrowLeftStartOnRectangleIcon className={cn("h-5 w-5", isSidebarCollapsed ? "" : "mr-2")} />
              <span className={cn("text-sm whitespace-nowrap", isSidebarCollapsed ? "hidden" : "block")}>Cerrar Sesión</span>
            </Button>

            <div
              onClick={() => user && setIsProfileModalOpen(true)}
              className={cn(
                "mt-2 flex items-center rounded-lg bg-secondary/50 border border-border cursor-pointer hover:bg-secondary hover:border-primary/30 transition-all",
                isSidebarCollapsed ? "justify-center p-1 h-10 w-10 mx-auto" : "p-2 gap-3"
              )}
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                {initials}
              </div>
              <div className={cn("overflow-hidden", isSidebarCollapsed ? "hidden" : "block")}>
                <p className="text-xs font-semibold text-foreground truncate w-32">{displayName}</p>
                <p className="text-[10px] text-muted-foreground truncate w-32">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* MODAL DE PERFIL PROPIO */}
      {user && (
        <Modal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title="Mi Perfil">
          <UserProfileDetail user={user} />
        </Modal>
      )}
    </>
  );
}
