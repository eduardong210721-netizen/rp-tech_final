"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart/CartContext";
import { formatPEN } from "@/lib/format";
import { crearPedidoAction } from "./actions";

/**
 * Campos sin caja: etiqueta arriba y un filete abajo. Una caja completa por
 * campo mete cuatro rectangulos en una pantalla que ya tiene el rectangulo
 * del resumen; el filete deja que mande el texto que el cliente escribe.
 * El anillo de foco global (`:focus-visible`) sigue intacto encima.
 */
const CAMPO =
  "w-full border-b border-hairline bg-transparent pb-2.5 pt-1 text-ink placeholder:text-ink-muted transition-colors duration-(--dur-fast) hover:border-ink-muted focus:border-signal";

const ETIQUETA = "block text-sm text-ink-soft";

export default function CheckoutForm() {
  const { lineas, total, vaciar } = useCart();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [distrito, setDistrito] = useState("");
  const [referencia, setReferencia] = useState("");

  /**
   * El pedido ya se registró y estamos navegando a su confirmación.
   *
   * Hace falta porque `vaciar()` provoca un re-render inmediato y, sin esta
   * bandera, el carrito vacío hacía que la pantalla mostrara "No hay nada que
   * confirmar todavía" durante el instante que tarda la navegación. El cliente
   * acababa de pedir y leía que su carrito estaba vacío: el peor mensaje
   * posible justo después de comprar.
   */
  const [enviado, setEnviado] = useState(false);

  const vacio = lineas.length === 0 && !enviado;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const resultado = await crearPedidoAction({
        cliente_nombre: nombre,
        cliente_telefono: telefono,
        distrito,
        referencia: referencia.trim() ? referencia.trim() : undefined,
        items: lineas.map((l) => ({ sku: l.sku, cantidad: l.cantidad })),
      });

      if (!resultado.ok) {
        // R13: nunca mostramos éxito ante un fallo. El carrito NO se toca,
        // así el cliente puede corregir el dato (o quitar un producto agotado)
        // y reintentar sin perder lo que ya había armado.
        setError(resultado.error);
        return;
      }

      // A partir de aquí el pedido ya existe en la base. El stock NO se movió:
      // se descuenta cuando el dueño confirma la venta desde el panel, porque
      // un pedido registrado es una intención, no una venta. Aun así el carrito
      // se vacía: el pedido ya está guardado y volver a enviarlo lo duplicaría.
      setEnviado(true);

      // Intentamos abrir WhatsApp directamente. Como esto corre después de un
      // `await` (la Server Action hizo un viaje de red), algunos navegadores ya
      // no lo consideran un gesto directo del usuario y bloquean el popup —no
      // hay forma de saberlo desde JS, `window.open` no distingue "bloqueado"
      // de "el usuario cerró la pestaña al toque"—. Por eso NUNCA dependemos
      // de que esto funcione: siempre navegamos a /pedido/[token], que repite
      // el mismo enlace como un <a> normal (un clic real, nunca bloqueado).
      // Es el token (uuid aleatorio) y no el código secuencial: el código es
      // adivinable y esta página no tiene autenticación.
      window.open(resultado.whatsappUrl, "_blank", "noopener,noreferrer");
      router.push(`/pedido/${resultado.token}`);
      vaciar();
    });
  }

  if (vacio) {
    return (
      <div className="max-w-md">
        <p className="text-heading text-ink">No hay nada que confirmar todavía</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Tu carrito está vacío. Elige lo que necesitas y vuelve aquí: el
          formulario te toma menos de un minuto.
        </p>
        <Link
          href="/#catalogo"
          className="mt-6 inline-block border-b border-ink pb-1 text-sm text-ink transition-colors duration-(--dur-fast) hover:border-signal hover:text-signal"
        >
          Ver el catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
      {/* En móvil el resumen va primero: el cliente confirma qué está pidiendo
          antes de ponerse a escribir. En escritorio se va a la columna. */}
      <aside className="order-1 rounded-card border border-hairline bg-paper-alt p-6 lg:order-2 lg:sticky lg:top-24 lg:h-fit">
        <p className="eyebrow">Tu pedido</p>

        <ul className="mt-5 divide-y divide-hairline">
          {lineas.map((l) => (
            <li key={l.sku} className="flex items-baseline justify-between gap-4 py-3">
              <span className="min-w-0 text-sm leading-snug text-ink-soft">
                <span className="font-mono text-ink">{l.cantidad}×</span>{" "}
                {l.nombre}
              </span>
              <span className="shrink-0 font-mono text-sm text-ink">
                {formatPEN(l.precio * l.cantidad)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-hairline pt-4">
          <span className="text-sm text-ink-soft">Total estimado</span>
          <span className="font-mono text-heading text-ink">{formatPEN(total)}</span>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-ink-muted">
          Referencial: el precio final lo calcula el servidor al registrar el
          pedido.
        </p>
      </aside>

      <form
        onSubmit={onSubmit}
        noValidate
        className="order-2 max-w-md space-y-7 lg:order-1"
      >
        <div className="space-y-2">
          <label htmlFor="nombre" className={ETIQUETA}>
            Nombre completo
          </label>
          <input
            id="nombre"
            name="nombre"
            autoComplete="name"
            required
            minLength={2}
            maxLength={120}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={CAMPO}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="telefono" className={ETIQUETA}>
            Celular con WhatsApp
          </label>
          <input
            id="telefono"
            name="telefono"
            autoComplete="tel-national"
            required
            inputMode="numeric"
            placeholder="987654321"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className={`${CAMPO} font-mono`}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="distrito" className={ETIQUETA}>
            Distrito
          </label>
          <input
            id="distrito"
            name="distrito"
            autoComplete="address-level3"
            required
            minLength={2}
            maxLength={80}
            value={distrito}
            onChange={(e) => setDistrito(e.target.value)}
            className={CAMPO}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="referencia" className={ETIQUETA}>
            Referencia <span className="text-ink-muted">(opcional)</span>
          </label>
          <textarea
            id="referencia"
            name="referencia"
            maxLength={300}
            rows={2}
            placeholder="Frente al parque, portón azul"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            className={`${CAMPO} resize-none`}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="border-l-2 border-danger bg-danger/5 py-3 pl-4 pr-3 text-sm leading-relaxed text-danger"
          >
            {error}
          </p>
        )}

        <div className="pt-1">
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-action px-5 py-3.5 text-sm font-medium text-ink transition-colors duration-(--dur-fast) hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Registrando…" : "Confirmar pedido por WhatsApp"}
          </button>
          <p className="mt-3 text-xs leading-relaxed text-ink-muted">
            Se abre WhatsApp con el resumen ya escrito. Todavía no pagas nada.
          </p>
        </div>
      </form>
    </div>
  );
}
