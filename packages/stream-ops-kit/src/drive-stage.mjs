// Staging temporal de clips OpsAfterDark en Google Drive (service account).
// Crea/usa carpeta "OpsAfterDark-PostStream" bajo OPSLY_DRIVE_ROOT_FOLDER_ID,
// sube el mp4, comparte "anyone with link" y devuelve una URL de descarga.
import fs from 'node:fs';
import path from 'node:path';
import { google } from 'googleapis';

export const DRIVE_STAGE_REQUIRED = ['GOOGLE_SERVICE_ACCOUNT_JSON', 'OPSLY_DRIVE_ROOT_FOLDER_ID'];
const FOLDER_NAME = 'OpsAfterDark-PostStream';

function loadCredentials(env) {
  const raw = String(env.GOOGLE_SERVICE_ACCOUNT_JSON ?? '').trim();
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON missing');
  const creds = JSON.parse(raw);
  if (creds.type !== 'service_account') throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON must be a service_account');
  return creds;
}

export function driveStageReady(env = process.env) {
  const miss = DRIVE_STAGE_REQUIRED.filter((n) => !String(env[n] ?? '').trim());
  return miss.length ? { ok: false, missing: miss } : { ok: true };
}

async function ensurePostStreamFolder(drive, rootId, folderIdFromEnv) {
  if (folderIdFromEnv) return folderIdFromEnv;
  const q = [
    `name='${FOLDER_NAME}'`,
    `'${rootId}' in parents`,
    'mimeType=\'application/vnd.google-apps.folder\'',
    'trashed=false',
  ].join(' and ');
  const found = await drive.files.list({
    q,
    fields: 'files(id,name)',
    pageSize: 5,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  if (found.data.files?.[0]?.id) return found.data.files[0].id;
  const created = await drive.files.create({
    requestBody: {
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });
  return created.data.id;
}

/**
 * @param {{ filePath: string, fileName?: string, env?: NodeJS.ProcessEnv, drive?: any }} opts
 * @returns {Promise<{ fileId: string, publicUrl: string, webViewLink: string|null, folderId: string }>}
 */
export async function stageVideoToDrive({ filePath, fileName, env = process.env, drive }) {
  const ready = driveStageReady(env);
  if (!ready.ok) throw new Error(`Drive staging missing: ${ready.missing.join(', ')}`);
  if (!fs.existsSync(filePath)) throw new Error(`file missing: ${filePath}`);

  const name = fileName || path.basename(filePath);
  let driveApi = drive;
  if (!driveApi) {
    const auth = new google.auth.GoogleAuth({
      credentials: loadCredentials(env),
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    driveApi = google.drive({ version: 'v3', auth });
  }

  const rootId = String(env.OPSLY_DRIVE_ROOT_FOLDER_ID).trim();
  const folderId = await ensurePostStreamFolder(
    driveApi,
    rootId,
    String(env.MAKE_OPSAFTERDARK_DRIVE_FOLDER_ID ?? '').trim() || undefined
  );

  const created = await driveApi.files.create({
    requestBody: { name, parents: [folderId] },
    media: { mimeType: 'video/mp4', body: fs.createReadStream(filePath) },
    fields: 'id, webViewLink, webContentLink',
    supportsAllDrives: true,
  });
  const fileId = created.data.id;
  if (!fileId) throw new Error('Drive upload returned no file id');

  await driveApi.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
    supportsAllDrives: true,
  });

  // Make / Meta need an HTTPS URL. uc?export=download works for many sizes;
  // large files may hit Drive's interstitial — documented limitation.
  const publicUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  return {
    fileId,
    publicUrl,
    webViewLink: created.data.webViewLink ?? null,
    folderId,
  };
}
