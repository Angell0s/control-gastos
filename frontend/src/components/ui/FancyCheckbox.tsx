// frontend/src/components/ui/FancyCheckbox.tsx
import React, { useId } from 'react';

interface FancyCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  className?: string;
}

export const FancyCheckbox = ({ checked, onChange, label, className = "" }: FancyCheckboxProps) => {
  const id = useId();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Wrapper del Checkbox */}
      <div className="relative w-[18px] h-[18px]">
        <input 
          type="checkbox" 
          id={id} 
          style={{ display: 'none' }} 
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <label htmlFor={id} className="check-box-custom">
          <svg width="18px" height="18px" viewBox="0 0 18 18">
            <path d="M 1 9 L 1 9 c 0 -5 3 -8 8 -8 L 9 1 C 14 1 17 5 17 9 L 17 9 c 0 4 -4 8 -8 8 L 9 17 C 5 17 1 14 1 9 L 1 9 Z" />
            <polyline points="1 9 7 14 15 4" />
          </svg>
        </label>
      </div>

      {/* Label de texto opcional */}
      {label && (
        <label htmlFor={id} className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
          {label}
        </label>
      )}

      {/* Estilos encapsulados para la animación SVG */}
      <style jsx>{`
        .check-box-custom {
          cursor: pointer;
          position: relative;
          margin: auto;
          width: 18px;
          height: 18px;
          -webkit-tap-highlight-color: transparent;
          transform: translate3d(0, 0, 0);
          display: block;
        }

        .check-box-custom svg {
          position: relative;
          z-index: 1;
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
          /* Color inactivo adaptable al tema */
          stroke: var(--muted-foreground); 
          opacity: 0.7;
          stroke-width: 1.5;
          transform: translate3d(0, 0, 0);
          transition: all 0.2s ease;
        }

        .check-box-custom svg path {
          stroke-dasharray: 60;
          stroke-dashoffset: 0;
        }

        .check-box-custom svg polyline {
          stroke-dasharray: 22;
          stroke-dashoffset: 66;
        }

        .check-box-custom:hover svg {
          /* Color primario al hover */
          stroke: var(--primary);
          opacity: 1;
        }

        /* Estado Checked */
        input:checked + .check-box-custom svg {
          stroke: var(--primary); /* Color primario activo */
          opacity: 1;
        }

        input:checked + .check-box-custom svg path {
          stroke-dashoffset: 60;
          transition: all 0.3s linear;
        }

        input:checked + .check-box-custom svg polyline {
          stroke-dashoffset: 42;
          transition: all 0.2s linear;
          transition-delay: 0.15s;
        }
      `}</style>
    </div>
  );
};
