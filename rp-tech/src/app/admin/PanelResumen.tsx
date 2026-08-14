import Link from 'next/link'
import { formatPEN } from '@/lib/format'
import type { AlertaInventario, Estadisticas, VentanaVentas } from '@/lib/repo/estadisticas'

/**
 * El panel: que paso, que falta hacer y que esta mal. En ese orden.
 *
 * Antes /admin ERA la lista de productos, asi que el enlace «RP Tech · Panel»
 * devolvia a la misma pantalla en la que ya estabas. La lista se mudo a
 * /admin/productos y este sitio quedo para lo unico que justifica una
 * portada: decirle al dueno, en diez segundos y desde el celular, si tiene
 * algo pendiente.
 *
 * El orden de la pagina es el orden de urgencia:
 *   1. Pedidos esperando confirmacion — plata parada, y solo la mueve el.
 *   2. Ventas de hoy y del mes — el pulso.
 *   3. Inventario en alerta — lo que va a fallar si no lo toca.
 *   4. Que hay en el estante y que falta publicar.
 *   5. Que se vende, cuando haya con que responder eso.
 *
 * Todo estado vacio dice la verdad. Con cero pedidos el panel no muestra
 * «S/ 0.00» ni «S/ NaN»: dice que todavia no hay ventas.
 *
 * Es presentacion pura: recibe las cifras ya calculadas. La autorizacion y la
 * consulta viven en `page.tsx`, que es donde tienen que estar.
 */

const FECHA_LIMA = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

export default function PanelResumen({
  stats,
  ahora,
}: {
  stats: Estadisticas
  ahora: Date
}) {
  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="eyebrow">Panel</p>
          <h1 className="mt-2 text-title">Resumen</h1>
        </div>
        <p className="text-sm text-ink-muted first-letter:uppercase">
          {FECHA_LIMA.format(ahora)} · Lima
        </p>
      </header>

      <PendientesBloque pendientes={stats.pendientes} />

      <Seccion titulo="Ventas">
        {stats.huboVentas ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <VentasTarjeta etiqueta="Hoy" ventana={stats.hoy} />
            <VentasTarjeta etiqueta="Últimos 30 días" ventana={stats.mes} />
          </div>
        ) : (
          <Vacio>
            Todavía no hay ninguna venta confirmada. Cuando confirmes tu primer
            pedido, aquí aparece lo facturado del día, del mes y el ticket
            promedio.
          </Vacio>
        )}
      </Seccion>

      <Seccion
        titulo="Inventario en alerta"
        enlace={{ href: '/admin/stock', texto: 'Ajustar stock' }}
      >
        {stats.alertas.length > 0 ? (
          <ul className="overflow-hidden rounded-card border border-hairline bg-paper">
            {stats.alertas.map((alerta) => (
              <FilaAlerta key={alerta.sku} alerta={alerta} />
            ))}
          </ul>
        ) : (
          <Vacio>
            Ningún producto publicado está agotado ni por debajo de su mínimo.
          </Vacio>
        )}
      </Seccion>

      <Seccion titulo="Lo que tienes">
        <div className="grid gap-3 sm:grid-cols-2">
          <Tarjeta>
            <p className="eyebrow">Valor del inventario</p>
            <p className="mt-4 font-mono text-title text-ink">
              {formatPEN(stats.inventario.venta)}
            </p>
            <p className="mt-1 text-sm text-ink-soft">a precio de venta</p>

            <dl className="mt-5 space-y-2 border-t border-hairline pt-4 text-sm">
              <Renglon termino="Costo de lo que hay">
                {formatPEN(stats.inventario.costo)}
              </Renglon>
              <Renglon termino="Utilidad potencial">
                {formatPEN(stats.inventario.utilidad)}
              </Renglon>
              <Renglon termino="Unidades en estante">
                {stats.inventario.unidades} en {stats.inventario.referencias}{' '}
                {stats.inventario.referencias === 1 ? 'producto' : 'productos'}
              </Renglon>
            </dl>
          </Tarjeta>

          <Tarjeta>
            <p className="eyebrow">Catálogo</p>
            <p className="mt-4 font-mono text-title text-ink">
              {stats.catalogo.activos}
              <span className="text-heading text-ink-muted">/{stats.catalogo.total}</span>
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              productos publicados en la tienda
            </p>

            <div className="mt-5 border-t border-hairline pt-4 text-sm">
              {stats.catalogo.sinFotoTotal === 0 ? (
                <p className="text-ink-soft">Todos los productos tienen foto.</p>
              ) : (
                <>
                  <p className="text-ink-soft">
                    {textoSinFoto(stats.catalogo.sinFotoTotal, stats.catalogo.sinFotoActivos)}
                  </p>
                  <Link
                    href="/admin/productos"
                    className="mt-3 inline-block border-b border-hairline pb-0.5 text-ink transition-colors duration-(--dur-fast) ease-(--ease-out-soft) hover:border-signal"
                  >
                    Ir a productos
                  </Link>
                </>
              )}
            </div>
          </Tarjeta>
        </div>
      </Seccion>

      <Seccion titulo="Lo más vendido">
        {stats.masVendidos.length > 0 ? (
          <ul className="overflow-hidden rounded-card border border-hairline bg-paper">
            {stats.masVendidos.map((p) => (
              <li
                key={p.sku}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-hairline px-4 py-3 last:border-b-0"
              >
                <span className="min-w-0 basis-full text-sm text-ink sm:basis-auto">
                  {p.nombre}
                </span>
                <span className="font-mono text-spec text-ink-muted">{p.sku}</span>
                <span className="ml-auto font-mono text-sm text-ink">
                  {p.unidades} u · {formatPEN(p.facturado)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Vacio>
            Sin ventas confirmadas todavía, no hay nada que rankear. Esta lista
            aparece sola en cuanto confirmes un pedido.
          </Vacio>
        )}
      </Seccion>
    </div>
  )
}

/* ------------------------------------------------------------------
   Pedidos pendientes — lo primero y lo único con botón de acción
   ------------------------------------------------------------------ */

function PendientesBloque({
  pendientes,
}: {
  pendientes: { cantidad: number; monto: number; esperaMaximaDias: number | null }
}) {
  if (pendientes.cantidad === 0) {
    return (
      <section className="mt-6 rounded-card border border-hairline bg-paper px-4 py-5 sm:px-6">
        <h2 className="eyebrow">Pedidos por confirmar</h2>
        <p className="mt-3 text-ink-soft">
          Ninguno esperando.{' '}
          <Link
            href="/admin/pedidos"
            className="border-b border-hairline pb-0.5 text-ink transition-colors duration-(--dur-fast) ease-(--ease-out-soft) hover:border-signal"
          >
            Ver pedidos
          </Link>
        </p>
      </section>
    )
  }

  const { cantidad, monto, esperaMaximaDias } = pendientes

  return (
    /* El único borde de acento y el único botón `action` de la pantalla. La
       regla de contención del sistema visual: la audacia se gasta en un solo
       lugar, y este es el número que mueve plata. */
    <section className="mt-6 rounded-card border border-action bg-paper px-4 py-5 sm:px-6 sm:py-6">
      <h2 className="eyebrow">Pedidos por confirmar</h2>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-mono text-display leading-none text-ink">{cantidad}</span>
            <span className="text-heading text-ink-soft">
              {cantidad === 1 ? 'pedido espera' : 'pedidos esperan'} tu confirmación
            </span>
          </p>
          <p className="mt-4 text-ink-soft">
            <span className="font-mono text-ink">{formatPEN(monto)}</span> sin cobrar
            {esperaMaximaDias !== null && esperaMaximaDias >= 1 && (
              <>
                {' · '}el más antiguo lleva {esperaMaximaDias}{' '}
                {esperaMaximaDias === 1 ? 'día' : 'días'}
              </>
            )}
          </p>
          <p className="mt-1.5 max-w-[46ch] text-sm text-ink-muted">
            El stock recién se descuenta cuando confirmas.
          </p>
        </div>

        <Link
          href="/admin/pedidos"
          className="w-full rounded-full bg-action px-5 py-3 text-center text-sm font-medium text-ink transition-colors duration-(--dur-fast) ease-(--ease-out-soft) hover:bg-action-hover sm:w-auto"
        >
          Revisar pedidos
        </Link>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------
   Piezas
   ------------------------------------------------------------------ */

function Seccion({
  titulo,
  enlace,
  children,
}: {
  titulo: string
  enlace?: { href: string; texto: string }
  children: React.ReactNode
}) {
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-heading text-ink">{titulo}</h2>
        {enlace && (
          <Link
            href={enlace.href}
            className="shrink-0 border-b border-hairline pb-0.5 text-sm text-ink-soft transition-colors duration-(--dur-fast) ease-(--ease-out-soft) hover:border-signal hover:text-ink"
          >
            {enlace.texto}
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

function Tarjeta({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-hairline bg-paper px-4 py-5 sm:px-5">{children}</div>
  )
}

function Vacio({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-card border border-dashed border-hairline px-4 py-8 text-center text-sm leading-relaxed text-ink-muted sm:px-10">
      {children}
    </p>
  )
}

function Renglon({ termino, children }: { termino: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-soft">{termino}</dt>
      <dd className="font-mono text-ink">{children}</dd>
    </div>
  )
}

function VentasTarjeta({ etiqueta, ventana }: { etiqueta: string; ventana: VentanaVentas }) {
  return (
    <Tarjeta>
      <p className="eyebrow">{etiqueta}</p>
      <p className="mt-4 font-mono text-title text-ink">{formatPEN(ventana.facturado)}</p>
      <p className="mt-3 text-sm text-ink-soft">
        {ventana.pedidos === 0 ? (
          'Sin ventas confirmadas en este período.'
        ) : (
          <>
            {ventana.pedidos} {ventana.pedidos === 1 ? 'pedido' : 'pedidos'} · ticket
            promedio{' '}
            <span className="font-mono text-ink">
              {ventana.ticketPromedio === null ? '—' : formatPEN(ventana.ticketPromedio)}
            </span>
          </>
        )}
      </p>
    </Tarjeta>
  )
}

const ETIQUETA_ALERTA: Record<AlertaInventario['tipo'], string> = {
  sobrevendido: 'Sobrevendido',
  agotado: 'Agotado',
  stock_bajo: 'Stock bajo',
}

function FilaAlerta({ alerta }: { alerta: AlertaInventario }) {
  // Rojo solo para lo que ya está roto. «Stock bajo» todavía no rompe nada:
  // si todo se pinta de rojo, nada destaca.
  const grave = alerta.tipo !== 'stock_bajo'

  return (
    <li
      className={`border-b border-hairline border-l-2 px-4 py-3.5 last:border-b-0 ${
        grave ? 'border-l-danger' : 'border-l-hairline'
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className={`font-mono text-spec uppercase tracking-[0.1em] ${
            grave ? 'text-danger' : 'text-ink-muted'
          }`}
        >
          {ETIQUETA_ALERTA[alerta.tipo]}
        </span>
        <span className="font-mono text-spec text-ink-muted">{alerta.sku}</span>
      </div>
      <p className="mt-1.5 text-sm text-ink">{alerta.nombre}</p>
      <p className="mt-1 text-sm text-ink-soft">{alerta.detalle}</p>
    </li>
  )
}

/**
 * La imagen de relleno solo se ve en la tienda si el producto está publicado.
 * Decirlo con precisión evita mandar al dueño a arreglar algo que no se ve.
 */
function textoSinFoto(total: number, activos: number): string {
  const cuenta = total === 1 ? '1 producto sin foto' : `${total} productos sin foto`
  if (activos === 0) {
    return `${cuenta}. Ninguno está publicado, así que en la tienda no se ve.`
  }
  if (activos === 1) {
    return `${cuenta}. 1 está publicado y sale con la imagen de relleno en la tienda.`
  }
  return `${cuenta}. ${activos} están publicados y salen con la imagen de relleno en la tienda.`
}
