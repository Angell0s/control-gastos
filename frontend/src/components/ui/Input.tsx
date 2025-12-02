import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <div className="w-full group">
        <input
          type={type}
          className={cn(
            // Base: rounded-full y px-6 para que el texto respire dentro de la curva
            "flex h-11 w-full rounded-full border border-gray-200 bg-gray-50 px-6 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 shadow-sm hover:bg-white hover:border-gray-300 hover:shadow-md",
            error && "border-red-500 focus-visible:ring-red-500 bg-red-50 text-red-900 placeholder:text-red-300",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1.5 ml-4 text-xs text-red-500 font-medium animate-in slide-in-from-top-1 fade-in-0">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
