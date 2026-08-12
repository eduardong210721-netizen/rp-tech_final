# Guía de Despliegue en Vercel — RP Tech

Este proyecto está listo para ser desplegado en **Vercel** desde el repositorio de GitHub:
`https://github.com/eduardong210721-netizen/rp-tech_final`

---

## Pasos para conectar a Vercel

1. Ingresa a [https://vercel.com/new](https://vercel.com/new) con tu cuenta de Vercel.
2. Selecciona **Import Git Repository** y elige tu repositorio `rp-tech_final`.
3. Vercel detectará el framework automáticamente como **Next.js**.
4. Despliega la sección **Environment Variables** y agrega las siguientes variables:

### Variables de Entorno Recomendadas

| Nombre de Variable | Valor Ejemplo / Descripción | Requerido |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_VENDOR_PIN` | `1234` (PIN de 4 dígitos para ingresar al portal) | **Sí** |
| `UPLOADTHING_TOKEN` | Tu Token de UploadThing (obtenido en https://uploadthing.com/dashboard) | Opcional (Hay fallback automático) |
| `GOOGLE_SHEET_ID` | ID de la hoja de cálculo de Google Sheets | Opcional (Si usas Google Sheets) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Correo de la cuenta de servicio de Google | Opcional (Si usas Google Sheets) |
| `GOOGLE_PRIVATE_KEY` | Llave privada de la cuenta de servicio Google (`-----BEGIN PRIVATE KEY...`) | Opcional (Si usas Google Sheets) |

5. Haz clic en **Deploy**. ¡Listo! Tu aplicación estará pública en un dominio `.vercel.app`.

---

## ¿Dónde se guardan los comprobantes de venta?

1. **En UploadThing**: Si configuraste `UPLOADTHING_TOKEN`, las imágenes se alojan en la CDN pública de UploadThing (`https://utfs.io/f/...`). Puedes gestionarlas todas desde tu panel en [UploadThing Dashboard](https://uploadthing.com/dashboard).
2. **En la Hoja de Ventas / Base de Datos**: En la columna **`Comprobante_URL`** de cada registro de venta se almacena el enlace directo (o la vista previa del comprobante) adjuntado por el vendedor.
