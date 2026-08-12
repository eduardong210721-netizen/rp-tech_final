import { google, drive_v3 } from 'googleapis';
import { JWT } from 'google-auth-library';
import { Readable } from 'stream';

export interface SaleDriveData {
  vendedor: string;
  cliente: string;
  distrito_entrega: string;
  producto_id: string;
  producto_nombre: string;
  cantidad: number;
  total: number;
  metodo_pago: string;
  comprobante_url: string;
}

function getDriveClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    return null;
  }

  const auth = new JWT({
    email,
    key: privateKey,
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });

  return google.drive({ version: 'v3', auth });
}

async function getOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  folderName: string,
  parentId?: string
): Promise<string> {
  // If no parentId provided and GOOGLE_DRIVE_FOLDER_ID is set in env, use it as root parent
  if (!parentId && process.env.GOOGLE_DRIVE_FOLDER_ID) {
    return process.env.GOOGLE_DRIVE_FOLDER_ID;
  }

  let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  try {
    const res = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (res.data.files && res.data.files.length > 0 && res.data.files[0].id) {
      return res.data.files[0].id;
    }
  } catch (err) {
    console.warn('Error querying Google Drive folder:', err);
  }

  const folderMetadata: drive_v3.Schema$File = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    folderMetadata.parents = [parentId];
  }

  const newFolder = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id',
    supportsAllDrives: true,
  });

  return newFolder.data.id!;
}

export async function saveSaleToDrive(data: SaleDriveData): Promise<{ voucherUrl?: string; txtUrl?: string }> {
  try {
    const drive = getDriveClient();
    if (!drive) {
      console.warn('Google Drive credentials not configured');
      return {};
    }

    const ownerEmail = 'eduardong210721@gmail.com';

    // 1. Get or create root "Pagos" folder
    const pagosFolderId = await getOrCreateFolder(drive, 'Pagos');

    // Share "Pagos" folder with owner email so it appears in "Compartidos conmigo" or owner's drive
    try {
      await drive.permissions.create({
        fileId: pagosFolderId,
        requestBody: {
          role: 'writer',
          type: 'user',
          emailAddress: ownerEmail,
        },
        sendNotificationEmail: false,
      });
    } catch {
      // Permission might already exist
    }

    // 2. Get or create Vendor subfolder
    const vendorFolderName = (data.vendedor || 'General').trim();
    const vendorFolderId = await getOrCreateFolder(drive, vendorFolderName, pagosFolderId);

    // Share vendor subfolder with owner
    try {
      await drive.permissions.create({
        fileId: vendorFolderId,
        requestBody: {
          role: 'writer',
          type: 'user',
          emailAddress: ownerEmail,
        },
        sendNotificationEmail: false,
      });
    } catch {
      // ignore
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeClient = (data.cliente || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_');

    let voucherUrl = data.comprobante_url;

    // 3. Upload Voucher Image if provided as Data URL or Base64
    if (data.comprobante_url && data.comprobante_url.startsWith('data:')) {
      const match = data.comprobante_url.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const ext = mimeType.split('/')[1] || 'jpg';
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, 'base64');

        const imageName = `comprobante_${safeClient}_${timestamp}.${ext}`;
        const imageRes = await drive.files.create({
          requestBody: {
            name: imageName,
            parents: [vendorFolderId],
          },
          media: {
            mimeType,
            body: Readable.from(buffer),
          },
          fields: 'id, webViewLink',
          supportsAllDrives: true,
        });

        if (imageRes.data.webViewLink) {
          voucherUrl = imageRes.data.webViewLink;
        }

        // Grant permission to owner and public read
        if (imageRes.data.id) {
          try {
            await drive.permissions.create({
              fileId: imageRes.data.id,
              requestBody: { role: 'reader', type: 'anyone' },
            });
          } catch {
            // ignore
          }
        }
      }
    }

    // 4. Create and upload Sale Text File
    const textContent = `========================================
REGISTRO DE VENTA — RP TECH
========================================
Fecha: ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}
Vendedor(a): ${data.vendedor}
Cliente: ${data.cliente}
Distrito de Entrega: ${data.distrito_entrega}
Producto: ${data.producto_nombre} (ID: ${data.producto_id})
Cantidad: ${data.cantidad}
Total Venta: S/ ${data.total.toFixed(2)}
Método de Pago: ${data.metodo_pago}
Link de Comprobante: ${voucherUrl || 'Sin comprobante adjunto'}
========================================
`;

    const txtBuffer = Buffer.from(textContent, 'utf-8');
    const txtName = `venta_${safeClient}_${timestamp}.txt`;

    const txtRes = await drive.files.create({
      requestBody: {
        name: txtName,
        parents: [vendorFolderId],
      },
      media: {
        mimeType: 'text/plain',
        body: Readable.from(txtBuffer),
      },
      fields: 'id, webViewLink',
      supportsAllDrives: true,
    });

    if (txtRes.data.id) {
      try {
        await drive.permissions.create({
          fileId: txtRes.data.id,
          requestBody: { role: 'reader', type: 'anyone' },
        });
      } catch {
        // ignore
      }
    }

    const txtUrl = txtRes.data.webViewLink || undefined;

    return { voucherUrl, txtUrl };
  } catch (error) {
    console.error('Error saving sale to Google Drive:', error);
    return {};
  }
}
