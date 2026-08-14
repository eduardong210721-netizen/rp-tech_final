/**
 * El conector: el dato que decide si un accesorio sirve o no.
 *
 * Vive en su propio módulo porque es lo que sostiene la promesa de la tienda
 * —"el accesorio correcto, a la primera"— y porque los dos peores errores del
 * catálogo anterior fueron exactamente de compatibilidad: un cable Lightning
 * que era USB-C, y un kit "Tipo C" que traía Micro USB.
 *
 * El valor describe el extremo que se enchufa AL EQUIPO DEL CLIENTE. Esa es la
 * perspectiva desde la que se hace la pregunta: nadie se pregunta "¿qué trae
 * este cable?", se pregunta "¿esto entra en mi celular?".
 */

export const CONECTORES = {
  "usb-c": {
    etiqueta: "USB-C",
    /** Cómo lo reconoce alguien que no sabe el nombre técnico */
    pista: "Óvalo pequeño, entra por los dos lados",
    filtrable: true,
  },
  lightning: {
    etiqueta: "Lightning",
    pista: "El de los iPhone hasta el 14",
    filtrable: true,
  },
  "micro-usb": {
    etiqueta: "Micro USB",
    pista: "Trapecio pequeño, entra de un solo lado",
    filtrable: true,
  },
  "jack-3.5": {
    etiqueta: "Jack 3.5 mm",
    pista: "El conector redondo de audio",
    filtrable: true,
  },
  "usb-a": {
    etiqueta: "USB",
    pista: "El rectangular de toda la vida",
    filtrable: true,
  },
  bluetooth: {
    etiqueta: "Bluetooth",
    pista: "Sin cable",
    filtrable: true,
  },
  multiple: {
    etiqueta: "Varios conectores",
    pista: "Sirve para casi cualquier equipo",
    filtrable: true,
  },
  ninguno: {
    etiqueta: "No se conecta",
    pista: "No necesita enchufarse a tu equipo",
    /** No aparece como filtro: nadie busca "accesorios que no se conectan" */
    filtrable: false,
  },
} as const;

export type ConectorKey = keyof typeof CONECTORES;

export function esConectorValido(v: unknown): v is ConectorKey {
  return typeof v === "string" && v in CONECTORES;
}

export function etiquetaConector(v: string | null | undefined): string | null {
  return esConectorValido(v) ? CONECTORES[v].etiqueta : null;
}

export function pistaConector(v: string | null | undefined): string | null {
  return esConectorValido(v) ? CONECTORES[v].pista : null;
}

/** Los que tiene sentido ofrecer como filtro, en orden de uso esperado. */
export const CONECTORES_FILTRABLES = (
  Object.keys(CONECTORES) as ConectorKey[]
).filter((k) => CONECTORES[k].filtrable);
