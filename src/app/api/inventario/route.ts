import { NextResponse } from 'next/server';
import { getInventorySheet } from '@/lib/sheets';
import fs from 'fs';
import path from 'path';
import { Product } from '@/types';

export const revalidate = 0; // Dynamic API route

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const jsonPath = path.join(process.cwd(), 'src', 'data', 'products.json');

function getLocalProducts(): Product[] {
  try {
    if (fs.existsSync(jsonPath)) {
      const data = fs.readFileSync(jsonPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading local products.json:', err);
  }
  return [];
}

function saveLocalProducts(products: Product[]): boolean {
  try {
    const dir = path.dirname(jsonPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(jsonPath, JSON.stringify(products, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing local products.json:', err);
    return false;
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  try {
    // Attempt to load from Google Sheets first if configured
    if (process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      try {
        const sheet = await getInventorySheet();
        const rows = await sheet.getRows();

        const productsFromSheet = rows.map((row) => ({
          id: row.get('ID') || row.get('SKU'),
          sku: row.get('SKU') || row.get('ID'),
          producto: row.get('Producto') || row.get('Descripción'),
          precio: Number(row.get('Precio') || row.get('Precio Sugerido de Venta') || 0),
          costo: Number(row.get('Costo Promedio') || row.get('Costo') || 0),
          stock: Number(row.get('Stock') || 10),
          imagen_url: row.get('Imagen_URL') || `/products/${row.get('SKU') || row.get('ID')}.jpg`,
          categoria: row.get('Categoría') || 'GENERAL',
        }));

        if (productsFromSheet.length > 0) {
          return NextResponse.json(productsFromSheet, { headers: corsHeaders });
        }
      } catch (sheetErr) {
        console.warn('Google Sheets not accessible, falling back to local JSON:', sheetErr);
      }
    }

    // Fallback to local products.json
    const products = getLocalProducts();
    return NextResponse.json(products, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    const products = getLocalProducts();
    return NextResponse.json(products, { headers: corsHeaders });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const products = getLocalProducts();

    const newProduct: Product = {
      id: body.id || body.sku || `SKU-${Date.now()}`,
      sku: body.sku || body.id || `SKU-${Date.now()}`,
      producto: body.producto,
      precio: Number(body.precio || 0),
      costo: Number(body.costo || 0),
      stock: Number(body.stock || 0),
      imagen_url: body.imagen_url || '/logo.jpg',
      categoria: body.categoria || 'GENERAL',
    };

    products.push(newProduct);
    saveLocalProducts(products);

    return NextResponse.json(newProduct, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500, headers: corsHeaders });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const products = getLocalProducts();

    const index = products.findIndex((p) => p.id === body.id || p.sku === body.sku);
    if (index === -1) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404, headers: corsHeaders });
    }

    products[index] = {
      ...products[index],
      sku: body.sku || products[index].sku,
      producto: body.producto ?? products[index].producto,
      precio: body.precio !== undefined ? Number(body.precio) : products[index].precio,
      costo: body.costo !== undefined ? Number(body.costo) : products[index].costo,
      stock: body.stock !== undefined ? Number(body.stock) : products[index].stock,
      imagen_url: body.imagen_url || products[index].imagen_url,
      categoria: body.categoria || products[index].categoria,
    };

    saveLocalProducts(products);

    return NextResponse.json(products[index], { headers: corsHeaders });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500, headers: corsHeaders });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400, headers: corsHeaders });
    }

    let products = getLocalProducts();
    products = products.filter((p) => p.id !== id && p.sku !== id);
    saveLocalProducts(products);

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500, headers: corsHeaders });
  }
}
