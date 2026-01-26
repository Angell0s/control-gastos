// frontend/src/app/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FancyCheckbox } from '@/components/ui/FancyCheckbox';
import Link from 'next/link';
import { DocumentTextIcon } from "@heroicons/react/24/outline";

// ✅ Importamos el hook del sistema de modales
import { useModal } from '@/components/providers/ModalProvider';
console.log("ENV API:", process.env.NEXT_PUBLIC_API_URL)
export default function LoginPage() {
  const router = useRouter();
  
  const setToken = useAuthStore((state) => state.setToken);
  const isAuth = useAuthStore((state) => state.isAuth);
  
  // ✅ Hook para abrir modales globales
  const { openModal } = useModal(); 

  // Estados comunes
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Register states
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regPhone, setRegPhone] = useState('');

  useEffect(() => {
    if (isAuth) {
      router.replace('/gastos');
    }
  }, [isAuth, router]);

  // ✅ Función centralizada para abrir el modal de privacidad con el botón extra
  const handleOpenPrivacy = () => {
    openModal("PRIVACY_POLICY", {
        // Pasamos el botón de redirección como footer extra
        extraFooter: (
            <Link href="/priv" target="_blank" className="w-full sm:w-auto block sm:mr-auto">
                <Button variant="outline" className="w-full gap-2 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <DocumentTextIcon className="h-4 w-4" />
                    Ver documento completo
                </Button>
            </Link>
        )
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      
      if (rememberMe) {
          formData.append('remember_me', 'true'); 
      }

      const response = await api.post('/login/access-token', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const { access_token } = response.data;
      setToken(access_token);
      
      await useAuthStore.getState().fetchUser();

      router.push('/gastos');
    } catch (err: any) {
      setError('Credenciales incorrectas o error de conexión');
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload = {
        email: regEmail,
        password: regPassword,
        first_name: regFirstName || null,
        last_name: regLastName || null,
        phone: regPhone || null,
      };

      await api.post('/users/signup', payload);

      setSuccess('¡Registro exitoso! Ya puedes iniciar sesión.');
      
      setTimeout(() => {
        setIsRegister(false);
        setRegEmail('');
        setRegPassword('');
        setRegFirstName('');
        setRegLastName('');
        setRegPhone('');
        setSuccess('');
      }, 2000);

    } catch (err: any) {
      const message = err.response?.data?.detail || 'Error al registrarse. Intenta de nuevo.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (isAuth) return null; 

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-950 transition-colors duration-300 px-4">
      
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 transition-all duration-300">
        
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">
          {isRegister ? 'Crear una cuenta' : 'Iniciar Sesión'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded text-sm text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded text-sm text-center">
            {success}
          </div>
        )}

        {isRegister ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
              <Input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="tu@email.com" required className="dark:bg-gray-950 dark:border-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contraseña *</label>
              <Input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} className="dark:bg-gray-950 dark:border-gray-700" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                <Input type="text" value={regFirstName} onChange={(e) => setRegFirstName(e.target.value)} placeholder="Juan" className="dark:bg-gray-950 dark:border-gray-700" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Apellido</label>
                <Input type="text" value={regLastName} onChange={(e) => setRegLastName(e.target.value)} placeholder="Pérez" className="dark:bg-gray-950 dark:border-gray-700" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono (opcional)</label>
              <Input type="tel" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="+54 11 1234-5678" className="dark:bg-gray-950 dark:border-gray-700" />
            </div>

            <div className="flex items-start gap-2 pt-2">
              <input 
                type="checkbox" 
                id="terms" 
                required 
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                He leído y acepto la{' '}
                <button 
                    type="button" 
                    onClick={handleOpenPrivacy} 
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium focus:outline-none"
                >
                  Política de Privacidad
                </button>
                {' '}y el procesamiento de mis datos personales.
              </label>
            </div>

            <Button type="submit" isLoading={loading} className="w-full" size="lg">
              {loading ? 'Creando cuenta...' : 'Regístrate'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@gastos.com" required autoFocus className="dark:bg-gray-950 dark:border-gray-700" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contraseña</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="******" required className="dark:bg-gray-950 dark:border-gray-700" />
            </div>

            <div className="flex items-center justify-between">
                <FancyCheckbox 
                    checked={rememberMe}
                    onChange={setRememberMe}
                    label="Recuérdame"
                />
            </div>

            <Button type="submit" isLoading={loading} className="w-full" size="lg">
              {loading ? 'Validando...' : 'Ingresar'}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isRegister ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'}{' '}
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
                setSuccess('');
              }}
              className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              {isRegister ? 'Inicia sesión aquí' : 'Regístrate gratis'}
            </button>
          </p>
        </div>
      </div>

      {/* ✅ Footer externo visible siempre */}
      <div className="mt-8 text-center text-xs text-gray-500 dark:text-gray-500">
        <button 
            type="button"
            onClick={handleOpenPrivacy}
            className="hover:underline hover:text-gray-800 dark:hover:text-gray-300 transition-colors"
        >
            Aviso de Privacidad
        </button>
        <span className="mx-2">•</span>
        <span>© {new Date().getFullYear()} Gastos App</span>
      </div>
      
    </div>
  );
}
