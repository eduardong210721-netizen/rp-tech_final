# RP Tech — sistema visual

Documento de referencia obligatorio para cualquiera que toque la interfaz.

## La tesis

Este negocio vende **compatibilidad**. El cliente no llega preguntando "¿es
bonito?", llega preguntando *"¿este cable sirve para mi celular?"*. Los dos
peores defectos del sistema anterior fueron exactamente eso: un cargador Micro
USB vendido como Tipo C, y un cable Apple USB‑C vendido como Lightning.

De ahí sale todo el diseño: **el dato técnico es el material gráfico
principal**. No se esconde en una tabla al pie de la ficha — se muestra en la
tarjeta, en el hero, en los filtros.

## Dirección

Claro minimalista. Papel blanco, mucho aire, tipografía grande, el producto
como protagonista. El marco desaparece; el contenido manda.

**Regla de contención:** la audacia se gasta en un solo lugar — el chip de
especificación y el riel del hero. Todo lo demás es disciplinado y callado. Si
dudas entre añadir algo o quitarlo, quítalo.

## Color

Definido en `src/app/globals.css` con `@theme`. Úsalo por token de Tailwind
(`text-ink`, `bg-paper-alt`, `border-hairline`), **nunca con hex literal**.

| Token | Hex | Contraste sobre blanco | Uso |
|---|---|---|---|
| `ink` | `#0a1a21` | 17.8:1 | Texto principal **y precios**. Negro con matiz teal, no negro puro |
| `ink-soft` | `#43555c` | 7.8:1 | Texto secundario, descripciones |
| `ink-muted` | `#657378` | 4.9:1 | Etiquetas, metadatos, texto terciario |
| `paper` | `#ffffff` | — | Fondo por defecto |
| `paper-alt` | `#f6f8f8` | — | Separación de secciones, fondo de imagen de producto |
| `hairline` | `#e4eaeb` | — | Todos los filetes y bordes |
| `brand` | `#023e55` | 11.5:1 | Footer y superficies oscuras |
| `signal` | `#2ba5b2` | **2.95:1** | **Nunca como texto.** Filete, foco, subrayado activo, bordes |
| `signal-ink` | `#1d7a84` | 5.0:1 | El acento cuando *tiene* que ser texto |
| `action` | `#f7af02` | — | **Solo** el botón de acción principal. Uno por pantalla |

**Sobre el precio.** Va en `ink`, no en el turquesa. El turquesa de marca da
2.95:1 sobre blanco y no alcanza el 4.5:1 que exige AA para texto normal — y un
precio ilegible es un precio que no vende. El color de marca aparece igual en la
página, en los filetes y en el footer; el precio gana peso por tamaño, no por
color, que es como funciona esta dirección.

## Tipografía

- **Instrument Sans** (`font-sans`) para todo el texto.
- **IBM Plex Mono** (`font-mono`) **solo para datos**: specs, SKU, códigos de
  pedido, etiquetas de sección. Es la firma. No la uses de adorno.

Escala disponible como clases: `text-display`, `text-title`, `text-heading`,
`text-spec`, `text-eyebrow`. La jerarquía se construye con **contraste de
tamaño y aire**, no con color ni con negritas.

Clase `.eyebrow` para etiquetas de sección (mono, versalita, muy espaciada).

## El elemento firma

`src/components/SpecChip.tsx`. Un dato técnico con filete a la izquierda, en
monoespaciada. `<SpecChipsResumen especificaciones={...} />` muestra las dos
primeras — el admin controla el orden, así que las primeras son las que el
negocio considera más vendedoras.

Aparece en: tarjeta de catálogo, hero, ficha de producto, línea del carrito.

## Movimiento

Una curva (`--ease-out-soft`) y tres duraciones (`--dur-fast/base/slow`).
**Nada rebota.** Este negocio vende precisión.

- `<Reveal delay={n}>` — entrada al hacer scroll, 14px + opacidad. Escalona
  listas con `delay={i * 60}`.
- Hover de tarjeta: la imagen escala ~1.03, aparece filete y sombra suave.
- `prefers-reduced-motion` ya está respetado globalmente en `globals.css`. No
  escribas animaciones que lo ignoren.

## Piso de calidad, no negociable

- Responsive real hasta 360px de ancho.
- Foco visible con teclado (ya global, no lo pises con `outline-none`).
- Contraste AA en todo texto.
- Toda imagen con `alt` descriptivo; decorativas con `alt=""`.
- Estados de error que **no** parezcan éxito.

## Copy

Voz directa, en segunda persona, sin relleno ni superlativos vacíos.
"Los mejores precios" no dice nada; "S/ 12, entrega en Lima" sí.

Los botones nombran lo que hacen y mantienen el nombre por todo el flujo: si
dice "Agregar al carrito", el resultado dice "Agregado".

Nada de inventar datos del negocio. `src/lib/negocio.ts` tiene campos en
`null` para lo que el dueño aún no confirmó (dirección, horario, correo,
redes) — si está en `null`, **no se renderiza**. Nunca rellenes con un
horario o una dirección plausible.
