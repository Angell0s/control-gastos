'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

// Importamos tus nuevos componentes
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  const router = useRouter();
  const setToken = useAuthStore((state) => state.setToken);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/login/access-token', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const { access_token } = response.data;
      setToken(access_token);
      router.push('/dashboard'); 
      
    } catch (err: any) {
      console.error(err);
      setError('Credenciales incorrectas o error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    // 1. Fondo de pantalla adaptable
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950 transition-colors duration-300">
      
      {/* 2. Tarjeta adaptable (Blanco -> Gris Oscuro) */}
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 transition-all duration-300">
        
        {/* 3. Título adaptable */}
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">
          Iniciar Sesión
        </h2>
        
        {/* 4. Error adaptable (Rojo suave -> Rojo oscuro) */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@gastos.com"
              required
              autoFocus
              // El Input ya tiene lógica interna para dark mode, pero podemos reforzar el fondo si queremos
              className="dark:bg-gray-950 dark:border-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contraseña
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="******"
              required
              className="dark:bg-gray-950 dark:border-gray-700"
            />
          </div>

          <Button 
            type="submit" 
            isLoading={loading} 
            className="w-full" 
            size="lg"
          >
            {loading ? 'Validando...' : 'Ingresar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
