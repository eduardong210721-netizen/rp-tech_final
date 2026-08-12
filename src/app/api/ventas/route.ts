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

    const inventorySheet = await getInventorySheet();
    const salesSheet = await getSalesSheet();

    const rows = await inventorySheet.getRows();
    const productRow = rows.find(row => String(row.get('ID')) === String(producto_id));

    if (!productRow) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const currentStock = Number(productRow.get('Stock'));
    if (currentStock < cantidad) {
      return NextResponse.json(
        { error: 'Not enough stock' },
        { status: 400, headers: corsHeaders }
      );
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

    productRow.set('Stock', currentStock - cantidad);
    await productRow.save();

    return NextResponse.json(
      { success: true, message: 'Sale recorded successfully' },
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
