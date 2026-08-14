"use client";

/**
 * Misma pantalla de fallo que la raiz, pero montada DENTRO del grupo
 * `(tienda)`.
 *
 * Un limite de error reemplaza todo lo que cuelga de su propio nivel. Con
 * solo `app/error.tsx`, un fallo en el catalogo se llevaba por delante el
 * layout de la tienda y el visitante quedaba en una pantalla de error sin
 * cabecera, sin carrito y sin pie —justo cuando mas necesita una salida—.
 * Este archivo baja el limite un nivel para que el marco sobreviva al fallo.
 *
 * `app/error.tsx` sigue existiendo como red de seguridad para lo que queda
 * fuera del grupo, /admin incluido.
 */
export { default } from "../error";
