# RP Tech — Tienda de Accesorios Tecnológicos

MVP de tienda online construida con Next.js 14, Google Sheets como backend, y Uploadthing para carga de archivos.

## 🚀 Inicio Rápido

### Requisitos Previos
- Node.js 18+
- Cuenta de Google Cloud con Sheets API habilitada
- Cuenta de Uploadthing

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
Copia `.env.local` y completa los valores:

```env
# Google Sheets
GOOGLE_SERVICE_ACCOUNT_EMAIL=tu-email@proyecto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=id_de_tu_spreadsheet

# Uploadthing
UPLOADTHING_TOKEN=tu_token

# PIN del portal de vendedores
NEXT_PUBLIC_VENDOR_PIN=1234
```

### 3. Configurar Google Sheet
Crear una hoja de cálculo con dos pestañas:

**Pestaña 1: "Inventario"** (headers en fila 1):
| ID | Producto | Precio | Stock | Imagen_URL |
|---|---|---|---|---|
| 1 | AUDIFONOS DAMIX M20 | 15 | 50 | https://lh3.googleusercontent.com/d/1Kwk43T9fPp87X5ze-7KOeAHrQMg3FfHG=s1000 |
| 2 | AUDIFONOS REDD ALAMBRICO | 20 | 40 | https://lh3.googleusercontent.com/d/1cfOrqGq1iPIPY8HHR8kWoFDwarLOe-v4=s1000 |
| 3 | Cable Iphone | 15 | 60 | https://lh3.googleusercontent.com/d/1Z6nUrWlihzk-oM3pml9au6-tMucsMaev=s1000 |
| 4 | CABLE REDD TIPO C USB 7.2 AMPERIOS | 15 | 80 | https://lh3.googleusercontent.com/d/1xuWhYpxHm6KEGqYJfl1frMy4-rKEI7_V=s1000 |
| 5 | CABLE ROMAX TIPO C | 10 | 100 | https://lh3.googleusercontent.com/d/13oe9kTnw8awDk7Ma-XqYVQH77byy8s0O=s1000 |
| 6 | Cargador Dado REDD + Cable Tipo C | 30 | 35 | https://lh3.googleusercontent.com/d/16Le6DnNZQ67VhW6dl0sneP65zusi6ulg=s1000 |
| 7 | HOLDER ROMAX | 15 | 45 | https://lh3.googleusercontent.com/d/1RHJ0wNZ7OrEKYjU0tV_V-6pQkpT4m8fQ=s1000 |
| 8 | MOUSE Bluetooth Halion | 65 | 30 | https://lh3.googleusercontent.com/d/1hQ_DnFbDA47xBKFRkAYo4x51byNthQri=s1000 |
| 9 | CARGADOR PORTÁTIL ROMAX | 45 | 25 | https://lh3.googleusercontent.com/d/1-efRqGdUAiR0Dm_or9QndAe5SyjaYxkp=s1000 |

**Pestaña 2: "Ventas"** (headers en fila 1):
| Fecha | Vendedor | Cliente | Distrito_Entrega | Producto | Cantidad | Total | Metodo_Pago | Comprobante_URL |

> **IMPORTANTE**: Compartir la hoja con el email de la Service Account (permisos de Editor)

### 4. Ejecutar en desarrollo
```bash
npm run dev
```

### 5. Desplegar en Vercel
```bash
npx vercel
```
Configurar las mismas variables de entorno en el dashboard de Vercel.

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── page.tsx              # Catálogo público
│   ├── layout.tsx            # Layout raíz
│   ├── globals.css           # Estilos globales
│   ├── ventas/page.tsx       # Portal vendedores (PIN)
│   └── api/
│       ├── inventario/       # GET productos
│       ├── ventas/           # POST venta
│       └── uploadthing/      # Upload comprobantes
├── components/
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── ProductCard.tsx
│   ├── ProductGrid.tsx
│   ├── PinLock.tsx
│   ├── SalesForm.tsx
│   └── UploadButton.tsx
├── lib/
│   ├── sheets.ts             # Google Sheets client
│   └── uploadthing.ts        # Uploadthing helpers
└── types/
    └── index.ts              # TypeScript interfaces
```

## 🎨 Paleta de Colores

| Color | Hex | Uso |
|---|---|---|
| Primary | `#023e55` | Fondos oscuros, headers |
| Secondary | `#2ba5b2` | Acentos, botones |
| Accent | `#f7af02` | CTAs, alertas |
| Complement | `#3b4e73` | Fondos intermedios |
