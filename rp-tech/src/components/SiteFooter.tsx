import Link from "next/link";
import {
  NEGOCIO,
  METODOS_PAGO,
  WHATSAPP_LEGIBLE,
  whatsappLink,
} from "@/lib/negocio";

/**
 * Cierre de pagina en oscuro.
 *
 * Todo el sitio es papel blanco; el footer es lo unico que invierte. Eso le
 * da un final a la pagina en vez de dejarla desvanecerse, que es como estaba
 * antes: el catalogo terminaba y no habia nada.
 *
 * Solo se muestran los datos que el negocio confirmo. Los campos vacios de
 * `NEGOCIO` no renderizan una fila con un guion: simplemente no aparecen.
 * Prometer un horario inventado es peor que no tener horario.
 */
export default function SiteFooter() {
  const anio = new Date().getFullYear();

  const redes = [
    { nombre: "Instagram", url: NEGOCIO.instagram },
    { nombre: "Facebook", url: NEGOCIO.facebook },
    { nombre: "TikTok", url: NEGOCIO.tiktok },
  ].filter((r): r is { nombre: string; url: string } => Boolean(r.url));

  return (
    <footer className="mt-24 bg-brand text-white/70">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <p className="flex items-baseline gap-1.5 text-lg tracking-tight text-white">
              <span className="font-semibold">RP</span>
              <span className="font-mono text-[0.8125rem] tracking-[0.16em] text-white/50">
                TECH
              </span>
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              Cables, cargadores, audio y accesorios con la especificación
              exacta a la vista. Te decimos el amperaje, el conector y el largo
              antes de que preguntes.
            </p>
          </div>

          <div>
            <p className="eyebrow text-white/40">Escríbenos</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-white transition-colors duration-(--dur-fast) hover:text-action"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 fill-current"
                    aria-hidden="true"
                  >
                    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.34M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.89 9.89-9.89 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.43 9.89-9.88 9.89m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45h.005c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.42Z" />
                  </svg>
                  {WHATSAPP_LEGIBLE}
                </a>
              </li>
              {NEGOCIO.correo ? (
                <li>
                  <a
                    href={`mailto:${NEGOCIO.correo}`}
                    className="transition-colors duration-(--dur-fast) hover:text-white"
                  >
                    {NEGOCIO.correo}
                  </a>
                </li>
              ) : null}
              <li>{NEGOCIO.ciudad}</li>
              {NEGOCIO.direccion ? <li>{NEGOCIO.direccion}</li> : null}
              {NEGOCIO.horario ? <li>{NEGOCIO.horario}</li> : null}
            </ul>
          </div>

          <div>
            <p className="eyebrow text-white/40">Tienda</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link
                  href="/#catalogo"
                  className="transition-colors duration-(--dur-fast) hover:text-white"
                >
                  Catálogo
                </Link>
              </li>
              <li>
                <Link
                  href="/contacto"
                  className="transition-colors duration-(--dur-fast) hover:text-white"
                >
                  Contacto y envíos
                </Link>
              </li>
            </ul>

            {redes.length > 0 ? (
              <ul className="mt-6 space-y-3 text-sm">
                {redes.map((r) => (
                  <li key={r.nombre}>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors duration-(--dur-fast) hover:text-white"
                    >
                      {r.nombre}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-3">
            <span>
              © {anio} {NEGOCIO.nombre}. {NEGOCIO.ciudad}.
            </span>

            {/*
              Atajo al panel para el dueño. Discreto, no escondido: la
              seguridad la da `requireAdmin()` en el servidor y la lista blanca
              de correos, no que el enlace sea difícil de encontrar. El sistema
              anterior confiaba justo en lo contrario —un PIN 1234 y ninguna
              comprobación en las rutas de API— y por eso cualquiera entraba.

              `nofollow` porque robots.txt ya prohíbe /admin: no tiene sentido
              gastar rastreo en una ruta que siempre responde con una
              redirección al inicio de sesión.
            */}
            <Link
              href="/admin"
              rel="nofollow"
              title="Panel de administración"
              aria-label="Ir al panel de administración"
              /* El icono se ve de 16px, pero el area de toque es de 44: el
                 relleno la agranda y el margen negativo evita que eso empuje
                 la linea de copyright. */
              className="-m-3.5 inline-flex items-center justify-center p-3.5 text-white/25 transition-colors duration-(--dur-fast) hover:text-white/70"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3 4.5 6v5.4c0 4.4 3.1 8.5 7.5 9.6 4.4-1.1 7.5-5.2 7.5-9.6V6L12 3Z" />
              </svg>
            </Link>
          </p>

          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.6875rem] tracking-[0.08em] text-white/40">
            <span className="text-white/30">PAGO</span>
            {METODOS_PAGO.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </p>
        </div>
      </div>
    </footer>
  );
}
