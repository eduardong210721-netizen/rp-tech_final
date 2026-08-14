"use client";

import { useEffect, useRef } from "react";
import { useFiltrosUrl, useHidratado } from "@/lib/useFiltrosUrl";
import type { OrdenKey } from "@/lib/repo/products";

export type OpcionOrden = { valor: OrdenKey; etiqueta: string };

/** El criterio por defecto no viaja en la URL: `/` y `/?orden=relevancia` son
    la misma pagina, y una sola direccion por resultado es mejor para el SEO. */
const ORDEN_POR_DEFECTO: OrdenKey = "relevancia";

/**
 * Selector de orden del catalogo.
 *
 * El estado vive en la URL (?orden=), igual que la busqueda y la categoria,
 * asi que un orden concreto se puede compartir y sobrevive al recargar.
 *
 * Base sin JavaScript: es un form GET con un boton "Aplicar" de verdad, y la
 * busqueda, la categoria y el conector vigentes van como campos ocultos. Si el navegador
 * hidrata, el boton desaparece —ya no hace falta— y cambiar el desplegable
 * aplica al instante. Nunca se queda un control que no hace nada.
 *
 * La lista de opciones llega como prop en vez de importarse: ORDENES vive en
 * la capa de datos, que es `server-only`, y no puede cruzar al cliente.
 */
export default function SortSelect({
  opciones,
  valorActual,
  busquedaActual,
  categoriaActiva,
  conectorActivo,
}: {
  opciones: readonly OpcionOrden[];
  valorActual: OrdenKey;
  busquedaActual?: string;
  categoriaActiva?: string;
  conectorActivo?: string;
}) {
  const { aplicar, pendiente } = useFiltrosUrl();
  const hidratado = useHidratado();
  const campoRef = useRef<HTMLSelectElement>(null);

  /* No controlado, como el buscador: si el valor colgara del searchParam que
     estamos cambiando, el desplegable daria un salto atras durante la
     navegacion. Solo se corrige cuando la URL cambio por otra via —"Quitar
     filtros" o el boton Atras dejan el orden en su valor por defecto. */
  useEffect(() => {
    const campo = campoRef.current;
    if (campo && campo.value !== valorActual) campo.value = valorActual;
  }, [valorActual]);

  return (
    <form
      method="get"
      action="/"
      className="flex shrink-0 items-center gap-2.5 border-b border-hairline transition-colors duration-[var(--dur-fast)] focus-within:border-ink"
    >
      {busquedaActual ? (
        <input type="hidden" name="q" value={busquedaActual} />
      ) : null}
      {categoriaActiva ? (
        <input type="hidden" name="cat" value={categoriaActiva} />
      ) : null}
      {conectorActivo ? (
        <input type="hidden" name="conector" value={conectorActivo} />
      ) : null}

      <label htmlFor="orden" className="eyebrow shrink-0">
        Orden
      </label>
      <select
        ref={campoRef}
        id="orden"
        name="orden"
        defaultValue={valorActual}
        onChange={(evento) => {
          const elegido = evento.currentTarget.value;
          aplicar({ orden: elegido === ORDEN_POR_DEFECTO ? null : elegido });
        }}
        aria-busy={pendiente}
        className="min-w-0 bg-transparent py-2 text-sm text-ink"
      >
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>

      {hidratado ? null : (
        <button
          type="submit"
          className="shrink-0 py-2 text-sm text-ink-soft transition-colors duration-[var(--dur-fast)] hover:text-ink"
        >
          Aplicar
        </button>
      )}
    </form>
  );
}
