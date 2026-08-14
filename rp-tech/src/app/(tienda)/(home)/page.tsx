import Link from "next/link";
import {
  listPublicProducts,
  listCategories,
  esOrdenValido,
  ORDENES,
  type OrdenKey,
} from "@/lib/repo/products";
import {
  CONECTORES_FILTRABLES,
  esConectorValido,
  etiquetaConector,
} from "@/lib/domain/conector";
import { NEGOCIO } from "@/lib/negocio";
import ProductCard from "@/components/ProductCard";
import CategoryFilter from "@/components/CategoryFilter";
import CatalogoConectorFiltro, {
  type OpcionConector,
} from "@/components/CatalogoConectorFiltro";
import SearchBox from "@/components/SearchBox";
import SortSelect, { type OpcionOrden } from "@/components/SortSelect";
import HeroSpecRail from "@/components/HeroSpecRail";
import Reveal from "@/components/Reveal";

export const revalidate = 60;

const OPCIONES_ORDEN: readonly OpcionOrden[] = (
  Object.keys(ORDENES) as OrdenKey[]
).map((valor) => ({ valor, etiqueta: ORDENES[valor].etiqueta }));

/** "conector USB-C, categoría Cables y búsqueda «romax»" */
function enumerar(partes: string[]): string {
  const ultima = partes[partes.length - 1];
  if (partes.length <= 1 || !ultima) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} y ${ultima}`;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    cat?: string;
    orden?: string;
    conector?: string;
  }>;
}) {
  const { q, cat, orden, conector } = await searchParams;

  /* Solo se propaga un orden que la capa de datos reconoce. Asi ?orden=<basura>
     cae en el criterio por defecto y no se arrastra por los enlaces. */
  const ordenUrl = esOrdenValido(orden) ? orden : undefined;
  const ordenActual: OrdenKey = ordenUrl ?? "relevancia";
  /* Igual con el conector: la lista es cerrada, asi que ?conector=<basura> no
     filtra nada ni viaja a los enlaces vecinos. */
  const conectorUrl = esConectorValido(conector) ? conector : undefined;

  /* Tres consultas como mucho, y solo cuando hacen falta:
     · `productos`  — lo que se pinta, con los cuatro filtros aplicados.
     · facetas      — lo mismo SIN el conector. Es la base de los conteos: si
                      se contara sobre lo ya filtrado, elegir USB-C dejaria en
                      pantalla una sola opcion y no habria forma de cambiar de
                      conector sin quitar el filtro. Contar sin el conector
                      tampoco ofrece nunca una opcion que lleve a cero.
     · completo     — el catalogo entero, para el riel del hero: el riel habla
                      de la tienda, no del filtro, y con una busqueda activa se
                      quedaria en dos chips y el bucle mostraria un hueco. */
  const [productos, categorias, facetas, completo] = await Promise.all([
    listPublicProducts({
      q,
      categoriaSlug: cat,
      orden: ordenActual,
      conector: conectorUrl,
    }),
    listCategories(),
    conectorUrl ? listPublicProducts({ q, categoriaSlug: cat }) : null,
    q || cat ? listPublicProducts() : null,
  ]);

  const baseFacetas = facetas ?? productos;
  const catalogoParaRiel = completo ?? baseFacetas;

  /* Solo se ofrecen conectores que existen en el catalogo visible, con su
     conteo. Un filtro que devuelve cero no es un filtro, es una trampa. */
  const conteos = new Map<string, number>();
  for (const producto of baseFacetas) {
    if (!producto.conector) continue;
    conteos.set(producto.conector, (conteos.get(producto.conector) ?? 0) + 1);
  }
  const opcionesConector: OpcionConector[] = CONECTORES_FILTRABLES.map(
    (valor) => ({ valor, total: conteos.get(valor) ?? 0 }),
  ).filter((o) => o.total > 0);

  /* Un solo conector a la vista no da nada que elegir; con uno puesto, en
     cambio, la fila tiene que quedarse para poder volver a "Todos". */
  const mostrarConector = opcionesConector.length > 1 || Boolean(conectorUrl);

  const categoriaActiva = categorias.find((c) => c.slug === cat);
  const filtrado = Boolean(q || cat || conectorUrl);

  const partesFiltro: string[] = [];
  if (conectorUrl) partesFiltro.push(`conector ${etiquetaConector(conectorUrl)}`);
  if (categoriaActiva) partesFiltro.push(`categoría ${categoriaActiva.nombre}`);
  if (q) partesFiltro.push(`búsqueda «${q}»`);

  return (
    <>
      {/* ── Hero ────────────────────────────────────────────────────────────
          Comprimido a proposito. Quien entra necesitando un cable no viene a
          leer un manifiesto: viene a ver si tenemos el suyo. El titular, una
          linea de confianza y la franja de datos caben en poco mas de 200px,
          asi que la primera fila de productos aparece sin hacer scroll.

          Sin foto: las del catalogo son cajas sobre fondo blanco y a tamano
          hero se delatarian. Lo que distingue a esta tienda tampoco es el
          estilo de vida, es la especificacion — asi que el material grafico
          del hero es el dato real, en la franja de abajo. */}
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-6xl px-5 pb-7 pt-9 sm:pb-9 sm:pt-14">
          {/* text-balance solo desde sm: en el ancho grande equilibra las dos
              lineas del titular, y en el telefono lo dejaba cortando en "a". */}
          <h1 className="animar-entrada max-w-3xl text-title text-ink sm:text-balance">
            El accesorio correcto, a la primera.
          </h1>
          <p
            className="animar-entrada mt-3 text-sm text-ink-soft sm:text-base"
            style={{ animationDelay: "120ms" }}
          >
            Entrega en {NEGOCIO.ciudad}. Pedido por WhatsApp.
          </p>
        </div>

        <HeroSpecRail productos={catalogoParaRiel} />
      </section>

      {/* ── Filtros ─────────────────────────────────────────────────────────
          Dos filas separadas por filete. Arriba la pregunta que decide la
          compra —el conector—; debajo el resto, que refina. Los cuatro
          controles componen entre si: cada uno lleva los valores de los
          otros tres, asi que cambiar uno nunca borra los demas. */}
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-6xl px-5">
          {mostrarConector ? (
            <div className="border-b border-hairline py-4">
              <CatalogoConectorFiltro
                opciones={opcionesConector}
                activo={conectorUrl}
                total={baseFacetas.length}
                busquedaActual={q}
                categoriaActiva={cat}
                ordenActual={ordenUrl}
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
            <CategoryFilter
              categorias={categorias}
              activa={cat}
              busquedaActual={q}
              ordenActual={ordenUrl}
              conectorActivo={conectorUrl}
            />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <SearchBox
                valorActual={q}
                categoriaActiva={cat}
                ordenActual={ordenUrl}
                conectorActivo={conectorUrl}
              />
              <SortSelect
                opciones={OPCIONES_ORDEN}
                valorActual={ordenActual}
                busquedaActual={q}
                categoriaActiva={cat}
                conectorActivo={conectorUrl}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Catálogo ────────────────────────────────────────────────────── */}
      <section
        id="catalogo"
        className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:pb-24 sm:pt-10"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="text-title text-ink">Catálogo</h2>
          {/* Region viva: al filtrar sin recargar, el conteo es lo unico que
              cambia arriba del todo. Sin esto, quien usa lector de pantalla
              escribe en el buscador y no se entera de que la lista cambio. */}
          <p
            role="status"
            aria-live="polite"
            className="font-mono text-spec text-ink-muted"
          >
            <span className="sr-only">Resultados: </span>
            {productos.length}{" "}
            {productos.length === 1 ? "producto" : "productos"}
          </p>
        </div>

        {filtrado ? (
          <p className="mt-3 text-sm text-ink-soft">
            {partesFiltro.length > 0 ? (
              <>Filtrando por {enumerar(partesFiltro)}. </>
            ) : null}
            {/* Quita los cuatro parametros de un gesto. scroll={false} como el
                resto de los filtros: el cliente esta mirando la lista, no la
                cabecera, y saltar al inicio le hace perder el sitio. */}
            <Link
              href="/"
              scroll={false}
              className="text-ink underline decoration-hairline underline-offset-4 transition-colors duration-(--dur-fast) hover:decoration-ink"
            >
              Quitar filtros
            </Link>
          </p>
        ) : null}

        {productos.length === 0 ? (
          <div className="mt-10 rounded-card border border-hairline px-6 py-16 text-center">
            <p className="text-ink">No encontramos productos con esos filtros.</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
              Prueba con otra palabra, con el código SKU, o escríbenos y lo
              buscamos por ti.
            </p>
            <Link
              href="/"
              scroll={false}
              className="mt-8 inline-block text-sm text-ink underline decoration-hairline underline-offset-4 transition-colors duration-(--dur-fast) hover:decoration-ink"
            >
              Ver todo el catálogo
            </Link>
          </div>
        ) : (
          /* Tres columnas en pantalla grande: con 9 productos son tres filas
             exactas. Con cuatro quedaba una tarjeta huerfana en la ultima.

             Una sola columna por debajo de 640px: el chip de especificacion
             no se parte ni se recorta ("Integrado con control en línea" mide
             unos 220px en monoespaciada), y recortar un dato tecnico es
             justamente el error que este rediseno existe para no repetir. */
          <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {productos.map((producto, i) => (
              <Reveal key={producto.id} delay={i * 60} className="h-full">
                <ProductCard product={producto} />
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
