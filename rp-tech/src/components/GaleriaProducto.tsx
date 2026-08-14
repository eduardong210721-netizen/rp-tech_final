"use client";

import Image from "next/image";
import { useState } from "react";
import type { PublicImage } from "@/lib/domain/product";
import { imageUrl, IMAGEN_PLACEHOLDER } from "@/lib/images";
import FichaZoom from "@/components/FichaZoom";

/**
 * Galeria de la ficha de producto.
 *
 * El catalogo real todavia tiene una sola foto por producto, asi que el caso
 * de una imagen es el caso principal, no el degradado: con una sola foto no
 * hay miniaturas huerfanas, ni contador, ni controles de teclado que no
 * lleven a ninguna parte. Todo eso aparece solo cuando hay algo que recorrer.
 *
 * Sin librerias: un indice en estado y dos flechas. El fondo es `paper-alt`
 * porque las fotos del proveedor vienen sobre blanco y necesitan un plano que
 * las contenga.
 *
 * La foto abre en grande porque en estas cajas vienen impresas las
 * especificaciones -amperaje, largo, conector- y a tamano de ficha no se leen.
 * La foto es un dato mas, no decoracion, asi que es pulsable de verdad: un
 * boton, no un div con onClick.
 */
export default function GaleriaProducto({
  imagenes,
  nombre,
}: {
  imagenes: PublicImage[];
  nombre: string;
}) {
  const [activa, setActiva] = useState(0);
  const [ampliada, setAmpliada] = useState(false);

  const total = imagenes.length;
  const varias = total > 1;
  const actual = imagenes[activa];
  const descripcion = actual?.alt || nombre;

  function mover(paso: number) {
    if (!varias) return;
    setActiva((i) => (i + paso + total) % total);
  }

  return (
    <div
      // El grupo solo existe cuando hay algo que recorrer: si no, seria una
      // parada de tabulacion que no hace nada.
      {...(varias
        ? {
            role: "group" as const,
            tabIndex: 0,
            "aria-roledescription": "galería de imágenes",
            "aria-label": `Imágenes de ${nombre}. Usa las flechas izquierda y derecha para cambiar de imagen.`,
            onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === "ArrowRight") {
                e.preventDefault();
                mover(1);
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                mover(-1);
              }
            },
          }
        : {})}
    >
      <div className="relative aspect-square overflow-hidden rounded-card border border-hairline bg-paper-alt">
        {actual ? (
          <button
            type="button"
            onClick={() => setAmpliada(true)}
            aria-haspopup="dialog"
            aria-label={`Ampliar la foto: ${descripcion}`}
            className="group absolute inset-0 block cursor-zoom-in"
          >
            <Image
              src={imageUrl(actual.storage_path)}
              alt={descripcion}
              fill
              priority
              sizes="(min-width: 1024px) 34rem, 100vw"
              className="object-contain p-6 transition-transform duration-(--dur-base) ease-(--ease-out-soft) group-hover:scale-[1.02] sm:p-10"
            />
            <span
              aria-hidden="true"
              className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-chip border border-hairline bg-paper/90 px-2 py-1 font-mono text-spec text-ink-soft transition-colors duration-(--dur-fast) group-hover:border-signal group-hover:text-ink"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-3.5 w-3.5"
              >
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path strokeLinecap="round" d="M12.6 12.6L17 17" />
                <path strokeLinecap="round" d="M6.2 8.5h4.6M8.5 6.2v4.6" />
              </svg>
              Ampliar
            </span>
          </button>
        ) : (
          <Image
            src={IMAGEN_PLACEHOLDER}
            alt={nombre}
            fill
            priority
            sizes="(min-width: 1024px) 34rem, 100vw"
            className="object-contain p-6 sm:p-10"
          />
        )}

        {varias ? (
          <p className="pointer-events-none absolute bottom-3 right-3 rounded-chip bg-paper/90 px-2 py-1 font-mono text-spec text-ink-soft">
            {activa + 1} / {total}
          </p>
        ) : null}
      </div>

      {varias ? (
        <>
          <p className="sr-only" aria-live="polite">
            Imagen {activa + 1} de {total}
          </p>

          <ul className="mt-3 grid grid-cols-5 gap-3">
            {imagenes.map((img, i) => (
              <li key={`${i}-${img.storage_path}`}>
                <button
                  type="button"
                  onClick={() => setActiva(i)}
                  aria-label={`Ver imagen ${i + 1} de ${total}`}
                  aria-current={i === activa ? "true" : undefined}
                  className={`relative block aspect-square w-full overflow-hidden rounded-chip border bg-paper-alt transition-colors duration-[var(--dur-fast)] ${
                    i === activa
                      ? "border-signal"
                      : "border-hairline hover:border-ink-muted"
                  }`}
                >
                  <Image
                    src={imageUrl(img.storage_path)}
                    alt=""
                    fill
                    sizes="6rem"
                    className="object-contain p-2"
                  />
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {actual ? (
        <FichaZoom
          src={imageUrl(actual.storage_path)}
          alt={descripcion}
          abierto={ampliada}
          onCerrar={() => setAmpliada(false)}
        />
      ) : null}
    </div>
  );
}
