import type { PublicProduct } from "@/lib/domain/product";
import SpecChip from "./SpecChip";

/**
 * El riel de especificaciones del hero.
 *
 * El hero de esta tienda no lleva foto de producto: las fotos del catalogo son
 * cajas sobre fondo blanco —honestas, pero no de portada— y ampliarlas a
 * tamano hero solo las delataria. Lo que diferencia a RP Tech tampoco es el
 * estilo de vida: es la especificacion exacta. Asi que el material grafico
 * del hero es el dato.
 *
 * Ya no es el protagonista, sin embargo: es una franja fina de ~40px que
 * cierra el hero. La portada tiene que mostrar producto antes de que el
 * cliente haga scroll, y una banda de 120px para decir "mira que datos
 * tenemos" costaba justo la primera fila de tarjetas.
 *
 * Este componente lee las especificaciones REALES de los productos que se
 * estan mostrando y extrae de cada una su magnitud tecnica (240W, 12000 mAh,
 * 7.2A, 10000 DPI, PD 66W). No hay una lista escrita a mano en ningun lado:
 * si el admin cambia una ficha, el riel cambia. Si el catalogo se queda sin
 * datos numericos, el riel no se renderiza en vez de inventar contenido.
 */

type Dato = { etiqueta: string; valor: string; fuerte: boolean };

/**
 * Unidades reconocidas. El orden importa: las alternativas largas van
 * primero para que "2 metros" no se lea como "2 m" + basura.
 */
const UNIDADES = [
  "mAh",
  "metros",
  "metro",
  "pulgadas",
  "pulgada",
  "voltios",
  "DPI",
  "GHz",
  "MHz",
  "Hz",
  "mm",
  "cm",
  "W",
  "A",
  "V",
  "m",
  "°",
] as const;

/**
 * Un numero (o un rango "3 a 7"), con un prefijo de estandar opcional
 * —"PD 66W", "USB 2.4 GHz"— y una unidad. El lookahead final evita que la
 * unidad se coma el principio de otra palabra.
 */
const PATRON = new RegExp(
  String.raw`\b((?:PD|QC|PPS|USB)\s+)?(\d+(?:[.,]\d+)?)(?:\s*(?:a|-|–)\s*(\d+(?:[.,]\d+)?))?\s*(${UNIDADES.join("|")})(?!\p{L})`,
  "iu",
);

/** Como se escribe cada unidad y si va pegada al numero. */
const CANONICA: Record<string, { texto: string; pegada: boolean }> = {
  mah: { texto: "mAh", pegada: false },
  dpi: { texto: "DPI", pegada: false },
  ghz: { texto: "GHz", pegada: false },
  mhz: { texto: "MHz", pegada: false },
  hz: { texto: "Hz", pegada: false },
  w: { texto: "W", pegada: true },
  a: { texto: "A", pegada: true },
  v: { texto: "V", pegada: true },
  voltios: { texto: "V", pegada: true },
  mm: { texto: "mm", pegada: false },
  cm: { texto: "cm", pegada: false },
  m: { texto: "m", pegada: false },
  metro: { texto: "m", pegada: false },
  metros: { texto: "m", pegada: false },
  pulgada: { texto: '"', pegada: true },
  pulgadas: { texto: '"', pegada: true },
  "°": { texto: "°", pegada: true },
};

/**
 * "Hasta 240W" -> "240W". "Equipos de 3 a 7 pulgadas" -> '3 a 7"'.
 * Devuelve null cuando el valor no contiene ninguna magnitud: preferimos un
 * riel corto a uno relleno con texto que no es un dato.
 */
export function extraerDato(valor: string): string | null {
  const encontrado = PATRON.exec(valor);
  if (!encontrado) return null;

  const [, prefijo, primero, segundo, unidad] = encontrado;
  if (!primero || !unidad) return null;

  const canonica = CANONICA[unidad.toLowerCase()];
  if (!canonica) return null;

  const numero = segundo ? `${primero} a ${segundo}` : primero;
  const estandar = prefijo ? `${prefijo.trim().toUpperCase()} ` : "";

  return `${estandar}${numero}${canonica.pegada ? "" : " "}${canonica.texto}`;
}

/** Hasta `maximo` magnitudes de un producto, en el orden que fijo el admin. */
function datosDe(producto: PublicProduct, maximo: number): Dato[] {
  const datos: Dato[] = [];

  for (const especificacion of producto.especificaciones) {
    const valor = extraerDato(especificacion.valor);
    if (!valor) continue;
    datos.push({
      etiqueta: especificacion.etiqueta,
      valor,
      // La primera de cada producto es la que el negocio considera mas
      // vendedora: se marca con el filete de senal.
      fuerte: datos.length === 0,
    });
    if (datos.length >= maximo) break;
  }

  return datos;
}

/**
 * Intercala por rondas en vez de concatenar producto a producto: asi el riel
 * no muestra cuatro "Potencia" seguidas cuando pasan los cables.
 */
export function construirDatos(productos: PublicProduct[], tope = 20): Dato[] {
  const porProducto = productos.map((p) => datosDe(p, 2));
  const vistos = new Set<string>();
  const datos: Dato[] = [];

  for (let ronda = 0; ronda < 2; ronda++) {
    for (const lista of porProducto) {
      const dato = lista[ronda];
      if (!dato) continue;
      const clave = `${dato.etiqueta}|${dato.valor}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      datos.push(dato);
      if (datos.length >= tope) return datos;
    }
  }

  return datos;
}

/**
 * El degradado a los lados evita que los chips se corten en seco contra el
 * borde de la pantalla. Es mascara de opacidad, no color de marca.
 */
const DEGRADADO =
  "linear-gradient(to right, transparent, black 10%, black 93%, transparent)";

export default function HeroSpecRail({
  productos,
}: {
  productos: PublicProduct[];
}) {
  const datos = construirDatos(productos);
  if (datos.length === 0) return null;

  /* Con la lista completa cada mitad mide mas de 2000px, o sea mas que casi
     cualquier ventana. En un monitor mas ancho que eso el bucle dejaria un
     hueco al final, asi que la fila nunca baja de 100vw y reparte el espacio
     sobrante entre los chips. Las dos mitades siguen siendo identicas, que es
     lo unico que el -50% necesita para no dar el salto. */
  const estirar = datos.length >= 6;

  const fila = (copia: boolean) => (
    <ul
      // La copia existe solo para que el bucle sea invisible: para un lector
      // de pantalla seria el mismo contenido dos veces.
      aria-hidden={copia || undefined}
      aria-label={
        copia ? undefined : "Especificaciones de productos en catálogo"
      }
      className={`flex shrink-0 items-center gap-x-7 pr-7 sm:gap-x-10 sm:pr-10 ${
        estirar ? "min-w-[100vw] justify-between" : ""
      }`}
    >
      {datos.map((dato) => (
        <li key={`${copia ? "copia" : "base"}-${dato.etiqueta}-${dato.valor}`}>
          <SpecChip
            etiqueta={dato.etiqueta}
            valor={dato.valor}
            fuerte={dato.fuerte}
          />
        </li>
      ))}
    </ul>
  );

  return (
    /* La etiqueta va a la izquierda, en la misma linea que los chips, en vez
       de encima: ahorra los ~30px que costaba el rotulo aparte. Por debajo de
       sm se oculta —"Especificaciones" ocuparia media pantalla— y el `ul`
       conserva su nombre accesible. */
    <div className="border-t border-hairline">
      <div className="mx-auto flex max-w-6xl items-center gap-5 px-5">
        <p className="eyebrow hidden shrink-0 sm:block">En catálogo</p>

        <div
          className="relative min-w-0 flex-1 overflow-hidden py-3"
          style={{ maskImage: DEGRADADO, WebkitMaskImage: DEGRADADO }}
        >
          <div className="riel-deriva flex w-max">
            {fila(false)}
            {fila(true)}
          </div>
        </div>
      </div>
    </div>
  );
}
