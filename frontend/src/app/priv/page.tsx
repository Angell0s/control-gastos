//frontend\src\app\priv\page.tsx
"use client";

import Link from "next/link";
import { 
  ShieldCheckIcon, 
  ArrowLeftIcon, 
  LockClosedIcon, 
  ServerStackIcon, 
  DocumentTextIcon 
} from "@heroicons/react/24/outline";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* --- NAV BAR SIMPLIFICADA --- */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* ✅ ACTUALIZADO: Redirige al Login */}
          <Link 
            href="/login" 
            className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Volver al Inicio
          </Link>

          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
            <ShieldCheckIcon className="h-6 w-6 text-green-600" />
            <span>Privacidad y Datos</span>
          </div>
        </div>
      </header>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <main className="max-w-3xl mx-auto px-6 py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Política de Privacidad
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Transparencia total sobre cómo protegemos, gestionamos y utilizamos tu información financiera.
          </p>
          <p className="text-sm text-slate-400 uppercase tracking-widest font-semibold">
            Última actualización: Diciembre 2025
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 sm:p-12 space-y-10">
          
          {/* SECCIÓN 1 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                <DocumentTextIcon className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">1. Introducción</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Bienvenido a nuestra plataforma. Entendemos que la información financiera es sensible y personal. 
              Esta política describe nuestro compromiso inquebrantable de proteger tu privacidad y explicarte claramente qué hacemos (y qué no hacemos) con tus datos.
              Al utilizar nuestros servicios, aceptas las prácticas descritas en este documento.
            </p>
          </section>

          {/* SECCIÓN 2 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                <ServerStackIcon className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">2. Información Recopilada</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Para brindarte el servicio de control de gastos, necesitamos procesar ciertos datos que tú nos proporcionas voluntariamente:
            </p>
            <ul className="space-y-3 pl-2">
              <li className="flex gap-3 items-start text-slate-600 dark:text-slate-300">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                <span><strong>Datos de Identificación:</strong> Nombre, correo electrónico y credenciales de acceso (encriptadas).</span>
              </li>
              <li className="flex gap-3 items-start text-slate-600 dark:text-slate-300">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                <span><strong>Datos Transaccionales:</strong> Montos, fechas, descripciones, categorías y notas de tus ingresos y gastos.</span>
              </li>
              <li className="flex gap-3 items-start text-slate-600 dark:text-slate-300">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                <span><strong>Metadatos Técnicos:</strong> Dirección IP, tipo de dispositivo y fecha de último acceso para auditoría de seguridad.</span>
              </li>
            </ul>
          </section>

          {/* SECCIÓN 3 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
                <LockClosedIcon className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">3. Uso y No Divulgación</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Utilizamos tus datos estrictamente para el funcionamiento interno de la aplicación: generar tus reportes, mostrar tus historiales y asegurar tu cuenta.
            </p>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border-l-4 border-orange-500 text-sm text-slate-700 dark:text-slate-300 italic">
              "Bajo ninguna circunstancia vendemos, comercializamos ni transferimos tus datos financieros o personales a terceros con fines publicitarios o de marketing."
            </div>
          </section>

          {/* SECCIÓN 4 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">4. Tus Derechos</h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Como propietario de tu información, tienes control total sobre ella. A través de tu panel de configuración puedes:
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <li className="p-3 rounded bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300">
                📥 Descargar tus datos
              </li>
              <li className="p-3 rounded bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300">
                ✏️ Corregir registros erróneos
              </li>
              <li className="p-3 rounded bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300">
                🗑️ Eliminar tu cuenta permanentemente
              </li>
            </ul>
          </section>

          {/* SECCIÓN 5 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">5. Cambios a esta Política</h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Nos reservamos el derecho de actualizar esta política para reflejar cambios en nuestras prácticas o por requisitos legales. 
              Te notificaremos sobre cualquier cambio significativo a través de la aplicación o por correo electrónico antes de que entre en vigor.
            </p>
          </section>

        </div>

        {/* FOOTER DE LA PÁGINA */}
        <div className="mt-12 text-center border-t border-slate-200 dark:border-slate-800 pt-8">
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            ¿Tienes dudas sobre tu privacidad?
          </p>
          <a 
            href="mailto:privacidad@midominio.com" 
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 transition-colors"
          >
            Contáctanos
          </a>
        </div>

      </main>
    </div>
  );
}
