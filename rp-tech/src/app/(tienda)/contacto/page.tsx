import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import SpecChip from "@/components/SpecChip";
import {
  METODOS_PAGO,
  NEGOCIO,
  WHATSAPP_LEGIBLE,
  whatsappLink,
} from "@/lib/negocio";

/**
 * Contacto y como comprar.
 *
 * Esta pagina no es un formulario. El canal de venta real del negocio es
 * WhatsApp: ahi se resuelve la pregunta que trae al cliente ("¿este cable
 * sirve para mi celular?") y ahi se cierra el pedido. Un formulario de
 * correo seria una promesa falsa —nadie lee ese buzon— asi que el unico
 * camino que ofrece la pagina es el que de verdad existe.
 *
 * Los pasos describen el flujo que la tienda tiene implementado hoy, sin
 * inventar plazos ni tarifas de envio: eso se acuerda por chat, porque el
 * negocio todavia no fija una tabla de costos por distrito.
 */

const DESCRIPCION =
  "Escríbenos por WhatsApp y te confirmamos si el accesorio es compatible con tu equipo. Cómo comprar, métodos de pago y entrega en Lima.";

export const metadata: Metadata = {
  title: "Contacto y cómo comprar",
  description: DESCRIPCION,
  alternates: { canonical: "/contacto" },
  openGraph: {
    title: "Contacto y cómo comprar | RP Tech",
    description: DESCRIPCION,
    url: "/contacto",
  },
};

const PASOS = [
  {
    numero: "01",
    titulo: "Eliges",
    texto:
      "Buscas en el catálogo por nombre o categoría. Cada tarjeta trae la especificación que decide la compra: potencia, conector, largo, capacidad.",
  },
  {
    numero: "02",
    titulo: "Agregas al carrito",
    texto:
      "Juntas todo en un solo pedido y ajustas las cantidades. El carrito no te pide registrarte ni crear una cuenta.",
  },
  {
    numero: "03",
    titulo: "Confirmas por WhatsApp",
    texto:
      "Dejas tu nombre, celular y distrito. Se abre el chat con el pedido ya escrito —productos, cantidades, total— y su código.",
  },
  {
    numero: "04",
    titulo: "Coordinas pago y entrega",
    texto:
      "Por ese mismo chat acordamos cómo pagas y cómo te llega. Recién ahí queda cerrado el pedido.",
  },
] as const;

const QUE_CONTARNOS = [
  "Marca y modelo de tu equipo",
  "Qué conector usa: USB‑C, Lightning, Micro USB",
  "Para qué lo necesitas: carga rápida, viaje, escritorio",
] as const;

export default function ContactoPage() {
  const mensajeConsulta =
    "Hola RP Tech, quiero saber si un accesorio es compatible con mi equipo.";

  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 sm:pb-20 sm:pt-20">
        <Reveal>
          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
            <div>
              <p className="eyebrow">Contacto</p>
              <h1 className="mt-5 max-w-[13ch] text-title text-ink lg:text-display">
                Pregúntanos antes de comprar.
              </h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-ink-soft sm:text-lg">
                Dinos qué equipo tienes y qué conector usa, y te confirmamos si
                el accesorio le sirve —o cuál sí— antes de que pagues. Vendemos
                por WhatsApp: ahí respondemos y ahí se cierran los pedidos.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <a
                  href={whatsappLink(mensajeConsulta)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 rounded-lg bg-action px-6 py-3.5 text-sm font-medium text-ink transition-colors duration-(--dur-fast) ease-(--ease-out-soft) hover:bg-action-hover"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 fill-current"
                    aria-hidden="true"
                  >
                    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.34M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.89 9.89-9.89 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.43 9.89-9.88 9.89m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45h.005c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.42Z" />
                  </svg>
                  Escribir por WhatsApp
                </a>
                <Link
                  href="/#catalogo"
                  className="inline-flex items-center rounded-lg border border-hairline px-6 py-3.5 text-sm font-medium text-ink transition-colors duration-(--dur-fast) ease-(--ease-out-soft) hover:border-ink-muted"
                >
                  Ver el catálogo
                </Link>
              </div>
            </div>

            <aside className="rounded-card border border-hairline p-7 sm:p-8">
              <p className="eyebrow">Datos</p>
              <dl className="mt-6 space-y-6">
                <div>
                  <dt className="text-sm text-ink-muted">WhatsApp</dt>
                  <dd className="mt-1.5">
                    <a
                      href={whatsappLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-base tracking-tight text-ink transition-colors duration-(--dur-fast) hover:text-signal"
                    >
                      {WHATSAPP_LEGIBLE}
                    </a>
                  </dd>
                </div>

                <div>
                  <dt className="text-sm text-ink-muted">Dónde estamos</dt>
                  <dd className="mt-1.5 text-base text-ink">
                    {NEGOCIO.ciudad}
                  </dd>
                </div>

                {NEGOCIO.direccion ? (
                  <div>
                    <dt className="text-sm text-ink-muted">Dirección</dt>
                    <dd className="mt-1.5 text-base text-ink">
                      {NEGOCIO.direccion}
                    </dd>
                  </div>
                ) : null}

                {NEGOCIO.horario ? (
                  <div>
                    <dt className="text-sm text-ink-muted">Horario</dt>
                    <dd className="mt-1.5 text-base text-ink">
                      {NEGOCIO.horario}
                    </dd>
                  </div>
                ) : null}

                {NEGOCIO.correo ? (
                  <div>
                    <dt className="text-sm text-ink-muted">Correo</dt>
                    <dd className="mt-1.5 text-base text-ink">
                      <a
                        href={`mailto:${NEGOCIO.correo}`}
                        className="transition-colors duration-(--dur-fast) hover:text-signal"
                      >
                        {NEGOCIO.correo}
                      </a>
                    </dd>
                  </div>
                ) : null}

                <div>
                  <dt className="text-sm text-ink-muted">Pago</dt>
                  <dd className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2.5">
                    {METODOS_PAGO.map((metodo, i) => (
                      <SpecChip key={metodo} valor={metodo} fuerte={i === 0} />
                    ))}
                  </dd>
                </div>
              </dl>

              <p className="mt-8 border-t border-hairline pt-6 text-sm leading-relaxed text-ink-soft">
                La web no cobra nada: no te pide tarjeta ni guarda datos de
                pago. El método lo acuerdas por WhatsApp cuando confirmas el
                pedido.
              </p>
            </aside>
          </div>
        </Reveal>
      </section>

      <section className="border-y border-hairline bg-paper-alt">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <Reveal>
            <p className="eyebrow">Cómo comprar</p>
            <h2 className="mt-4 max-w-xl text-title text-ink">
              Cuatro pasos y ninguna cuenta que crear.
            </h2>
          </Reveal>

          <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {PASOS.map((paso, i) => (
              <Reveal key={paso.numero} delay={i * 60}>
                <li className="border-t border-hairline pt-5">
                  <span className="font-mono text-spec text-ink-muted">
                    {paso.numero}
                  </span>
                  <h3 className="mt-4 text-heading text-ink">{paso.titulo}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
                    {paso.texto}
                  </p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <div className="grid gap-12 sm:grid-cols-2 lg:gap-16">
          <Reveal>
            <div className="border-t border-hairline pt-5">
              <p className="eyebrow">Entrega</p>
              <h2 className="mt-4 max-w-sm text-heading text-ink">
                El envío se acuerda según tu distrito
              </h2>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-soft">
                Entregamos en {NEGOCIO.ciudad}. El costo y el plazo dependen de
                dónde estés, así que te los decimos por WhatsApp antes de que
                pagues: preferimos eso a publicar una tarifa que después no
                podamos cumplir.
              </p>
            </div>
          </Reveal>

          <Reveal delay={60}>
            <div className="border-t border-hairline pt-5">
              <p className="eyebrow">Qué contarnos</p>
              <h2 className="mt-4 max-w-sm text-heading text-ink">
                Con estos tres datos te respondemos de una
              </h2>
              <ul className="mt-5 max-w-md space-y-3 text-sm leading-relaxed text-ink-soft">
                {QUE_CONTARNOS.map((dato) => (
                  <li key={dato} className="border-l border-hairline pl-3.5">
                    {dato}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
