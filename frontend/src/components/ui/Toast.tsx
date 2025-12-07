//frontend\src\components\ui\Toast.tsx
import * as React from "react";
import { cn } from "@/lib/utils";
// Importamos los iconos de Heroicons
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  XMarkIcon 
} from "@heroicons/react/24/outline";

export type ToastType = "error" | "success" | "warning" | "info";

export interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  type?: ToastType;
  duration?: number;
  onRemove: (id: string) => void;
}

// Configuración de estilos e iconos según el tipo
const toastConfig = {
  error: {
    colorClass: "text-red-600 dark:text-red-500",
    bgIcon: "bg-red-50 dark:bg-red-900/20",
    icon: <XCircleIcon className="w-full h-full" />,
  },
  success: {
    colorClass: "text-emerald-600 dark:text-emerald-500",
    bgIcon: "bg-emerald-50 dark:bg-emerald-900/20",
    icon: <CheckCircleIcon className="w-full h-full" />,
  },
  warning: {
    colorClass: "text-amber-600 dark:text-amber-500",
    bgIcon: "bg-amber-50 dark:bg-amber-900/20",
    icon: <ExclamationTriangleIcon className="w-full h-full" />,
  },
  info: {
    colorClass: "text-blue-600 dark:text-blue-500",
    bgIcon: "bg-blue-50 dark:bg-blue-900/20",
    icon: <InformationCircleIcon className="w-full h-full" />,
  },
};

export const Toast = ({
  id,
  title,
  description,
  type = "error",
  duration = 4000,
  onRemove,
}: ToastProps) => {
  const [isExiting, setIsExiting] = React.useState(false);
  const config = toastConfig[type];

  React.useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    // Esperamos a la animación de salida (300ms)
    setTimeout(() => {
      onRemove(id);
    }, 300);
  };

  return (
    <div
      className={cn(
        // Layout y Base
        "relative flex items-center justify-between gap-4 overflow-hidden rounded-lg border border-border/50",
        "w-[340px] min-h-[80px] p-4 shadow-lg backdrop-blur-sm",
        "bg-card/95 text-card-foreground dark:bg-card",
        
        // Animaciones de Entrada
        "animate-in slide-in-from-right-full fade-in duration-300",
        
        // Animación de Salida
        isExiting && "animate-out slide-out-to-right-full fade-out duration-300 fill-mode-forwards",
        
        // Interacción
        "hover:shadow-md transition-all"
      )}
      role="alert"
    >
      {/* Wave SVG Background (Decorativo, mantenemos el SVG custom ya que Heroicons no tiene waves) */}
      <div className="absolute -left-[31px] top-[32px] w-[80px] rotate-90 opacity-10 pointer-events-none">
        <svg viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg" className={cn("fill-current transition-colors", config.colorClass)}>
           <path d="M0,256L11.4,240C22.9,224,46,192,69,192C91.4,192,114,224,137,234.7C160,245,183,235,206,213.3C228.6,192,251,160,274,149.3C297.1,139,320,149,343,181.3C365.7,213,389,267,411,282.7C434.3,299,457,277,480,250.7C502.9,224,526,192,549,181.3C571.4,171,594,181,617,208C640,235,663,277,686,256C708.6,235,731,149,754,122.7C777.1,96,800,128,823,165.3C845.7,203,869,245,891,224C914.3,203,937,117,960,112C982.9,107,1006,181,1029,197.3C1051.4,213,1074,171,1097,144C1120,117,1143,107,1166,133.3C1188.6,160,1211,224,1234,218.7C1257.1,213,1280,139,1303,133.3C1325.7,128,1349,192,1371,192C1394.3,192,1417,128,1429,96L1440,64L1440,320L1428.6,320C1417.1,320,1394,320,1371,320C1348.6,320,1326,320,1303,320C1280,320,1257,320,1234,320C1211.4,320,1189,320,1166,320C1142.9,320,1120,320,1097,320C1074.3,320,1051,320,1029,320C1005.7,320,983,320,960,320C937.1,320,914,320,891,320C868.6,320,846,320,823,320C800,320,777,320,754,320C731.4,320,709,320,686,320C662.9,320,640,320,617,320C594.3,320,571,320,549,320C525.7,320,503,320,480,320C457.1,320,434,320,411,320C388.6,320,366,320,343,320C320,320,297,320,274,320C251.4,320,229,320,206,320C182.9,320,160,320,137,320C114.3,320,91,320,69,320C45.7,320,23,320,11,320L0,320Z" />
        </svg>
      </div>

      {/* Icono Container Principal */}
      <div className={cn(
        "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-opacity-50 backdrop-blur-sm transition-colors",
        config.bgIcon
      )}>
        <div className={cn("h-6 w-6", config.colorClass)}>
          {config.icon}
        </div>
      </div>

      {/* Textos */}
      <div className="relative z-10 flex flex-1 flex-col justify-center gap-1">
        <p className={cn("text-[15px] font-bold leading-tight tracking-tight", config.colorClass)}>
          {title || type.charAt(0).toUpperCase() + type.slice(1)}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground font-medium">
            {description}
          </p>
        )}
      </div>

      {/* Botón Cerrar con Heroicon */}
      <button 
        onClick={handleClose}
        className="relative z-10 shrink-0 rounded-md p-1 text-muted-foreground/50 hover:text-foreground hover:bg-secondary transition-all duration-200 active:scale-90"
        aria-label="Close"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  );
};
