/**
 * Catálogo semilla.
 *
 * ATENCIÓN — los `costo` de este archivo son CERO a propósito. El costo es
 * información competitiva: revela el margen de cada producto, y este código
 * puede acabar en un repositorio público. Toda la protección del serializador
 * (`toPublicProduct` construye el objeto campo por campo justamente para que
 * `costo` no salga nunca en una respuesta pública) no sirve de nada si los
 * mismos números viajan en el repositorio.
 *
 * Los costos reales viven en la base de datos y se editan desde `/admin`.
 *
 * Para sembrar un entorno nuevo con costos reales, crea
 * `scripts/data/costos.local.json` —ignorado por git— con la forma:
 *
 *   { "26002": 8.5, "26003": 6 }
 *
 * `seed.ts` lo carga si existe y deja el costo en 0 si no. Sembrar sin ese
 * archivo produce un catálogo correcto de cara al cliente; solo el margen del
 * panel sale en cero hasta que el dueño cargue los costos.
 */

export type SeedProducto = {
  sku: string
  slug: string
  nombre: string
  descripcion_corta: string
  descripcion_larga: string
  marca: string | null
  modelo: string | null
  especificaciones: { etiqueta: string; valor: string }[]
  categoria: string           // slug de categoría
  precio: number
  costo: number
  stock: number
  activo: boolean
  garantia_meses: number | null
  imagen: string | null       // nombre del archivo .webp, sin ruta
  alt: string
}

export const CATEGORIAS = [
  { slug: 'audifonos',       nombre: 'Audífonos',        orden: 1 },
  { slug: 'cables',          nombre: 'Cables',           orden: 2 },
  { slug: 'cargadores',      nombre: 'Cargadores',       orden: 3 },
  { slug: 'powerbanks',      nombre: 'Power Banks',      orden: 4 },
  { slug: 'computo',         nombre: 'Cómputo',          orden: 5 },
  { slug: 'accesorios-auto', nombre: 'Accesorios Auto',  orden: 6 },
]

export const PRODUCTOS: SeedProducto[] = [
  {
    sku: '26002',
    slug: 'audifonos-bluetooth-damix-m20-tws',
    nombre: 'Audífonos Inalámbricos Bluetooth Damix M20 TWS',
    descripcion_corta: 'Audífonos TWS con estuche de carga y display LED de batería.',
    descripcion_larga:
      'Audífonos totalmente inalámbricos con estuche de carga que muestra el nivel de batería en un display LED. Emparejamiento automático al abrir el estuche y controles táctiles en cada audífono. Ideales para llamadas y música en el día a día.',
    marca: 'Damix', modelo: 'M20 TWS',
    especificaciones: [
      { etiqueta: 'Conexión', valor: 'Bluetooth inalámbrico' },
      { etiqueta: 'Estuche',  valor: 'Con display LED de carga' },
      { etiqueta: 'Controles', valor: 'Táctiles' },
    ],
    categoria: 'audifonos', precio: 15, costo: 0, stock: 10, activo: true,
    garantia_meses: 3, imagen: '26001.webp', alt: 'Audífonos Damix M20 TWS con estuche de carga y display LED',
  },
  {
    sku: '26003',
    slug: 'audifonos-estereo-cable-redd-rd-3029',
    nombre: 'Audífonos Estéreo con Cable REDD RD-3029',
    descripcion_corta: 'Audífonos HiFi con micrófono y control en línea, jack 3.5 mm.',
    descripcion_larga:
      'Audífonos in-ear con sonido estéreo HiFi, micrófono integrado y control en línea para contestar llamadas y manejar la música sin sacar el celular. Conector universal de 3.5 mm. Disponibles en negro y blanco.',
    marca: 'REDD', modelo: 'RD-3029',
    especificaciones: [
      { etiqueta: 'Conector', valor: 'Jack 3.5 mm' },
      { etiqueta: 'Micrófono', valor: 'Integrado con control en línea' },
      { etiqueta: 'Colores', valor: 'Negro / Blanco' },
    ],
    categoria: 'audifonos', precio: 12, costo: 0, stock: 10, activo: true,
    garantia_meses: 3, imagen: '26002.webp', alt: 'Audífonos con cable REDD RD-3029 en negro y blanco',
  },
  {
    // CORREGIDO: el nombre anterior decía "Cable Lightning para iPhone".
    // La fotografía es el cable Apple USB-C a USB-C de 240W. Confirmado con el dueño.
    sku: '26004',
    slug: 'cable-apple-usb-c-240w-2m',
    nombre: 'Cable Apple USB-C a USB-C 240W — 2 m',
    descripcion_corta: 'Cable Apple original de 2 metros, hasta 240W de carga.',
    descripcion_larga:
      'Cable de carga Apple USB-C a USB-C de 2 metros con soporte para hasta 240W de potencia. Tejido trenzado resistente. Compatible con iPhone 15 en adelante, iPad, MacBook y cualquier equipo USB-C.',
    marca: 'Apple', modelo: 'USB-C 240W',
    especificaciones: [
      { etiqueta: 'Potencia', valor: 'Hasta 240W' },
      { etiqueta: 'Longitud', valor: '2 metros' },
      { etiqueta: 'Conectores', valor: 'USB-C a USB-C' },
      { etiqueta: 'Cubierta', valor: 'Tejido trenzado' },
    ],
    categoria: 'cables', precio: 15, costo: 0, stock: 6, activo: true,
    garantia_meses: 3, imagen: '26003.webp', alt: 'Cable Apple USB-C a USB-C 240W de 2 metros con su caja',
  },
  {
    sku: '26005',
    slug: 'cable-tipo-c-redd-rd-2119c-75w',
    nombre: 'Cable Tipo C Carga Rápida REDD RD-2119C 7.2A 75W — 1 m',
    descripcion_corta: 'Cable Tipo C de 75W y 7.2A con malla trenzada, 1 metro.',
    descripcion_larga:
      'Cable de datos y carga rápida USB a Tipo C con salida de hasta 75W y 7.2A. Chip inteligente que regula la corriente para proteger la batería. Malla trenzada de alta durabilidad y 1 metro de largo.',
    marca: 'REDD', modelo: 'RD-2119C',
    especificaciones: [
      { etiqueta: 'Corriente', valor: '7.2A' },
      { etiqueta: 'Potencia', valor: '75W' },
      { etiqueta: 'Longitud', valor: '1 metro' },
      { etiqueta: 'Cubierta', valor: 'Malla trenzada' },
    ],
    categoria: 'cables', precio: 12, costo: 0, stock: 12, activo: true,
    garantia_meses: 3, imagen: '26004.webp', alt: 'Cable REDD RD-2119C Tipo C trenzado con su empaque',
  },
  {
    sku: '26006',
    slug: 'cable-usb-tipo-c-romax-45w',
    nombre: 'Cable USB a Tipo C ROMAX 45W 5.5A — 1 m',
    descripcion_corta: 'Cable de datos ROMAX de 1 metro, 45W y 5.5A.',
    descripcion_larga:
      'Cable de datos y carga USB a Tipo C de ROMAX con salida de 45W y 5.5A. Un metro de largo, ideal para carga rápida de celulares y tablets. Disponible en negro y blanco.',
    marca: 'ROMAX', modelo: null,
    especificaciones: [
      { etiqueta: 'Corriente', valor: '5.5A' },
      { etiqueta: 'Potencia', valor: '45W' },
      { etiqueta: 'Longitud', valor: '1 metro' },
      { etiqueta: 'Colores', valor: 'Negro / Blanco' },
    ],
    categoria: 'cables', precio: 12, costo: 0, stock: 5, activo: true,
    garantia_meses: 3, imagen: '26005.webp', alt: 'Cable ROMAX USB a Tipo C en negro y blanco',
  },
  {
    // CORREGIDO: el nombre anterior decía "+ Cable Tipo C".
    // La caja del producto dice MICRO USB. Confirmado con el dueño.
    sku: '26007',
    slug: 'kit-cargador-pared-redd-67w-micro-usb',
    nombre: 'Kit Cargador de Pared REDD 67W 6.2A + Cable Micro USB',
    descripcion_corta: 'Cargador turbo de pared 67W con cable Micro USB incluido.',
    descripcion_larga:
      'Kit de carga rápida REDD: cargador de pared con salida turbo de hasta 67W y 6.2A, más cable Micro USB incluido. Atención: el cable del kit es Micro USB, no Tipo C — revisa el conector de tu equipo antes de comprar.',
    marca: 'REDD', modelo: null,
    especificaciones: [
      { etiqueta: 'Potencia', valor: '67W máximo' },
      { etiqueta: 'Corriente', valor: '6.2A' },
      { etiqueta: 'Cable incluido', valor: 'Micro USB' },
      { etiqueta: 'Puertos', valor: '1 x USB-A carga rápida' },
    ],
    categoria: 'cargadores', precio: 17, costo: 0, stock: 6, activo: true,
    garantia_meses: 3, imagen: '26006.webp', alt: 'Cargador de pared REDD 67W con cable Micro USB',
  },
  {
    // CORREGIDO: era "Soporte para Celular Romax" en categoría MISELANEO.
    // La caja dice claramente "SOPORTE DE CELULAR PARA AUTO".
    sku: '26008',
    slug: 'soporte-celular-auto-romax',
    nombre: 'Soporte de Celular para Auto ROMAX — ventosa 360°',
    descripcion_corta: 'Soporte vehicular con ventosa y cuello flexible de 360°.',
    descripcion_larga:
      'Soporte de celular para auto marca ROMAX. Se fija al parabrisas o tablero con ventosa y tiene cuello flexible que gira 360° para dejar la pantalla en el ángulo que quieras. Agarre firme y compatible con equipos de 3 a 7 pulgadas.',
    marca: 'ROMAX', modelo: null,
    especificaciones: [
      { etiqueta: 'Montaje', valor: 'Ventosa para parabrisas o tablero' },
      { etiqueta: 'Rotación', valor: '360°' },
      { etiqueta: 'Compatibilidad', valor: 'Equipos de 3 a 7 pulgadas' },
      { etiqueta: 'Cuello', valor: 'Flexible ajustable' },
    ],
    categoria: 'accesorios-auto', precio: 15, costo: 0, stock: 5, activo: true,
    garantia_meses: 3, imagen: '26008.webp', alt: 'Soporte de celular para auto ROMAX con ventosa',
  },
  {
    // CORREGIDO: era "Mouse Inalámbrico Bluetooth Halion".
    // Es un mouse gamer con receptor USB 2.4GHz, no Bluetooth.
    sku: '26009',
    slug: 'mouse-gamer-halion-mantis-ha-m105',
    nombre: 'Mouse Gamer Inalámbrico Halion Mantis HA-M105 RGB 10000 DPI',
    descripcion_corta: 'Mouse gamer inalámbrico con RGB, 10000 DPI y batería recargable.',
    descripcion_larga:
      'Mouse gamer inalámbrico Halion Mantis con sensor de hasta 10000 DPI e iluminación RGB. Se conecta por receptor USB de 2.4 GHz de baja latencia y trae cable USB-C para cargar y usar con cable. Diseño ergonómico para sesiones largas.',
    marca: 'Halion', modelo: 'HA-M105 Mantis',
    especificaciones: [
      { etiqueta: 'Sensor', valor: 'Hasta 10000 DPI' },
      { etiqueta: 'Conexión', valor: 'Receptor USB 2.4 GHz' },
      { etiqueta: 'Iluminación', valor: 'RGB' },
      { etiqueta: 'Batería', valor: 'Recargable por USB-C' },
      { etiqueta: 'Incluye', valor: 'Receptor USB y cable USB-C' },
    ],
    categoria: 'computo', precio: 65, costo: 0, stock: 1, activo: true,
    garantia_meses: 6, imagen: '26009.webp', alt: 'Mouse gamer Halion Mantis HA-M105 RGB con receptor USB',
  },
  {
    sku: '26010',
    slug: 'power-bank-romax-12000mah-pd66w-magnetico',
    nombre: 'Power Bank ROMAX Premium 12000 mAh PD 66W Magnético',
    descripcion_corta: 'Batería de 12000 mAh con carga inalámbrica magnética y PD 66W.',
    descripcion_larga:
      'Power bank ROMAX Premium de 12000 mAh con carga rápida PD de hasta 66W. Incluye carga inalámbrica magnética compatible con MagSafe y cable Tipo C integrado que sirve como entrada y salida. Suma salidas Tipo C, Lightning y puerto USB.',
    marca: 'ROMAX', modelo: 'PD-66',
    especificaciones: [
      { etiqueta: 'Capacidad', valor: '12000 mAh' },
      { etiqueta: 'Carga rápida', valor: 'PD 66W' },
      { etiqueta: 'Inalámbrica', valor: 'Magnética, compatible MagSafe' },
      { etiqueta: 'Cable', valor: 'Tipo C integrado bidireccional' },
      { etiqueta: 'Salidas', valor: 'Tipo C, Lightning y USB' },
    ],
    categoria: 'powerbanks', precio: 70, costo: 0, stock: 2, activo: true,
    garantia_meses: 6, imagen: '26010.webp', alt: 'Power bank ROMAX Premium 12000 mAh magnético PD 66W',
  },
  {
    // Inactivo: en producción apuntaba a /products/26010.png, archivo inexistente.
    // Se activa desde el admin cuando haya foto.
    sku: '26011',
    slug: 'extension-de-corriente',
    nombre: 'Extensión de corriente',
    descripcion_corta: 'Extensión de corriente para el hogar u oficina.',
    descripcion_larga: 'Pendiente de completar la ficha y la fotografía del producto.',
    marca: null, modelo: null, especificaciones: [],
    categoria: 'accesorios-auto', precio: 30, costo: 0, stock: 0, activo: false,
    garantia_meses: null, imagen: null, alt: '',
  },
  {
    // NUEVO: la foto 26011.jpg estaba huérfana en el repo viejo.
    // Inactivo hasta que el dueño cargue precio, costo y stock desde el admin.
    sku: '26012',
    slug: 'teclado-mecanico-hyperx-rgb-tkl',
    nombre: 'Teclado Mecánico HyperX RGB TKL',
    descripcion_corta: 'Teclado mecánico compacto TKL con iluminación RGB por tecla.',
    descripcion_larga:
      'Teclado mecánico HyperX en formato TKL (sin teclado numérico) con iluminación RGB configurable por tecla. Switches mecánicos, estructura resistente y teclas multimedia. Formato compacto que libera espacio en el escritorio.',
    marca: 'HyperX', modelo: null,
    especificaciones: [
      { etiqueta: 'Formato', valor: 'TKL, sin teclado numérico' },
      { etiqueta: 'Switches', valor: 'Mecánicos' },
      { etiqueta: 'Iluminación', valor: 'RGB por tecla' },
      { etiqueta: 'Conexión', valor: 'Cable USB' },
    ],
    categoria: 'computo', precio: 0, costo: 0, stock: 0, activo: false,
    garantia_meses: 12, imagen: '26011.webp', alt: 'Teclado mecánico HyperX RGB formato TKL',
  },
]
