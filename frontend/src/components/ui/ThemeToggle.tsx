"use client";

import * as React from "react";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useTheme } from "next-themes";
import { Button } from "./Button";

export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const { theme, setTheme } = useTheme();
  // Evitamos errores de hidratación esperando a que monte
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9" />; // Placeholder invisible
  }

  return (
    <Button
      variant="ghost"
      size={showLabel ? "default" : "icon"}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="w-full justify-start lg:w-auto lg:justify-center"
    >
      <SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 block dark:hidden" />
      <MoonIcon className="h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 hidden dark:block" />
      
      {showLabel && (
        <span className="ml-2">
          {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
        </span>
      )}
      <span className="sr-only">Cambiar tema</span>
    </Button>
  );
}
