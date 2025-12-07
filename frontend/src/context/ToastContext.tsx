// frontend/src/context/ToastContext.tsx
"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Toast, ToastType } from "@/components/ui/Toast";

// Interfaz para la función que invoca el toast
interface ToastOptions {
  title?: string;
  description: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (opts: ToastOptions | string) => void;
    error: (opts: ToastOptions | string) => void;
    warning: (opts: ToastOptions | string) => void;
    info: (opts: ToastOptions | string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  description?: string;
  duration?: number;
}

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: ToastType, opts: ToastOptions | string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const options = typeof opts === "string" ? { description: opts } : opts;

    setToasts((prev) => [
      ...prev,
      {
        id,
        type,
        title: options.title,
        description: options.description,
        duration: options.duration,
      },
    ]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toastFuncs = {
    success: (opts: ToastOptions | string) => addToast("success", opts),
    error: (opts: ToastOptions | string) => addToast("error", opts),
    warning: (opts: ToastOptions | string) => addToast("warning", opts),
    info: (opts: ToastOptions | string) => addToast("info", opts),
  };

  return (
    <ToastContext.Provider value={{ toast: toastFuncs }}>
      {children}
      {/* Contenedor Global en la esquina inferior derecha */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
             <Toast 
                id={t.id}
                type={t.type}
                title={t.title}
                description={t.description}
                duration={t.duration}
                onRemove={removeToast}
             />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de un ToastProvider");
  }
  return context;
};
