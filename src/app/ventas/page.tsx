'use client';

import { useState, useEffect } from 'react';
import PinLock from '@/components/PinLock';
import SalesForm from '@/components/SalesForm';

export default function VentasPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = sessionStorage.getItem('rp_vendor_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  if (loading) return null;

  if (!isAuthenticated) {
    return <PinLock onUnlock={() => setIsAuthenticated(true)} />;
  }

  const handleLogout = () => {
    sessionStorage.removeItem('rp_vendor_auth');
    setIsAuthenticated(false);
  };

  return (
    <div className="min-h-screen bg-light">
      <header className="bg-primary text-white py-4 px-6 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold">Portal de Ventas</h1>
        <button 
          onClick={handleLogout}
          className="bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-lg text-sm font-medium"
        >
          Cerrar Sesión
        </button>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <SalesForm />
      </main>
    </div>
  );
}
