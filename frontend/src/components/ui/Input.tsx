// frontend/src/components/ui/Input.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  error?: string;
  icon?: React.ReactNode;
  isCurrency?: boolean;
  prefixText?: string; // ✅ Nueva prop para el hint (ej: "$")
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onValueChange?: (value: number) => void;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, isCurrency, prefixText, value, onChange, onValueChange, ...props }, ref) => {
    
    const [displayValue, setDisplayValue] = React.useState("");

    React.useEffect(() => {
      if (!isCurrency) return;
      if (value === 0 || value === "" || value === undefined) {
        // Lógica simplificada de reset
      }
    }, [value, isCurrency]);

    React.useEffect(() => {
      if (isCurrency && value !== undefined && value !== "") {
        const numericVal = parseFloat(value.toString());
        if (!isNaN(numericVal)) {
           const currentNumeric = parseFloat(displayValue.replace(/,/g, ""));
           if (currentNumeric !== numericVal) {
             setDisplayValue(numericVal.toLocaleString("es-MX", { maximumFractionDigits: 2 }));
           }
        }
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]); 

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputVal = e.target.value;
      
      if (inputVal === "") {
        setDisplayValue("");
        if (onValueChange) onValueChange(0);
        if (onChange) { e.target.value = "0"; onChange(e); }
        return;
      }

      const rawValue = inputVal.replace(/,/g, "");
      if (!/^\d*\.?\d{0,2}$/.test(rawValue)) return;

      setDisplayValue(inputVal);
      const numberVal = parseFloat(rawValue) || 0;
      
      if (onValueChange) onValueChange(numberVal);
      if (onChange) { e.target.value = rawValue; onChange(e); }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (isCurrency) {
        const rawValue = displayValue.replace(/,/g, "");
        const numberVal = parseFloat(rawValue);
        if (!isNaN(numberVal) && rawValue !== "") {
          setDisplayValue(numberVal.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        }
      }
      if (props.onBlur) props.onBlur(e);
    };

    return (
      <div className="w-full group relative flex items-center">
        {/* Icono (SVG o similar) */}
        {icon && (
          <div className="absolute left-3 text-muted-foreground/70 transition-colors group-focus-within:text-primary z-10 pointer-events-none flex items-center">
            {icon}
          </div>
        )}

        {/* Prefix Text (Texto fijo como "$") */}
        {prefixText && (
          <div className="absolute left-2 text-muted-foreground font-medium z-10 pointer-events-none select-none text-sm">
            {prefixText}
          </div>
        )}

        <input
          ref={ref}
          type={isCurrency ? "text" : type}
          inputMode={isCurrency ? "decimal" : props.inputMode}
          className={cn(
            // Estilos Base
            "flex h-10 w-full rounded-lg border-2 border-transparent bg-secondary px-4 py-2 text-base sm:text-sm text-foreground transition-all duration-300",
            "placeholder:text-muted-foreground/60",
            
            // Hover & Focus
            "hover:bg-background hover:border-border hover:shadow-sm",
            "focus:outline-none focus:bg-background focus:border-primary/50 focus:ring-4 focus:ring-primary/10",

            // Padding ajustes
            icon && "pl-10",
            prefixText && "pl-6", // Espacio para el $
            (icon && prefixText) && "pl-12", // Si hubiera ambos

            // Currency styles
            isCurrency && "text-right font-mono",

            // Error styles
            error && "border-red-500/50 bg-red-50/50 text-red-900 focus:border-red-500",
            
            className
          )}
          value={isCurrency ? displayValue : value}
          onChange={isCurrency ? handleCurrencyChange : onChange}
          onBlur={handleBlur}
          {...props}
        />
        
        {error && (
          <div className="absolute -bottom-5 left-1">
              <p className="text-xs text-red-500 font-medium animate-in slide-in-from-top-1 fade-in-0">
                {error}
              </p>
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
