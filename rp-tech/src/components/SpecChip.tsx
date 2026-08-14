import type { Especificacion } from "@/lib/domain/product";

/**
 * El chip de especificacion: el elemento firma de la tienda.
 *
 * Este negocio vende compatibilidad. El cliente no pregunta "¿es bonito?",
 * pregunta "¿sirve para mi celular?". Los dos peores defectos del sistema
 * anterior fueron precisamente etiquetas de compatibilidad equivocadas: un
 * cargador Micro USB vendido como Tipo C, y un cable Apple USB-C vendido
 * como Lightning.
 *
 * Por eso el dato tecnico no se esconde en una tabla al final de la ficha:
 * se trata como material grafico, en monoespaciada, visible desde la
 * tarjeta del catalogo. Ninguna otra tienda del rubro te dice "240W · 2 m"
 * antes de que entres al producto.
 */
export default function SpecChip({
  etiqueta,
  valor,
  fuerte = false,
}: {
  etiqueta?: string;
  valor: string;
  fuerte?: boolean;
}) {
  return (
    <span className={`spec-chip${fuerte ? " spec-chip--fuerte" : ""}`}>
      {etiqueta ? <span>{etiqueta}</span> : null}
      <span className="spec-chip__valor">{valor}</span>
    </span>
  );
}

/**
 * Las dos especificaciones que mas deciden una compra se muestran en la
 * tarjeta. El orden de `especificaciones` lo define el admin, asi que las
 * primeras son las que el negocio considera mas vendedoras.
 */
export function SpecChipsResumen({
  especificaciones,
  maximo = 2,
}: {
  especificaciones: Especificacion[];
  maximo?: number;
}) {
  const visibles = especificaciones.slice(0, maximo);
  if (visibles.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {visibles.map((e, i) => (
        <SpecChip key={e.etiqueta} valor={e.valor} fuerte={i === 0} />
      ))}
    </div>
  );
}
