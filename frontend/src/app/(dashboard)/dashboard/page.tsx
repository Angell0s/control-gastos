"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon, 
  CurrencyDollarIcon, 
  CreditCardIcon 
} from "@heroicons/react/24/outline";

// --- DATOS FALSOS PARA PRUEBAS ---
const mockStats = [
  {
    title: "Gasto Total (Mes)",
    value: "$12,450.00",
    trend: "+12% vs mes anterior",
    trendUp: false, // false = rojo (gastamos más), true = verde
    icon: CurrencyDollarIcon,
  },
  {
    title: "Ingresos",
    value: "$45,000.00",
    trend: "+5% vs mes anterior",
    trendUp: true,
    icon: ArrowTrendingUpIcon,
  },
  {
    title: "Presupuesto Restante",
    value: "$8,200.00",
    trend: "65% consumido",
    trendUp: true, // neutro o bueno
    icon: CreditCardIcon,
  },
];

const mockTransactions = [
  { id: 1, desc: "Supermercado Walmart", cat: "Comida", date: "01 Dic, 2025", amount: -1250.00 },
  { id: 2, desc: "Netflix Suscripción", cat: "Entretenimiento", date: "01 Dic, 2025", amount: -199.00 },
  { id: 3, desc: "Transferencia Nómina", cat: "Ingreso", date: "30 Nov, 2025", amount: 15000.00 },
  { id: 4, desc: "Gasolina Shell", cat: "Transporte", date: "29 Nov, 2025", amount: -800.00 },
  { id: 5, desc: "Cena Tacos", cat: "Comida", date: "28 Nov, 2025", amount: -450.00 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* --- Encabezado --- */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Dashboard
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Resumen financiero de Diciembre 2025
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">Descargar Reporte</Button>
          <Button>+ Nuevo Gasto</Button>
        </div>
      </div>

      {/* --- Tarjetas de KPI (Key Performance Indicators) --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </div>
              <p className={`text-xs ${stat.trendUp ? 'text-green-600' : 'text-red-600'} flex items-center mt-1`}>
                 {stat.trendUp ? <ArrowTrendingUpIcon className="w-3 h-3 mr-1"/> : <ArrowTrendingDownIcon className="w-3 h-3 mr-1"/>}
                 {stat.trend}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* --- Sección Principal (Gráfico y Lista) --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        {/* Gráfico Mockup (Ocupa 4 columnas) */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Resumen Mensual</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            {/* Placeholder visual de un gráfico */}
            <div className="h-[300px] flex items-end justify-between gap-2 px-4 py-4 border-b border-l border-gray-200 dark:border-gray-700 border-dashed">
                {[40, 70, 35, 50, 90, 60, 80].map((h, i) => (
                    <div key={i} className="w-full bg-blue-500 dark:bg-blue-600 rounded-t-sm opacity-80 hover:opacity-100 transition-all" style={{ height: `${h}%` }}></div>
                ))}
            </div>
            <p className="text-center text-xs text-gray-500 mt-2">Datos simulados de los últimos 7 días</p>
          </CardContent>
        </Card>

        {/* Últimas Transacciones (Ocupa 3 columnas) */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Últimos Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {mockTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center">
                  <div className="ml-4 space-y-1 flex-1">
                    <p className="text-sm font-medium leading-none text-gray-900 dark:text-white">
                        {tx.desc}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {tx.cat} • {tx.date}
                    </p>
                  </div>
                  <div className={`font-medium ${tx.amount > 0 ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
