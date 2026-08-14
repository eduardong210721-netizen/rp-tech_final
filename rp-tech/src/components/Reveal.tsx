"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Revela su contenido al entrar en pantalla: 14px hacia arriba y opacidad.
 *
 * Un solo gesto para todo el sitio. La direccion es minimalista, asi que el
 * movimiento tiene que leerse como respiracion, no como efecto — de ahi la
 * distancia corta y la curva de salida suave.
 *
 * El estado inicial (oculto) se declara en CSS, no en JavaScript, por tres
 * razones:
 *
 * 1. Servidor y cliente renderizan exactamente el mismo marcado, asi que no
 *    hay desajuste de hidratacion.
 * 2. `prefers-reduced-motion` lo neutraliza desde la hoja de estilos, antes de
 *    que corra una sola linea de JS.
 * 3. Un `<noscript>` en el layout lo revela todo si JavaScript no carga. Una
 *    animacion de entrada que deja la pagina en blanco cuando falla el JS es
 *    el fallo clasico de este patron.
 */
export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  /** Escalonado en milisegundos, para listas */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;

    if (typeof IntersectionObserver === "undefined") {
      // Navegador sin soporte: el observador nunca dispararia, asi que
      // revelamos en el siguiente cuadro en vez de dejarlo invisible.
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada?.isIntersecting) {
          setVisible(true);
          observador.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );

    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-revelar={visible ? "visible" : "oculto"}
      className={className}
      style={{ "--revelar-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
