-- ============================================================
-- RP TECH — CONFIGURACIÓN DE BASE DE DATOS Y REALTIME EN SUPABASE
-- Ejecuta este script en el SQL Editor de tu proyecto en Supabase
-- (https://supabase.com/dashboard/project/_/sql)
-- ============================================================

-- 1. TABLA DE PRODUCTOS (INVENTARIO)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  producto TEXT NOT NULL,
  precio NUMERIC(10, 2) NOT NULL DEFAULT 0,
  costo NUMERIC(10, 2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  imagen_url TEXT DEFAULT '/logo.jpg',
  categoria TEXT DEFAULT 'GENERAL',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA DE HISTORIAL DE VENTAS
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY,
  fecha TEXT NOT NULL,
  vendedor TEXT NOT NULL,
  cliente TEXT NOT NULL,
  distrito_entrega TEXT NOT NULL,
  producto_id TEXT NOT NULL,
  producto_nombre TEXT NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  metodo_pago TEXT NOT NULL DEFAULT 'Yape',
  comprobante_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. HABILITAR POLITICAS DE ACCESO PUBLICO (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso público productos" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso público ventas" ON public.sales FOR ALL USING (true) WITH CHECK (true);

-- 4. ACTIVAR SUSCRIPCIONES EN TIEMPO REAL (REALTIME WEBSOCKETS)
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;

-- 5. SEMILLA DE PRODUCTOS INICIALES (OPCIONAL)
INSERT INTO public.products (id, sku, producto, precio, costo, stock, imagen_url, categoria)
VALUES 
  ('26001', '26001', 'Cable Cargador De Carga Rápida Tipo C Y Para Iphone 1 Metro Transparente 66w 2 en 1', 3.00, 1.50, 10, '/products/26001.png', 'CABLE CARGADOR'),
  ('26002', '26002', 'Mini Bocina Bluetooth Vintage Modelo Fm Hifi Con Batería Recargable', 10.00, 5.00, 10, '/products/26002.png', 'BOCINA BLUETOOTH'),
  ('26003', '26003', 'Foco Cámara 360° Con Alarma Inalámbrica Visión Nocturna Sensor De Movimiento Altavoz Y Micrófono Integrado', 18.00, 9.00, 10, '/products/26003.png', 'CAMARA SEGURIDAD'),
  ('26004', '26004', 'Tira Led Neón Manguera Flex 5m Decorativa 12v Fuente', 17.50, 8.75, 10, '/products/26004.png', 'ILUMINACION LED'),
  ('26005', '26005', 'Cable De Carga Ultra Rápido 120w 6a Conector Giratorio 180° Tipo C', 3.00, 1.50, 10, '/products/26005.png', 'CABLE CARGADOR'),
  ('26006', '26006', 'Foco Giratorio Bocina Luces Audiorítmica Bluetooth E27 RGB', 11.50, 5.75, 10, '/products/26006.png', 'ILUMINACION LED')
ON CONFLICT (id) DO NOTHING;
