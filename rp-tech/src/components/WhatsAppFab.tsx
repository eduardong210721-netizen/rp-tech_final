"use client";

import { usePathname } from "next/navigation";
import { whatsappLink } from "@/lib/negocio";

/**
 * Boton flotante de WhatsApp.
 *
 * WhatsApp no es un canal secundario en este negocio: es donde se cierra la
 * venta. Antes solo aparecia dentro del checkout, o sea despues de que el
 * cliente ya se decidio. La pregunta que trae a la gente ("¿este cable sirve
 * para mi celular?") ocurre mucho antes, y necesita una salida en cualquier
 * pantalla.
 *
 * No aparece en el panel de administracion ni en el checkout: en el primero
 * no tiene sentido, y en el segundo competiria con el boton de confirmar.
 */
export default function WhatsAppFab() {
  const ruta = usePathname();

  const oculto =
    ruta.startsWith("/admin") ||
    ruta.startsWith("/checkout") ||
    ruta.startsWith("/pedido");

  if (oculto) return null;

  return (
    <a
      href={whatsappLink()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      /*
        El texto solo se despliega en pantallas grandes. En anchos intermedios
        la ficha de producto monta una barra de compra fija abajo, que deja un
        carril libre para este botón — pero justo el ancho de ese carril es lo
        que el botón se comía al expandirse, invadiendo la barra.
      */
      className="group fixed bottom-5 right-5 z-40 flex h-14 items-center gap-0 overflow-hidden rounded-full bg-[#25D366] px-[15px] text-white shadow-lg shadow-black/15 transition-[padding,box-shadow] duration-(--dur-base) ease-(--ease-out-soft) hover:shadow-xl hover:shadow-black/20 sm:bottom-8 sm:right-8 lg:hover:pr-6"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0 fill-current" aria-hidden="true">
        <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.34M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.89 9.89-9.89 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.43 9.89-9.88 9.89m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45h.005c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.42Z" />
      </svg>
      <span className="max-w-0 whitespace-nowrap text-sm font-medium opacity-0 transition-[max-width,opacity,margin] duration-(--dur-base) ease-(--ease-out-soft) lg:group-hover:ml-2.5 lg:group-hover:max-w-[10rem] lg:group-hover:opacity-100">
        Escríbenos
      </span>
    </a>
  );
}
