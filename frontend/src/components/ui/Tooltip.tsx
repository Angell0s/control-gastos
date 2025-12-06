// frontend/src/components/ui/Tooltip.tsx
import React from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  className?: string;
  /**
   * Si se define, controla manualmente la visibilidad.
   * Si es undefined, funciona con hover (comportamiento por defecto).
   */
  show?: boolean; 
  variant?: "default" | "error";
}

export const Tooltip = ({ text, children, className, show, variant = "default" }: TooltipProps) => {
  return (
    <div className="relative flex flex-col items-center group">
      
      {/* El Tooltip en sí */}
      <div
        className={cn(
          "absolute bottom-full mb-2 flex flex-col items-center z-50 whitespace-nowrap pointer-events-none transition-all duration-300 ease-in-out transform origin-bottom",
          // Visibilidad: Control manual (show) O hover del grupo
          show === true 
             ? "opacity-100 scale-100 translate-y-0" 
             : (show === false ? "opacity-0 scale-90 translate-y-2" : "opacity-0 scale-90 translate-y-2 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0"),
          className
        )}
      >
        <span 
            className={cn(
                "relative z-10 p-2 text-xs font-semibold text-white rounded-md shadow-lg",
                variant === "error" ? "bg-red-500" : "bg-neutral-800"
            )}
        >
          {text}
          {/* Flechita inferior */}
          <span 
            className={cn(
                "absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 -z-10",
                variant === "error" ? "bg-red-500" : "bg-neutral-800"
            )}
          ></span>
        </span>
      </div>

      {/* El elemento que activa el tooltip */}
      {children}
    </div>
  );
};
