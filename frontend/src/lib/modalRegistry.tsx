// src/lib/modalRegistry.tsx
import React from "react";
import { 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  TrashIcon, 
  ArrowPathIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  BookOpenIcon
} from "@heroicons/react/24/outline";


// 1. Tipos de Modales disponibles
export type ModalKey = 
  | "CREATE_CATEGORY_PRIVATE"
  | "REACTIVATE_CATEGORY"
  | "DELETE_CONFIRMATION"
  | "INFO_GENERIC"
  | "INFO_FORM_GASTOS"
  | "INFO_PAGE_GASTOS"
  | "INFO_PAGE_INGRESOS"
  | "INFO_FORM_INGRESOS"
  | "DELETE_INGRESO_HELP"
  | "PRIVACY_POLICY";

// 2. Definición de la estructura
export interface ModalDefinition {
  title: string;
  icon: React.ElementType;
  colorClass: string; // "indigo", "red", "blue", "yellow", "green", "emerald", "slate"
  content: (props: any) => React.ReactNode; 
}

// 3. Registro centralizado
export const MODAL_REGISTRY: Record<ModalKey, ModalDefinition> = {
  // ===================== LEGAL / SISTEMA =====================
  
  PRIVACY_POLICY: {
    title: "Política de Privacidad y Datos",
    icon: ShieldCheckIcon,
    colorClass: "slate",
    content: () => (
      <div className="space-y-4 text-sm text-muted-foreground max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        <p className="text-xs text-slate-400 mb-2">
            Última actualización: {new Date().toLocaleDateString()}
        </p>

        <section className="space-y-2">
            <h4 className="font-semibold text-foreground text-slate-800 dark:text-slate-200">1. Recolección de Datos</h4>
            <p>
                Para el funcionamiento de la aplicación "Gastos", recolectamos la información estrictamente necesaria:
                correo electrónico, nombre y los datos financieros (ingresos y gastos) que tú decides registrar manualmente.
            </p>
        </section>

        <section className="space-y-2">
            <h4 className="font-semibold text-foreground text-slate-800 dark:text-slate-200">2. Uso de la Información</h4>
            <p>
                Tus datos se utilizan exclusivamente para generar tus reportes personales de finanzas. 
                No compartimos, vendemos ni analizamos tu información financiera con terceros para fines publicitarios.
            </p>
        </section>

        <section className="space-y-2">
            <h4 className="font-semibold text-foreground text-slate-800 dark:text-slate-200">3. Seguridad y Cifrado</h4>
            <p>
                Implementamos medidas de seguridad para proteger tu cuenta. 
                <br/>
                <span className="bg-slate-100 dark:bg-slate-800 p-1 rounded text-xs font-mono mt-1 inline-block">
                    Nota: El cifrado de punta a punta para montos específicos se encuentra en fase beta.
                </span>
            </p>
        </section>

        <section className="space-y-2">
            <h4 className="font-semibold text-foreground text-slate-800 dark:text-slate-200">4. Tus Derechos</h4>
            <p>
                Como usuario, tienes derecho a solicitar la exportación completa de tus datos o la eliminación 
                total de tu cuenta y registros históricos en cualquier momento contactando al administrador.
            </p>
        </section>

        <hr className="border-slate-200 dark:border-slate-700"/>

        <p className="text-xs italic">
            Al registrarte, aceptas que procesemos tus datos bajo estos términos.
        </p>
      </div>
    )
  },
  // --- CATEGORÍAS ---
  CREATE_CATEGORY_PRIVATE: {
    title: "Crear Categoría Personal",
    icon: ExclamationTriangleIcon,
    colorClass: "indigo",
    content: ({ name }) => (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-foreground bg-secondary/20 p-2 rounded border border-border">
          <span className="font-semibold">Nombre:</span> 
          <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{name}</span>
        </div>
        <p>
          Esta categoría será <strong>exclusivamente para ti</strong>. 
          A diferencia de las globales, otros usuarios no podrán verla ni usarla en sus registros.
        </p>
        <div className="bg-muted p-3 rounded text-xs border border-border">
            <strong>Información importante:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1 opacity-80">
                <li>Solo tú puedes ver esta categoría en tus reportes.</li>
                <li>Si necesitas que sea pública para todos, solicítalo a un administrador.</li>
                <li>Para eliminarla posteriormente, ve a <em>Categorías {'>'} Administrar</em>.</li>
            </ul>
        </div>
      </div>
    )
  },

  REACTIVATE_CATEGORY: {
    title: "Reactivar Categoría",
    icon: ArrowPathIcon,
    colorClass: "blue",
    content: ({ categoryName }) => (
      <div className="space-y-3">
        <p>
           Has seleccionado <strong>"{categoryName}"</strong>, una categoría que fue desactivada anteriormente.
        </p>
        <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded text-blue-800 dark:text-blue-200 text-xs">
           Si confirmas, la categoría se <strong>activará automáticamente</strong> al guardar este registro.
           <br/>
           Los registros históricos no se verán afectados.
        </div>
      </div>
    )
  },

  // --- ELIMINACIÓN GENÉRICA ---
  DELETE_CONFIRMATION: {
    title: "Confirmar Eliminación",
    icon: TrashIcon,
    colorClass: "red",
    content: ({ itemName = "este registro" }) => (
      <div className="space-y-2">
        <p>¿Estás seguro de que deseas eliminar <strong>{itemName}</strong>?</p>
        <p className="text-red-600 dark:text-red-400 text-xs font-semibold">
          Esta acción no se puede deshacer y se perderán los datos asociados.
        </p>
      </div>
    )
  },

  // --- INFORMACIÓN GENÉRICA ---
  INFO_GENERIC: {
    title: "Información",
    icon: InformationCircleIcon,
    colorClass: "slate",
    content: ({ message }) => (
      <div>
        {message || "Sin información adicional."}
      </div>
    )
  },

  // --- GASTOS ---
  INFO_FORM_GASTOS: {
    title: "Guía: Creación de Gasto",
    icon: BookOpenIcon,
    colorClass: "blue",
    content: () => (
      <div className="space-y-4">
        <p>Aquí puedes registrar un gasto nuevo, separarlo por ítems e incluso organizarlo en categorías.</p>

        <div className="space-y-2">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
                🏷️ Categorías al vuelo
            </h4>
            <p>
                Si no encuentras tu categoría en la lista, puedes crearla ahora mismo escribiendo el nombre que quieres. 
                ¡Así estará disponible para la próxima!
            </p>
            <div className="bg-muted p-3 rounded text-xs border border-border mt-2">
                <strong>Sobre las categorías nuevas:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1 opacity-90">
                    <li>Serán <strong>exclusivamente para ti</strong> (Privadas).</li>
                    <li>Solo tú podrás verlas en tus reportes.</li>
                    <li>Si necesitas que sean públicas, deberás solicitarlo después.</li>
                </ul>
            </div>
        </div>

        <div className="space-y-1">
            <h4 className="font-semibold text-foreground">📝 Notas y Títulos</h4>
            <p>
                En "Notas" puedes añadir un título descriptivo a tu gasto completo. 
                <br/>
                <span className="italic text-xs opacity-80">Ej: "Compras de la semana", "Cena de ayer", "Materiales oficina".</span>
            </p>
        </div>

        <div className="space-y-2">
            <h4 className="font-semibold text-foreground">🛒 Ítems de Compra</h4>
            <p>
                Puedes desglosar tu gasto como si fuera un ticket real. Cada ítem puede tener su propia categoría.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/10 p-2 rounded text-blue-800 dark:text-blue-200 text-xs">
                <strong>Tip:</strong> ¿Tienes prisa? ¡Crea ítems sin categoría! Podrás editarlos y asignarla con calma más tarde.
            </div>
            <p className="text-xs">
                ⚠️ Verifica cantidades y precios antes de guardar. El <strong>Total Estimado</strong> abajo te ayudará a confirmar.
            </p>
        </div>
      </div>
    )
  },

  INFO_PAGE_GASTOS: {
    title: "Guía: Pestaña de Gastos",
    icon: BanknotesIcon,
    colorClass: "emerald",
    content: () => (
      <div className="space-y-4">
        <p>
          En esta sección puedes ver y registrar todos tus gastos, 
          organizarlos en categorías y administrarlos.
        </p>

        <div className="space-y-2">
            <h4 className="font-semibold text-foreground">🔍 Detalles del Gasto</h4>
            <p>
                Al hacer clic sobre algún gasto de la lista, puedes 
                <strong> desglosar su contenido</strong> para ver los precios individuales y notas específicas.
            </p>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 p-3 rounded-lg mt-2">
            <div className="flex items-center gap-2 mb-1 text-emerald-700 dark:text-emerald-400 font-bold">
                <ShieldCheckIcon className="h-4 w-4" />
                <span>Ante tu privacidad</span>
            </div>
            <p className="text-xs text-emerald-800 dark:text-emerald-200 opacity-90 leading-relaxed">
                Las cantidades y detalles, cada registro de tu usuario estará <strong>cifrado</strong>. 
                Es decir, ¡cualquier cosa que escribas no la podrá ver ni el administrador! ¡Solo tú!
            </p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400/60 mt-2 italic border-t border-emerald-200 dark:border-emerald-800 pt-1">
                * Nota: Sistema de cifrado en fase de pruebas.
            </p>
        </div>
      </div>
    )
  },

  // --- INGRESOS ---
  INFO_PAGE_INGRESOS: {
    title: "Guía: Pestaña de Ingresos",
    icon: BanknotesIcon,
    colorClass: "green",
    content: () => (
      <div className="space-y-4">
        <p>
          En esta sección puedes registrar y revisar todas tus <strong>entradas de dinero</strong>, 
          ya sean pagos de clientes, sueldos, intereses u otras fuentes.
        </p>

        <div className="space-y-2">
          <h4 className="font-semibold text-foreground">📋 Lista de ingresos</h4>
          <p>
            Cada fila representa un ingreso con su fecha, descripción general, fuente opcional y monto total.
            Al hacer clic sobre un ingreso podrás ver el desglose de conceptos que lo componen.
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/40 p-3 rounded-lg mt-2">
          <div className="flex items-center gap-2 mb-1 text-green-800 dark:text-green-300 font-bold">
            <ShieldCheckIcon className="h-4 w-4" />
            <span>Privacidad de tus ingresos</span>
          </div>
          <p className="text-xs leading-relaxed">
            La información de tus ingresos está pensada para ser visible solo para ti. 
            En fases posteriores se añadirá cifrado punto a punto para proteger aún más los montos y desgloses.
          </p>
        </div>
      </div>
    )
  },

  INFO_FORM_INGRESOS: {
    title: "Guía: Creación de Ingreso",
    icon: BookOpenIcon,
    colorClass: "green",
    content: () => (
      <div className="space-y-4">
        <p>
          Aquí puedes registrar un <strong>nuevo ingreso</strong>, definir una descripción general,
          opcionalmente indicar la fuente y desglosarlo en uno o varios conceptos.
        </p>

        <div className="space-y-2">
          <h4 className="font-semibold text-foreground">📝 Descripción, fecha y fuente</h4>
          <p>
            La <strong>descripción general</strong> nombra el ingreso completo 
            (ej: "Pago de proyecto web", "Sueldo quincenal"). 
            La <strong>fecha</strong> indica cuándo se registró o recibió y la 
            <strong> fuente</strong> es opcional (cliente, empresa, banco, etc.).
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-foreground">💰 Conceptos e importes</h4>
          <p>
            Puedes registrar un solo concepto con su monto, o desglosar el ingreso en varios 
            conceptos (por ejemplo: "Honorarios", "Reembolso de gastos", "Propinas").
          </p>
          <p className="text-xs">
            Si solo tienes un concepto y dejas su descripción vacía, el sistema usará la 
            <strong> descripción general</strong> como nombre del concepto.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-foreground">🏷️ Categorías de ingreso</h4>
          <p>
            Cada concepto puede asociarse a una categoría para mantener tus reportes organizados.
            Si no eliges ninguna, el sistema utilizará una categoría genérica como "Otros".
          </p>
          <p className="text-xs">
            Si creas una categoría nueva desde aquí, quedará disponible para reutilizarla en futuros ingresos.
          </p>
        </div>

        <div className="space-y-1">
          <h4 className="font-semibold text-foreground">✔️ Total estimado</h4>
          <p className="text-xs">
            El total que ves al final es la suma de todos los conceptos. 
            Úsalo para verificar que coincide con el monto que esperabas recibir antes de guardar.
          </p>
        </div>
      </div>
    )
  },

  DELETE_INGRESO_HELP: {
    title: "¿Qué significa eliminar un ingreso?",
    icon: TrashIcon,
    colorClass: "red",
    content: ({ descripcion }: { descripcion?: string }) => (
      <div className="space-y-3">
        <p>
          Estás a punto de eliminar un ingreso{descripcion ? <> llamado <strong>"{descripcion}"</strong></> : null}.
        </p>
        <p>
          Esto eliminará también todos los conceptos asociados y dejará de contarse en tus totales y reportes.
        </p>
        <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
          La acción es permanente. Si solo quieres corregir montos o categorías, es mejor <strong>editar</strong> el ingreso en lugar de borrarlo.
        </p>
      </div>
    )
  }
};
