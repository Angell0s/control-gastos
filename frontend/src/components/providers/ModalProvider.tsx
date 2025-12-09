// src/components/providers/ModalProvider.tsx
"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Modal } from "@/components/Modal"; // Tu componente Modal base
import { Button } from "@/components/ui/Button";
import { MODAL_REGISTRY, ModalKey } from "@/lib/modalRegistry";
import { cn } from "@/lib/utils"; // Utilidad para clases si la tienes, o usa template strings

interface ModalContextType {
  isOpen: boolean;
  modalType: ModalKey | null;
  modalProps: any;
  openModal: <T = any>(type: ModalKey, props?: T) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

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
    // Limpiamos el estado después de la animación de cierre (aprox 300ms)
    setTimeout(() => {
      setModalType(null);
      setModalProps({});
    }, 300); 
  }, []);

  return (
    <ModalContext.Provider value={{ isOpen, modalType, modalProps, openModal, closeModal }}>
      {children}
      <ModalManager />
    </ModalContext.Provider>
  );
}

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error("useModal must be used within a ModalProvider");
  return context;
};

// --- COMPONENTE GESTOR VISUAL (Interno) ---
function ModalManager() {
  const { isOpen, modalType, modalProps, closeModal } = useModal();

  if (!modalType) return null;

  const definition = MODAL_REGISTRY[modalType];
  if (!definition) return null;

  const { title, icon: Icon, colorClass, content } = definition;
  
  // Extraemos props de control (callbacks y textos) del objeto de props genérico
  const { 
      onConfirm, 
      isSubmitting, 
      confirmText = "Confirmar", 
      cancelText = "Cancelar",
      onClose // Opcional: callback al cerrar sin confirmar
  } = modalProps;

  // Mapeo básico de colores para Tailwind (puedes extenderlo o usar 'cn')
  const getColorClasses = (color: string) => {
      const colors: Record<string, { border: string, iconBg: string, iconText: string, btn: string }> = {
          indigo: { border: "border-l-indigo-500", iconBg: "bg-indigo-50 dark:bg-indigo-900/20", iconText: "text-indigo-600 dark:text-indigo-300", btn: "bg-indigo-600 hover:bg-indigo-700 text-white" },
          red:    { border: "border-l-red-500",    iconBg: "bg-red-50 dark:bg-red-900/20",    iconText: "text-red-600 dark:text-red-300",    btn: "bg-red-600 hover:bg-red-700 text-white" },
          blue:   { border: "border-l-blue-500",   iconBg: "bg-blue-50 dark:bg-blue-900/20",   iconText: "text-blue-600 dark:text-blue-300",   btn: "bg-blue-600 hover:bg-blue-700 text-white" },
          yellow: { border: "border-l-yellow-500", iconBg: "bg-yellow-50 dark:bg-yellow-900/20", iconText: "text-yellow-600 dark:text-yellow-300", btn: "bg-yellow-600 hover:bg-yellow-700 text-white" },
          slate:  { border: "border-l-slate-500",  iconBg: "bg-slate-50 dark:bg-slate-800",      iconText: "text-slate-600 dark:text-slate-300",  btn: "bg-primary text-primary-foreground" },
      };
      return colors[color] || colors.slate;
  };

  const theme = getColorClasses(colorClass);

  const handleClose = () => {
      if (onClose) onClose();
      closeModal();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={title} 
      className={`max-w-md border-l-4 ${theme.border}`}
    >
      <div className="space-y-5">
        
        {/* Encabezado con Icono */}
        <div className={`flex items-start gap-3 p-3 rounded-lg ${theme.iconBg} ${theme.iconText}`}>
          <Icon className="h-6 w-6 shrink-0" />
          <div className="text-sm font-bold pt-0.5">{title}</div>
        </div>

        {/* Contenido Dinámico */}
        <div className="px-1">
            {content(modalProps)}
        </div>

        {/* Footer con Botones */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={isSubmitting}
            className="w-full sm:w-auto" // Botón ancho completo en móvil
          >
            {cancelText}
          </Button>
          
          {onConfirm && (
            <Button 
                onClick={onConfirm} 
                disabled={isSubmitting} 
                className={`${theme.btn} w-full sm:w-auto`} // Botón ancho completo en móvil
            >
              {isSubmitting ? "Procesando..." : confirmText}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
