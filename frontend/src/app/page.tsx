// frontend/src/app/page.tsx
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col items-center gap-8 py-32 px-16 bg-white dark:bg-zinc-950 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 transition-all sm:items-center text-center">
        
        {/* Logo */}
        <Image
          className="dark:invert mb-4"
          src="/next.svg"
          alt="Next.js logo"
          width={120}
          height={24}
          priority
        />

        {/* Texto de Bienvenida */}
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-4xl font-bold tracking-tight text-black dark:text-zinc-50">
            Bienvenido a Gastos App
          </h1>
          <p className="max-w-md text-lg leading-7 text-zinc-600 dark:text-zinc-400">
            Gestiona tus finanzas de forma inteligente y mantén el control de tus ahorros en un solo lugar.
          </p>
        </div>

        {/* Botón de Acción Principal */}
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <Link href="/login">
            <Button size="lg" className="w-full text-lg font-medium shadow-lg shadow-blue-500/10">
              Inicia sesión para empezar
            </Button>
          </Link>
          
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            ¿No tienes cuenta? <Link href="/login" className="text-blue-600 hover:underline">Regístrate gratis</Link>
          </p>
        </div>

        <hr className="w-full border-zinc-100 dark:border-zinc-800 mt-4" />

        {/* Footer Minimalista */}
        <div className="flex gap-6 text-sm text-zinc-500 dark:text-zinc-400">
          <a href="https://nextjs.org/docs" target="_blank" className="hover:text-black dark:hover:text-white transition-colors">
            Documentación
          </a>
          <span>•</span>
          <a href="https://vercel.com/templates" target="_blank" className="hover:text-black dark:hover:text-white transition-colors">
            Plantillas
          </a>
        </div>
      </main>
    </div>
  );
}