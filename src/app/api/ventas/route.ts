import { NextRequest, NextResponse } from 'next/server';
import { getInventorySheet, getSalesSheet } from '@/lib/sheets';
import { Product, SaleRecord } from '@/types';
import { saveSaleToDrive } from '@/lib/drive';
import fs from 'fs';
import path from 'path';

export const revalidate = 0; // Dynamic API route

interface SalePayload {
  producto_id: string;
  producto_nombre: string;
  cantidad: number;
  total: number;
  vendedor: string;
  cliente: string;
  distrito_entrega: string;
  metodo_pago: string;
  comprobante_url: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const salesJsonPath = path.join(process.cwd(), 'src', 'data', 'sales.json');

let memorySalesCache: SaleRecord[] | null = null;

function getLocalSales(): SaleRecord[] {
  if (memorySalesCache && memorySalesCache.length > 0) {
    return [...memorySalesCache];
  }
  try {
    if (fs.existsSync(salesJsonPath)) {
      const data = fs.readFileSync(salesJsonPath, 'utf8');
      memorySalesCache = JSON.parse(data);
      return [...(memorySalesCache || [])];
    }
  } catch (err) {
    console.error('Error reading local sales.json:', err);
  }
  return [];
}

function saveLocalSales(sales: SaleRecord[]): boolean {
  memorySalesCache = [...sales];
  try {
    const dir = path.dirname(salesJsonPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(salesJsonPath, JSON.stringify(sales, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.warn('Could not write to local sales.json (read-only filesystem):', err);
    return false;
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  try {
    const localSales = getLocalSales();
    const combinedSales = [...localSales];

    // 1. Try fetching sales from Google Sheets if configured
    if (process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      try {
        const sheet = await getSalesSheet();
        const rows = await sheet.getRows();

        const salesFromSheet: SaleRecord[] = rows.map((row, idx) => ({
          id: String(row.get('ID') || `VENTA-SHEET-${idx + 1}`),
          fecha: String(row.get('Fecha') || new Date().toLocaleDateString('es-PE')),
          vendedor: String(row.get('Vendedor') || ''),
          cliente: String(row.get('Cliente') || ''),
          distrito_entrega: String(row.get('Distrito_Entrega') || ''),
          producto_id: String(row.get('Producto_ID') || ''),
          producto_nombre: String(row.get('Producto') || ''),
          cantidad: Number(row.get('Cantidad') || 1),
          total: Number(row.get('Total') || 0),
          metodo_pago: String(row.get('Metodo_Pago') || 'Yape'),
          comprobante_url: String(row.get('Comprobante_URL') || ''),
        }));

        // Merge without duplicates by ID
        for (const s of salesFromSheet) {
          if (!combinedSales.some(existing => existing.id === s.id)) {
            combinedSales.push(s);
          }
        }
      } catch (sheetErr) {
        console.warn('Google Sheets sales not accessible, returning local sales:', sheetErr);
      }
    }

    memorySalesCache = [...combinedSales];
    return NextResponse.json(combinedSales, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching sales:', error);
    const sales = getLocalSales();
    return NextResponse.json(sales, { headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SalePayload = await request.json();

    const {
      producto_id,
      producto_nombre,
      cantidad,
      total,
      vendedor,
      cliente,
      distrito_entrega,
      metodo_pago,
      comprobante_url,
    } = body;

    if (!producto_id || !cantidad || !total || !vendedor || !cliente || !distrito_entrega || !metodo_pago) {
      return NextResponse.json(
        { error: 'Todos los campos requeridos deben estar completos' },
        { status: 400, headers: corsHeaders }
      );
    }

    const now = new Date();
    const newSale: SaleRecord = {
      id: `VENTA-${Date.now()}`,
      fecha: `${now.toLocaleDateString('es-PE')} ${now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`,
      vendedor,
      cliente,
      distrito_entrega,
      producto_id,
      producto_nombre,
      cantidad: Number(cantidad),
      total: Number(total),
      metodo_pago,
      comprobante_url: comprobante_url || '',
    };

    // 1. GUARANTEED STEP: Save sale locally in memory & sales.json FIRST
    const sales = getLocalSales();
    sales.unshift(newSale); // newest first
    saveLocalSales(sales);

    // 2. Reduce stock in local products inventory
    try {
      const invRes = await fetch(new URL('/api/inventario', request.url).toString());
      if (invRes.ok) {
        const products: Product[] = await invRes.json();
        const product = products.find((p: Product) => String(p.id) === String(producto_id) || String(p.sku) === String(producto_id));

        if (product) {
          const newStock = Math.max(0, product.stock - cantidad);
          await fetch(new URL('/api/inventario', request.url).toString(), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...product, stock: newStock }),
          });
        }
      }
    } catch (localErr) {
      console.warn('Could not update local product stock:', localErr);
    }

    // 3. OPTIONAL REMOTE SYNC: Google Drive & Google Sheets (non-blocking)
    let driveVoucherUrl = '';
    try {
      const driveRes = await saveSaleToDrive(body);
      if (driveRes.voucherUrl) {
        driveVoucherUrl = driveRes.voucherUrl;
        newSale.comprobante_url = driveVoucherUrl;
        // Update local record with drive URL if available
        saveLocalSales(sales);
      }
    } catch (driveErr) {
      console.warn('Google Drive sync skipped/error:', driveErr);
    }

    if (process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      try {
        const inventorySheet = await getInventorySheet();
        const salesSheet = await getSalesSheet();

        const rows = await inventorySheet.getRows();
        const productRow = rows.find(row => String(row.get('ID')) === String(producto_id) || String(row.get('SKU')) === String(producto_id));

        if (productRow) {
          const currentStock = Number(productRow.get('Stock') || 0);
          productRow.set('Stock', Math.max(0, currentStock - cantidad));
          await productRow.save();
        }

        // Safe URL for Google Sheets cell (max 50,000 chars)
        let sheetVoucherVal = driveVoucherUrl || newSale.comprobante_url;
        if (sheetVoucherVal.startsWith('data:')) {
          sheetVoucherVal = '[Comprobante adjuntado en Web]';
        }

        await salesSheet.addRow({
          ID: newSale.id,
          Fecha: newSale.fecha,
          Vendedor: newSale.vendedor,
          Cliente: newSale.cliente,
          Distrito_Entrega: newSale.distrito_entrega,
          Producto_ID: newSale.producto_id,
          Producto: newSale.producto_nombre,
          Cantidad: newSale.cantidad,
          Total: newSale.total,
          Metodo_Pago: newSale.metodo_pago,
          Comprobante_URL: sheetVoucherVal,
        });
      } catch (sheetErr) {
        console.warn('Google Sheets sync skipped/error:', sheetErr);
      }
    }

    return NextResponse.json(
      { success: true, message: 'Venta registrada exitosamente', sale: newSale },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error processing sale:', error);
    return NextResponse.json(
      { error: 'Failed to process sale' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400, headers: corsHeaders });
    }

    let sales = getLocalSales();
    sales = sales.filter((s) => s.id !== id);
    saveLocalSales(sales);

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error deleting sale:', error);
    return NextResponse.json({ error: 'Failed to delete sale' }, { status: 500, headers: corsHeaders });
  }
}
