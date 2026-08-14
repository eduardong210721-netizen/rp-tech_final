import type { Metadata } from "next";
import CheckoutForm from "./CheckoutForm";

export const metadata: Metadata = {
  title: "Finalizar pedido",
  robots: { index: false, follow: false },
};

/**
 * Ultimo paso antes de WhatsApp. Es la unica pantalla del sitio sin adornos:
 * ni riel de specs ni imagenes grandes. Lo unico que compite por atencion es
 * el boton de confirmar, que es tambien el unico `bg-action` de la pagina
 * (el FAB de WhatsApp se oculta aqui a proposito).
 */
export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
      <p className="eyebrow">Paso final</p>
      <h1 className="mt-3 text-title text-ink">Finalizar pedido</h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-soft">
        Déjanos tus datos de entrega. El pago y la hora se coordinan por
        WhatsApp, con el resumen del pedido ya escrito.
      </p>

      <div className="mt-10 sm:mt-14">
        <CheckoutForm />
      </div>
    </div>
  );
}
