//frontend\src\app\(dashboard)\categorias\page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/Card"; // Ajusta la ruta si tu componente está en otro lado
import { Button } from "@/components/ui/Button";
import { 
  TagIcon, 
  Cog6ToothIcon, 
  PlusCircleIcon,
  ArchiveBoxIcon
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

// --- TIPO ---
interface Category {
  id: string;
  name: string;
  // description?: string; // Si añades descripción en el futuro
}

export default function CategoriasPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // --- CARGA DE DATOS (GET) ---
  useEffect(() => {
    const fetchCategories = async () => {
      if (!token) return;
      try {
        const res = await api.get<Category[]>("/categories/");
        setCategories(res.data);
      } catch (err) {
        console.error(err);
        toast.error("Error al cargar categorías");
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [token]);

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      
      {/* --- HEADER DE PÁGINA --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <TagIcon className="h-8 w-8 text-primary" />
            Categorías de Gastos
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Organiza y visualiza cómo se clasifican tus gastos.
          </p>
        </div>
        
        {/* Botón de Administrar (Navega a la sub-ruta) */}
        <Button 
          onClick={() => router.push("/categorias/admin")}
          className="gap-2 shadow-lg hover:shadow-primary/25 transition-all"
          size="lg"
        >
          <Cog6ToothIcon className="h-5 w-5" />
          Administrar Categorías
        </Button>
      </div>

      {/* --- ESTADO DE CARGA --- */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        // --- ESTADO VACÍO ---
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <ArchiveBoxIcon className="h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900">No hay categorías aún</h3>
          <p className="text-gray-500 max-w-sm mt-2 mb-6">
            Comienza creando categorías para organizar tus finanzas de manera efectiva.
          </p>
          <Button variant="outline" onClick={() => router.push("/categorias/admin")}>
            <PlusCircleIcon className="h-5 w-5 mr-2" />
            Crear mi primera categoría
          </Button>
        </div>
      ) : (
        // --- GRID DE TARJETAS (CARDS) ---
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <Card 
              key={cat.id} 
              className="hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-default group bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-900/50"
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                    <TagIcon className="h-6 w-6" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-xl mb-1">{cat.name}</CardTitle>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                  ID: {cat.id.slice(0, 8)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
