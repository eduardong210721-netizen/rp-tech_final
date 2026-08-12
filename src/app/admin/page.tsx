'use client';

import { useState, useEffect, useCallback } from 'react';
import PinLock from '@/components/PinLock';
import { Product, SaleRecord } from '@/types';
import {
  getStoredProducts,
  saveStoredProducts,
  getStoredSales,
  saveStoredSales,
  DATA_UPDATED_EVENT,
} from '@/lib/storage';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventario' | 'ventas'>('inventario');

  // Inventario state
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('TODOS');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Ventas state
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [salesSearch, setSalesSearch] = useState('');
  const [selectedVendorFilter, setSelectedVendorFilter] = useState('TODOS');
  const [selectedVoucherUrl, setSelectedVoucherUrl] = useState<string | null>(null);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    // 1. Instant local render (0ms lag)
    const stored = getStoredProducts();
    if (stored.length > 0) {
      setProducts(stored);
    }

    // 2. Background API sync
    try {
      const response = await fetch('/api/inventario');
      if (response.ok) {
        const data: Product[] = await response.json();
        saveStoredProducts(data);
        setProducts(data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }, []);

  const fetchSales = useCallback(async () => {
    // 1. Instant local render (0ms lag)
    const stored = getStoredSales();
    if (stored.length > 0) {
      setSales(stored);
    }

    // 2. Background API sync
    try {
      const response = await fetch('/api/ventas');
      if (response.ok) {
        const data: SaleRecord[] = await response.json();
        saveStoredSales(data);
        setSales(data);
      }
    } catch (error) {
      console.error('Error loading sales:', error);
    }
  }, []);

  const refreshAllData = useCallback(() => {
    const p = getStoredProducts();
    if (p.length > 0) setProducts(p);

    const s = getStoredSales();
    if (s.length > 0) setSales(s);
  }, []);

  useEffect(() => {
    const auth = sessionStorage.getItem('rp_vendor_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      fetchProducts();
      fetchSales();
    }
    setLoading(false);

    const handleUpdate = () => {
      refreshAllData();
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
  }, [fetchProducts, fetchSales, refreshAllData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUnlock = () => {
    setIsAuthenticated(true);
    fetchProducts();
    fetchSales();
  };

  const handleLogout = () => {
    sessionStorage.removeItem('rp_vendor_auth');
    setIsAuthenticated(false);
  };

  // Inventario Handlers
  const handleOpenAddModal = () => {
    const nextSku = `260${(products.length + 1).toString().padStart(2, '0')}`;
    setEditingProduct({
      id: nextSku,
      sku: nextSku,
      producto: '',
      precio: 0,
      costo: 0,
      stock: 10,
      imagen_url: '/logo.jpg',
      categoria: 'GENERAL'
    });
    setIsEditingMode(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct({ ...product });
    setIsEditingMode(true);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setSaving(true);
    try {
      const method = isEditingMode ? 'PUT' : 'POST';

      // 1. Instant local update
      let updatedProducts = [...products];
      const idx = updatedProducts.findIndex(p => p.id === editingProduct.id || p.sku === editingProduct.sku);
      if (idx !== -1) {
        updatedProducts[idx] = { ...editingProduct };
      } else {
        updatedProducts.push(editingProduct);
      }
      setProducts(updatedProducts);
      saveStoredProducts(updatedProducts);

      const res = await fetch('/api/inventario', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProduct),
      });

      if (res.ok) {
        showToast(isEditingMode ? '✅ Cambios confirmados y guardados' : '✨ Producto creado con éxito');
        setIsModalOpen(false);
        fetchProducts();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`Error al guardar: ${data.error || 'No se pudo guardar el producto'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión con el servidor');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    const updated = products.filter(p => p.id !== id && p.sku !== id);
    setProducts(updated);
    saveStoredProducts(updated);

    try {
      const res = await fetch(`/api/inventario?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('🗑️ Producto eliminado');
        fetchProducts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickStockChange = async (product: Product, delta: number) => {
    const newStock = Math.max(0, product.stock + delta);
    const updatedProduct = { ...product, stock: newStock };
    
    const updatedList = products.map(p => p.id === product.id ? updatedProduct : p);
    setProducts(updatedList);
    saveStoredProducts(updatedList);

    try {
      await fetch('/api/inventario', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProduct),
      });
      showToast(`Stock de ${product.sku || product.id}: ${newStock}`);
    } catch (err) {
      console.error(err);
      fetchProducts();
    }
  };

  // Ventas Handlers
  const handleDeleteSale = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro de venta?')) return;

    const updatedSales = sales.filter(s => s.id !== id);
    setSales(updatedSales);
    saveStoredSales(updatedSales);

    try {
      const res = await fetch(`/api/ventas?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('🗑️ Venta eliminada del historial');
        fetchSales();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadTxt = (sale: SaleRecord) => {
    const textContent = `========================================
REGISTRO DE VENTA — RP TECH
========================================
ID Venta: ${sale.id}
Fecha y Hora: ${sale.fecha}
Vendedor(a): ${sale.vendedor}
Cliente: ${sale.cliente}
Distrito de Entrega: ${sale.distrito_entrega}
Producto: ${sale.producto_nombre} (ID: ${sale.producto_id})
Cantidad: ${sale.cantidad}
Total Pagado: S/ ${sale.total.toFixed(2)}
Método de Pago: ${sale.metodo_pago}
========================================
`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Venta_${sale.cliente.replace(/\s+/g, '_')}_${sale.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('📄 Ficha TXT descargada en tu dispositivo');
  };

  const handleExportCsv = () => {
    if (sales.length === 0) {
      alert('No hay ventas registradas para exportar');
      return;
    }

    const headers = ['ID Venta', 'Fecha', 'Vendedor', 'Cliente', 'Distrito', 'Producto', 'Cantidad', 'Total S/', 'Metodo Pago'];
    const rows = sales.map(s => [
      `"${s.id}"`,
      `"${s.fecha}"`,
      `"${s.vendedor}"`,
      `"${s.cliente}"`,
      `"${s.distrito_entrega}"`,
      `"${s.producto_nombre}"`,
      s.cantidad,
      s.total.toFixed(2),
      `"${s.metodo_pago}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Historial_Ventas_RP_Tech_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('📊 Exportación Excel (CSV) lista');
  };

  if (loading) return null;
  if (!isAuthenticated) return <PinLock onUnlock={handleUnlock} />;

  // Inventario filters
  const categories = ['TODOS', ...Array.from(new Set(products.map(p => p.categoria || 'GENERAL')))];
  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.producto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.sku || p.id || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'TODOS' || p.categoria === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const totalValor = products.reduce((acc, p) => acc + (p.precio * p.stock), 0);
  const totalStock = products.reduce((acc, p) => acc + p.stock, 0);

  // Ventas filters
  const vendors = ['TODOS', ...Array.from(new Set(sales.map(s => s.vendedor || 'General')))];
  const filteredSales = sales.filter(s => {
    const matchesSearch = (s.cliente || '').toLowerCase().includes(salesSearch.toLowerCase()) ||
                          (s.vendedor || '').toLowerCase().includes(salesSearch.toLowerCase()) ||
                          (s.producto_nombre || '').toLowerCase().includes(salesSearch.toLowerCase()) ||
                          (s.distrito_entrega || '').toLowerCase().includes(salesSearch.toLowerCase());
    const matchesVendor = selectedVendorFilter === 'TODOS' || s.vendedor === selectedVendorFilter;
    return matchesSearch && matchesVendor;
  });

  const totalMontoVentas = sales.reduce((acc, s) => acc + s.total, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-[#023e55] text-white py-4 px-6 shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="bg-[#2ba5b2] p-2 rounded-xl text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
            </span>
            <div>
              <h1 className="text-xl font-bold">Panel de Administración & Control</h1>
              <p className="text-xs text-white/70">RP Tech — Inventario, Ventas y Comprobantes</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/10">
            <button
              onClick={() => setActiveTab('inventario')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'inventario'
                  ? 'bg-[#2ba5b2] text-white shadow-md'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              📦 Inventario ({products.length})
            </button>

            <button
              onClick={() => {
                setActiveTab('ventas');
                fetchSales();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'ventas'
                  ? 'bg-[#2ba5b2] text-white shadow-md'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              📋 Historial de Ventas ({sales.length})
            </button>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'inventario' ? (
              <button
                onClick={handleOpenAddModal}
                className="bg-[#2ba5b2] hover:bg-[#20838e] text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-md hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Nuevo Producto
              </button>
            ) : (
              <button
                onClick={handleExportCsv}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-md hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Exportar a Excel
              </button>
            )}

            <button
              onClick={handleLogout}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-sm transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#023e55] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce border border-[#2ba5b2]">
            <span>{toastMessage}</span>
          </div>
        )}

        {/* TAB 1: INVENTARIO */}
        {activeTab === 'inventario' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">
                  📦
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Total Productos</p>
                  <p className="text-2xl font-bold text-gray-800">{products.length}</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center font-bold text-xl">
                  📊
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Unidades en Stock</p>
                  <p className="text-2xl font-bold text-gray-800">{totalStock}</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl">
                  💰
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Valor Inventario</p>
                  <p className="text-2xl font-bold text-gray-800">S/ {totalValor.toFixed(2)}</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xl">
                  🏷️
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Categorías</p>
                  <p className="text-2xl font-bold text-gray-800">{categories.length - 1}</p>
                </div>
              </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-96">
                <input
                  type="text"
                  placeholder="Buscar por SKU o Nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2ba5b2]"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>

              <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-[#023e55] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-4 px-4">Imagen</th>
                      <th className="py-4 px-4">SKU</th>
                      <th className="py-4 px-4">Producto</th>
                      <th className="py-4 px-4">Categoría</th>
                      <th className="py-4 px-4 text-right">Costo</th>
                      <th className="py-4 px-4 text-right">Precio Venta</th>
                      <th className="py-4 px-4 text-center">Stock</th>
                      <th className="py-4 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-gray-400">
                          No se encontraron productos
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => {
                        const margin = p.precio > 0 && p.costo ? (((p.precio - p.costo) / p.precio) * 100).toFixed(0) : null;
                        return (
                          <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="w-12 h-12 relative rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={p.imagen_url}
                                  alt={p.producto}
                                  className="object-contain w-full h-full p-1"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/logo.jpg';
                                  }}
                                />
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-block bg-gray-100 text-gray-800 font-mono text-xs font-bold px-2.5 py-1 rounded-lg">
                                {p.sku || p.id}
                              </span>
                            </td>
                            <td className="py-3 px-4 max-w-xs font-medium text-gray-900">
                              <div className="line-clamp-2">{p.producto}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                {p.categoria || 'GENERAL'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right text-gray-500">
                              S/ {(p.costo || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-[#023e55]">
                              S/ {p.precio.toFixed(2)}
                              {margin && (
                                <span className="block text-[10px] text-green-600 font-normal">
                                  +{margin}% margen
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleQuickStockChange(p, -1)}
                                  className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 flex items-center justify-center transition-colors"
                                >
                                  -
                                </button>
                                <span className={`w-8 text-center font-bold text-sm ${p.stock <= 5 ? 'text-red-600' : 'text-gray-800'}`}>
                                  {p.stock}
                                </span>
                                <button
                                  onClick={() => handleQuickStockChange(p, 1)}
                                  className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 flex items-center justify-center transition-colors"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleOpenEditModal(p)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                  title="Editar producto"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                  title="Eliminar producto"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: HISTORIAL DE VENTAS */}
        {activeTab === 'ventas' && (
          <>
            {/* Sales Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl">
                  💵
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Total Recaudado</p>
                  <p className="text-2xl font-bold text-gray-800">S/ {totalMontoVentas.toFixed(2)}</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">
                  🛒
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Ventas Registradas</p>
                  <p className="text-2xl font-bold text-gray-800">{sales.length}</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xl">
                  👩‍💼
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Vendedoras Activas</p>
                  <p className="text-2xl font-bold text-gray-800">{vendors.length - 1}</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl">
                  📈
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Promedio / Venta</p>
                  <p className="text-2xl font-bold text-gray-800">
                    S/ {sales.length > 0 ? (totalMontoVentas / sales.length).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>
            </div>

            {/* Sales Search & Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-96">
                <input
                  type="text"
                  placeholder="Buscar por cliente, vendedora o producto..."
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2ba5b2]"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                <span className="text-xs font-bold text-gray-500 uppercase mr-1">Vendedora:</span>
                {vendors.map((v) => (
                  <button
                    key={v}
                    onClick={() => setSelectedVendorFilter(v)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedVendorFilter === v
                        ? 'bg-[#023e55] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Sales Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-4 px-4">Fecha / ID</th>
                      <th className="py-4 px-4">Vendedora</th>
                      <th className="py-4 px-4">Cliente & Distrito</th>
                      <th className="py-4 px-4">Producto Comprado</th>
                      <th className="py-4 px-4 text-center">Cant.</th>
                      <th className="py-4 px-4 text-right">Total (S/)</th>
                      <th className="py-4 px-4 text-center">Pago</th>
                      <th className="py-4 px-4 text-center">Comprobante</th>
                      <th className="py-4 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredSales.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-gray-400">
                          No se registraron ventas en el historial
                        </td>
                      </tr>
                    ) : (
                      filteredSales.map((s) => (
                        <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <span className="block font-bold text-xs text-gray-900">{s.fecha}</span>
                            <span className="text-[11px] font-mono text-gray-400">{s.id}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block bg-purple-50 text-purple-700 font-semibold px-2.5 py-1 rounded-lg text-xs">
                              👩‍💼 {s.vendedor}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-gray-900">{s.cliente}</p>
                            <p className="text-xs text-gray-500">📍 {s.distrito_entrega}</p>
                          </td>
                          <td className="py-3 px-4 max-w-xs font-medium text-gray-800">
                            {s.producto_nombre}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-gray-800">
                            {s.cantidad}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-[#023e55] text-base">
                            S/ {s.total.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-block bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                              {s.metodo_pago}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {s.comprobante_url ? (
                              <button
                                onClick={() => setSelectedVoucherUrl(s.comprobante_url)}
                                className="bg-[#2ba5b2]/10 text-[#2ba5b2] hover:bg-[#2ba5b2] hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 mx-auto"
                              >
                                🖼️ Ver Foto
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">Sin foto</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleDownloadTxt(s)}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                title="Descargar Ficha (.txt)"
                              >
                                📄
                              </button>
                              <button
                                onClick={() => handleDeleteSale(s.id)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                title="Eliminar registro"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* MODAL 1: EDITAR / CREAR PRODUCTO */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="text-xl font-bold text-[#023e55]">
                {isEditingMode ? '✏️ Editar Producto' : '✨ Nuevo Producto'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">SKU</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.sku || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value, id: editingProduct.id || e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-[#2ba5b2] outline-none"
                    placeholder="26001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Categoría</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.categoria || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, categoria: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2ba5b2] outline-none"
                    placeholder="CABLE CARGADOR"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  value={editingProduct.producto || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, producto: e.target.value })}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2ba5b2] outline-none"
                  placeholder="Audífonos Bluetooth..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Costo (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingProduct.costo || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, costo: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2ba5b2] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Precio Venta (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingProduct.precio || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, precio: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm font-bold text-[#023e55] focus:ring-2 focus:ring-[#2ba5b2] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Stock</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.stock || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2ba5b2] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Ruta de Imagen (URL o /products/SKU.jpg)</label>
                <input
                  type="text"
                  required
                  value={editingProduct.imagen_url || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, imagen_url: e.target.value })}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2ba5b2] outline-none"
                  placeholder="/products/26001.png"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 py-3 bg-[#2ba5b2] hover:bg-[#20838e] text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {saving ? (
                    'Guardando...'
                  ) : isEditingMode ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      Confirmar los Cambios
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                      </svg>
                      Confirmar y Crear
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VER COMPROBANTE COMPLETO */}
      {selectedVoucherUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl flex flex-col items-center gap-4">
            <div className="w-full flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-[#023e55] flex items-center gap-2">
                🖼️ Comprobante de Pago Adjuntado
              </h3>
              <button
                onClick={() => setSelectedVoucherUrl(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            <div className="w-full max-h-[70vh] overflow-auto bg-gray-100 rounded-2xl p-2 flex items-center justify-center border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedVoucherUrl}
                alt="Comprobante de venta"
                className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-md"
              />
            </div>

            <div className="w-full flex gap-3 justify-end pt-2">
              <a
                href={selectedVoucherUrl}
                target="_blank"
                rel="noreferrer"
                download="Comprobante_Venta.jpg"
                className="bg-[#2ba5b2] hover:bg-[#20838e] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2"
              >
                ⬇️ Descargar Imagen
              </a>
              <button
                onClick={() => setSelectedVoucherUrl(null)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
