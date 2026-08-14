import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  getPublicProductBySlug,
  listAllPublicSlugs,
  listCategories,
} from "@/lib/repo/products";
import { formatPEN } from "@/lib/format";
import { imageUrl } from "@/lib/images";
import GaleriaProducto from "@/components/GaleriaProducto";
import ProductosRelacionados from "@/components/ProductosRelacionados";
import SpecChip, { SpecChipsResumen } from "@/components/SpecChip";
import FichaCompatibilidad from "@/components/FichaCompatibilidad";
import FichaConfianza from "@/components/FichaConfianza";
import FichaBarraCompra, { ID_ACCION_FICHA } from "@/components/FichaBarraCompra";
import BotonAgregar from "./BotonAgregar";

export const revalidate = 60;

export async function generateStaticParams() {
  return (await listAllPublicSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  // Memoizada con cache(): esta misma llamada la reusa el componente de abajo.
  const p = await getPublicProductBySlug(slug);
  if (!p) return { title: "Producto no encontrado" };

  const primera = p.imagenes[0];
  const imagen = primera ? imageUrl(primera.storage_path) : undefined;
  const descripcion =
    p.descripcion_corta ?? `${p.nombre} a ${formatPEN(p.precio)} en RP Tech.`;

  return {
    title: p.nombre,
    description: descripcion,
    alternates: { canonical: `/producto/${p.slug}` },
    openGraph: {
      title: p.nombre,
      description: descripcion,
      url: `/producto/${p.slug}`,
      type: "website",
      locale: "es_PE",
      images: imagen ? [{ url: imagen, alt: primera!.alt }] : [],
    },
  };
}

/**
 * Ficha de producto.
 *
 * Toda la pantalla esta ordenada por una sola pregunta: "¿esto me sirve?".
 * La columna derecha la responde en ese orden y no en otro:
 *
 *   nombre → precio → SI ENTRA EN TU EQUIPO → boton → como se entrega y paga
 *
 * El bloque de compatibilidad va ANTES del boton a proposito. La ficha
 * anterior mostraba especificaciones -"Conector: Micro USB"- sin responder la
 * pregunta, y el dato que decide la compra quedaba disperso entre el nombre y
 * tres filas de una tabla. Ahora es una pieza propia con la pista en
 * castellano, y el aviso de compatibilidad se cruza si o si camino al boton.
 *
 * La tabla completa de especificaciones se queda debajo, para quien compara.
 *
 * La galeria queda fija en escritorio mientras la columna de decision hace
 * scroll: asi la foto acompana a la lectura y la pagina no deja el hueco que
 * dejaba antes debajo de una imagen cuadrada corta. En movil no hay columna
 * fija posible, asi que el boton viaja en una barra inferior.
 */
export default async function ProductoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getPublicProductBySlug(slug);
  if (!p) notFound();

  const categoria = p.categoria_id
    ? ((await listCategories()).find((c) => c.id === p.categoria_id) ?? null)
    : null;

  const principal = p.imagenes[0];
  const especificaciones = p.especificaciones;
  const restante = p.stock_restante;
  const quedanPocas = restante !== null && restante > 0 && restante <= 3;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.nombre,
    sku: p.sku,
    description: p.descripcion_corta ?? p.nombre,
    ...(p.marca ? { brand: { "@type": "Brand", name: p.marca } } : {}),
    ...(principal ? { image: [imageUrl(principal.storage_path)] } : {}),
    offers: {
      "@type": "Offer",
      price: p.precio.toFixed(2),
      priceCurrency: "PEN",
      availability: p.disponible
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  // JSON.stringify no escapa "/", así que un `nombre` o `descripcion_corta`
  // que contenga literalmente "</script>" cerraría la etiqueta e inyectaría
  // HTML/JS arbitrario en cada visita a la ficha. `<` es JSON válido:
  // los parsers de datos estructurados lo leen igual que "<".
  const jsonLdSeguro = JSON.stringify(jsonLd).replace(/</g, "\\u003c");

  return (
    <div className="mx-auto max-w-6xl px-5 pb-8 pt-6 sm:pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSeguro }}
      />

      <nav
        aria-label="Miga de pan"
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-ink-muted"
      >
        <Link
          href="/"
          className="transition-colors duration-[var(--dur-fast)] hover:text-ink"
        >
          Inicio
        </Link>
        <span aria-hidden="true">/</span>
        {categoria ? (
          <>
            <Link
              href={`/?cat=${categoria.slug}#catalogo`}
              className="transition-colors duration-[var(--dur-fast)] hover:text-ink"
            >
              {categoria.nombre}
            </Link>
            <span aria-hidden="true">/</span>
          </>
        ) : null}
        <span aria-current="page" className="text-ink-soft">
          {p.nombre}
        </span>
      </nav>

      <div className="mt-7 grid items-start gap-x-14 gap-y-12 lg:mt-10 lg:grid-cols-2">
        <div className="lg:sticky lg:top-24">
          <GaleriaProducto imagenes={p.imagenes} nombre={p.nombre} />
        </div>

        <div>
          {p.marca || p.modelo ? (
            <p className="eyebrow">
              {[p.marca, p.modelo].filter(Boolean).join(" · ")}
            </p>
          ) : null}

          <h1 className="mt-3 text-balance text-[1.75rem] leading-[1.08] tracking-[-0.03em] text-ink sm:text-title">
            {p.nombre}
          </h1>

          <p className="mt-3 font-mono text-spec text-ink-muted">SKU {p.sku}</p>

          {especificaciones.length > 0 ? (
            <div className="mt-6">
              <SpecChipsResumen especificaciones={especificaciones} />
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-end gap-x-6 gap-y-3">
            <p className="font-mono text-[2.375rem] leading-none tracking-[-0.02em] text-ink">
              {formatPEN(p.precio)}
            </p>
            <p className="flex items-center gap-2 pb-1 text-sm">
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${p.disponible ? "bg-ok" : "bg-danger"}`}
              />
              <span className={p.disponible ? "text-ok" : "text-danger"}>
                {p.disponible ? "Disponible" : "Agotado"}
              </span>
            </p>
          </div>

          {restante === null ? (
            <div className="mt-5">
              <SpecChip valor="Bajo pedido" />
            </div>
          ) : null}

          {quedanPocas ? (
            <p className="mt-4 font-mono text-spec text-danger">
              {restante === 1
                ? "¡Última unidad!"
                : `¡Últimas ${restante} unidades!`}
            </p>
          ) : null}

          <FichaCompatibilidad
            conector={p.conector}
            nota={p.compatibilidad_nota}
            className="mt-7"
          />

          <div id={ID_ACCION_FICHA} className="mt-7">
            <BotonAgregar producto={p} />
          </div>

          <div className="mt-6">
            <FichaConfianza
              nombre={p.nombre}
              sku={p.sku}
              garantiaMeses={p.garantia_meses}
            />
          </div>

          {especificaciones.length > 0 ? (
            <section
              aria-labelledby="ficha-specs"
              className="mt-10 border-t border-hairline pt-8"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h2 id="ficha-specs" className="eyebrow">
                  Especificaciones
                </h2>
                <span className="font-mono text-spec text-ink-muted">
                  {especificaciones.length}{" "}
                  {especificaciones.length === 1 ? "dato" : "datos"}
                </span>
              </div>

              <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-ink-soft">
                Estos son los datos que deciden la compatibilidad. Compáralos
                con tu equipo antes de pedir.
              </p>

              <dl className="mt-6 divide-y divide-hairline border-y border-hairline">
                {especificaciones.map((e) => (
                  <div
                    key={e.etiqueta}
                    className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-baseline gap-x-4 py-3.5 sm:grid-cols-[10rem_minmax(0,1fr)]"
                  >
                    <dt className="text-[0.8125rem] text-ink-muted">
                      {e.etiqueta}
                    </dt>
                    <dd className="font-mono text-[0.8125rem] leading-relaxed text-ink">
                      {e.valor}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>
      </div>

      {p.descripcion_larga ? (
        <section
          aria-labelledby="ficha-detalle"
          className="mt-16 border-t border-hairline pt-10 lg:mt-20"
        >
          <div className="grid gap-4 lg:grid-cols-[10rem_minmax(0,1fr)] lg:gap-14">
            <h2 id="ficha-detalle" className="eyebrow lg:pt-1.5">
              En detalle
            </h2>
            <p className="max-w-[68ch] text-pretty text-[1.0625rem] leading-[1.7] text-ink-soft">
              {p.descripcion_larga}
            </p>
          </div>
        </section>
      ) : null}

      <div className="mt-16 lg:mt-20">
        <ProductosRelacionados producto={p} categoria={categoria} />
      </div>

      <FichaBarraCompra producto={p} />
    </div>
  );
}
