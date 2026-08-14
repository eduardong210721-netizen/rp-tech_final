"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";

/** Cuanto crece la imagen al acercar. 2.2x deja legible la letra de la caja. */
const ACERCAMIENTO = 2.2;

/** Selector de lo que puede recibir foco dentro de la capa. */
const ENFOCABLES = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Vista ampliada de la foto del producto.
 *
 * Existe por una razon muy concreta del catalogo real: las fotos del
 * proveedor traen las especificaciones impresas en la caja -amperaje, largo,
 * conector- y a 360px de ancho no se alcanzan a leer. Es la misma pregunta de
 * siempre ("¿esto me sirve?") respondida con la unica fuente que hay.
 *
 * Sin librerias. El acercamiento es un contenedor que hace scroll con la
 * imagen dibujada a `ACERCAMIENTO` veces la caja: no hay transformaciones que
 * mantener sincronizadas, y el navegador se encarga del desplazamiento. En
 * movil el gesto natural sigue funcionando encima: no se toca `touch-action`
 * ni la escala del viewport, asi que el pellizco amplia como en cualquier
 * visor de fotos.
 *
 * Capa modal de verdad: cierra con Escape, atrapa el Tab, congela el fondo y
 * devuelve el foco a la miniatura desde la que se abrio.
 */
export default function FichaZoom({
  src,
  alt,
  abierto,
  onCerrar,
}: {
  src: string;
  alt: string;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const capa = useRef<HTMLDivElement>(null);
  const lienzo = useRef<HTMLDivElement>(null);
  const botonCerrar = useRef<HTMLButtonElement>(null);
  const focoPrevio = useRef<HTMLElement | null>(null);
  const [cerca, setCerca] = useState(false);

  // El cierre vive en una ref y no en las dependencias del efecto: si el padre
  // pasa una funcion nueva en cada render -lo normal con una flecha en el
  // JSX-, el efecto se rearmaria a cada rato y devolveria el foco al boton de
  // cerrar en mitad de la interaccion.
  const alCerrar = useRef(onCerrar);
  useEffect(() => {
    alCerrar.current = onCerrar;
  }, [onCerrar]);

  // Cerrar tambien deshace el acercamiento: la proxima vez que se abra, se
  // abre entera. Se hace aqui y no en un efecto de entrada para no encadenar
  // un render extra cada vez que la capa aparece.
  const cerrar = useCallback(() => {
    setCerca(false);
    alCerrar.current();
  }, []);

  useEffect(() => {
    if (!abierto) return;

    focoPrevio.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    botonCerrar.current?.focus();

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function alPulsarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        cerrar();
        return;
      }
      if (evento.key !== "Tab") return;

      const nodo = capa.current;
      if (!nodo) return;

      const enfocables = Array.from(nodo.querySelectorAll<HTMLElement>(ENFOCABLES));
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
      focoPrevio.current?.focus();
    };
    // `cerrar` es estable (useCallback sin dependencias): no rearma nada.
  }, [abierto, cerrar]);

  // Al acercar, el interes esta en el centro de la caja, no en la esquina
  // superior izquierda donde arranca el scroll.
  useEffect(() => {
    const nodo = lienzo.current;
    if (!nodo || !abierto) return;
    nodo.scrollTo({
      left: (nodo.scrollWidth - nodo.clientWidth) / 2,
      top: (nodo.scrollHeight - nodo.clientHeight) / 2,
    });
  }, [cerca, abierto]);

  if (!abierto) return null;

  const escala = cerca ? ACERCAMIENTO : 1;

  // Va al final de <body> por una razon verificada en pantalla: la galeria
  // vive dentro de la columna `lg:sticky`, y un elemento sticky crea contexto
  // de apilamiento. Sin el portal, la capa quedaba atrapada ahi dentro y la
  // cabecera de la tienda y el boton de WhatsApp se pintaban ENCIMA de la foto
  // ampliada, por mucho z-index que se le pusiera.
  return createPortal(
    <div
      ref={capa}
      role="dialog"
      aria-modal="true"
      aria-label={`Imagen ampliada: ${alt}`}
      className="fixed inset-0 z-[60] flex flex-col bg-ink/95"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <p className="min-w-0 flex-1 truncate text-sm text-paper/70">{alt}</p>
        <button
          ref={botonCerrar}
          type="button"
          onClick={cerrar}
          aria-label="Cerrar la imagen ampliada"
          className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-paper transition-colors duration-(--dur-fast) hover:bg-paper/10"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-6 w-6"
            aria-hidden="true"
          >
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div ref={lienzo} className="flex-1 overflow-auto overscroll-contain">
        <button
          type="button"
          onClick={() => setCerca((v) => !v)}
          aria-pressed={cerca}
          aria-label={cerca ? "Alejar la imagen" : "Acercar la imagen"}
          className={`relative block ${cerca ? "cursor-zoom-out" : "cursor-zoom-in"}`}
          style={{ width: `${escala * 100}%`, height: `${escala * 100}%`, minHeight: "100%" }}
        >
          <Image
            src={src}
            alt={alt}
            fill
            sizes="100vw"
            className="object-contain p-3"
          />
        </button>
      </div>

      <p className="px-4 pb-[calc(0.875rem_+_env(safe-area-inset-bottom))] pt-3 text-center text-[0.8125rem] text-paper/60">
        {cerca
          ? "Arrastra para recorrer la caja · Esc para cerrar"
          : "Toca la imagen para acercar · Esc para cerrar"}
      </p>
    </div>,
    document.body,
  );
}
