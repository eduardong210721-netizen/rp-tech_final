import Image from "next/image";
import Link from "next/link";
import type { Especificacion, PublicProduct } from "@/lib/domain/product";
import { etiquetaConector } from "@/lib/domain/conector";
import { formatPEN } from "@/lib/format";
import { imageUrl, IMAGEN_PLACEHOLDER } from "@/lib/images";
import SpecChip, { SpecChipsResumen } from "./SpecChip";
import AddToCartButton from "./AddToCartButton";

/**
 * El conector ya se muestra en su propio chip, asi que la especificacion que
 * repite ese mismo dato ("Conector = Jack 3.5 mm", "Conexión = Bluetooth
 * inalámbrico") no vale el hueco: gastaria el segundo chip en decir dos veces
 * lo mismo en vez de aportar el dato siguiente.
 *
 * Compara por prefijo y no por coincidencia parcial a proposito: "USB" es
 * subcadena de media ficha tecnica y descartaria specs que si aportan.
 */
export function sinRepetirConector(
  especificaciones: Especificacion[],
  conector: string | null,
): Especificacion[] {
  if (!conector) return especificaciones;
  const normal = conector.trim().toLowerCase();
  return especificaciones.filter((e) => {
    const valor = e.valor.trim().toLowerCase();
    return !valor.startsWith(normal) && !normal.startsWith(valor);
  });
}

/**
 * Tarjeta del catalogo.
 *
 * En reposo no tiene borde ni sombra: es producto sobre papel, con aire
 * alrededor. El filete y la sombra aparecen solo al pasar el mouse, para que
 * la retícula no se lea como una cuadrícula de cajas.
 *
 * Lo que ninguna otra tienda del rubro hace: la especificacion se ve ANTES de
 * entrar a la ficha. El cliente que pregunta "¿sirve para mi celular?" no
 * deberia tener que abrir nueve pestanas para responderselo.
 *
 * El orden de los datos responde a esa pregunta y no a otra: primero el
 * CONECTOR —lo que decide si el accesorio entra en el equipo del cliente—, y
 * solo despues los vatios. Cuando el producto trae aviso de compatibilidad, el
 * aviso va entero y encima del precio: recortarlo o mandarlo a la ficha es
 * exactamente lo que causo devoluciones reales con el kit "Tipo C" que traia
 * Micro USB.
 *
 * El nombre tampoco se recorta: contiene el dato de compatibilidad ("240W —
 * 2 m", "+ Cable Micro USB").
 */
export default function ProductCard({ product }: { product: PublicProduct }) {
  const principal = product.imagenes[0];
  const restante = product.stock_restante;
  const quedanPocas = restante !== null && restante > 0 && restante <= 3;

  const conector = etiquetaConector(product.conector);
  const especificaciones = sinRepetirConector(
    product.especificaciones,
    conector,
  );
  /* Con conector visible queda sitio para un solo dato mas: la fila de chips
     no puede partirse en dos lineas sin desalinear la retícula. */
  const segunda = especificaciones[0];

  return (
    <article className="group relative flex h-full flex-col rounded-card border border-transparent p-3 transition-[border-color,box-shadow] duration-(--dur-base) ease-(--ease-out-soft) focus-within:border-hairline hover:border-hairline hover:shadow-lg hover:shadow-ink/10">
      {/*
        El enlace cubre toda la tarjeta con un pseudo-elemento estirado, en vez
        de envolverla. Asi el boton de agregar puede convivir con el enlace sin
        quedar anidado dentro de el, que seria HTML invalido y dejaria el boton
        inalcanzable con teclado.
      */}
      <Link
        href={`/producto/${product.slug}`}
        className="flex flex-1 flex-col outline-none after:absolute after:inset-0 after:rounded-card"
      >
        <div className="relative aspect-square overflow-hidden rounded-card bg-paper-alt">
          <Image
            src={principal ? imageUrl(principal.storage_path) : IMAGEN_PLACEHOLDER}
            alt={principal?.alt || product.nombre}
            fill
            sizes="(max-width: 420px) 92vw, (max-width: 1024px) 46vw, 360px"
            className="object-contain p-6 transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-soft)] group-hover:scale-[1.03]"
          />
          {!product.disponible && (
            <span className="absolute inset-x-0 bottom-0 bg-ink/85 py-2 text-center font-mono text-spec uppercase text-paper">
              Agotado
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col px-1 pt-5">
          {product.marca ? <p className="eyebrow">{product.marca}</p> : null}

          <h3 className="mt-2 text-base leading-snug text-ink">
            {product.nombre}
          </h3>

          <div className="mt-auto space-y-3 pt-5">
            {conector ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                {/* El filete de senal, el que marca el dato principal, es
                    siempre del conector cuando el producto tiene uno. */}
                <SpecChip valor={conector} fuerte />
                {segunda ? <SpecChip valor={segunda.valor} /> : null}
              </div>
            ) : (
              <SpecChipsResumen especificaciones={especificaciones} />
            )}

            {product.compatibilidad_nota ? (
              <p className="border-l-2 border-signal pl-3 text-sm leading-snug text-ink-soft">
                {product.compatibilidad_nota}
              </p>
            ) : null}

            <p className="text-heading text-ink">{formatPEN(product.precio)}</p>

            {quedanPocas ? (
              <p className="font-mono text-spec text-danger">
                {restante === 1
                  ? "¡Última unidad!"
                  : `¡Últimas ${restante} unidades!`}
              </p>
            ) : null}
          </div>
        </div>
      </Link>

      {/*
        Encima del enlace estirado (z-10) para que reciba el clic. Variante
        discreta: en una retícula de nueve, nueve botones ámbar convertirian el
        color de accion en ruido. El ámbar se reserva para la ficha, donde hay
        una sola decision.
      */}
      <div className="relative z-10 px-1 pt-4">
        <AddToCartButton product={product} variante="discreta" />
      </div>
    </article>
  );
}
