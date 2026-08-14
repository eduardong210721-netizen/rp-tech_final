import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CartDrawer from "@/components/CartDrawer";
import WhatsAppFab from "@/components/WhatsAppFab";

/**
 * El marco de la TIENDA: cabecera, pie, cajon del carrito y el boton de
 * WhatsApp. Vive en un componente y no directamente en `(tienda)/layout.tsx`
 * porque hay una pantalla que necesita el mismo marco y no pasa por ese
 * layout: `app/not-found.tsx`.
 *
 * Un 404 de URL desconocida lo resuelve Next contra el layout RAIZ, no contra
 * el del grupo — es una limitacion conocida del App Router. Si el marco
 * estuviera solo en el layout, la pantalla de "no existe" quedaria sin
 * cabecera y sin buscador de salida, que es justo lo que esa pantalla existe
 * para ofrecer.
 *
 * Lo que NO va aqui: <html>, <body>, las fuentes ni CartProvider. Eso es del
 * layout raiz, porque tambien lo necesita /admin.
 */
export default function ChromeTienda({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
      >
        Saltar al contenido
      </a>
      <SiteHeader />
      <main id="contenido">{children}</main>
      <SiteFooter />
      <CartDrawer />
      <WhatsAppFab />
    </>
  );
}
