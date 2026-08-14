import { NEGOCIO, METODOS_PAGO, whatsappLink } from "@/lib/negocio";

/**
 * Entrega, pago, garantia y la salida a WhatsApp — debajo del boton, que es
 * donde se decide.
 *
 * Antes esto vivia en el pie de pagina: el cliente tenia que abandonar la
 * ficha, bajar hasta el final y volver para saber si podia pagar con Yape.
 *
 * Solo datos reales. No hay plazo de entrega ni tarifa de envio porque el
 * negocio no los tiene fijados, y una promesa inventada aqui es una queja
 * despues: el texto dice lo unico cierto, que se coordinan por WhatsApp. La
 * garantia sale del propio producto y la fila desaparece si no la tiene.
 */
export default function FichaConfianza({
  nombre,
  sku,
  garantiaMeses,
}: {
  nombre: string;
  sku: string;
  garantiaMeses: number | null;
}) {
  const filas: { etiqueta: string; contenido: React.ReactNode }[] = [
    {
      etiqueta: "Entrega",
      contenido: `${NEGOCIO.ciudad}. El punto y el día se coordinan contigo por WhatsApp al confirmar el pedido.`,
    },
    {
      etiqueta: "Pago",
      contenido: METODOS_PAGO.join(" · "),
    },
    ...(garantiaMeses
      ? [
          {
            etiqueta: "Garantía",
            contenido: (
              <span className="font-mono">
                {garantiaMeses === 1 ? "1 mes" : `${garantiaMeses} meses`}
              </span>
            ),
          },
        ]
      : []),
    {
      etiqueta: "¿Dudas?",
      contenido: (
        <>
          <a
            href={whatsappLink(
              `Hola RP Tech, ¿el ${nombre} (SKU ${sku}) sirve para mi equipo?`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="border-b border-ink-muted pb-0.5 text-ink transition-colors duration-(--dur-fast) hover:border-signal hover:text-signal"
          >
            Escríbenos por WhatsApp
          </a>{" "}
          y te decimos si entra en tu equipo antes de que pidas.
        </>
      ),
    },
  ];

  return (
    <dl className="divide-y divide-hairline border-y border-hairline text-[0.8125rem]">
      {filas.map((f) => (
        <div
          key={f.etiqueta}
          className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-x-4 py-3"
        >
          <dt className="text-ink-muted">{f.etiqueta}</dt>
          <dd className="leading-relaxed text-ink-soft">{f.contenido}</dd>
        </div>
      ))}
    </dl>
  );
}
