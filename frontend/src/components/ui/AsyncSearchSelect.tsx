"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { MagnifyingGlassIcon, CheckIcon, PlusSmallIcon, PencilIcon } from "@heroicons/react/24/outline";

export interface AsyncOption {
  value: string;
  label: string;
  raw?: any;
}

interface AsyncSearchSelectProps {
  value: string | null;
  onChange: (value: string | null, option?: AsyncOption | null) => void;
  fetchUrl?: string;
  queryParam?: string;
  fetchOptions?: (query: string) => Promise<AsyncOption[]>;
  mapResponseToOptions?: (data: any) => AsyncOption[];
  initialOptions?: AsyncOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  creatable?: boolean;
  onCreateOption?: (label: string) => Promise<AsyncOption | null> | AsyncOption | null;
  alwaysEditing?: boolean; 
}

export function AsyncSearchSelect({
  value,
  onChange,
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
}: AsyncSearchSelectProps) {
  const [options, setOptions] = useState<AsyncOption[]>(initialOptions);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [displayValue, setDisplayValue] = useState("");
  
  const [isEditing, setIsEditing] = useState(alwaysEditing || !value);

  const inputRef = useRef<HTMLInputElement>(null);
  const shouldFocus = useRef(false); 
  
  const [menuPosition, setMenuPosition] = useState<'bottom' | 'top'>('bottom');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  // Sincronizar valor externo
  useEffect(() => {
    if (!value) {
      setDisplayValue("");
      if (!alwaysEditing) setIsEditing(true);
      return;
    }
    const selected = options.find(o => o.value === value);
    if (selected) {
        setDisplayValue(selected.label);
        if (!alwaysEditing && !open) setIsEditing(false);
    } else {
         if (!displayValue && !alwaysEditing) setIsEditing(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, options]);

  // Auto-focus controlado
  useEffect(() => {
    if (isEditing && inputRef.current && shouldFocus.current) {
        inputRef.current.focus();
        shouldFocus.current = false;
    }
  }, [isEditing]);


  // Cargar opciones
  const loadOptions = async (term: string) => {
    if (!term.trim()) {
      if(initialOptions.length > 0) setOptions(initialOptions);
      return;
    }
    try {
      setLoading(true);
      if (fetchOptions) {
        const res = await fetchOptions(term);
        setOptions(res);
        return;
      }
      if (!fetchUrl) return;
      
      const url = `${fetchUrl}?${encodeURIComponent(queryParam)}=${encodeURIComponent(term)}`;
      const res = await api.get(url);
      const data = res.data;

      if (mapResponseToOptions) {
        setOptions(mapResponseToOptions(data));
      } else {
        const mapped: AsyncOption[] = (data as any[]).map(item => ({
          value: item.id,
          label: item.name,
          raw: item,
        }));
        setOptions(mapped);
      }
    } catch (err) {
      console.error("Error buscando opciones", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => loadOptions(query), 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  // Cálculo de posición
  useEffect(() => {
    if (open && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const menuHeight = 240; // Estimar altura máxima
      const gap = 6;
      
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      let position: 'bottom' | 'top' = 'bottom';
      
      if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
        position = 'top';
      }
      
      setMenuPosition(position);
      
      if (position === 'bottom') {
          setCoords({
            top: rect.bottom + window.scrollY + gap,
            left: rect.left + window.scrollX,
            width: rect.width,
          });
      } else {
          setCoords({
             top: rect.top + window.scrollY - gap,
             left: rect.left + window.scrollX,
             width: rect.width,
          });
      }
    }
  }, [open, query, options]);

  useEffect(() => {
    const handleScroll = () => { if(open) setOpen(false); };
    window.addEventListener("scroll", handleScroll, true); 
    window.addEventListener("resize", handleScroll);
    return () => {
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleScroll);
    };
  }, [open]);

  // Click Outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && inputRef.current.contains(e.target as Node)) return;
      const menuElement = document.getElementById("async-select-menu");
      if (menuElement && menuElement.contains(e.target as Node)) return;

      setOpen(false);
      if (value && !alwaysEditing) {
          setIsEditing(false);
          const selected = options.find(o => o.value === value);
          if (selected) setDisplayValue(selected.label);
      } else {
          if(!value) setQuery(""); 
      }
    };
    
    if (open || (isEditing && value && !alwaysEditing)) { 
        document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, value, isEditing, alwaysEditing, options]);

  const handleSelect = (opt: AsyncOption) => {
    onChange(opt.value, opt);
    setDisplayValue(opt.label);
    setQuery("");
    setOpen(false);
    if (!alwaysEditing) setIsEditing(false);
  };

  const handleCreate = async () => {
    if (!onCreateOption) return;
    const label = query.trim();
    if (!label) return;
    try {
      setLoading(true);
      const newOpt = await onCreateOption(label);
      if (newOpt) {
        setOptions(prev => [...prev, newOpt]);
        handleSelect(newOpt);
      }
    } finally {
      setLoading(false);
    }
  };

  const showCreate = creatable && onCreateOption && query.trim().length > 0 && !loading && !options.some(o => o.label.toLowerCase() === query.trim().toLowerCase());


  if (!isEditing && value) {
      return (
        <div 
            className={cn(
                "w-full h-9 flex items-center justify-between rounded-md border border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-1 text-sm cursor-pointer transition-all group",
                className
            )}
            onClick={() => {
                if (!disabled) {
                    shouldFocus.current = true;
                    setIsEditing(true);
                    setQuery(""); 
                    setOptions(initialOptions);
                    setTimeout(() => setOpen(true), 50); 
                }
            }}
        >
            <span className="truncate text-slate-900 dark:text-slate-100 font-medium">
                {displayValue || placeholder}
            </span>
            <PencilIcon className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      );
  }

  return (
    <div className={cn("relative w-full group", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          disabled={disabled}
          className={cn(
            // ✅ CORRECCIÓN ZOOM IOS: 'text-base sm:text-sm'
            "w-full h-9 rounded-md border bg-transparent px-3 py-1 pr-9 text-base sm:text-sm shadow-sm transition-colors",
            "border-slate-200 text-slate-900 placeholder:text-slate-400",
            "dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-500",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary",
            disabled && "cursor-not-allowed opacity-50"
          )}
          placeholder={placeholder}
          value={open ? query : (query || displayValue)}
          onFocus={() => {
            setOpen(true);
            if(value) setQuery("");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {loading ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-primary dark:border-slate-700" />
          ) : (
            <MagnifyingGlassIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          )}
        </div>
      </div>

      {open && (options.length > 0 || showCreate) && createPortal(
        <div
            id="async-select-menu"
            style={{
                position: 'fixed',
                left: coords.left,
                width: coords.width,
                zIndex: 9999,
                ...(menuPosition === 'top' 
                    ? { bottom: window.innerHeight - coords.top } 
                    : { top: coords.top }
                )
            }}
            className={cn(
                "overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-950 shadow-xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50",
                menuPosition === 'bottom' 
                    ? "animate-in fade-in slide-in-from-top-2 duration-200" 
                    : "animate-in fade-in slide-in-from-bottom-2 duration-200"
            )}
        >
            <div className={cn(
                "max-h-60 overflow-y-auto p-1 flex flex-col",
                menuPosition === 'top' && "flex-col-reverse" 
            )}>
                {options.map((opt) => (
                    <div
                        key={opt.value}
                        onClick={() => handleSelect(opt)}
                        className={cn(
                            "relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors shrink-0",
                            value === opt.value 
                                ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground font-medium" 
                                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        )}
                    >
                        <span className="block truncate flex-1">{opt.label}</span>
                        {value === opt.value && (
                            <CheckIcon className="h-4 w-4 text-primary" />
                        )}
                    </div>
                ))}

                {showCreate && (
                    <div
                        onClick={handleCreate}
                        className={cn(
                            "group flex cursor-pointer select-none items-center rounded-md px-2 py-2 text-sm text-primary hover:bg-primary/5 dark:hover:bg-primary/10 shrink-0",
                            menuPosition === 'bottom' 
                                ? "mt-1 border-t border-slate-100 dark:border-slate-800" 
                                : "mb-1 border-b border-slate-100 dark:border-slate-800"
                        )}
                    >
                        <PlusSmallIcon className="mr-2 h-4 w-4" />
                        <span className="font-medium">Crear &quot;{query.trim()}&quot;</span>
                    </div>
                )}
            </div>
        </div>,
        document.body
      )}
    </div>
  );
}
