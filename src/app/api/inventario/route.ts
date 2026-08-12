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

let memoryProductsCache: Product[] | null = null;

function getLocalProducts(): Product[] {
  if (memoryProductsCache && memoryProductsCache.length > 0) {
    return [...memoryProductsCache];
  }
  try {
    if (fs.existsSync(jsonPath)) {
      const data = fs.readFileSync(jsonPath, 'utf8');
      memoryProductsCache = JSON.parse(data);
      return [...(memoryProductsCache || [])];
    }
  } catch (err) {
    console.error('Error reading local products.json:', err);
  }
  return [];
}

function saveLocalProducts(products: Product[]): boolean {
  memoryProductsCache = [...products];
  try {
    const dir = path.dirname(jsonPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(jsonPath, JSON.stringify(products, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.warn('Could not write to local products.json (may be read-only environment):', err);
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

        const productsFromSheet: Product[] = rows.map((row) => ({
          id: String(row.get('ID') || row.get('SKU')),
          sku: String(row.get('SKU') || row.get('ID')),
          producto: String(row.get('Producto') || row.get('Descripción') || ''),
          precio: Number(row.get('Precio') || row.get('Precio Sugerido de Venta') || 0),
          costo: Number(row.get('Costo Promedio') || row.get('Costo') || 0),
          stock: Number(row.get('Stock') || 0),
          imagen_url: String(row.get('Imagen_URL') || `/products/${row.get('SKU') || row.get('ID')}.jpg`),
          categoria: String(row.get('Categoría') || 'GENERAL'),
        }));

        if (productsFromSheet.length > 0) {
          memoryProductsCache = [...productsFromSheet];
          return NextResponse.json(productsFromSheet, { headers: corsHeaders });
        }
      } catch (sheetErr) {
        console.warn('Google Sheets not accessible, falling back to local storage:', sheetErr);
      }
    }

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

    const newProduct: Product = {
      id: String(body.id || body.sku || `SKU-${Date.now()}`),
      sku: String(body.sku || body.id || `SKU-${Date.now()}`),
      producto: String(body.producto || ''),
      precio: Number(body.precio || 0),
      costo: Number(body.costo || 0),
      stock: Number(body.stock || 0),
      imagen_url: String(body.imagen_url || '/logo.jpg'),
      categoria: String(body.categoria || 'GENERAL'),
    };

    // 1. Google Sheets sync
    if (process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      try {
        const sheet = await getInventorySheet();
        await sheet.addRow({
          ID: newProduct.id,
          SKU: newProduct.sku,
          Producto: newProduct.producto,
          Precio: newProduct.precio,
          Costo: newProduct.costo,
          Stock: newProduct.stock,
          Imagen_URL: newProduct.imagen_url,
          Categoría: newProduct.categoria,
        });
      } catch (sheetErr) {
        console.warn('Failed to add row to Google Sheets:', sheetErr);
      }
    }

    // 2. Local memory & json sync
    const products = getLocalProducts();
    // Prevent duplicate ID in local array
    const existingIndex = products.findIndex((p) => p.id === newProduct.id || p.sku === newProduct.sku);
    if (existingIndex !== -1) {
      products[existingIndex] = newProduct;
    } else {
      products.push(newProduct);
    }
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
    const targetId = String(body.id || body.sku);

    const updatedProduct: Product = {
      id: targetId,
      sku: String(body.sku || targetId),
      producto: String(body.producto || ''),
      precio: Number(body.precio ?? 0),
      costo: Number(body.costo ?? 0),
      stock: Number(body.stock ?? 0),
      imagen_url: String(body.imagen_url || '/logo.jpg'),
      categoria: String(body.categoria || 'GENERAL'),
    };

    // 1. Google Sheets sync
    if (process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      try {
        const sheet = await getInventorySheet();
        const rows = await sheet.getRows();
        const targetRow = rows.find(
          (r) => String(r.get('ID')) === targetId || String(r.get('SKU')) === targetId || String(r.get('SKU')) === String(body.sku)
        );

        if (targetRow) {
          targetRow.set('SKU', updatedProduct.sku);
          targetRow.set('Producto', updatedProduct.producto);
          targetRow.set('Precio', updatedProduct.precio);
          targetRow.set('Costo', updatedProduct.costo);
          targetRow.set('Stock', updatedProduct.stock);
          targetRow.set('Imagen_URL', updatedProduct.imagen_url);
          targetRow.set('Categoría', updatedProduct.categoria);
          await targetRow.save();
        } else {
          // If row not found in sheet, append it
          await sheet.addRow({
            ID: updatedProduct.id,
            SKU: updatedProduct.sku,
            Producto: updatedProduct.producto,
            Precio: updatedProduct.precio,
            Costo: updatedProduct.costo,
            Stock: updatedProduct.stock,
            Imagen_URL: updatedProduct.imagen_url,
            Categoría: updatedProduct.categoria,
          });
        }
      } catch (sheetErr) {
        console.warn('Failed to update row in Google Sheets:', sheetErr);
      }
    }

    // 2. Local memory & json sync
    const products = getLocalProducts();
    const index = products.findIndex((p) => p.id === targetId || p.sku === body.sku || p.id === body.sku);

    if (index !== -1) {
      products[index] = { ...products[index], ...updatedProduct };
    } else {
      products.push(updatedProduct);
    }
    saveLocalProducts(products);

    return NextResponse.json(updatedProduct, { headers: corsHeaders });
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

    // 1. Google Sheets sync
    if (process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      try {
        const sheet = await getInventorySheet();
        const rows = await sheet.getRows();
        const targetRow = rows.find((r) => String(r.get('ID')) === String(id) || String(r.get('SKU')) === String(id));
        if (targetRow) {
          await targetRow.delete();
        }
      } catch (sheetErr) {
        console.warn('Failed to delete row from Google Sheets:', sheetErr);
      }
    }

    // 2. Local memory & json sync
    let products = getLocalProducts();
    products = products.filter((p) => String(p.id) !== String(id) && String(p.sku) !== String(id));
    saveLocalProducts(products);

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500, headers: corsHeaders });
  }
}
