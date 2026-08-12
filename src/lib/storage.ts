import { Product, SaleRecord } from '@/types';

const PRODUCTS_STORAGE_KEY = 'rp_products_cache';
const SALES_STORAGE_KEY = 'rp_sales_cache';

export const DATA_UPDATED_EVENT = 'rp_data_updated';

function notifyDataUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(DATA_UPDATED_EVENT));
  }
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
  // Avoid duplicate by ID
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
}
