import Link from "next/link";

/**
 * Ficha que no existe: enlace roto, o producto desactivado desde el admin.
 *
 * No pide disculpas ni finge un error tecnico: dice lo que pasó y ofrece la
 * unica salida util, que es volver al catalogo.
 */
export default function ProductoNoEncontrado() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-24 sm:py-32">
      <p className="eyebrow">Error 404</p>

      <h1 className="mt-4 text-balance text-[1.75rem] leading-[1.08] tracking-[-0.03em] text-ink sm:text-title">
        No encontramos ese producto
      </h1>

      <p className="mt-5 max-w-[54ch] text-[1.0625rem] leading-relaxed text-ink-soft">
        El enlace puede estar roto o el producto ya salió del catálogo. Busca
        por marca o por el dato que necesitas —el conector, la potencia, el
        largo— y lo ubicas en un par de clics.
      </p>

      <Link
        href="/#catalogo"
        className="mt-9 inline-block rounded-full bg-action px-5 py-3.5 text-sm font-medium text-ink transition-colors duration-[var(--dur-fast)] hover:bg-action-hover"
      >
        Ver el catálogo
      </Link>
    </div>
  );
}
