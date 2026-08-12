import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

let cachedDoc: GoogleSpreadsheet | null = null;

export async function getDoc() {
  if (cachedDoc) {
    return cachedDoc;
  }

  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  });

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
  await doc.loadInfo(); 
  
  cachedDoc = doc;
  return doc;
}

export async function getInventorySheet() {
  const doc = await getDoc();
  return doc.sheetsByIndex[0];
}

export async function getSalesSheet() {
  const doc = await getDoc();
  return doc.sheetsByIndex[1];
}
