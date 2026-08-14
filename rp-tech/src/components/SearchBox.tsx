"use client";

import { useEffect, useRef } from "react";
import { useFiltrosUrl, useHidratado } from "@/lib/useFiltrosUrl";

/**
 * Buscador del catalogo.
 *
 * Sin caja gris ni boton de color: un filete que se oscurece al enfocar. La
 * barra de filtros tiene que leerse como una linea de herramientas discreta,
 * no como el elemento principal de la pagina —el protagonista es el producto.
 *
 * Filtra mientras se escribe: cada tecla reprograma un envio a 300ms, asi que
 * la consulta sale cuando el cliente hace una pausa, no una por letra.
 *
 * Sigue siendo un form GET de verdad. Sin JavaScript se escribe, se pulsa
 * "Buscar" y funciona igual que siempre; los parametros vecinos (categoria,
 * orden y conector) viajan como campos ocultos para que buscar no borre el
 * filtro puesto.
 * En cuanto hidrata, el boton sobra y se sustituye por el aviso de "Buscando".
 *
 * El input es NO controlado a proposito. Si su valor colgara del `?q=` que
 * estamos actualizando, cada navegacion reescribiria el campo a mitad de
 * palabra y el cursor saltaria al final. El DOM manda mientras el campo tiene
 * el foco; la URL manda cuando no lo tiene.
 */
export default function SearchBox({
  valorActual,
  categoriaActiva,
  ordenActual,
  conectorActivo,
}: {
  valorActual?: string;
  categoriaActiva?: string;
  ordenActual?: string;
  conectorActivo?: string;
}) {
  const { aplicar, aplicarConRetardo, pendiente } = useFiltrosUrl();
  const hidratado = useHidratado();
  const campoRef = useRef<HTMLInputElement>(null);
  /** Hay texto escrito que todavia no llego a la URL. */
  const enCola = useRef(false);

  const enUrl = valorActual ?? "";
  /* Los cuatro parametros, no tres: si el conector faltara aqui, elegir un
     conector mientras hay texto a medio escribir se leeria como "no queda ni
     un filtro" y el campo se borraria solo. */
  const sinFiltros =
    !valorActual && !categoriaActiva && !ordenActual && !conectorActivo;

  useEffect(() => {
    const campo = campoRef.current;
    if (!campo || campo.value === enUrl) {
      enCola.current = false;
      return;
    }

    if (sinFiltros) {
      // No queda ni un filtro en la URL: alguien pulso "Quitar filtros". Ese
      // gesto manda sobre lo que hubiera a medio escribir. Reprogramar con
      // valor vacio no es redundante: es la unica forma de cancelar el envio
      // que el hook ya tenia en cola, que si no resucitaria la busqueda 300ms
      // despues de haberla quitado.
      campo.value = "";
      if (enCola.current) {
        enCola.current = false;
        aplicarConRetardo({ q: null });
      }
      return;
    }

    if (enCola.current) {
      // Se escribio algo que aun no llega a la URL y mientras tanto se aplico
      // otro filtro. El hook arma la URL cuando se le llama, no cuando dispara,
      // asi que el envio en cola lleva los parametros de antes y borraria la
      // categoria o el orden recien elegidos. Se reprograma con los de ahora.
      aplicarConRetardo({ q: campo.value });
      return;
    }

    // Nadie esta escribiendo y la URL dice otra cosa: la cambio un enlace o el
    // boton Atras. Manda la URL.
    if (campo !== document.activeElement) campo.value = enUrl;
    // `aplicarConRetardo` cambia de identidad con cada navegacion: eso es lo
    // que hace que este efecto corra tambien cuando cambian cat u orden.
  }, [enUrl, sinFiltros, aplicarConRetardo]);

  return (
    <form
      method="get"
      action="/"
      role="search"
      onSubmit={(evento) => {
        // Con JavaScript, Enter no recarga la pagina: aplica ya, sin esperar
        // los 300ms. Sin JavaScript este manejador no existe y el form se
        // envia solo, que es justo lo que queremos.
        evento.preventDefault();
        enCola.current = false;
        aplicar({ q: campoRef.current?.value ?? "" });
      }}
      className="flex min-w-0 flex-1 items-center gap-3 border-b border-hairline transition-colors duration-[var(--dur-fast)] focus-within:border-ink sm:max-w-56"
    >
      {categoriaActiva ? (
        <input type="hidden" name="cat" value={categoriaActiva} />
      ) : null}
      {ordenActual ? (
        <input type="hidden" name="orden" value={ordenActual} />
      ) : null}
      {conectorActivo ? (
        <input type="hidden" name="conector" value={conectorActivo} />
      ) : null}

      <input
        ref={campoRef}
        type="search"
        name="q"
        defaultValue={valorActual}
        placeholder="Buscar por nombre, marca o SKU"
        aria-label="Buscar productos"
        onChange={(evento) => {
          enCola.current = true;
          aplicarConRetardo({ q: evento.currentTarget.value });
        }}
        className="min-w-0 flex-1 bg-transparent py-2 text-sm text-ink placeholder:text-ink-muted"
      />

      {hidratado ? (
        /* Ocupa el hueco que dejo el boton, asi que la fila no da un salto al
           hidratar. El conteo de resultados ya se anuncia por su region viva;
           esto es senal visual, de ahi el aria-hidden. */
        <span
          aria-hidden="true"
          className={`shrink-0 py-2 font-mono text-spec text-ink-muted transition-opacity duration-[var(--dur-base)] ${
            pendiente ? "opacity-100" : "opacity-0"
          }`}
        >
          Buscando…
        </span>
      ) : (
        <button
          type="submit"
          className="shrink-0 py-2 text-sm text-ink-soft transition-colors duration-[var(--dur-fast)] hover:text-ink"
        >
          Buscar
        </button>
      )}
    </form>
  );
}
