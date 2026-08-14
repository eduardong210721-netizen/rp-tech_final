import { etiquetaConector, pistaConector } from "@/lib/domain/conector";

/**
 * El bloque que responde la pregunta que trae al cliente: "¿esto entra en mi
 * equipo?".
 *
 * Va pegado al boton de compra, no al final de la ficha. Antes ese dato estaba
 * disperso -en el nombre del producto, en una spec llamada "Conector", en
 * otra "Cable incluido", o en ninguna parte- y el cliente tenia que deducirlo.
 * Los dos peores errores del catalogo anterior fueron exactamente eso.
 *
 * Dos capas, porque son dos preguntas distintas:
 *
 * 1. El conector, con su PISTA. Nadie piensa "necesito USB-C"; piensa "el
 *    ovalito que entra por los dos lados". La pista traduce el nombre tecnico
 *    a algo que se reconoce mirando el celular.
 * 2. El aviso en prosa, cuando el nombre del producto puede inducir a error.
 *    El caso que justifica todo esto es el kit "Tipo C" que trae Micro USB:
 *    causaba devoluciones reales. Por eso el aviso se dibuja como una banda
 *    propia dentro de la tarjeta, en tinta plena y a 15px, justo antes del
 *    boton: para llegar a comprar hay que pasarle por encima.
 *
 * El tono es de advertencia util, no de alarma: turquesa de marca, no rojo.
 * Esto no es un error del cliente, es un dato que le ahorra un viaje.
 *
 * Si no hay nada que decir, no se dibuja nada. Un soporte de auto no "entra"
 * en ningun sitio (`conector = 'ninguno'`): mostrar una tarjeta vacia seria
 * ruido, y el hueco se nota mas que la ausencia.
 */
export default function FichaCompatibilidad({
  conector,
  nota,
  className = "",
}: {
  conector: string | null;
  nota: string | null;
  /** El margen lo pone quien lo coloca: si no hay bloque, no hay hueco. */
  className?: string;
}) {
  const etiqueta = etiquetaConector(conector);
  const pista = pistaConector(conector);

  // 'ninguno' es un valor valido y significa justamente que no hay conexion
  // que verificar. Se excluye a mano y no con `filtrable` porque son dos
  // preguntas distintas: una es "¿lo ofrezco como filtro?", esta es "¿tiene
  // sentido responder aqui si entra?".
  const muestraConector = etiqueta !== null && conector !== "ninguno";

  if (!muestraConector && !nota) return null;

  return (
    <section
      aria-labelledby="ficha-compatibilidad"
      className={`overflow-hidden rounded-card border border-hairline bg-paper ${className}`}
    >
      <div className="p-5 sm:p-6">
        <h2 id="ficha-compatibilidad" className="eyebrow">
          ¿Entra en tu equipo?
        </h2>

        {muestraConector ? (
          <div className="mt-4 border-l-2 border-signal pl-3.5">
            <p className="font-mono text-[1.25rem] leading-none tracking-[-0.01em] text-ink">
              {etiqueta}
            </p>
            {pista ? (
              <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
                {pista}
              </p>
            ) : null}
          </div>
        ) : null}

        {nota && !muestraConector ? (
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink">
            {nota}
          </p>
        ) : null}
      </div>

      {nota && muestraConector ? (
        <div className="flex gap-3 border-t border-hairline bg-paper-alt px-5 py-4 sm:px-6">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.4}
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-signal-ink"
          >
            <circle cx="10" cy="10" r="8" />
            <path strokeLinecap="round" d="M10 6v5" />
            <path strokeLinecap="round" d="M10 13.6v.2" />
          </svg>
          <div>
            <p className="eyebrow">Antes de pedir</p>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink">
              {nota}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
