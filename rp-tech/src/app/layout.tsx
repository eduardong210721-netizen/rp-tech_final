import type { Metadata } from "next";
import { Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import { CartProvider } from "@/lib/cart/CartContext";
import { SITE_URL } from "@/lib/siteUrl";
import "./globals.css";

/* Una grotesca para todo, una monoespaciada para el dato.
   Instrument Sans en vez de Inter: mismo registro sobrio, pero con
   caja mas estrecha y remates mas secos, que es lo que sostiene los
   titulares grandes de esta direccion. */
const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
});

/* IBM Plex Mono solo aparece en datos: specs, SKU, codigos de pedido.
   Es la firma visual de la tienda. */
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const DESCRIPCION =
  "Cables, cargadores, audio y accesorios con la especificación exacta a la vista. Entrega en Lima, pedido por WhatsApp.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "RP Tech | Accesorios de tecnología en Lima",
    template: "%s | RP Tech",
  },
  description: DESCRIPCION,
  openGraph: {
    siteName: "RP Tech",
    locale: "es_PE",
    type: "website",
    url: "/",
    title: "RP Tech | Accesorios de tecnología en Lima",
    description: DESCRIPCION,
  },
};

/**
 * Layout raiz: solo lo que TODA ruta necesita —el documento, las fuentes, el
 * respaldo sin JavaScript y el carrito—.
 *
 * La cabecera, el pie y el boton de WhatsApp NO viven aqui. Vivian aqui, y el
 * resultado era que el panel de /admin arrastraba el logotipo de la tienda,
 * los enlaces de Catalogo y Contacto y el icono del carrito encima de su
 * propia barra. Ahora ese marco es del grupo `(tienda)`, y /admin pinta el
 * suyo.
 *
 * CartProvider si se queda: el cajon del carrito lo monta `(tienda)`, pero el
 * proveedor tiene que envolver tambien a `app/not-found.tsx`, que Next
 * resuelve contra ESTE layout y no contra el del grupo.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-PE">
      <head>
        {/* Si JavaScript no carga, el observador nunca revela nada y la
            pagina quedaria en blanco. Esto la deja visible. */}
        <noscript>
          <style>{`[data-revelar]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body
        className={`${instrument.variable} ${plexMono.variable} font-sans antialiased`}
      >
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
