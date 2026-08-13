import { Product, SaleRecord } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const PRODUCTS_STORAGE_KEY = 'rp_products_cache';
const SALES_STORAGE_KEY = 'rp_sales_cache';

export const DATA_UPDATED_EVENT = 'rp_data_updated';

function notifyDataUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(DATA_UPDATED_EVENT));
  }
}

// ----------------------------------------------------
// REALTIME WEBSOCKETS LISTENER (SUPABASE)
// ----------------------------------------------------

let realtimeInitialized = false;

export function initSupabaseRealtimeSync() {
  if (!isSupabaseConfigured || !supabase || realtimeInitialized || typeof window === 'undefined') return;

  realtimeInitialized = true;

  // Listen to Products changes in Realtime WebSockets
  supabase
    .channel('realtime_products_channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'products' },
      async (payload) => {
        console.log('⚡ Supabase Realtime Product Event:', payload);
        const { eventType, new: newRow, old: oldRow } = payload;
        const currentProducts = getStoredProducts();

        const parseProductRow = (row: Record<string, unknown>): Product => ({
          id: String(row.id),
          sku: String(row.sku || row.id),
          producto: String(row.producto),
          precio: Number(row.precio),
          costo: Number(row.costo || 0),
          stock: Number(row.stock || 0),
          imagen_url: String(row.imagen_url || '/logo.jpg'),
          categoria: String(row.categoria || 'GENERAL'),
        });

        if (eventType === 'INSERT' && newRow) {
          const product = parseProductRow(newRow);
          if (!currentProducts.some(p => p.id === product.id)) {
            currentProducts.push(product);
          }
        } else if (eventType === 'UPDATE' && newRow) {
          const updated = parseProductRow(newRow);
          const idx = currentProducts.findIndex(p => p.id === updated.id);
          if (idx !== -1) {
            currentProducts[idx] = updated;
          } else {
            currentProducts.push(updated);
          }
        } else if (eventType === 'DELETE' && oldRow) {
          const deletedId = (oldRow as { id: string }).id;
          const filtered = currentProducts.filter(p => p.id !== deletedId);
          saveStoredProducts(filtered);
          return;
        }

        saveStoredProducts(currentProducts);
      }
    )
    .subscribe();

  // Listen to Sales changes in Realtime WebSockets
  supabase
    .channel('realtime_sales_channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sales' },
      async (payload) => {
        console.log('⚡ Supabase Realtime Sale Event:', payload);
        const { eventType, new: newRow, old: oldRow } = payload;
        const currentSales = getStoredSales();

        if (eventType === 'INSERT' && newRow) {
          const sale: SaleRecord = newRow as SaleRecord;
          if (!currentSales.some(s => s.id === sale.id)) {
            currentSales.unshift(sale);
          }
        } else if (eventType === 'DELETE' && oldRow) {
          const deletedId = (oldRow as { id: string }).id;
          const filtered = currentSales.filter(s => s.id !== deletedId);
          saveStoredSales(filtered);
          return;
        }

        saveStoredSales(currentSales);
      }
    )
    .subscribe();
}

// ----------------------------------------------------
// PRODUCTS STORAGE
// ----------------------------------------------------

export function getStoredProducts(): Product[] {
  if (typeof window === 'undefined') return [];
  try {
    const cached = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.warn('Error reading stored products:', e);
  }
  return [];
}

export function saveStoredProducts(products: Product[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
    notifyDataUpdated();
  } catch (e) {
    console.warn('Error saving stored products:', e);
  }
}

// ----------------------------------------------------
// SALES STORAGE
// ----------------------------------------------------

export function getStoredSales(): SaleRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const cached = localStorage.getItem(SALES_STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.warn('Error reading stored sales:', e);
  }
  return [];
}

export function saveStoredSales(sales: SaleRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(sales));
    notifyDataUpdated();
  } catch (e) {
    console.warn('Error saving stored sales:', e);
  }
}

// ----------------------------------------------------
// REAL-TIME SALE & STOCK DEDUCTION ORCHESTRATOR
// ----------------------------------------------------

export function recordSaleLocally(newSale: SaleRecord): void {
  // 1. Add sale to sales history
  const currentSales = getStoredSales();
  const exists = currentSales.some(s => s.id === newSale.id);
  if (!exists) {
    currentSales.unshift(newSale);
    saveStoredSales(currentSales);
  }

  // 2. Deduct product stock in local storage
  const currentProducts = getStoredProducts();
  const targetProduct = currentProducts.find(
    p => String(p.id) === String(newSale.producto_id) || String(p.sku) === String(newSale.producto_id)
  );

  if (targetProduct) {
    targetProduct.stock = Math.max(0, targetProduct.stock - newSale.cantidad);
    saveStoredProducts(currentProducts);
  }

  // 3. Supabase Direct Async Push (if configured)
  if (isSupabaseConfigured && supabase) {
    supabase
      .from('sales')
      .insert([newSale])
      .then(({ error }) => {
        if (error) console.warn('Supabase sale insert error:', error.message);
      });

    if (targetProduct) {
      supabase
        .from('products')
        .update({ stock: targetProduct.stock })
        .eq('id', targetProduct.id)
        .then(({ error }) => {
          if (error) console.warn('Supabase stock update error:', error.message);
        });
    }
  }
}

export function deleteSaleLocally(id: string): void {
  const currentSales = getStoredSales();
  const filtered = currentSales.filter(s => s.id !== id);
  saveStoredSales(filtered);

  if (isSupabaseConfigured && supabase) {
    supabase
      .from('sales')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.warn('Supabase delete sale error:', error.message);
      });
  }
}
