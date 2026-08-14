import { ImageResponse } from "next/og";

/**
 * Icono para la pantalla de inicio de iOS.
 *
 * Misma composicion que el favicon —"RP" blanco a sangre sobre el azul de
 * marca— porque a 180 px el logotipo completo tampoco aporta: iOS recorta
 * las esquinas y pone el nombre debajo del icono, asi que la palabra
 * "TECH" dentro del cuadrado solo restaria tamano a las letras que si se
 * reconocen de lejos.
 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const BRAND = "#023e55";
const PAPER = "#ffffff";

export default function AppleIcon() {
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
          fontSize: 108,
          letterSpacing: "-0.06em",
        }}
      >
        RP
      </div>
    ),
    { ...size },
  );
}
