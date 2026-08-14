import { ImageResponse } from "next/og";

/**
 * Favicon propio, generado con la API de iconos de Next.
 *
 * A 32 px no cabe el logotipo completo ("RP" + "TECH" en mono): las dos
 * palabras juntas se convierten en una mancha. Se queda solo con "RP" en
 * blanco, a sangre sobre el azul de marca —sin margen ni esquinas redondas,
 * que a este tamano solo comen pixeles de la letra— y con el rastreo
 * cerrado para que las dos letras se lean como una unidad.
 *
 * Los colores van literales porque Satori no resuelve variables CSS: son
 * los mismos valores de `--color-brand` y `--color-paper` en globals.css.
 * Si cambian alli, cambian aqui.
 *
 * No se declara peso: el generador de imagenes trae una sola grotesca
 * incrustada, sin negrita, y pedirle 700 solo seria ruido en el codigo. El
 * peso visual lo da el tamano de la letra contra el cuadrado lleno.
 */

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const BRAND = "#023e55";
const PAPER = "#ffffff";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND,
          color: PAPER,
          fontSize: 23,
          letterSpacing: "-0.06em",
        }}
      >
        RP
      </div>
    ),
    { ...size },
  );
}
