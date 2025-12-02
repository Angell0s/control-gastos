"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
// Si usas TypeScript estricto, next-themes a veces pide props específicas,
// pero generalmente 'any' o la interfaz de ThemeProviderProps funcionan.
// Para simplificar y evitar conflictos de tipos de librerías externas:
import type { ThemeProviderProps } from "next-themes"; 

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
