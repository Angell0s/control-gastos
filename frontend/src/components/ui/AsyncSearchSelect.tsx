// frontend\src\components\ui\AsyncSearchSelect.tsx
"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import {
  MagnifyingGlassIcon,
  CheckIcon,
  PlusSmallIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";

export interface AsyncOption {
  value: string;
  label: string;
  raw?: any;
  actionId?: string;
  meta?: any;
}

interface AsyncSearchSelectProps {
  value: string | null;
  onChange: (value: string | null, option?: AsyncOption | null) => void;
  onOptionClick?: (option: AsyncOption) => void;
  fetchUrl?: string;
  queryParam?: string;
  fetchOptions?: (query: string) => Promise<AsyncOption[]>;
  mapResponseToOptions?: (data: any) => AsyncOption[];
  initialOptions?: AsyncOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  creatable?: boolean;
  onCreateOption?: (
    label: string
  ) => Promise<AsyncOption | null> | AsyncOption | null;
  alwaysEditing?: boolean;
  actionOptions?: AsyncOption[];
}

/**
 * Hook de debounce para callbacks.
 */
function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debounced = useCallback(
    (...args: any[]) => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debounced;
}

type MenuPosition = "bottom" | "top";

interface Coords {
  top: number;
  left: number;
  width: number;
}

/**
 * Hook para calcular posición. 
 */
function useDropdownPosition<T extends HTMLElement>(
  triggerRef: React.RefObject<T | null>,
  open: boolean,
  menuHeight: number = 240,
  gap: number = 6
) {
  const [menuPosition, setMenuPosition] = useState<MenuPosition>("bottom");
  const [coords, setCoords] = useState<Coords>({ top: 0, left: 0, width: 0 });

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const nextPosition: MenuPosition =
      spaceBelow < menuHeight && spaceAbove > spaceBelow ? "top" : "bottom";

    const viewportWidth = window.innerWidth;
    const maxWidth = viewportWidth - 16;
    const width = Math.min(rect.width, maxWidth);

    let left = rect.left + window.scrollX;
    if (left + width > viewportWidth - 8) left = viewportWidth - width - 8;
    if (left < 8) left = 8;

    const top =
      nextPosition === "bottom"
        ? rect.bottom + window.scrollY + gap
        : rect.top + window.scrollY - gap;

    setMenuPosition((prev) => (prev === nextPosition ? prev : nextPosition));
    setCoords((prev) => (prev.top === top && prev.left === left && prev.width === width ? prev : { top, left, width }));
  }, [triggerRef, menuHeight, gap]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [open, updatePosition]);

  return { menuPosition, coords };
}


export function AsyncSearchSelect({
  value,
  onChange,
  onOptionClick,
  fetchUrl,
  queryParam = "search",
  fetchOptions,
  mapResponseToOptions,
  initialOptions = [],
  placeholder = "Buscar...",
  disabled = false,
  className,
  creatable = false,
  onCreateOption,
  alwaysEditing = false,
  actionOptions = [],
}: AsyncSearchSelectProps) {
  const [options, setOptions] = useState<AsyncOption[]>(initialOptions);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const [searchLoading, setSearchLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [displayValue, setDisplayValue] = useState("");
  const [isEditing, setIsEditing] = useState(alwaysEditing || !value);

  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const shouldFocus = useRef(false);

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const menuId = useId();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const { menuPosition, coords } = useDropdownPosition(inputRef, open);

  // === Sincronizar valor seleccionado ===
  useEffect(() => {
    if (!value) {
      setDisplayValue("");
      if (!alwaysEditing) setIsEditing(true);
      return;
    }
    const selected = options.find((o) => o.value === value);
    if (selected) {
      setDisplayValue(selected.label);
      if (!alwaysEditing && !open) setIsEditing(false);
    }
  }, [value, options, alwaysEditing, open]);

  // === Auto-focus ===
  useEffect(() => {
    if (isEditing && inputRef.current && shouldFocus.current) {
      inputRef.current.focus();
      shouldFocus.current = false;
    }
  }, [isEditing]);

  // === CORRECCIÓN: Cerrar al hacer scroll (IGNORANDO EL PROPIO MENÚ) ===
  useEffect(() => {
    if (!open) return;

    const handleScroll = (event: Event) => {
      // Si el evento de scroll viene desde dentro del menú, NO cerramos.
      if (menuRef.current && menuRef.current.contains(event.target as Node)) {
        return;
      }
      // Si es un scroll de la página principal, cerramos.
      setOpen(false);
    };

    window.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  // === Cargar opciones ===
  const loadOptions = useCallback(
    async (term: string) => {
      if (!open) return;

      if (!term.trim()) {
        if (!isMountedRef.current) return;
        setOptions(initialOptions);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const currentRequestId = ++requestIdRef.current;

      try {
        setSearchLoading(true);

        if (fetchOptions) {
          const res = await fetchOptions(term);
          if (!isMountedRef.current) return;
          if (currentRequestId !== requestIdRef.current) return;
          setOptions(res);
          return;
        }

        if (!fetchUrl) return;

        const separator = fetchUrl.includes("?") ? "&" : "?";
        const url = `${fetchUrl}${separator}${encodeURIComponent(
          queryParam
        )}=${encodeURIComponent(term)}`;

        const res = await api.get(url, { signal: controller.signal });
        const data = res.data;

        if (!isMountedRef.current) return;
        if (currentRequestId !== requestIdRef.current) return;

        if (mapResponseToOptions) {
          setOptions(mapResponseToOptions(data));
        } else {
          const mapped: AsyncOption[] = (data as any[]).map((item) => ({
            value: item.id,
            label:
              item.is_active === false
                ? `${item.name} (Inactivo)`
                : item.name,
            raw: item,
          }));
          setOptions(mapped);
        }
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.name === "AbortError") {
          return;
        }
        console.error("Error buscando opciones", err);
      } finally {
        if (!isMountedRef.current) return;
        if (currentRequestId !== requestIdRef.current) return;
        setSearchLoading(false);
      }
    },
    [
      open,
      initialOptions,
      fetchOptions,
      fetchUrl,
      queryParam,
      mapResponseToOptions,
    ]
  );

  const debouncedLoadOptions = useDebouncedCallback(loadOptions, 300);

  useEffect(() => {
    if (!open) return;
    debouncedLoadOptions(query);
  }, [query, open, debouncedLoadOptions]);

  // === Click outside ===
  useEffect(() => {
    if (!open && !(isEditing && value && !alwaysEditing)) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (inputRef.current?.contains(target as Node)) return;
      if (menuRef.current?.contains(target as Node)) return;

      setOpen(false);

      if (value && !alwaysEditing) {
        setIsEditing(false);
        const selected = options.find((o) => o.value === value);
        if (selected) setDisplayValue(selected.label);
      } else {
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [open, value, isEditing, alwaysEditing, options]);

  // === Opción de crear dinámica ===
  const createOption: AsyncOption | null = useMemo(() => {
    if (!creatable) return null;
    if (!onCreateOption) return null;
    if (!query.trim()) return null;
    if (searchLoading || createLoading) return null;

    return {
      value: "",
      label: `Crear "${query.trim()}"`,
      actionId: "create-new",
    };
  }, [creatable, onCreateOption, query, searchLoading, createLoading]);

  // === Todas las opciones del menú ===
  const menuOptions: AsyncOption[] = useMemo(() => {
    const base = [...options, ...actionOptions];
    if (createOption) {
      return [...base, createOption];
    }
    return base;
  }, [options, actionOptions, createOption]);

  // === Click en opción ===
  const handleOptionClick = useCallback(
    async (option: AsyncOption) => {
      onOptionClick?.(option);

      if (option.actionId === "create-new" && onCreateOption) {
        // ✅ CORRECCIÓN: Cerramos el menú INMEDIATAMENTE para que no estorbe al modal
        setOpen(false);

        try {
          setCreateLoading(true); // Esto mostrará el spinner pequeño en el input, lo cual es buen feedback
          
          // Esperamos a que el usuario confirme en el modal (o cancele)
          const created = await onCreateOption(query.trim());
          
          if (created && isMountedRef.current) {
            setOptions((prev) => [created, ...prev]);
            onChange(created.value, created);
            setDisplayValue(created.label);
            setIsEditing(false);
            setQuery(""); // Limpiamos la búsqueda solo si se creó con éxito
          }
        } catch (err) {
          console.error("Error creando opción", err);
        } finally {
          if (isMountedRef.current) {
            setCreateLoading(false);
          }
        }
        return;
      }

      // Comportamiento normal para opciones existentes
      if (option.value && option.value !== "") {
        onChange(option.value, option);
        setDisplayValue(option.label);
        setIsEditing(false);
      }

      setOpen(false);
      setQuery("");
    },
    [onOptionClick, onCreateOption, query, onChange]
  );

  // === Render: Portal del menú ===
  const menuPortal = useMemo(() => {
    if (!open) return null;

    return createPortal(
      <div
        ref={menuRef}
        id={menuId}
        style={{
          position: "fixed",
          left: coords.left,
          width: coords.width,
          maxWidth: "calc(100vw - 16px)",
          zIndex: 9999,
          ...(menuPosition === "top"
            ? { bottom: window.innerHeight - coords.top }
            : { top: coords.top }),
        }}
        className={cn(
          "pointer-events-auto overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-950 shadow-xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50",
          menuPosition === "bottom"
            ? "animate-in fade-in slide-in-from-top-2 duration-200"
            : "animate-in fade-in slide-in-from-bottom-2 duration-200"
        )}
      >
        <div
          className={cn(
            "max-h-60 overflow-y-auto p-1 flex flex-col",
            menuPosition === "top" && "flex-col-reverse"
          )}
        >
          {menuOptions.length === 0 && !searchLoading && !createLoading && (
            <div className="px-3 py-2 text-sm text-slate-500">
              No se encontraron resultados
            </div>
          )}

          {menuOptions.map((opt, i) => (
            <div
              key={opt.value || opt.actionId || i}
              onClick={() => handleOptionClick(opt)}
              className={cn(
                "relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors shrink-0",
                (!opt.value || opt.actionId) &&
                  "text-primary font-medium hover:bg-primary/5 dark:hover:bg-primary/10",
                opt.value && value === opt.value
                  ? "bg-primary/10 text-primary dark:bg-primary/20 font-medium"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              )}
            >
              {opt.actionId === "create-new" && (
                <PlusSmallIcon className="mr-2 h-4 w-4" />
              )}
              <span className="block truncate flex-1">{opt.label}</span>
              {opt.value && value === opt.value && (
                <CheckIcon className="h-4 w-4 text-primary ml-2" />
              )}
            </div>
          ))}

          {(searchLoading || createLoading) && (
            <div className="px-3 py-2 flex items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-primary dark:border-slate-700 dark:border-t-primary" />
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  }, [
    open,
    coords,
    menuPosition,
    menuOptions,
    searchLoading,
    createLoading,
    value,
    handleOptionClick,
    menuId,
  ]);

  // === Render: Vista solo lectura/display ===
  if (!isEditing && value) {
    return (
      <div
        className={cn(
          "w-full h-9 flex items-center justify-between rounded-md border border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-1 text-sm cursor-pointer transition-all group",
          className
        )}
        onClick={() => {
          if (disabled) return;
          shouldFocus.current = true;
          setIsEditing(true);
          setQuery("");
          setOptions(initialOptions);
          requestAnimationFrame(() => setOpen(true));
        }}
      >
        <span className="truncate text-slate-900 dark:text-slate-100 font-medium">
          {displayValue || placeholder}
        </span>
        <PencilIcon className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  const inputValue = open ? query : displayValue;

  // === Render principal ===
  return (
    <div className={cn("relative w-full group", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          disabled={disabled}
          className={cn(
            "w-full h-9 rounded-md border bg-transparent px-3 py-1 pr-9 text-base sm:text-sm shadow-sm transition-colors",
            "border-slate-200 text-slate-900 placeholder:text-slate-400",
            "dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-500",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary",
            disabled && "cursor-not-allowed opacity-50"
          )}
          placeholder={placeholder}
          value={inputValue}
          onFocus={() => {
            setOpen(true);
            if (value) setQuery("");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {searchLoading || createLoading ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-primary dark:border-slate-700" />
          ) : (
            <MagnifyingGlassIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          )}
        </div>
      </div>

      {menuPortal}
    </div>
  );
}
