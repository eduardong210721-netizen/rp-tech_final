export interface Product {
  id: string;
  sku?: string;
  producto: string;
  precio: number;
  costo?: number;
  stock: number;
  imagen_url: string;
  categoria?: string;
}

export interface SalePayload {
  vendedor: string;
  cliente: string;
  distrito_entrega: string;
  producto_id: string;
  producto_nombre: string;
  cantidad: number;
  total: number;
  metodo_pago: string;
  comprobante_url: string;
}

export interface SaleFormData {
  vendedor: string;
  cliente: string;
  distrito_entrega: string;
  producto_id: string;
  cantidad: number;
  metodo_pago: 'Yape' | 'Plin' | 'Efectivo' | 'Transferencia';
  comprobante_url: string;
}
