//frontend\src\components\providers\ModalProvider.tsx
"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Modal } from "@/components/Modal"; 
import { Button } from "@/components/ui/Button";
import { MODAL_REGISTRY, ModalKey } from "@/lib/modalRegistry";
// import { cn } from "@/lib/utils"; // Descomenta si usas cn para clases

// --- 1. Definición del Contexto ---
interface ModalContextType {
  isOpen: boolean;
  modalType: ModalKey | null;
  modalProps: any; // Props dinámicos (callbacks, textos, extraFooter, etc.)
  openModal: <T = any>(type: ModalKey, props?: T) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

// --- 2. Provider (Lógica de Estado) ---
export function ModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalKey | null>(null);
  const [modalProps, setModalProps] = useState<any>({});

  const openModal = useCallback((type: ModalKey, props: any = {}) => {
    setModalType(type);
    setModalProps(props);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    // Limpieza diferida para permitir animación de salida
    setTimeout(() => {
      setModalType(null);
      setModalProps({});
    }, 300); 
  }, []);

  return (
    <ModalContext.Provider value={{ isOpen, modalType, modalProps, openModal, closeModal }}>
      {children}
      {/* El Manager se renderiza aquí para estar disponible globalmente */}
      <ModalManager />
    </ModalContext.Provider>
  );
}

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error("useModal must be used within a ModalProvider");
  return context;
};

// --- 3. GESTOR VISUAL (Renderizado Dinámico) ---
function ModalManager() {
  const { isOpen, modalType, modalProps, closeModal } = useModal();

  // Si no hay modal activo, retornamos null
  if (!modalType) return null;

  const definition = MODAL_REGISTRY[modalType];
  if (!definition) return null;

  const { title, icon: Icon, colorClass, content } = definition;
  
  // Desestructuramos las props dinámicas que vienen de openModal()
  const { 
      onConfirm,        // Callback principal
      isSubmitting,     // Estado de carga
      confirmText = "Confirmar", 
      cancelText = "Cancelar",
      onClose,          // Callback opcional al cerrar
      extraFooter,      // ✅ NUEVO: Componente extra para el footer (ej: Botón Link)
      ...contentProps   // Props para el cuerpo del modal
  } = modalProps;

  // Sistema de temas para colores
  const getColorClasses = (color: string) => {
      const colors: Record<string, { border: string, iconBg: string, iconText: string, btn: string }> = {
          indigo: { border: "border-l-indigo-500", iconBg: "bg-indigo-50 dark:bg-indigo-900/20", iconText: "text-indigo-600 dark:text-indigo-300", btn: "bg-indigo-600 hover:bg-indigo-700 text-white" },
          red:    { border: "border-l-red-500",    iconBg: "bg-red-50 dark:bg-red-900/20",    iconText: "text-red-600 dark:text-red-300",    btn: "bg-red-600 hover:bg-red-700 text-white" },
          blue:   { border: "border-l-blue-500",   iconBg: "bg-blue-50 dark:bg-blue-900/20",   iconText: "text-blue-600 dark:text-blue-300",   btn: "bg-blue-600 hover:bg-blue-700 text-white" },
          yellow: { border: "border-l-yellow-500", iconBg: "bg-yellow-50 dark:bg-yellow-900/20", iconText: "text-yellow-600 dark:text-yellow-300", btn: "bg-yellow-600 hover:bg-yellow-700 text-white" },
          green:  { border: "border-l-green-500",  iconBg: "bg-green-50 dark:bg-green-900/20",  iconText: "text-green-600 dark:text-green-300",  btn: "bg-green-600 hover:bg-green-700 text-white" },
          emerald:{ border: "border-l-emerald-500",iconBg: "bg-emerald-50 dark:bg-emerald-900/20",iconText: "text-emerald-600 dark:text-emerald-300",btn: "bg-emerald-600 hover:bg-emerald-700 text-white" },
          slate:  { border: "border-l-slate-500",  iconBg: "bg-slate-50 dark:bg-slate-800",      iconText: "text-slate-600 dark:text-slate-300",  btn: "bg-primary text-primary-foreground" },
      };
      return colors[color] || colors.slate;
  };

  const theme = getColorClasses(colorClass);

  const handleClose = () => {
      if (onClose) onClose();
      closeModal();
  };

  // Construcción del Header (Icono + Texto) para pasarlo al componente Modal
  const headerContent = (
    <div className="flex items-center gap-2">
       <div className={`p-1.5 rounded-md ${theme.iconBg} ${theme.iconText}`}>
          <Icon className="h-5 w-5" />
       </div>
       <span>{title}</span>
    </div>
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={headerContent} // Enviamos el JSX al header del Modal
      className={`max-w-md border-l-4 ${theme.border}`}
    >
      <div className="space-y-4 pt-1">
        
        {/* Renderizado del Cuerpo desde el Registry */}
        <div className="text-sm text-muted-foreground">
            {content ? content(contentProps) : <p className="italic opacity-70">Sin contenido.</p>}
        </div>

        {/* Footer Dinámico */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 mt-4 border-t border-border/40">
          
          {/* ✅ Renderizado del Footer Extra (Izquierda o arriba en móvil) */}
          {extraFooter && (
             <div className="w-full sm:w-auto sm:mr-auto">
                {extraFooter}
             </div>
          )}

          {/* Botones de Acción Estándar */}
          {!onConfirm ? (
             // Caso Informativo
             <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                Entendido
             </Button>
          ) : (
             // Caso Interactivo
             <>
                <Button 
                  variant="outline" 
                  onClick={handleClose} 
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {cancelText}
                </Button>
                
                <Button 
                    onClick={onConfirm} 
                    disabled={isSubmitting} 
                    className={`${theme.btn} w-full sm:w-auto shadow-sm`}
                >
                  {isSubmitting ? "Procesando..." : confirmText}
                </Button>
             </>
          )}

        </div>
      </div>
    </Modal>
  );
}
