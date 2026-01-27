"use client";

import { useState, useEffect } from "react";
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
  ListBulletIcon,
  ArrowTrendingUpIcon
} from "@heroicons/react/24/outline";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { ThemeToggle } from "./ThemeToggle";

// --- 1. DEFINICIÓN ROBUSTA DE TIPOS ---

// Tipo exacto para componentes de Heroicons (v2)
type HeroIcon = React.ForwardRefExoticComponent<
  Omit<React.SVGProps<SVGSVGElement>, "ref"> & {
    title?: string | undefined;
    titleId?: string | undefined;
  } & React.RefAttributes<SVGSVGElement>
>;

// Definimos las acciones posibles (mejora mantenibilidad)
type SidebarAction = "new-expense" | "edit-expense" | "delete-expense";

interface NavItem {
  name: string;
  href: string;
  icon: HeroIcon; // Usamos el tipo estricto aquí
  requiredPermission?: "superuser";
  action?: SidebarAction; // ✅ Añadido explícitamente para evitar el error
  children?: NavItem[];   // Recursividad: los hijos usan la misma estructura
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "Ingresos", href: "/ingresos", icon: ArrowTrendingUpIcon },
  { 
    name: "Mis Gastos", 
    href: "/gastos", 
    icon: BanknotesIcon,
    children: [
      { name: "Ver Listado", href: "/gastos", icon: ListBulletIcon },
      // ✅ Ahora TypeScript sabe que 'action' es una propiedad válida
      { name: "Registrar Nuevo", href: "/gastos?action=new", icon: PlusIcon, action: "new-expense" }
    ]
  },
  { name: "Usuarios", href: "/users", icon: UsersIcon, requiredPermission: 'superuser' },
  { name: "Categorías", href: "/categorias", icon: TagIcon },
  { name: "Reportes", href: "/reportes", icon: ChartPieIcon },
  { name: "Bitácora", href: "/bitacora", icon: ClipboardDocumentListIcon, requiredPermission: 'superuser' },
];

// --- 2. COMPONENTES AUXILIARES ---

const UserProfileDetail = ({ user, onLogout }: { user: any, onLogout: () => void }) => (
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

      <div className="lg:hidden pt-4 border-t border-border mt-4">
        <Button 
            variant="destructive" 
            className="w-full flex items-center justify-center gap-2"
            onClick={onLogout}
        >
            <ArrowLeftStartOnRectangleIcon className="h-5 w-5" />
            Cerrar Sesión
        </Button>
      </div>
    </div>
  </div>
);

// --- 3. COMPONENTE PRINCIPAL ---

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  
  // Estados UI
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>("Mis Gastos"); 

  const { setTheme } = useTheme();
  const { logout, user } = useAuthStore();
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();

  const handleLogout = () => {
    setIsProfileModalOpen(false);
    setIsMobileMenuOpen(false);
    logout();
    setTheme("system");
    router.push("/login");
  };

  useEffect(() => {
     setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleMobileNavigation = (href?: string) => {
      setIsMobileMenuOpen(false);
      if(href) router.push(href);
  };

  const displayName = user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.email || "Cargando...";

  const initials = user?.first_name && user?.last_name
      ? (user.first_name[0] + user.last_name[0]).toUpperCase()
      : user?.email?.slice(0, 2).toUpperCase() || "US";

  // Filtro permisos
  const filteredNavigation = navigation.filter(item => {
    if (!item.requiredPermission) return true;
    if (item.requiredPermission === 'superuser') return user?.is_superuser === true;
    return false;
  });

  const toggleSubmenu = (itemName: string) => {
    if (isSidebarCollapsed) {
      toggleSidebar(); 
      setOpenSubmenu(itemName);
    } else {
      setOpenSubmenu(prev => (prev === itemName ? null : itemName));
    }
  };

  const renderNavItems = (isMobile: boolean) => (
    <ul className="space-y-1">
      {filteredNavigation.map((item) => {
        const isActive = pathname === item.href;
        const hasChildren = !!item.children;
        const isOpen = openSubmenu === item.name;

        // Recuperamos el icono con mayúscula para usarlo como componente JSX
        const ItemIcon = item.icon;

        return (
          <li key={item.name}>
            {hasChildren ? (
              <>
                <button
                  onClick={() => toggleSubmenu(item.name)}
                  className={cn(
                    "w-full group flex items-center rounded-md transition-all duration-200 relative overflow-hidden",
                    (isSidebarCollapsed && !isMobile) ? "justify-center p-2" : "px-3 py-2 justify-between",
                    isActive || isOpen ? "text-foreground bg-accent/50" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <div className="flex items-center">
                    <ItemIcon className={cn("flex-shrink-0 transition-all", (isSidebarCollapsed && !isMobile) ? "h-6 w-6" : "h-5 w-5 mr-3", (isActive || isOpen) ? "text-primary" : "")} />
                    <span className={cn("text-sm whitespace-nowrap transition-all duration-300", (isSidebarCollapsed && !isMobile) ? "w-0 opacity-0 hidden" : "w-auto opacity-100 block")}>
                      {item.name}
                    </span>
                  </div>
                  {(!isSidebarCollapsed || isMobile) && (
                    <ChevronDownIcon className={cn("h-3 w-3 transition-transform duration-200", isOpen ? "rotate-180" : "")} />
                  )}
                </button>
                
                {isOpen && (!isSidebarCollapsed || isMobile) && (
                  <div className="mt-1 ml-4 pl-2 border-l border-border space-y-1 animate-in slide-in-from-top-1 duration-200">
                    {item.children!.map((subItem) => {
                      const isSubActive = pathname === subItem.href.split('?')[0] && (!subItem.action || pathname.includes("action"));
                      const SubIcon = subItem.icon;
                      
                      return (
                        <Link
                          key={subItem.name}
                          href={subItem.href}
                          onClick={() => isMobile && setIsMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center px-3 py-1.5 text-sm rounded-md transition-colors",
                            isSubActive 
                            ? "text-primary font-medium bg-primary/5" 
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                          )}
                        >
                          {SubIcon && <SubIcon className="h-4 w-4 mr-2 opacity-70" />}
                          {subItem.name}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </>
            ) : (
              <Link
                href={item.href}
                onClick={() => isMobile && setIsMobileMenuOpen(false)}
                className={cn(
                  "group flex items-center rounded-md transition-all duration-300 relative overflow-hidden",
                  (isSidebarCollapsed && !isMobile) ? "justify-center p-2" : "px-3 py-2",
                  isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {(isActive && !isSidebarCollapsed && !isMobile) && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />}
                <ItemIcon className={cn("flex-shrink-0 transition-all", (isSidebarCollapsed && !isMobile) ? "h-6 w-6" : "h-5 w-5 mr-3", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                <span className={cn("text-sm whitespace-nowrap transition-all duration-300", (isSidebarCollapsed && !isMobile) ? "w-0 opacity-0 hidden" : "w-auto opacity-100 block")}>
                  {item.name}
                </span>
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );

  // Helper Bottom Nav
  // Tipamos explícitamente el prop icon
  const BottomNavItem = ({ icon: Icon, label, href, isActive, onClick }: { icon: HeroIcon, label: string, href?: string, isActive: boolean, onClick?: () => void }) => (
    <div 
      onClick={() => {
        if (onClick) onClick();
        else if (href) handleMobileNavigation(href);
      }}
      className={cn(
        "flex flex-col items-center justify-center w-full h-full space-y-1 cursor-pointer active:scale-95 transition-transform select-none",
        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
       <Icon className="h-6 w-6" />
       <span className="text-[10px] font-medium">{label}</span>
    </div>
  );

  return (
    <>
      {/* MOBILE DRAWER */}
      <div
          className={cn(
            "fixed inset-0 bg-black/60 z-[35] lg:hidden transition-opacity duration-300 backdrop-blur-sm",
            isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
          onClick={() => setIsMobileMenuOpen(false)}
      />

      <div 
        className={cn(
          "fixed bottom-[64px] left-0 right-0 bg-card z-[36] lg:hidden",
          "rounded-t-2xl border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.2)]",
          "flex flex-col max-h-[80vh] overflow-hidden",
          "transition-transform duration-300 ease-out will-change-transform",
          isMobileMenuOpen ? "translate-y-0" : "translate-y-[150%]"
        )}
      >
          <div className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing" onClick={() => setIsMobileMenuOpen(false)}>
           <div className="w-12 h-1.5 rounded-full bg-muted hover:bg-muted-foreground/50 transition-colors" />
          </div>

          <div className="px-4 py-2 flex items-center justify-between border-b border-border/50">
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Menú</span>
            <Button variant="ghost" size="sm" onClick={() => setIsMobileMenuOpen(false)} className="h-8 w-8 p-0 rounded-full">
               <XMarkIcon className="h-5 w-5" />
            </Button>
          </div>

          <div className="overflow-y-auto p-4 space-y-4 custom-scrollbar pb-8">
            <nav>{renderNavItems(true)}</nav>
            
            <div className="pt-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between px-2">
                   <span className="text-sm font-medium">Tema</span>
                   <ThemeToggle showLabel={false} />
                </div>
            </div>
          </div>
      </div>

      {/* BOTTOM NAVIGATION BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-card/95 backdrop-blur-md border-t border-border flex justify-around items-center px-2 pb-safe shadow-[0_-1px_2px_rgba(0,0,0,0.05)]">
        
        <BottomNavItem icon={HomeIcon} label="Inicio" href="/dashboard" isActive={pathname === "/dashboard"} />
        
        <BottomNavItem icon={ArrowTrendingUpIcon} label="Ingresos" href="/ingresos" isActive={pathname.startsWith("/ingresos")} />
        
        <BottomNavItem icon={BanknotesIcon} label="Gastos" href="/gastos" isActive={pathname.startsWith("/gastos")} />
        
        <div 
          onClick={() => {
             setIsMobileMenuOpen(false);
             user && setIsProfileModalOpen(true);
          }}
          className="flex flex-col items-center justify-center w-full h-full space-y-1 cursor-pointer active:scale-95 transition-transform"
        >
          <div className={cn(
              "h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm bg-gradient-to-tr from-blue-500 to-purple-500 transition-all",
              pathname === "/profile" ? "ring-2 ring-primary ring-offset-1" : ""
            )}
          >
            {initials}
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">Perfil</span>
        </div>

        <BottomNavItem 
          icon={isMobileMenuOpen ? ChevronDownIcon : Bars3Icon} 
          label={isMobileMenuOpen ? "Cerrar" : "Menú"} 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          isActive={isMobileMenuOpen} 
        />
      </div>


      {/* DESKTOP SIDEBAR */}
      <aside
        className={cn(
          "hidden lg:flex fixed top-0 left-0 z-40 h-screen bg-card border-r border-border shadow-xl lg:shadow-none",
          "transition-all duration-300 ease-in-out flex-col",
          isSidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className="hidden lg:flex absolute -right-3 top-9 z-50">
          <Button onClick={toggleSidebar} size="icon" variant="outline" className="h-6 w-6 rounded-full bg-card border border-border shadow-sm hover:bg-accent p-0">
            {isSidebarCollapsed ? <ChevronRightIcon className="h-3 w-3" /> : <ChevronLeftIcon className="h-3 w-3" />}
          </Button>
        </div>

        <div className={cn("mb-6 flex items-center px-4 h-10 transition-all duration-500 mt-4", isSidebarCollapsed ? "justify-center" : "justify-start")}>
          <div className="h-8 w-8 rounded-lg bg-primary flex flex-shrink-0 items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/30">
            $
          </div>
          <div className={cn("ml-3 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out", isSidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100 delay-200")}>
            <h1 className="text-lg font-bold text-foreground">MisGastos</h1>
          </div>
        </div>

        <div className="flex-1 space-y-1 px-3 overflow-y-auto custom-scrollbar">
          <p className={cn("px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 whitespace-nowrap transition-all duration-300", isSidebarCollapsed ? "w-0 opacity-0 translate-x-[-10px]" : "w-auto opacity-100 translate-x-0 delay-200")}>
            Menu Principal
          </p>
          {renderNavItems(false)}
        </div>

        <div className="mt-auto border-t border-border px-3 pt-3 pb-2 space-y-1 bg-card">
          <div className={cn("flex transition-all duration-500", isSidebarCollapsed ? "justify-center mb-2" : "mb-1")}>
            <ThemeToggle showLabel={!isSidebarCollapsed} />
          </div>

          <Button variant="ghost" size="sm" className={cn("w-full group text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-9", isSidebarCollapsed ? "justify-center px-0" : "justify-start px-2")} onClick={handleLogout} title="Cerrar Sesión">
            <ArrowLeftStartOnRectangleIcon className={cn("h-5 w-5", isSidebarCollapsed ? "" : "mr-2")} />
            <span className={cn("text-sm whitespace-nowrap", isSidebarCollapsed ? "hidden" : "block")}>Cerrar Sesión</span>
          </Button>

          <div onClick={() => user && setIsProfileModalOpen(true)} className={cn("mt-2 flex items-center rounded-lg bg-secondary/50 border border-border cursor-pointer hover:bg-secondary hover:border-primary/30 transition-all mb-2", isSidebarCollapsed ? "justify-center p-1 h-10 w-10 mx-auto" : "p-2 gap-3")}>
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
              {initials}
            </div>
            <div className={cn("overflow-hidden", isSidebarCollapsed ? "hidden" : "block")}>
              <p className="text-xs font-semibold text-foreground truncate w-32">{displayName}</p>
              <p className="text-[10px] text-muted-foreground truncate w-32">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {user && (
        <Modal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title="Mi Perfil">
          <UserProfileDetail user={user} onLogout={handleLogout} />
        </Modal>
      )}
    </>
  );
}
