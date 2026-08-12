'use client';

import { Product } from '@/types';

export default function ProductCard({ product }: { product: Product }) {
  const sku = product.sku || product.id;
  
  const handleBuy = () => {
    const text = `Hola, RP Tech. Deseo comprar el producto [SKU: ${sku}] ${product.producto} por S/ ${product.precio.toFixed(2)}. ¿Tienen disponibilidad?`;
    window.open(`https://wa.me/51935423395?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="group bg-white rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full border border-gray-100">
      {/* Image & Badges */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden flex-shrink-0">
        {/* SKU Badge */}
        <div className="absolute top-3 left-3 z-10 bg-primary/90 backdrop-blur-md text-white text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg shadow-sm">
          SKU: {sku}
        </div>

        {/* Category Tag */}
        {product.categoria && (
          <div className="absolute top-3 right-3 z-10 bg-secondary/80 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider">
            {product.categoria}
          </div>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={product.imagen_url || '/logo.jpg'} 
          alt={product.producto} 
          className="object-contain p-4 w-full h-full group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/logo.jpg';
          }}
        />
      </div>

      {/* Details */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="font-semibold text-primary text-sm line-clamp-2 min-h-[2.5rem] leading-snug">
          {product.producto}
        </h3>
        
        <div className="mt-3 flex items-baseline justify-between">
          <p className="text-2xl font-bold text-secondary">
            S/ {product.precio.toFixed(2)}
          </p>
          <span className="rounded-full bg-green-50 text-green-600 text-xs px-2.5 py-0.5 font-medium border border-green-200">
            {product.stock} disp.
          </span>
        </div>
        
        {/* Buy Button */}
        <div className="mt-auto pt-4">
          <button 
            onClick={handleBuy}
            className="w-full py-3 bg-accent hover:bg-amber-500 text-primary font-bold rounded-xl transition-all duration-200 uppercase tracking-wide text-sm hover:shadow-lg hover:shadow-amber-200/50 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
            Comprar
          </button>
        </div>
      </div>
    </div>
  );
}
