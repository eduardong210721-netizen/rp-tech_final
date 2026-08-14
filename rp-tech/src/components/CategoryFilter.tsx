"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { useFiltrosUrl } from "@/lib/useFiltrosUrl";
import type { Category } from "@/lib/repo/products";

/**
 * Filtro de categorias.
 *
 * Deliberadamente NO son pildoras con fondo gris: esa es la plantilla de
 * cualquier tienda y ademas mete siete rectangulos de color en una pagina
 * cuyo tema es el aire. La categoria activa se marca con peso y un subrayado;
 * el resto es texto tenue.
 *
 * Son enlaces de verdad, con su `href` completo: sin JavaScript se pulsan y
 * navegan igual, y se pueden abrir en otra pestaña o compartir. Cada href
 * arrastra la busqueda, el orden y el conector vigentes —cambiar de categoria
 * no puede borrar lo que el cliente ya escribio ni el conector que eligio.
 *
 * Con JavaScript se interceptan para filtrar sin recargar ni saltar al inicio
 * de la pagina. Se usa `replace`, no `push`: recorrer seis categorias no puede
 * dejar seis entradas en el historial, o el boton Atras deja de servir para
 * volver de donde el cliente venia.
 */
export default function CategoryFilter({
  categorias,
  activa,
  busquedaActual,
  ordenActual,
  conectorActivo,
}: {
  categorias: Category[];
  activa?: string;
  busquedaActual?: string;
  ordenActual?: string;
  conectorActivo?: string;
}) {
  const { aplicar, pendiente } = useFiltrosUrl();

  const consulta = (extra: Record<string, string>) => {
    const base: Record<string, string> = {};
    if (busquedaActual) base.q = busquedaActual;
    if (ordenActual) base.orden = ordenActual;
    if (conectorActivo) base.conector = conectorActivo;
    return { ...base, ...extra };
  };

  const alPulsar = (evento: MouseEvent<HTMLAnchorElement>, slug: string | null) => {
    // Ctrl/Cmd/Shift/medio: el navegador abre en otra pestaña o ventana. Ahi
    // no interceptamos nada, que para eso el enlace tiene href de verdad.
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
    aplicar({ cat: slug });
  };

  const clase = (seleccionada: boolean) =>
    seleccionada
      ? "text-ink underline decoration-signal decoration-2 underline-offset-[7px]"
      : "text-ink-muted transition-colors duration-[var(--dur-fast)] hover:text-ink";

  return (
    <nav aria-label="Categorías">
      {/* Mientras la navegacion esta en curso la fila baja de intensidad: sin
          esa senal, en una conexion lenta parece que la pulsacion se perdio. */}
      <ul
        className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-sm transition-opacity duration-[var(--dur-base)] ${
          pendiente ? "opacity-50" : "opacity-100"
        }`}
      >
        <li>
          <Link
            href={{ pathname: "/", query: consulta({}) }}
            onClick={(evento) => alPulsar(evento, null)}
            aria-current={!activa ? "page" : undefined}
            className={clase(!activa)}
          >
            Todas
          </Link>
        </li>
        {categorias.map((categoria) => (
          <li key={categoria.id}>
            <Link
              href={{ pathname: "/", query: consulta({ cat: categoria.slug }) }}
              onClick={(evento) => alPulsar(evento, categoria.slug)}
              aria-current={activa === categoria.slug ? "page" : undefined}
              className={clase(activa === categoria.slug)}
            >
              {categoria.nombre}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
