'use client'

import { useState, useEffect } from 'react';
import { Product } from '@/types';
import ProductGrid from '@/components/ProductGrid';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/inventario');
        if (response.ok) {
          const data = await response.json();
          setProducts(data.filter((p: Product) => p.stock > 0));
        } else {
          console.error("Failed to fetch products");
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(p => 
    (p.producto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku || p.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.categoria || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-light pb-20">
      {/* Hero Section */}
      <section className="relative w-full bg-gradient-to-br from-primary via-complement to-primary min-h-[50vh] flex items-center overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-64 h-64 bg-secondary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-secondary/10 rounded-full blur-3xl"></div>
        
        <div className="container max-w-7xl mx-auto px-4 relative z-10">
          <div className="inline-block px-4 py-1.5 rounded-full bg-secondary/20 text-secondary border border-secondary/30 text-sm font-medium mb-6">
            Accesorios Tecnológicos
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-4">
            Encuentra los mejores<br />
            <span className="text-accent">accesorios tech</span>
          </h1>
          <p className="text-white/70 text-lg md:text-xl max-w-xl">
            Accesorios de calidad a los mejores precios para potenciar todos tus dispositivos.
          </p>
        </div>
      </section>

      {/* Search Bar Section */}
      <section className="bg-white/80 backdrop-blur-md shadow-sm py-4 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <input 
              type="text" 
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary sm:text-sm transition-all" 
              placeholder="Buscar productos..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-end gap-4 mb-8">
          <h2 className="text-3xl font-bold text-primary relative">
            Nuestros Productos
            <div className="absolute -bottom-2 left-0 w-1/2 h-1 bg-accent rounded-full"></div>
          </h2>
          <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full mb-1">
            {filteredProducts.length} disponibles
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-gray-200 rounded-2xl animate-pulse h-80 w-full"></div>
            ))}
          </div>
        ) : (
          <ProductGrid products={filteredProducts} />
        )}
      </section>
    </main>
  );
}
