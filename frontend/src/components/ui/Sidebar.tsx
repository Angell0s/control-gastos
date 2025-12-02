"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
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
} from "@heroicons/react/24/outline";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { ThemeToggle } from "./ThemeToggle";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "Mis Gastos", href: "/gastos", icon: BanknotesIcon },
  { name: "Usuarios", href: "/users", icon: UsersIcon },
  { name: "Categorías", href: "/categorias", icon: TagIcon },
  { name: "Reportes", href: "/reportes", icon: ChartPieIcon },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { setTheme } = useTheme();

  // Obtenemos user, logout y fetchUser del store
  const { logout, user, fetchUser } = useAuthStore();
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();

  // Cargar usuario al montar el componente si no existe o para actualizarlo
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleLogout = () => {
    logout();
    setTheme("system");
    router.push("/login");
  };

  // Helpers para mostrar datos del usuario
  const displayName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.email || "Cargando...";

  const initials =
    user?.first_name && user?.last_name
      ? (user.first_name[0] + user.last_name[0]).toUpperCase()
      : user?.email?.slice(0, 2).toUpperCase() || "US";

  return (
    <>
      {/* --- MOBILE TOGGLE (Solo visible en móvil) --- */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-card shadow-md border-border"
        >
          {isMobileOpen ? (
            <XMarkIcon className="h-6 w-6 text-foreground" />
          ) : (
            <Bars3Icon className="h-6 w-6 text-foreground" />
          )}
        </Button>
      </div>

      {/* --- MOBILE OVERLAY --- */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* --- SIDEBAR CONTAINER --- */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen bg-card border-r border-border shadow-xl lg:shadow-none",
          "transition-all duration-300 ease-in-out", // Clase smooth-transition integrada
          isSidebarCollapsed ? "w-20" : "w-64",
          isMobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Botón Colapsar (Desktop) */}
        <div className="hidden lg:flex absolute -right-3 top-9 z-50">
          <Button
            onClick={toggleSidebar}
            size="icon"
            variant="outline"
            className="h-6 w-6 rounded-full bg-card border border-border shadow-sm hover:bg-accent p-0"
          >
            {isSidebarCollapsed ? (
              <ChevronRightIcon className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronLeftIcon className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>
        </div>

        <div className="flex flex-col h-full py-4 overflow-x-hidden">
          {/* LOGO */}
          <div
            className={cn(
              "mb-6 flex items-center px-4 h-10 transition-all duration-500",
              isSidebarCollapsed ? "justify-center" : "justify-start"
            )}
          >
            <div className="h-8 w-8 rounded-lg bg-primary flex flex-shrink-0 items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/30">
              $
            </div>

            <div
              className={cn(
                "ml-3 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
                isSidebarCollapsed
                  ? "w-0 opacity-0"
                  : "w-auto opacity-100 delay-200"
              )}
            >
              <h1 className="text-lg font-bold text-foreground">MisGastos</h1>
            </div>
          </div>

          {/* MENU */}
          <nav className="flex-1 space-y-1 px-3">
            <p
              className={cn(
                "px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 whitespace-nowrap transition-all duration-300",
                isSidebarCollapsed
                  ? "w-0 opacity-0 translate-x-[-10px]"
                  : "w-auto opacity-100 translate-x-0 delay-200"
              )}
            >
              Menu Principal
            </p>

            <ul className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        "group flex items-center rounded-md transition-all duration-300 relative overflow-hidden",
                        isSidebarCollapsed ? "justify-center p-2" : "px-3 py-2",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                      title={isSidebarCollapsed ? item.name : ""}
                    >
                      {/* Indicador Activo */}
                      {isActive && !isSidebarCollapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full animate-in fade-in slide-in-from-left-1 duration-300" />
                      )}

                      <item.icon
                        className={cn(
                          "flex-shrink-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
                          isSidebarCollapsed ? "h-6 w-6" : "h-5 w-5 mr-3",
                          "group-hover:scale-110 group-hover:rotate-6",
                          isActive
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-foreground"
                        )}
                      />

                      <span
                        className={cn(
                          "text-sm whitespace-nowrap transition-all duration-300",
                          isSidebarCollapsed
                            ? "w-0 opacity-0 hidden"
                            : "w-auto opacity-100 block group-hover:translate-x-1 delay-150"
                        )}
                      >
                        {item.name}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* FOOTER */}
          <div className="mt-auto border-t border-border px-3 pt-3 pb-2 space-y-1">
            {/* Theme Toggle */}
            <div
              className={cn(
                "flex transition-all duration-500",
                isSidebarCollapsed ? "justify-center mb-2" : "mb-1"
              )}
            >
              <ThemeToggle showLabel={!isSidebarCollapsed} />
            </div>

            {/* Logout Button */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full group text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-9 transition-all duration-300",
                isSidebarCollapsed ? "justify-center px-0" : "justify-start px-2"
              )}
              onClick={handleLogout}
              title={isSidebarCollapsed ? "Cerrar Sesión" : ""}
            >
              <ArrowLeftStartOnRectangleIcon
                className={cn(
                  "h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1",
                  isSidebarCollapsed ? "" : "mr-2"
                )}
              />
              <span
                className={cn(
                  "text-sm whitespace-nowrap transition-all duration-300",
                  isSidebarCollapsed
                    ? "w-0 opacity-0 hidden"
                    : "w-auto opacity-100 delay-150"
                )}
              >
                Cerrar Sesión
              </span>
            </Button>

            {/* PERFIL DE USUARIO */}
            <div
              className={cn(
                "mt-2 flex items-center rounded-lg bg-secondary/50 border border-border transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
                isSidebarCollapsed
                  ? "justify-center p-1 h-10 w-10 mx-auto"
                  : "p-2 gap-3"
              )}
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex flex-shrink-0 items-center justify-center text-xs font-bold text-white shadow-sm">
                {initials}
              </div>

              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  isSidebarCollapsed
                    ? "w-0 opacity-0 hidden"
                    : "w-auto opacity-100 delay-200"
                )}
              >
                <p className="text-xs font-semibold text-foreground truncate w-32">
                  {displayName}
                </p>
                <p className="text-[10px] text-muted-foreground truncate w-32">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
