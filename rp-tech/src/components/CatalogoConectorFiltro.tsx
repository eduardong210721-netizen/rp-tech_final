"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { useFiltrosUrl } from "@/lib/useFiltrosUrl";
import { etiquetaConector, pistaConector } from "@/lib/domain/conector";

/** Un conector presente en el catálogo, con cuántos productos lo usan. */
export type OpcionConector = { valor: string; total: number };

/**
 * Filtro por conector: el control que responde "¿esto entra en mi equipo?".
 *
 * Va arriba del todo en la consola de filtros, en su propia fila y con su
 * pregunta escrita. No comparte fila con las categorías a propósito: son dos
 * preguntas distintas —"qué tipo de producto" contra "qué entra en mi
 * equipo"— y la segunda es la que decide la compra. Mezclarlas en una sola
 * tira de enlaces convertiría la más importante en una más.
 *
 * Cada opción lleva su PISTA. Un cliente no piensa "necesito USB-C", piensa
 * "el ovalito que entra por los dos lados". Sin esa línea, el filtro solo
 * sirve a quien ya sabe la respuesta —o sea, a quien no lo necesita.
 *
 * Son enlaces de verdad con su href completo: sin JavaScript se pulsan y
 * navegan, y no hace falta ningún botón de aplicar. Cada href arrastra la
 * búsqueda, la categoría y el orden vigentes, así que elegir conector nunca
 * borra lo que el cliente ya había puesto. Con JavaScript se interceptan para
 * filtrar sin recargar; `replace` y no `push`, porque probar cuatro conectores
 * no puede dejar cuatro entradas en el historial.
 */
export default function CatalogoConectorFiltro({
  opciones,
  activo,
  total,
  busquedaActual,
  categoriaActiva,
  ordenActual,
}: {
  opciones: OpcionConector[];
  activo?: string;
  /** Productos que quedan sin filtrar por conector: el conteo de "Todos" */
  total: number;
  busquedaActual?: string;
  categoriaActiva?: string;
  ordenActual?: string;
}) {
  const { aplicar, pendiente } = useFiltrosUrl();

  /* Con un solo conector a la vista el filtro no filtra nada: ofrecerlo sería
     un control que siempre devuelve lo mismo. Salvo que ese conector sea el
     que está puesto —entonces tiene que seguir en pantalla, o el cliente se
     queda sin la forma de volver a "Todos". */
  if (opciones.length < 2 && !activo) return null;

  const consulta = (extra: Record<string, string>) => {
    const base: Record<string, string> = {};
    if (busquedaActual) base.q = busquedaActual;
    if (categoriaActiva) base.cat = categoriaActiva;
    if (ordenActual) base.orden = ordenActual;
    return { ...base, ...extra };
  };

  const alPulsar = (
    evento: MouseEvent<HTMLAnchorElement>,
    valor: string | null,
  ) => {
    // Ctrl/Cmd/Shift/medio: el navegador abre en otra pestaña. Ahí no
    // interceptamos, que para eso el enlace tiene href de verdad.
    if (
      evento.metaKey ||
      evento.ctrlKey ||
      evento.shiftKey ||
      evento.altKey ||
      evento.button !== 0
    ) {
      return;
    }
    evento.preventDefault();
    aplicar({ conector: valor });
  };

  const opcion = (
    valor: string | null,
    etiqueta: string,
    pista: string | null,
    conteo: number,
  ) => {
    const seleccionada = valor === (activo ?? null);
    return (
      <li key={valor ?? "todos"} className="shrink-0">
        <Link
          href={{
            pathname: "/",
            query: consulta(valor ? { conector: valor } : {}),
          }}
          onClick={(evento) => alPulsar(evento, valor)}
          aria-current={seleccionada ? "page" : undefined}
          className={`group flex h-11 flex-col justify-center gap-1 border-l-2 pl-3 transition-colors duration-(--dur-fast) ease-(--ease-out-soft) ${
            seleccionada ? "border-signal" : "border-hairline"
          }`}
        >
          <span
            className={`font-mono text-spec whitespace-nowrap transition-colors duration-(--dur-fast) ${
              seleccionada ? "text-ink" : "text-ink-soft group-hover:text-ink"
            }`}
          >
            {etiqueta}{" "}
            <span aria-hidden="true" className="text-ink-muted">
              {conteo}
            </span>
            <span className="sr-only">
              , {conteo} {conteo === 1 ? "producto" : "productos"}
            </span>
          </span>
          {pista ? (
            <span className="whitespace-nowrap text-xs leading-none text-ink-muted">
              {pista}
            </span>
          ) : null}
        </Link>
      </li>
    );
  };

  return (
    <nav
      aria-label="Filtrar por conector"
      className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-8"
    >
      <p className="shrink-0 text-sm text-ink">¿Qué entra en tu equipo?</p>

      {/* En el teléfono la tira se desplaza en horizontal y sangra hasta los
          bordes de la pantalla, para que se vea que hay más a la derecha. A
          partir de sm cabe entera y simplemente fluye en varias líneas.

          Mientras la navegación está en curso la fila baja de intensidad: sin
          esa señal, en una conexión lenta parece que la pulsación se perdió. */}
      <ul
        className={`-mx-5 flex min-w-0 gap-x-5 gap-y-3 overflow-x-auto px-5 pb-1 transition-opacity duration-(--dur-base) sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 ${
          pendiente ? "opacity-50" : "opacity-100"
        }`}
      >
        {opcion(null, "Todos", null, total)}
        {opciones.map((o) =>
          opcion(
            o.valor,
            etiquetaConector(o.valor) ?? o.valor,
            pistaConector(o.valor),
            o.total,
          ),
        )}
      </ul>
    </nav>
  );
}
