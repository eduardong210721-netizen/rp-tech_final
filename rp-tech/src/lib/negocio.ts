/**
 * Datos de contacto del negocio, en un solo lugar.
 *
 * Solo contiene informacion verificada del sistema anterior. Los campos
 * que el dueno todavia no ha confirmado quedan como `null` y la interfaz
 * simplemente no los muestra: es preferible una seccion de contacto mas
 * corta que una que promete un horario o una direccion inventados.
 */

/** Numero de WhatsApp en formato internacional, sin +, para wa.me */
export const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP ?? "51935423395";

/** El mismo numero, formateado para leerse */
export const WHATSAPP_LEGIBLE = "+51 935 423 395";

export const NEGOCIO = {
  nombre: "RP Tech",
  descripcion: "Accesorios de tecnología en Lima",
  ciudad: "Lima, Perú",
  /** Pendiente de confirmar con el dueño */
  direccion: null as string | null,
  horario: null as string | null,
  correo: null as string | null,
  instagram: null as string | null,
  facebook: null as string | null,
  tiktok: null as string | null,
} as const;

export const METODOS_PAGO = ["Yape", "Plin", "Transferencia", "Efectivo"] as const;

/**
 * Abre WhatsApp con un mensaje ya redactado.
 * Sin argumento, usa un saludo general.
 */
export function whatsappLink(mensaje?: string): string {
  const texto =
    mensaje ?? "Hola RP Tech, quisiera consultar por un producto del catálogo.";
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
}
