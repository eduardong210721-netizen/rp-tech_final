# RP Tech

Tienda en línea de accesorios tecnológicos (Lima, Perú). Catálogo público con
búsqueda y filtros, carrito de compras, checkout que registra el pedido en
base de datos y lo entrega por WhatsApp, y un panel de administración para
gestionar productos, stock y pedidos.

- **Next.js 16** (App Router) + React 19, TypeScript en modo estricto.
- **Supabase** (Postgres + Auth + Storage) como único backend. No hay Google
  Sheets, ni ninguna otra fuente de datos: todo el catálogo, el stock y los
  pedidos viven en Postgres.
- **Tailwind CSS v4** (configurado vía `@theme` en `src/app/globals.css`, sin
  `tailwind.config.ts`).
- **Vitest** para pruebas unitarias.

## Requisitos

- Node.js 22+
- Un proyecto de Supabase (gratis en [supabase.com](https://supabase.com))

## Variables de entorno

Copia `.env.example` a `.env.local` y complétalo. Estas son **las seis**
variables que el código realmente lee (verificado con
`grep -rn "process.env" src scripts`) — no hay ninguna otra:

| Variable | Dónde se usa | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente y servidor | URL del proyecto Supabase (`https://xxxx.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente y servidor | Clave pública (`anon`). Respeta Row Level Security. |
| `SUPABASE_SERVICE_ROLE_KEY` | **solo servidor** | Clave `service_role`. Ignora RLS. Se usa en `supabaseAdmin()` para leer/escribir el catálogo, el stock y los pedidos, y en `scripts/seed.ts`. |
| `NEXT_PUBLIC_WHATSAPP` | cliente y servidor | Número de WhatsApp del negocio (formato `51XXXXXXXXX`) al que se arma el enlace `wa.me` del checkout. |
| `NEXT_PUBLIC_SITE_URL` | servidor | URL pública del sitio (`https://rptech.pe`). Se usa para `metadataBase`, el `sitemap.xml`, `robots.txt` y las URLs absolutas de OpenGraph. |
| `ADMIN_EMAILS` | **solo servidor** | Lista blanca de correos con acceso a `/admin`, separados por coma (`a@x.com,b@y.com`). **Nunca** con prefijo `NEXT_PUBLIC_`. El registro de usuarios está abierto en el proyecto de Supabase (`disable_signup: false`): cualquiera con la anon key puede crear una cuenta y confirmarla, así que estar autenticado no basta para entrar al panel — `requireAdmin()` exige además que el correo esté en esta lista. Sin ella (o vacía), se deniega el acceso a **todos**, nunca falla abierto. |

> **Advertencia de seguridad:** `SUPABASE_SERVICE_ROLE_KEY` **jamás** debe
> llevar el prefijo `NEXT_PUBLIC_`. Cualquier variable con ese prefijo la
> incluye Next.js en el bundle de JavaScript que se descarga en el navegador
> de cualquier visitante. La `service_role` ignora Row Level Security: si se
> filtra, cualquiera puede leer y escribir toda la base de datos —
> productos, costos, stock y pedidos de clientes — sin autenticarse.
> Esta clave solo se lee en código de servidor (`src/lib/supabase/admin.ts`,
> `scripts/seed.ts`) y nunca debe aparecer en un componente cliente ni
> comprometerse en el repositorio. `.env.local` está en `.gitignore`.

## Cómo correrlo en local

```bash
npm install
cp .env.example .env.local   # y completa las 6 variables
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Otros scripts

```bash
npm run typecheck   # tsc --noEmit
npm run lint         # eslint
npm test             # vitest run (pruebas unitarias, no requieren Supabase)
npm run build         # build de producción
npm run start         # sirve el build de `npm run build`
```

## Base de datos

Las migraciones SQL viven en `supabase/migrations/` y son la fuente de
verdad del esquema (tablas `categories`, `products`, `product_images`,
`orders`, `order_items`, la función `crear_pedido` y las políticas RLS).
Aplícalas contra tu proyecto de Supabase en orden con el SQL Editor del
dashboard o con `supabase db push` si usas el CLI de Supabase.

### Sembrar el catálogo

Con `.env.local` completo (necesita `NEXT_PUBLIC_SUPABASE_URL` y
`SUPABASE_SERVICE_ROLE_KEY`):

```bash
npm run seed
```

Esto sube las imágenes de `scripts/imagenes/` (generadas con
`scripts/optimizar-imagenes.sh`, ya comprimidas a WebP ≤300 KB) al bucket
público `productos` de Supabase Storage, y crea/actualiza categorías y
productos a partir de `scripts/data/catalogo.ts`. Es idempotente: se puede
correr varias veces sin duplicar filas (usa `upsert` por slug/SKU).

El bucket `productos` debe existir y ser **público** antes de sembrar
(Supabase Dashboard → Storage → New bucket).

### Crear el usuario admin

1. Supabase Dashboard → Authentication → Users → Add user. Email real del
   dueño, contraseña fuerte, **email confirmado**.
2. Agrega ese mismo correo a `ADMIN_EMAILS` en `.env.local` (o en las
   variables de la plataforma de despliegue).

Con eso inicia sesión en `/admin/login`.

> **El registro público de Supabase Auth NO es un control de acceso al
> panel.** Puede estar abierto (`disable_signup: false`) o cerrado — en
> cualquiera de los dos casos, `requireAdmin()` exige además que el correo
> esté en `ADMIN_EMAILS`. Si quieres cerrar también el registro público
> (defensa en profundidad, no obligatorio): Authentication → Providers →
> Email → "Allow new users to sign up" = OFF.

## Cómo desplegar en Vercel

La base de datos de producción **ya está montada y sembrada** (proyecto
Supabase `ijxgultrjfxmgkzhfrks`), así que este despliegue no la crea: la
reutiliza. Los pasos son en orden y el orden importa.

### 1. Subir el repositorio

Vercel despliega desde un repositorio Git. Todavía no hay remoto configurado:

```bash
# desde la raíz del repositorio, no desde rp-tech/
gh repo create rp-tech --private --source=. --remote=origin --push
# o, si prefieres crearlo a mano en github.com:
#   git remote add origin git@github.com:TU-USUARIO/rp-tech.git
#   git push -u origin main
```

### 2. Importar en Vercel, con el directorio raíz correcto

En *Add New… → Project*, elige el repositorio y **cambia «Root Directory» a
`rp-tech`**. Es el error número uno al desplegar este proyecto: la aplicación
vive en un subdirectorio, y con la raíz por defecto Vercel no encuentra el
`package.json` y falla sin explicar por qué.

Framework Preset se detecta solo (Next.js). No toques los comandos de build.

### 3. Las seis variables de entorno

Cópialas en *Settings → Environment Variables*, marcando **Production**,
**Preview** y **Development**. Las tres primeras salen de Supabase
(*Project Settings → API*).

| Variable | Secreta | Valor |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | no | `https://ijxgultrjfxmgkzhfrks.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | no | la clave `anon` |
| `SUPABASE_SERVICE_ROLE_KEY` | **sí** | la clave `service_role` |
| `ADMIN_EMAILS` | **sí** | tu correo, o varios separados por coma |
| `NEXT_PUBLIC_WHATSAPP` | no | `51935423395` |
| `NEXT_PUBLIC_SITE_URL` | no | el dominio final, sin barra al final |

Tres avisos que ahorran una tarde de depuración:

- **`SUPABASE_SERVICE_ROLE_KEY` y `ADMIN_EMAILS` nunca llevan `NEXT_PUBLIC_`.**
  Ese prefijo las mete en el paquete que descarga el navegador. La primera es
  la llave maestra de la base; la segunda es lo único que separa «tiene
  cuenta» de «es el dueño».
- **`NEXT_PUBLIC_SITE_URL` tiene que ser el dominio real desde el primer
  despliegue.** De ella dependen el `sitemap.xml`, el `robots.txt` y las URLs
  de OpenGraph — o sea, la vista previa que sale al compartir un producto por
  WhatsApp, que es el canal de venta de la tienda. Si falta, el build falla a
  propósito en vez de publicar canónicos apuntando a `localhost`.
- **El build consulta Supabase.** `generateStaticParams` y `sitemap.ts` piden
  los slugs activos durante `next build`, así que las variables tienen que
  existir *antes* del primer despliegue, no después.

### 4. Cerrar el registro público en Supabase

**Esto es obligatorio y hoy está abierto.** En
*Authentication → Sign In / Providers → Email*, desactiva **«Allow new users
to sign up»**.

Sin eso, cualquiera que tenga la clave `anon` —que por diseño es pública—
puede crearse una cuenta. El código ya lo bloquea con la lista blanca de
`ADMIN_EMAILS`, pero una sola capa de defensa no basta para el panel que ve
todos tus costos y todos los datos de tus clientes.

Mientras estás ahí, dos ajustes más de un clic:

- *Authentication → URL Configuration* → pon tu dominio en **Site URL**.
- *Authentication → Policies* (o *Password settings*) → activa **Leaked
  password protection**. Compara la contraseña contra la base de
  HaveIBeenPwned y evita que la única cuenta con acceso a tus costos y a los
  datos de tus clientes use una contraseña ya filtrada en otra brecha. El
  linter de seguridad de Supabase lo reporta como pendiente.

### 5. Comprobar después de desplegar

```bash
DOMINIO=https://tu-dominio

# El panel está cerrado
curl -s -o /dev/null -w '%{http_code}\n' $DOMINIO/admin          # 307

# Los costos no salen al público
curl -s $DOMINIO/ | grep -ci costo                               # 0

# El sitemap apunta a tu dominio, no a localhost
curl -s $DOMINIO/sitemap.xml | head -3

# Las fotos cargan (si esto falla, revisa NEXT_PUBLIC_SUPABASE_URL)
curl -s $DOMINIO/ | grep -o '_next/image[^"]*' | head -1
```

Y en el navegador: entra a `/admin` con tu correo, confirma que ves el
resumen, y haz un pedido de prueba completo para verificar que WhatsApp abre
con el mensaje correcto. Bórralo después desde el panel.

### 6. Rotar la clave `service_role`

Si la clave se compartió en algún chat, mensaje o captura durante el
desarrollo, rótala en *Project Settings → API → service_role → Rotate* y
actualiza la variable en Vercel. Es la llave maestra: quien la tenga puede
leer y escribir toda la base saltándose las políticas de seguridad.

## CI

`.github/workflows/ci.yml` (en la raíz del repositorio, no dentro de
`rp-tech/` — así es como GitHub Actions lo descubre) corre en cada push y
pull request: `typecheck`, `lint` y `test`. Deliberadamente **no** corre
`build`: `generateStaticParams` en `producto/[slug]/page.tsx` y `sitemap.ts`
sí hacen una petición real a Supabase durante `next build` (para listar los
slugs a pre-renderizar), así que el build necesita credenciales reales de un
proyecto de Supabase alcanzable — unas credenciales de relleno con formato
válido pero que no resuelven (`https://ejemplo.supabase.co`) hacen fallar el
build, no lo saltan. Verificar el build de producción completo queda para el
despliegue, donde sí hay un proyecto real detrás.

## Pendientes conocidos

Dos productos quedan sembrados con `activo = false` porque falta información
que no se puede inventar (precio/costo/stock de un SKU, y la foto de otro).
Se activan desde `/admin` en cuanto el dueño complete esos datos. Fuera de
alcance de esta versión: pasarela de pago, cuentas de cliente, variantes de
color con stock independiente, costo de envío por distrito y emails
transaccionales.
