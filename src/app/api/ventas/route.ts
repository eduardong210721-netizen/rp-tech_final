import { NextRequest, NextResponse } from 'next/server';
import { getInventorySheet, getSalesSheet } from '@/lib/sheets';

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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
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
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Try Google Sheets sync if configured
    if (process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      try {
        const inventorySheet = await getInventorySheet();
        const salesSheet = await getSalesSheet();

        const rows = await inventorySheet.getRows();
        const productRow = rows.find(row => String(row.get('ID')) === String(producto_id) || String(row.get('SKU')) === String(producto_id));

        if (productRow) {
          const currentStock = Number(productRow.get('Stock') || 0);
          if (currentStock < cantidad) {
            return NextResponse.json(
              { error: 'Stock insuficiente para procesar la venta' },
              { status: 400, headers: corsHeaders }
            );
          }
          productRow.set('Stock', Math.max(0, currentStock - cantidad));
          await productRow.save();
        }

        await salesSheet.addRow({
          Fecha: new Date().toLocaleDateString('es-PE'),
          Vendedor: vendedor,
          Cliente: cliente,
          Distrito_Entrega: distrito_entrega,
          Producto: producto_nombre,
          Cantidad: cantidad,
          Total: total,
          Metodo_Pago: metodo_pago,
          Comprobante_URL: comprobante_url || '',
        });

        return NextResponse.json(
          { success: true, message: 'Venta registrada con éxito en Google Sheets' },
          { status: 201, headers: corsHeaders }
        );
      } catch (sheetErr) {
        console.warn('Google Sheets no disponible, usando fallback local para venta:', sheetErr);
      }
    }

    // Local / In-Memory Fallback
    try {
      // Fetch products via local API endpoint logic
      const invRes = await fetch(new URL('/api/inventario', request.url).toString());
      if (invRes.ok) {
        const products = await invRes.json();
        const product = products.find((p: any) => String(p.id) === String(producto_id) || String(p.sku) === String(producto_id));

        if (product) {
          const newStock = Math.max(0, product.stock - cantidad);
          await fetch(new URL('/api/inventario', request.url).toString(), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...product, stock: newStock })
          });
        }
      }
    } catch (localErr) {
      console.warn('Could not update local product stock:', localErr);
    }

    return NextResponse.json(
      { success: true, message: 'Venta registrada correctamente' },
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
