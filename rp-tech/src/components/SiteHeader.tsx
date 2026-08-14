import Link from "next/link";
import { CartButton } from "@/components/CartDrawer";

/**
 * Barra superior: papel blanco, un filete abajo, nada mas.
 *
 * El header anterior era una banda azul solida que competia con el producto.
 * En una direccion donde el catalogo es el protagonista, el marco tiene que
 * desaparecer: el unico peso visual es el logotipo.
 */
export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5">
        <Link
          href="/"
          className="group flex items-baseline gap-1.5 text-[1.0625rem] tracking-tight"
          aria-label="RP Tech, ir al inicio"
        >
          <span className="font-semibold text-ink">RP</span>
          <span className="font-mono text-[0.8125rem] tracking-[0.16em] text-ink-muted transition-colors duration-(--dur-fast) group-hover:text-signal">
            TECH
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-ink-soft sm:flex">
          <Link
            href="/#catalogo"
            className="transition-colors duration-(--dur-fast) hover:text-ink"
          >
            Catálogo
          </Link>
          <Link
            href="/contacto"
            className="transition-colors duration-(--dur-fast) hover:text-ink"
          >
            Contacto
          </Link>
        </nav>

        <CartButton />
      </div>
    </header>
  );
}
