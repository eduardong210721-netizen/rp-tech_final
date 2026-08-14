"use client";

import { useEffect, useState } from "react";
import type { PublicProduct } from "@/lib/domain/product";
import { useCart } from "@/lib/cart/CartContext";
import { formatPEN } from "@/lib/format";
import { imageUrl } from "@/lib/images";

/** El envoltorio del boton principal de la ficha, al que sigue esta barra. */
export const ID_ACCION_FICHA = "ficha-accion";

/**
 * Barra de compra fija en movil.
 *
 * En el celular la ficha es larga: foto, precio, compatibilidad, specs,
 * detalle, relacionados. Al llegar abajo, comprar exigia volver arriba.
 *
 * Tres decisiones que no son cosmeticas:
 *
 * 1. NO aparece mientras el boton principal esta a la vista. Ademas de
 *    redundante, dos botones `bg-action` a la vez romperian la regla de un
 *    solo boton de accion por pantalla.
 * 2. NO ocupa todo el ancho: deja libre el carril derecho donde vive el boton
 *    flotante de WhatsApp (`WhatsAppFab`, fijo abajo a la derecha). Asi no lo
 *    tapa ni queda tapada por el, sin tener que moverlo. Las dos piezas se
 *    alinean como una sola fila de herramientas.
 * 3. Se esconde cuando entra el pie. Ahi la pagina ya termino y una pastilla
 *    flotando sobre el cierre oscuro es basura visual.
 *
 * Respeta `env(safe-area-inset-bottom)` para los iPhone con barra de gestos.
 */
export default function FichaBarraCompra({
  producto,
}: {
  producto: PublicProduct;
}) {
  const { agregar } = useCart();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const accion = document.getElementById(ID_ACCION_FICHA);
    if (!accion) return;
    const pie = document.querySelector("footer");

    // El boton principal no basta con que "no se vea": tiene que haber quedado
    // ARRIBA. Si todavia no llegaste a el, la barra seria un atajo a algo que
    // no has leido -y en esta ficha lo que hay entre el precio y el boton es
    // justamente el aviso de compatibilidad-.
    //
    // El margen inferior enorme es lo que hace fiable la medida: con el, la
    // zona observada cubre TODO lo que queda por debajo, asi que el boton solo
    // deja de intersecar cuando sale por arriba. Sin ese margen, un salto de
    // scroll que se brinque el boton entero (volver atras con la posicion
    // restaurada, un enlace a un ancla) no cruzaria ningun umbral y el
    // observador no avisaria nunca.
    let pasado = false;
    let pieALaVista = false;
    const recalcular = () => setVisible(pasado && !pieALaVista);

    const deLaAccion = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada) return;
        pasado =
          !entrada.isIntersecting && entrada.boundingClientRect.bottom <= 0;
        recalcular();
      },
      { rootMargin: "0px 0px 100000px 0px" },
    );
    deLaAccion.observe(accion);

    // El pie es del marco de la tienda, no de la ficha: se busca, no se exige.
    const delPie = pie
      ? new IntersectionObserver(([entrada]) => {
          pieALaVista = entrada?.isIntersecting ?? false;
          recalcular();
        })
      : null;
    if (pie && delPie) delPie.observe(pie);

    return () => {
      deLaAccion.disconnect();
      delPie?.disconnect();
    };
  }, []);

  if (!producto.disponible) return null;

  const principal = producto.imagenes[0];

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={`fixed bottom-[calc(1.25rem_+_env(safe-area-inset-bottom))] left-3 right-[5.25rem] z-30 flex h-14 items-center justify-between gap-3 rounded-full border border-hairline bg-paper/95 pl-4 pr-1.5 shadow-lg shadow-ink/15 backdrop-blur transition-[opacity,transform] duration-(--dur-base) ease-(--ease-out-soft) sm:right-[7rem] lg:hidden ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <p className="truncate font-mono text-[0.9375rem] text-ink">
        {formatPEN(producto.precio)}
      </p>

      <button
        type="button"
        aria-label="Agregar al carrito"
        onClick={() =>
          agregar({
            sku: producto.sku,
            slug: producto.slug,
            nombre: producto.nombre,
            precio: producto.precio,
            imagen: principal ? imageUrl(principal.storage_path) : null,
            cantidad: 1,
            maximo: producto.stock_restante,
          })
        }
        className="h-11 shrink-0 rounded-full bg-action px-5 text-sm font-medium text-ink transition-colors duration-(--dur-fast) hover:bg-action-hover"
      >
        Agregar
      </button>
    </div>
  );
}
