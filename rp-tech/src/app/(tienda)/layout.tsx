import ChromeTienda from "@/components/ChromeTienda";

/**
 * Layout de la tienda publica.
 *
 * Existe por una razon concreta: antes la cabecera, el pie y el boton de
 * WhatsApp se pintaban en el layout raiz, asi que /admin arrastraba el
 * logotipo, los enlaces de Catalogo y Contacto y hasta el icono del carrito.
 * El dueno no compra en su propia tienda, y en un celular esos 64px de barra
 * eran media pantalla de panel perdida.
 *
 * El grupo `(tienda)` no aparece en la URL: `/`, `/producto/[slug]`,
 * `/checkout`, `/pedido/[token]` y `/contacto` siguen exactamente donde
 * estaban. Lo unico que cambia es que /admin ya no hereda este marco.
 */
export default function TiendaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ChromeTienda>{children}</ChromeTienda>;
}
