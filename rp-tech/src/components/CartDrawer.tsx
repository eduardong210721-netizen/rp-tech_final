"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useCart } from "@/lib/cart/CartContext";
import { formatPEN } from "@/lib/format";
import { IMAGEN_PLACEHOLDER } from "@/lib/images";
import SpecChip from "@/components/SpecChip";

/**
 * Boton del carrito con contador, para montar en el header.
 *
 * El header dejo de ser una banda azul: ahora es papel blanco con un filete,
 * asi que el boton se dibuja en tinta y el contador es un disco de tinta
 * solida. El numero va en monoespaciada porque es un dato, no un adorno.
 */
export function CartButton() {
  const { cantidadTotal, abierto, setAbierto } = useCart();

  return (
    <button
      type="button"
      onClick={() => setAbierto(true)}
      aria-haspopup="dialog"
      aria-expanded={abierto}
      aria-label={
        cantidadTotal === 0
          ? "Abrir carrito, vacío"
          : `Abrir carrito, ${cantidadTotal} ${cantidadTotal === 1 ? "producto" : "productos"}`
      }
      className="relative -mr-2 rounded-full p-2 text-ink transition-colors duration-(--dur-fast) hover:bg-paper-alt"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 1.994-4.708 2.598-7.201.121-.5-.271-.949-.786-.949H5.106M7.5 14.25 5.106 5.272M6.75 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm11.25 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
        />
      </svg>
      {cantidadTotal > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-0 top-0 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-ink px-1 font-mono text-[0.625rem] leading-none text-paper"
        >
          {cantidadTotal}
        </span>
      )}
    </button>
  );
}

/** Selector de lo que puede recibir foco dentro del panel. */
const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function CartDrawer() {
  const { lineas, cambiarCantidad, quitar, total, cantidadTotal, abierto, setAbierto } =
    useCart();
  const vacio = lineas.length === 0;

  const panel = useRef<HTMLElement>(null);
  const botonCerrar = useRef<HTMLButtonElement>(null);
  const focoPrevio = useRef<HTMLElement | null>(null);

  /**
   * Mientras el carrito esta abierto es una capa modal de verdad: atenua y
   * bloquea el fondo, se cierra con Escape, atrapa el Tab dentro del panel y
   * devuelve el foco a donde estaba al cerrarse. Sin esto, un usuario de
   * teclado tabulaba "detras" del panel sin ninguna pista visual.
   */
  useEffect(() => {
    if (!abierto) return;

    focoPrevio.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    botonCerrar.current?.focus();

    // El scroll del fondo se congela. Se compensa el ancho de la barra de
    // scroll para que la pagina no de un salto lateral al abrir.
    const overflowPrevio = document.body.style.overflow;
    const paddingPrevio = document.body.style.paddingRight;
    const barra = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (barra > 0) document.body.style.paddingRight = `${barra}px`;

    function alPulsarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        setAbierto(false);
        return;
      }
      if (evento.key !== "Tab") return;

      const nodo = panel.current;
      if (!nodo) return;

      const enfocables = Array.from(
        nodo.querySelectorAll<HTMLElement>(ENFOCABLES),
      ).filter((el) => el.offsetParent !== null);

      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (!primero || !ultimo) return;

      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener("keydown", alPulsarTecla);
    return () => {
      document.removeEventListener("keydown", alPulsarTecla);
      document.body.style.overflow = overflowPrevio;
      document.body.style.paddingRight = paddingPrevio;
      focoPrevio.current?.focus();
    };
  }, [abierto, setAbierto]);

  return (
    <>
      {/* El velo se queda montado siempre para poder animar su opacidad. */}
      <div
        onClick={() => setAbierto(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-ink/40 transition-opacity duration-(--dur-base) ease-(--ease-out-soft) ${
          abierto ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
        inert={!abierto}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-hairline bg-paper shadow-2xl shadow-ink/10 transition-transform duration-(--dur-base) ease-(--ease-out-soft) ${
          abierto ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-5">
          <div>
            <p className="eyebrow">Carrito</p>
            <h2 className="mt-2 text-heading text-ink">
              {cantidadTotal === 0
                ? "Vacío"
                : `${cantidadTotal} ${cantidadTotal === 1 ? "producto" : "productos"}`}
            </h2>
          </div>
          <button
            ref={botonCerrar}
            type="button"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar carrito"
            className="-mr-2 -mt-1 shrink-0 rounded-full p-2 text-ink-muted transition-colors duration-(--dur-fast) hover:bg-paper-alt hover:text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {vacio ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 pb-16 text-center">
            <p className="text-heading text-ink">Todavía no elegiste nada</p>
            <p className="max-w-[16rem] text-sm leading-relaxed text-ink-soft">
              En el catálogo cada producto muestra el conector, el amperaje y el
              largo antes de que preguntes.
            </p>
            <Link
              href="/#catalogo"
              onClick={() => setAbierto(false)}
              className="mt-1 border-b border-ink pb-1 text-sm text-ink transition-colors duration-(--dur-fast) hover:border-signal hover:text-signal"
            >
              Ver el catálogo
            </Link>
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-hairline overflow-y-auto px-5">
            {lineas.map((l) => {
              const enElTope = l.maximo !== null && l.cantidad >= l.maximo;
              return (
                <li key={l.sku} className="flex gap-4 py-5">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-chip bg-paper-alt">
                    <Image
                      src={l.imagen ?? IMAGEN_PLACEHOLDER}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-contain p-2"
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link
                      href={`/producto/${l.slug}`}
                      onClick={() => setAbierto(false)}
                      className="text-sm leading-snug text-ink transition-colors duration-(--dur-fast) hover:text-signal"
                    >
                      {l.nombre}
                    </Link>

                    <div className="mt-2.5">
                      <SpecChip etiqueta="c/u" valor={formatPEN(l.precio)} fuerte />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                      <div className="inline-flex items-center rounded-full border border-hairline">
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(l.sku, l.cantidad - 1)}
                          aria-label={`Disminuir cantidad de ${l.nombre}`}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft transition-colors duration-(--dur-fast) hover:bg-paper-alt hover:text-ink"
                        >
                          <svg
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.25}
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" d="M3 8h10" />
                          </svg>
                        </button>
                        <span
                          aria-hidden="true"
                          className="w-6 text-center font-mono text-spec text-ink"
                        >
                          {l.cantidad}
                        </span>
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(l.sku, l.cantidad + 1)}
                          disabled={enElTope}
                          aria-label={`Aumentar cantidad de ${l.nombre}`}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft transition-colors duration-(--dur-fast) hover:bg-paper-alt hover:text-ink disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
                        >
                          <svg
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.25}
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" d="M8 3v10M3 8h10" />
                          </svg>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => quitar(l.sku)}
                        aria-label={`Quitar ${l.nombre} del carrito`}
                        className="text-xs text-ink-muted transition-colors duration-(--dur-fast) hover:text-danger"
                      >
                        Quitar
                      </button>
                    </div>

                    {enElTope && (
                      <p className="mt-2 font-mono text-spec text-ink-muted">
                        {l.maximo === 1
                          ? "Queda 1 unidad"
                          : `Quedan ${l.maximo} unidades`}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!vacio && (
          <div className="border-t border-hairline px-5 py-5">
            <div className="flex items-baseline justify-between gap-4">
              <span className="eyebrow">Total</span>
              <span className="font-mono text-heading text-ink">
                {formatPEN(total)}
              </span>
            </div>

            <Link
              href="/checkout"
              onClick={() => setAbierto(false)}
              className="mt-5 block rounded-full bg-action px-5 py-3.5 text-center text-sm font-medium text-ink transition-colors duration-(--dur-fast) hover:bg-action-hover"
            >
              Continuar pedido
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
