import Link from "next/link";
import type { Metadata } from "next";
import ChromeTienda from "@/components/ChromeTienda";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

/**
 * 404 util, no gracioso.
 *
 * Quien llega aqui casi siempre venia por un enlace compartido por WhatsApp
 * a un producto que ya no esta publicado. Un chiste no le sirve: le sirve
 * poder buscar el reemplazo sin volver atras. Por eso la pantalla ofrece el
 * mismo buscador del catalogo —un formulario GET normal, que funciona aunque
 * el JavaScript falle— antes que un enlace generico al inicio.
 *
 * Monta su propio ChromeTienda: una URL que no existe se resuelve contra el
 * layout RAIZ, que ya no trae cabecera ni pie. Sin esto, la pantalla que
 * existe para reorientar al visitante seria la unica sin barra de navegacion.
 */
export default function NotFound() {
  return (
    <ChromeTienda>
      <section className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
        <div className="max-w-xl">
          <p className="eyebrow">Error 404</p>

          <h1 className="mt-5 text-title text-ink">
            Esta página no existe.
          </h1>

          <p className="mt-5 text-base leading-relaxed text-ink-soft">
            El enlace puede estar mal copiado, o el producto que buscabas salió
            del catálogo. Búscalo por nombre o por lo que necesita tu equipo:
            escribe &laquo;tipo C&raquo;, &laquo;power bank&raquo; o la marca.
          </p>

          <form
            method="get"
            action="/"
            role="search"
            className="mt-8 flex max-w-md gap-2"
          >
            <input
              type="search"
              name="q"
              aria-label="Buscar en el catálogo"
              placeholder="Buscar en el catálogo"
              className="w-full rounded-lg border border-hairline bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink-muted"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-ink px-5 py-3 text-sm font-medium text-paper transition-opacity duration-(--dur-fast) ease-(--ease-out-soft) hover:opacity-90"
            >
              Buscar
            </button>
          </form>

          <p className="mt-8 text-sm text-ink-soft">
            O revisa{" "}
            <Link
              href="/#catalogo"
              className="border-b border-hairline pb-0.5 text-ink transition-colors duration-(--dur-fast) hover:border-signal"
            >
              el catálogo completo
            </Link>
            : son pocos productos y cada uno dice su especificación exacta.
          </p>
        </div>
      </section>
    </ChromeTienda>
  );
}
