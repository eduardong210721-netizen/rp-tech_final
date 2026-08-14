"use client"; // Los limites de error deben ser Client Components.

import { useEffect } from "react";
import Link from "next/link";
import { whatsappLink } from "@/lib/negocio";

/**
 * Pantalla de fallo.
 *
 * Dos reglas la gobiernan. La primera: no puede parecer exito —de ahi la
 * etiqueta roja y un titulo que dice que no se cargo, no un "ups" simpatico
 * que deje al cliente sin saber si su pedido entro o no. La segunda: no
 * muestra el mensaje crudo del error, porque suele filtrar rutas, nombres de
 * tabla o consultas; en su lugar ofrece el `digest`, que es el identificador
 * con el que podemos encontrar ese fallo concreto en los registros.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Aqui engancharia un servicio de reporte de errores. Por ahora la
    // consola del servidor y el digest son todo el rastro que hay.
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
      <div className="max-w-xl">
        <p className="font-mono text-eyebrow uppercase text-danger">
          Algo falló
        </p>

        <h1 className="mt-5 text-title text-ink">
          No pudimos cargar esta página.
        </h1>

        <p className="mt-5 text-base leading-relaxed text-ink-soft">
          El fallo es nuestro, no de tu conexión: la tienda no pudo responder.
          Vuelve a intentarlo en unos segundos.
        </p>

        <p className="mt-4 text-base leading-relaxed text-ink-soft">
          Si estabas confirmando un pedido, no des por hecho que se registró
          ni lo repitas todavía. Escríbenos por WhatsApp y te decimos si llegó.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-ink px-6 py-3.5 text-sm font-medium text-paper transition-opacity duration-(--dur-fast) ease-(--ease-out-soft) hover:opacity-90"
          >
            Reintentar
          </button>
          <Link
            href="/#catalogo"
            className="rounded-lg border border-hairline px-6 py-3.5 text-sm font-medium text-ink transition-colors duration-(--dur-fast) ease-(--ease-out-soft) hover:border-ink-muted"
          >
            Volver al catálogo
          </Link>
          <a
            href={whatsappLink(
              "Hola RP Tech, la web me mostró un error. ¿Me ayudan?",
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-ink-soft underline decoration-hairline underline-offset-4 transition-colors duration-(--dur-fast) hover:text-ink"
          >
            Escríbenos por WhatsApp
          </a>
        </div>

        {error.digest ? (
          <p className="mt-10 border-t border-hairline pt-5 text-sm text-ink-muted">
            Si nos escribes, pásanos este código del fallo:{" "}
            <span className="font-mono text-ink-soft">{error.digest}</span>
          </p>
        ) : null}
      </div>
    </section>
  );
}
