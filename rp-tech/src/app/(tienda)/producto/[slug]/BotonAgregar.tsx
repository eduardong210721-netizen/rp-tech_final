"use client";

import type { PublicProduct } from "@/lib/domain/product";
import { useCart } from "@/lib/cart/CartContext";
import { imageUrl } from "@/lib/images";
import { whatsappLink } from "@/lib/negocio";

/**
 * La accion de la ficha: el unico `bg-action` de esta pantalla.
 *
 * Vive junto a la ficha y no en `components/` a proposito. La tarjeta del
 * catalogo ya no lleva boton -es un enlace completo-, asi que este boton no
 * se repite en ninguna reticula: puede permitirse el amarillo de accion, que
 * en una grilla de nueve tarjetas seria ruido.
 *
 * No hay estado "Agregado": al agregar, el carrito se abre solo. Un cambio de
 * texto debajo del cajon abierto no lo veria nadie.
 *
 * Tampoco lleva la letra pequena de pago y entrega: eso ahora es una pieza
 * propia -`FichaConfianza`- que ademas dice la garantia y los metodos de pago,
 * en vez de una linea suelta pegada al boton.
 */
export default function BotonAgregar({ producto }: { producto: PublicProduct }) {
  const { agregar } = useCart();

  if (!producto.disponible) {
    return (
      <div>
        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-full border border-hairline bg-paper-alt px-5 py-3.5 text-sm font-medium text-ink-muted"
        >
          Agotado
        </button>
        <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-muted">
          <a
            href={whatsappLink(
              `Hola RP Tech, ¿cuándo vuelve el ${producto.nombre} (SKU ${producto.sku})?`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="border-b border-ink-muted pb-0.5 text-ink transition-colors duration-[var(--dur-fast)] hover:border-signal hover:text-signal"
          >
            Pregúntanos por WhatsApp
          </a>{" "}
          cuándo vuelve a entrar.
        </p>
      </div>
    );
  }

  const principal = producto.imagenes[0];

  return (
    <button
      type="button"
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
      className="w-full rounded-full bg-action px-5 py-3.5 text-sm font-medium text-ink transition-colors duration-(--dur-fast) hover:bg-action-hover"
    >
      Agregar al carrito
    </button>
  );
}
