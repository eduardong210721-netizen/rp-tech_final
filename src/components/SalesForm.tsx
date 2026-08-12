import { useState, useEffect, useCallback } from 'react';
import { Product, SaleRecord } from '@/types';
import UploadButton from '@/components/UploadButton';
import {
  getStoredProducts,
  saveStoredProducts,
  recordSaleLocally,
  initSupabaseRealtimeSync,
  DATA_UPDATED_EVENT,
} from '@/lib/storage';

export default function SalesForm() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    vendedor: '',
    cliente: '',
    distrito_entrega: '',
    producto_id: '',
    cantidad: 1,
    metodo_pago: 'Yape',
    comprobante_url: '',
  });

  const loadProducts = useCallback(async () => {
    // 1. Instant local render
    const stored = getStoredProducts();
    if (stored.length > 0) {
      setProducts(stored.filter((p: Product) => p.stock > 0));
      setLoading(false);
    }

    // 2. Background API sync
    try {
      const res = await fetch('/api/inventario');
      if (res.ok) {
        const data: Product[] = await res.json();
        saveStoredProducts(data);
        setProducts(data.filter((p: Product) => p.stock > 0));
      }
    } catch (err) {
      console.error('Error syncing products API:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initSupabaseRealtimeSync();
    loadProducts();

    const handleUpdate = () => {
      const current = getStoredProducts();
      if (current.length > 0) {
        setProducts(current.filter((p: Product) => p.stock > 0));
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(DATA_UPDATED_EVENT, handleUpdate);
      window.addEventListener('storage', handleUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(DATA_UPDATED_EVENT, handleUpdate);
        window.removeEventListener('storage', handleUpdate);
      }
    };
  }, [loadProducts]);

  const selectedProduct = products.find(p => String(p.id) === formData.producto_id);
  const total = selectedProduct ? selectedProduct.precio * formData.cantidad : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.producto_id || !formData.comprobante_url) {
      setMessage({ type: 'error', text: 'Por favor complete todos los campos y suba el comprobante.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const now = new Date();
    const tempSale: SaleRecord = {
      id: `VENTA-${Date.now()}`,
      fecha: `${now.toLocaleDateString('es-PE')} ${now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`,
      vendedor: formData.vendedor,
      cliente: formData.cliente,
      distrito_entrega: formData.distrito_entrega,
      producto_id: formData.producto_id,
      producto_nombre: selectedProduct?.producto || '',
      cantidad: formData.cantidad,
      total,
      metodo_pago: formData.metodo_pago,
      comprobante_url: formData.comprobante_url,
    };

    // 1. Instant local deduction & state update (0ms UI lag)
    recordSaleLocally(tempSale);

    try {
      const payload = {
        vendedor: formData.vendedor,
        cliente: formData.cliente,
        distrito_entrega: formData.distrito_entrega,
        producto_id: formData.producto_id,
        producto_nombre: selectedProduct?.producto || '',
        cantidad: formData.cantidad,
        total,
        metodo_pago: formData.metodo_pago,
        comprobante_url: formData.comprobante_url,
      };

      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error de servidor');
      }

      setMessage({ type: 'success', text: '¡Venta registrada exitosamente!' });
      setFormData({
        vendedor: '',
        cliente: '',
        distrito_entrega: '',
        producto_id: '',
        cantidad: 1,
        metodo_pago: 'Yape',
        comprobante_url: '',
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Hubo un error al procesar la venta en el servidor.';
      // Sale is preserved locally regardless
      setMessage({ type: 'success', text: '¡Venta registrada localmente! (' + errorMsg + ')' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-secondary"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
        <div className="bg-primary/10 p-3 rounded-xl">
          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-primary">Registrar Nueva Venta</h2>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          ) : (
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          )}
          <p className="font-medium mt-0.5">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-primary mb-1.5">Vendedor</label>
            <input 
              required
              type="text" 
              placeholder="Nombre del vendedor"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all bg-gray-50 hover:bg-white"
              value={formData.vendedor}
              onChange={e => setFormData({...formData, vendedor: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-primary mb-1.5">Cliente</label>
            <input 
              required
              type="text" 
              placeholder="Nombre del cliente"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all bg-gray-50 hover:bg-white"
              value={formData.cliente}
              onChange={e => setFormData({...formData, cliente: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-primary mb-1.5">Distrito de Entrega</label>
            <input 
              required
              type="text" 
              placeholder="Ej: Miraflores, San Isidro..."
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all bg-gray-50 hover:bg-white"
              value={formData.distrito_entrega}
              onChange={e => setFormData({...formData, distrito_entrega: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-primary mb-1.5">Método de Pago</label>
            <div className="relative">
              <select 
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all bg-gray-50 hover:bg-white appearance-none"
                value={formData.metodo_pago}
                onChange={e => setFormData({...formData, metodo_pago: e.target.value})}
              >
                <option value="Yape">Yape</option>
                <option value="Plin">Plin</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-primary mb-1.5">Producto</label>
            <div className="relative">
              <select 
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all bg-gray-50 hover:bg-white appearance-none"
                value={formData.producto_id}
                onChange={e => setFormData({...formData, producto_id: e.target.value, cantidad: 1})}
              >
                <option value="" disabled>Seleccione un producto</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.producto} - S/{p.precio.toFixed(2)} (Stock: {p.stock})
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-primary mb-1.5">Cantidad</label>
            <input 
              required
              type="number" 
              min="1"
              max={selectedProduct?.stock || 1}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all bg-gray-50 hover:bg-white"
              value={formData.cantidad}
              onChange={e => setFormData({...formData, cantidad: parseInt(e.target.value) || 1})}
              disabled={!selectedProduct}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-primary mb-1.5">Total</label>
            <input 
              readOnly
              type="text" 
              className="w-full px-4 py-3 rounded-xl border-2 border-transparent bg-secondary/10 font-bold text-xl text-secondary outline-none"
              value={`S/ ${total.toFixed(2)}`}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-primary mb-1.5">Comprobante de Pago</label>
          <UploadButton onUploadComplete={(url) => setFormData({...formData, comprobante_url: url})} />
        </div>

        <button 
          type="submit" 
          disabled={submitting}
          className={`w-full py-4 bg-secondary hover:bg-secondary/90 text-white font-bold rounded-xl text-lg transition-all flex justify-center items-center gap-2 mt-6 ${submitting ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:shadow-secondary/30'}`}
        >
          {submitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Procesando...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              Registrar Venta
            </>
          )}
        </button>
      </form>
    </div>
  );
}
