//frontend\src\app\layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import AuthProvider from "@/components/AuthProvider";
import { ToastProvider } from "@/context/ToastContext";
import { ModalProvider } from "@/components/providers/ModalProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Control de Gastos",
  description: "Aplicación para administrar tus finanzas personales",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <html lang="es" suppressHydrationWarning>
        <body className={inter.className}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ModalProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </ModalProvider>
          </ThemeProvider>
        </body>
      </html>
    </AuthProvider>
  );
}
