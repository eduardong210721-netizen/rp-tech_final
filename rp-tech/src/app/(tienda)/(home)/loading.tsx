/**
 * Esqueleto de la portada.
 *
 * Vive dentro del grupo (home) a proposito. Si estuviera en la raiz de
 * `app/`, Next lo usaria como frontera de carga de las demas rutas y los
 * `notFound()` de /producto/[slug] llegarian al navegador como un 200 con el
 * esqueleto pintado, no como un 404. No lo muevas.
 *
 * Copia la reticula real del catalogo —misma caja (max-w-6xl px-5), mismos
 * filetes de seccion, mismas alturas de hero, franja y filtros, misma
 * progresion 1 / 2 / 3 columnas y el mismo cuadrado de imagen— para que el
 * contenido no salte cuando llega. Si cambias un relleno en la portada,
 * cambialo aqui: el salto que evita esto es exactamente el de la primera
 * fila de tarjetas moviendose bajo el dedo del cliente. Los
 * bloques usan `hairline` para lo que sera texto y `paper-alt` para lo que
 * sera superficie, que es justo el fondo que llevan las fotos de producto.
 */
export default function Loading() {
  return (
    <div>
      <p className="sr-only" role="status">
        Cargando el catálogo…
      </p>

      {/* Hero comprimido */}
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-6xl px-5 pb-7 pt-9 sm:pb-9 sm:pt-14">
          <div className="h-9 w-full max-w-xl animate-pulse rounded-lg bg-hairline" />
          <div className="mt-3 h-4 w-3/5 max-w-xs animate-pulse rounded-full bg-paper-alt" />
        </div>

        {/* Franja de especificaciones */}
        <div className="border-t border-hairline">
          <div className="mx-auto flex max-w-6xl items-center gap-5 overflow-hidden px-5 py-3">
            <div className="hidden h-3 w-24 shrink-0 animate-pulse rounded-full bg-hairline sm:block" />
            {["w-28", "w-20", "w-32", "w-24", "w-36", "w-24"].map((ancho, i) => (
              <div
                key={i}
                className={`h-3.5 shrink-0 animate-pulse rounded-full bg-paper-alt ${ancho}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Filtros: arriba el conector, debajo categorías, búsqueda y orden */}
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-col gap-3 border-b border-hairline py-4 lg:flex-row lg:items-center lg:gap-8">
            <div className="h-4 w-44 shrink-0 animate-pulse rounded-full bg-hairline" />
            <div className="flex gap-5 overflow-hidden">
              {["w-16", "w-40", "w-36", "w-32", "w-28"].map((ancho, i) => (
                <div
                  key={i}
                  className={`h-11 shrink-0 animate-pulse rounded-r-chip border-l-2 border-hairline bg-paper-alt ${ancho}`}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-5">
              {["w-16", "w-20", "w-16", "w-24", "w-20"].map((ancho, i) => (
                <div
                  key={i}
                  className={`h-5 animate-pulse rounded-full bg-paper-alt ${ancho}`}
                />
              ))}
            </div>
            <div className="h-10 w-full animate-pulse rounded-lg bg-paper-alt sm:w-64" />
          </div>
        </div>
      </section>

      {/* Catálogo */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:pb-24 sm:pt-10">
        <div className="flex items-baseline justify-between gap-6">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-hairline" />
          <div className="h-3 w-24 animate-pulse rounded-full bg-paper-alt" />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-3">
              <div className="aspect-square animate-pulse rounded-card bg-paper-alt" />
              <div className="px-1 pt-5">
                <div className="h-3 w-16 animate-pulse rounded-full bg-paper-alt" />
                <div className="mt-3.5 h-4 w-11/12 animate-pulse rounded-full bg-hairline" />
                <div className="mt-2 h-4 w-3/5 animate-pulse rounded-full bg-hairline" />
                <div className="mt-6 h-3 w-2/5 animate-pulse rounded-full bg-paper-alt" />
                <div className="mt-3 h-6 w-24 animate-pulse rounded-lg bg-hairline" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
