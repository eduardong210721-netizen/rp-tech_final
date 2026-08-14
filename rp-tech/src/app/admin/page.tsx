import { requireAdmin } from '@/lib/auth'
import { obtenerEstadisticas } from '@/lib/repo/estadisticas'
import PanelResumen from './PanelResumen'

/**
 * Portada del panel.
 *
 * Solo hace tres cosas: autorizar, consultar y entregar. El dibujo está en
 * `PanelResumen`, que no toca la base ni la sesión —así se puede mirar con
 * datos inventados sin abrir un agujero de autorización aquí—.
 *
 * `requireAdmin()` es la primera línea, como en toda página del panel. Estas
 * cifras incluyen costo y utilidad.
 */
export default async function AdminPanelPage() {
  await requireAdmin()

  const ahora = new Date()
  const stats = await obtenerEstadisticas(ahora)

  return <PanelResumen stats={stats} ahora={ahora} />
}
