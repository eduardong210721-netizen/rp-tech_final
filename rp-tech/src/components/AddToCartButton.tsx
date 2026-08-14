"use client";

import type { PublicProduct } from "@/lib/domain/product";
import { imageUrl } from "@/lib/images";
import { useCart } from "@/lib/cart/CartContext";

const BASE =
  "block w-full rounded-full px-5 py-3.5 text-center text-sm font-medium transition-colors duration-(--dur-fast)";

/**
 * Agregar al carrito.
 *
 * `variante` existe por la regla de un solo boton `bg-action` por pantalla:
 * en la ficha del producto este ES el boton principal, pero en una grilla de
 * tarjetas repetirlo veinte veces convertiria el amarillo en ruido. Ahi se
 * monta como `variante="discreta"`, un boton de contorno.
 */
export default function AddToCartButton({
  product,
  variante = "principal",
}: {
  product: PublicProduct;
  variante?: "principal" | "discreta";
}) {
  const { agregar } = useCart();

  if (!product.disponible) {
    return (
      <button
        type="button"
        disabled
        className={`${BASE} cursor-not-allowed border border-hairline bg-paper-alt text-ink-muted`}
      >
        Agotado
      </button>
    );
  }

  const principal = product.imagenes[0];

  const aspecto =
    variante === "principal"
      ? "bg-action text-ink hover:bg-action-hover"
      : "border border-hairline bg-paper text-ink hover:border-ink";

  return (
    <button
      type="button"
      onClick={() =>
        agregar({
          sku: product.sku,
          slug: product.slug,
          nombre: product.nombre,
          precio: product.precio,
          imagen: principal ? imageUrl(principal.storage_path) : null,
          cantidad: 1,
          maximo: product.stock_restante,
        })
      }
      className={`${BASE} ${aspecto}`}
    >
      Agregar al carrito
    </button>
  );
}
