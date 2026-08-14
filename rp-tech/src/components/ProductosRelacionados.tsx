import Image from "next/image";
import Link from "next/link";
import type { PublicProduct } from "@/lib/domain/product";
import { formatPEN } from "@/lib/format";
import { imageUrl, IMAGEN_PLACEHOLDER } from "@/lib/images";
import { listRelacionados, type Category } from "@/lib/repo/products";
import Reveal from "@/components/Reveal";
import { SpecChipsResumen } from "@/components/SpecChip";

/**
 * Lo que acompana a una ficha.
 *
 * El titulo dice de donde sale la lista: si todo lo que se muestra es de la
 * misma categoria, lo nombra ("También en Cables"). Con nueve productos en
 * catalogo, "Productos relacionados" seria una etiqueta vacia -y ademas
 * mentiria, porque no hay ningun motor de recomendacion detras.
 *
 * La tarjeta es una version compacta y local: la del catalogo vive en
 * `ProductCard` y responde a otra reticula.
 */
export default async function ProductosRelacionados({
  producto,
  categoria,
}: {
  producto: PublicProduct;
  categoria: Category | null;
}) {
  const relacionados = await listRelacionados(producto, 4);
  if (relacionados.length === 0) return null;

  const todosDeLaCategoria =
    categoria !== null &&
    relacionados.every((r) => r.categoria_id === producto.categoria_id);

  const titulo = todosDeLaCategoria
    ? `También en ${categoria.nombre}`
    : "Completa tu compra";

  return (
    <section
      aria-labelledby="ficha-relacionados"
      className="border-t border-hairline pt-10"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id="ficha-relacionados" className="text-heading text-ink">
          {titulo}
        </h2>
        <Link
          href={todosDeLaCategoria ? `/?cat=${categoria.slug}#catalogo` : "/#catalogo"}
          className="border-b border-hairline pb-0.5 text-sm text-ink-soft transition-colors duration-[var(--dur-fast)] hover:border-signal hover:text-signal"
        >
          {todosDeLaCategoria
            ? `Ver todo en ${categoria.nombre}`
            : "Ver el catálogo"}
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 sm:gap-x-6">
        {relacionados.map((r, i) => {
          const principal = r.imagenes[0];

          return (
            <Reveal key={r.id} delay={i * 60}>
              <Link
                href={`/producto/${r.slug}`}
                className="group flex h-full flex-col rounded-card border border-transparent p-2.5 transition-[border-color,box-shadow] duration-[var(--dur-base)] ease-[var(--ease-out-soft)] hover:border-hairline hover:shadow-lg hover:shadow-ink/10"
              >
                <div className="relative aspect-square overflow-hidden rounded-card bg-paper-alt">
                  <Image
                    src={principal ? imageUrl(principal.storage_path) : IMAGEN_PLACEHOLDER}
                    alt={principal?.alt || r.nombre}
                    fill
                    sizes="(max-width: 640px) 46vw, 260px"
                    className="object-contain p-5 transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-soft)] group-hover:scale-[1.03]"
                  />
                  {!r.disponible && (
                    <span className="absolute inset-x-0 bottom-0 bg-ink/85 py-1.5 text-center font-mono text-spec uppercase text-paper">
                      Agotado
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col px-1 pt-4">
                  {r.marca ? <p className="eyebrow">{r.marca}</p> : null}

                  <h3 className="mt-2 text-sm leading-snug text-ink">
                    {r.nombre}
                  </h3>

                  <div className="mt-auto space-y-2.5 pt-4">
                    <SpecChipsResumen
                      especificaciones={r.especificaciones}
                      maximo={1}
                    />
                    <p className="text-base text-ink">{formatPEN(r.precio)}</p>
                  </div>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
