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

export const DRIVE_STAGE_TTL_HOURS = 48;

function driveClient(env) {
  const auth = new google.auth.GoogleAuth({ credentials: loadCredentials(env), scopes: ['https://www.googleapis.com/auth/drive'] });
  return google.drive({ version: 'v3', auth });
}

/**
 * Borra de la carpeta de staging los clips con mas de `ttlHours` horas. Solo toca esa carpeta
 * (nunca la crea) y solo archivos creados por la cuenta de servicio; los enlaces publicos dejan de funcionar.
 * @returns {Promise<{ checked: number, deleted: string[], errors: string[] }>}
 */
export async function sweepDriveStaging({ env = process.env, drive, nowMs = Date.now(), ttlHours = DRIVE_STAGE_TTL_HOURS, dry = false } = {}) {
  const ready = driveStageReady(env);
  if (!ready.ok) return { checked: 0, deleted: [], errors: [], skipped: `faltan ${ready.missing.join(', ')}` };
  const api = drive ?? driveClient(env);
  const rootId = String(env.OPSLY_DRIVE_ROOT_FOLDER_ID).trim();
  const explicit = String(env.MAKE_OPSAFTERDARK_DRIVE_FOLDER_ID ?? '').trim();
  let folderId = explicit;
  if (!folderId) {
    const found = await api.files.list({
      q: `name='${FOLDER_NAME}' and '${rootId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)', pageSize: 5, supportsAllDrives: true, includeItemsFromAllDrives: true,
    });
    folderId = found.data.files?.[0]?.id;
  }
  if (!folderId) return { checked: 0, deleted: [], errors: [] };
  const cutoff = new Date(nowMs - ttlHours * 3600_000).toISOString();
  const list = await api.files.list({
    q: `'${folderId}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder' and createdTime < '${cutoff}'`,
    fields: 'files(id,name,createdTime)', pageSize: 100, supportsAllDrives: true, includeItemsFromAllDrives: true,
  });
  const files = list.data.files ?? [];
  const deleted = []; const errors = [];
  for (const f of files) {
    if (dry) { deleted.push(f.id); continue; }
    try { await api.files.delete({ fileId: f.id, supportsAllDrives: true }); deleted.push(f.id); }
    catch (e) { errors.push(`${f.id}: ${String(e.message).slice(0, 120)}`); }
  }
  return { checked: files.length, deleted, errors };
}
