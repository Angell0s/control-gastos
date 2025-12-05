// frontend/src/components/PrivacyModal.tsx
"use client";

import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { Fragment } from "react";
import Link from "next/link"; // ✅ Importamos Link
import { Button } from "@/components/ui/Button";
import { 
  XMarkIcon, 
  ShieldCheckIcon, 
  ArrowTopRightOnSquareIcon // ✅ Icono para enlace externo
} from "@heroicons/react/24/outline";

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-6 text-left align-middle shadow-xl transition-all border border-slate-200 dark:border-slate-800">
                
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-700 dark:text-green-400">
                        <ShieldCheckIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                        Política de Privacidad y Términos
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                        Última actualización: Diciembre 2025
                        </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Contenido Scrolleable */}
                <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed custom-scrollbar">
                  
                  <section>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">1. Introducción</h4>
                    <p>
                      Bienvenido a nuestra plataforma de gestión de gastos. Nos tomamos muy en serio la privacidad de tus datos financieros. 
                      Este documento explica cómo recopilamos, usamos y protegemos tu información. Al registrarte, aceptas estos términos.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">2. Datos que Recopilamos</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Información de Cuenta:</strong> Correo electrónico, nombre y contraseña encriptada.</li>
                      <li><strong>Datos Financieros:</strong> Registros de ingresos, gastos, categorías y notas asociadas que tú ingresas manualmente.</li>
                      <li><strong>Datos Técnicos:</strong> Dirección IP y logs de acceso por motivos de seguridad y auditoría.</li>
                    </ul>
                  </section>

                  <section>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">3. Uso de la Información</h4>
                    <p>
                      Tus datos se utilizan exclusivamente para:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 mt-1">
                      <li>Proporcionarte el servicio de visualización y gestión de finanzas.</li>
                      <li>Generar reportes y gráficos estadísticos para tu uso personal.</li>
                      <li>Mejorar la seguridad de tu cuenta (ej. alertas de inicio de sesión).</li>
                    </ul>
                    <p className="mt-2 font-medium text-slate-800 dark:text-slate-200">
                      NO vendemos, rentamos ni compartimos tu información financiera con terceros ni anunciantes.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">4. Seguridad de los Datos</h4>
                    <p>
                      Implementamos medidas de seguridad robustas, incluyendo encriptación de contraseñas (hashing) y conexiones seguras (HTTPS). 
                      Sin embargo, ningún sistema es 100% infalible. Te recomendamos usar una contraseña única y segura.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">5. Tus Derechos (ARCO)</h4>
                    <p>
                      Tienes derecho a acceder, rectificar, cancelar u oponerte al tratamiento de tus datos. 
                      Puedes eliminar tu cuenta y todos sus registros asociados permanentemente desde el panel de configuración en cualquier momento.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">6. Limitación de Responsabilidad</h4>
                    <p>
                      Esta aplicación es una herramienta de ayuda para la organización personal. No somos asesores financieros ni fiscales. 
                      No nos hacemos responsables por decisiones económicas tomadas en base a la información mostrada en la plataforma.
                    </p>
                  </section>

                </div>

                {/* Footer Actualizado */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-4">
                  
                  {/* ✅ Link a página completa */}
                  <Link 
                    href="/priv" 
                    target="_blank"
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center justify-center gap-1 font-medium transition-colors"
                  >
                    Ver documento completo
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  </Link>

                  <Button onClick={onClose} className="w-full sm:w-auto bg-slate-900 text-white hover:bg-slate-800">
                    Entendido, cerrar
                  </Button>
                </div>

              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
