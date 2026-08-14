"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Un cambio con valor vacío o null borra el parámetro de la URL. */
export type CambiosFiltro = Record<string, string | null | undefined>;

const SIN_SUSCRIPCION = () => () => {};

/**
 * Detecta si el componente ya se hidrató, sin llamar a setState dentro de un
 * efecto (que es un error de lint y ya nos costó una vez).
 *
 * Sirve para ocultar el botón "Aplicar": el servidor lo pinta para quien no
 * tenga JavaScript, y en cuanto hay JavaScript sobra, porque el filtrado
 * ocurre solo.
 */
export function useHidratado(): boolean {
  return useSyncExternalStore(
    SIN_SUSCRIPCION,
    () => true,
    () => false,
  );
}

/**
 * Sincroniza filtros con la URL sin recargar ni pulsar ningún botón.
 *
 * Por qué la URL y no estado local: un filtro en la URL se puede compartir,
 * marcar como favorito y sobrevive a un F5. Además el servidor puede hacer la
 * consulta ya filtrada, así que la página funciona igual con JavaScript
 * desactivado si el formulario que la envuelve tiene su botón de envío.
 *
 * `aplicar` es inmediato: sirve para selectores y botones, donde el usuario ya
 * terminó de decidir. `aplicarConRetardo` espera a que deje de escribir, para
 * no lanzar una consulta por cada tecla.
 *
 * Usa `replace` y no `push`: filtrar no es navegar. Si cada tecla dejara una
 * entrada en el historial, el botón Atrás del navegador tendría que pulsarse
 * quince veces para volver a la pantalla anterior.
 */
export function useFiltrosUrl({ retardo = 300 }: { retardo?: number } = {}) {
  const router = useRouter();
  const ruta = usePathname();
  const parametros = useSearchParams();
  const [pendiente, iniciarTransicion] = useTransition();
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Referencia siempre al día con la URL vigente.
   *
   * NO es una optimización: es la corrección de un error real. Si la URL se
   * arma en el momento de PROGRAMAR el retardo, el envío en cola lleva dentro
   * una foto de los parámetros de hace 300ms. Escribes "romax", eliges la
   * categoría "Cables" antes de que el temporizador dispare, y el envío
   * pendiente pisa la categoría que acabas de elegir.
   *
   * Se arma al DISPARAR, leyendo de aquí.
   */
  const actual = useRef({ parametros, ruta });

  useEffect(() => {
    actual.current = { parametros, ruta };
  }, [parametros, ruta]);

  const construirUrl = useCallback((cambios: CambiosFiltro) => {
    /*
      La URL se lee del NAVEGADOR, no del estado de React.

      Primero intenté un ref sincronizado por efecto, y no bastaba: cuando el
      usuario escribe y, dentro de los 300 ms de espera, pulsa una categoría o
      un conector, esa navegación puede no haber confirmado su render todavía
      cuando el temporizador dispara. El envío en cola leía parámetros viejos y
      borraba el filtro recién elegido.

      `window.location` es la única fuente que ya está actualizada en ese
      instante: el enrutador escribe la URL con la History API al iniciar la
      navegación, no al terminar de renderizar. El ref queda de respaldo por si
      esto llegara a ejecutarse fuera del navegador.
    */
    const enNavegador = typeof window !== "undefined";
    const vigentes = enNavegador
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams(actual.current.parametros.toString());
    const rutaVigente = enNavegador
      ? window.location.pathname
      : actual.current.ruta;

    const siguientes = new URLSearchParams(vigentes.toString());
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor === null || valor === undefined || valor === "") {
        siguientes.delete(clave);
      } else {
        siguientes.set(clave, valor);
      }
    }
    const consulta = siguientes.toString();
    return consulta ? `${rutaVigente}?${consulta}` : rutaVigente;
  }, []);

  const cancelarPendiente = useCallback(() => {
    if (temporizador.current) {
      clearTimeout(temporizador.current);
      temporizador.current = null;
    }
  }, []);

  const aplicar = useCallback(
    (cambios: CambiosFiltro) => {
      cancelarPendiente();
      iniciarTransicion(() => {
        // scroll:false — al filtrar, saltar al inicio de la página desorienta:
        // el usuario está mirando la lista, no la cabecera.
        router.replace(construirUrl(cambios), { scroll: false });
      });
    },
    [cancelarPendiente, construirUrl, router],
  );

  const aplicarConRetardo = useCallback(
    (cambios: CambiosFiltro) => {
      cancelarPendiente();
      temporizador.current = setTimeout(() => {
        iniciarTransicion(() => {
          router.replace(construirUrl(cambios), { scroll: false });
        });
      }, retardo);
    },
    [cancelarPendiente, construirUrl, retardo, router],
  );

  // Si el componente se desmonta con una búsqueda en cola, no navegar después.
  useEffect(() => cancelarPendiente, [cancelarPendiente]);

  return {
    aplicar,
    aplicarConRetardo,
    /**
     * Descarta un envío en cola sin lanzarlo.
     *
     * Hace falta cuando otro control decide por su cuenta: si pulsas "Quitar
     * filtros" mientras quedaba una búsqueda a medio segundo de dispararse,
     * esa búsqueda volvería a escribir lo que acabas de limpiar.
     */
    cancelar: cancelarPendiente,
    pendiente,
  };
}
