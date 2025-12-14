// frontend/src/components/Modal.tsx
"use client";

import { ReactNode, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode; // Acepta strings o elementos (como el título con botón de ayuda)
  children: ReactNode;
  className?: string;
  headerActions?: ReactNode;
}

export function Modal({ isOpen, onClose, title, children, className, headerActions }: ModalProps) {
  
  // 1. Cierra el modal con la tecla ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // 2. ✅ Bloqueo de Scroll del Body
  useEffect(() => {
    if (isOpen) {
      // Al abrir, bloqueamos el scroll
      document.body.style.overflow = "hidden";
    } else {
      // Al cerrar (isOpen false), liberamos
      document.body.style.overflow = "unset";
    }

    // Cleanup: Asegura que se libere si el componente se desmonta abruptamente
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          
          {/* OVERLAY */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* CONTENIDO */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()} 
            className={cn(
              "relative bg-card text-card-foreground rounded-xl shadow-2xl border border-border w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]", // Flex col para manejar scroll interno mejor
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-4 bg-muted/20 shrink-0">
              <div className="text-lg font-semibold flex items-center gap-2">
                 {title}
              </div>
              
              <div className="flex items-center gap-2">
                {headerActions}
                <button
                  onClick={onClose}
                  className="rounded-full p-1.5 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body con Scroll Interno */}
            {/* 'overflow-y-auto' permite scrollear el contenido del modal si es muy largo, mientras el body está bloqueado */}
            <div className="p-6 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
