'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Navegación del panel, en dos formas para dos manos.
 *
 * En pantalla ancha va donde siempre: una fila en la barra superior, al lado
 * del logotipo. En el celular esa fila no cabe —cuatro enlaces más el correo
 * más «Salir» se envolvían en tres líneas y empujaban el contenido fuera de
 * la pantalla— y además queda en el borde más lejano del pulgar. Por eso en
 * móvil se convierte en una barra fija abajo, que es donde la mano ya está.
 *
 * Es un Client Component solo por `usePathname`: saber en qué sección estás
 * es la mitad del valor de una navegación, y sin eso las cuatro etiquetas se
 * ven idénticas.
 */

const ENLACES = [
  { href: '/admin', etiqueta: 'Resumen' },
  { href: '/admin/productos', etiqueta: 'Productos' },
  { href: '/admin/stock', etiqueta: 'Stock' },
  { href: '/admin/pedidos', etiqueta: 'Pedidos' },
] as const

/**
 * `/admin` es prefijo de todo el panel, así que solo está activo en
 * coincidencia exacta. Los demás sí toman sus subrutas: estando en
 * `/admin/productos/nuevo`, la sección activa sigue siendo Productos.
 */
function esActivo(ruta: string, href: string): boolean {
  if (href === '/admin') return ruta === '/admin'
  return ruta === href || ruta.startsWith(`${href}/`)
}

export function NavEscritorio() {
  const ruta = usePathname()

  return (
    <nav aria-label="Secciones del panel" className="hidden sm:flex sm:items-center sm:gap-6">
      {ENLACES.map((enlace) => {
        const activo = esActivo(ruta, enlace.href)
        return (
          <Link
            key={enlace.href}
            href={enlace.href}
            aria-current={activo ? 'page' : undefined}
            className={`border-b-2 pb-0.5 text-sm transition-colors duration-(--dur-fast) ease-(--ease-out-soft) ${
              activo
                ? 'border-signal text-white'
                : 'border-transparent text-white/70 hover:text-white'
            }`}
          >
            {enlace.etiqueta}
          </Link>
        )
      })}
    </nav>
  )
}

export function NavMovil() {
  const ruta = usePathname()

  return (
    <nav
      aria-label="Secciones del panel"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-paper/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="grid grid-cols-4">
        {ENLACES.map((enlace) => {
          const activo = esActivo(ruta, enlace.href)
          return (
            <li key={enlace.href}>
              <Link
                href={enlace.href}
                aria-current={activo ? 'page' : undefined}
                /* 56px de alto: objetivo táctil cómodo sin comerse la pantalla. */
                className={`flex h-14 flex-col items-center justify-center gap-1.5 text-xs transition-colors duration-(--dur-fast) ease-(--ease-out-soft) ${
                  activo ? 'text-ink' : 'text-ink-muted'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-0.5 w-6 rounded-full ${activo ? 'bg-signal' : 'bg-transparent'}`}
                />
                {enlace.etiqueta}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
