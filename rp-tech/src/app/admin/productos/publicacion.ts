/**
 * Qué le falta a un producto para poder publicarse.
 *
 * Existe porque hay dos productos que el dueño dejó inactivos a propósito
 * -uno sin precio, otro sin foto- y desde el formulario no se veía QUÉ les
 * faltaba: solo una casilla "Activo" que se podía marcar igual. Esto convierte
 * esa duda en una lista concreta.
 *
 * Lógica pura: ni React ni base de datos, para poder probarla sola.
 */

export type Requisito = {
  clave: string
  etiqueta: string
  /** Una palabra, para el chip "le falta:" del listado. */
  corto: string
  detalle: string
  cumplido: boolean
  /**
   * `true` = sin esto el producto NO puede activarse; el formulario lo impide.
   * `false` = se puede publicar igual, pero sale peor en la tienda.
   */
  bloqueante: boolean
}

export type DatosPublicacion = {
  precio: number
  costo: number
  categoriaId: string
  fotos: number
  especificaciones: number
  descripcionCorta: string
  stock: number
  bajoPedido: boolean
}

export function requisitosPublicacion(d: DatosPublicacion): Requisito[] {
  return [
    {
      clave: 'precio',
      corto: 'precio',
      etiqueta: 'Precio mayor que cero',
      detalle: 'Un producto activo con precio S/ 0.00 se puede pedir gratis desde el carrito.',
      cumplido: d.precio > 0,
      bloqueante: true,
    },
    {
      clave: 'categoria',
      corto: 'categoría',
      etiqueta: 'Categoría asignada',
      detalle: 'Sin categoría no aparece en los filtros del catálogo ni en los relacionados.',
      cumplido: d.categoriaId.trim().length > 0,
      bloqueante: true,
    },
    {
      clave: 'foto',
      corto: 'foto',
      etiqueta: 'Al menos una foto',
      detalle: 'Sin foto sale con la imagen de relleno en la tarjeta, la ficha y WhatsApp.',
      cumplido: d.fotos > 0,
      bloqueante: false,
    },
    {
      clave: 'especificaciones',
      corto: 'especificaciones',
      etiqueta: 'Dos especificaciones',
      detalle: 'Las dos primeras son los datos que se leen en la tarjeta del catálogo.',
      cumplido: d.especificaciones >= 2,
      bloqueante: false,
    },
    {
      clave: 'descripcion',
      corto: 'descripción',
      etiqueta: 'Descripción corta',
      detalle: 'Es la línea que acompaña al nombre en la ficha y en la vista previa del enlace.',
      cumplido: d.descripcionCorta.trim().length > 0,
      bloqueante: false,
    },
    {
      clave: 'costo',
      corto: 'costo',
      etiqueta: 'Costo registrado',
      detalle: 'Con costo S/ 0.00 el margen sale al 100% y la utilidad del panel miente.',
      cumplido: d.costo > 0,
      bloqueante: false,
    },
    {
      clave: 'disponibilidad',
      corto: 'unidades',
      etiqueta: 'Unidades o venta bajo pedido',
      detalle: 'Con 0 unidades y sin "bajo pedido" el cliente lo ve agotado y no puede comprarlo.',
      cumplido: d.bajoPedido || d.stock > 0,
      bloqueante: false,
    },
  ]
}

export function pendientes(requisitos: readonly Requisito[]): Requisito[] {
  return requisitos.filter((r) => !r.cumplido)
}

export function bloqueantesPendientes(requisitos: readonly Requisito[]): Requisito[] {
  return requisitos.filter((r) => !r.cumplido && r.bloqueante)
}
