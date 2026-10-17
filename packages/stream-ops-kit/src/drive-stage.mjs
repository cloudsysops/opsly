// Staging temporal de clips OpsAfterDark en Google Drive.
// Sube el mp4, comparte "anyone with link" y devuelve URL de descarga.
// Auth: preferir GOOGLE_USER_CREDENTIALS_JSON (cuota My Drive del usuario);
// si solo hay service account, la carpeta raiz DEBE ser Shared Drive (cuota SA = 0).
import fs from 'node:fs';
import path from 'node:path';
import { google } from 'googleapis';

export const DRIVE_STAGE_TTL_HOURS = 48;
const FOLDER_NAME = 'OpsAfterDark-PostStream';

/** Nombres que el publicador/Doppler deben exportar (credencial = user OAuth o SA). */
export const DRIVE_STAGE_REQUIRED = [
  'OPSLY_DRIVE_ROOT_FOLDER_ID',
  'GOOGLE_SERVICE_ACCOUNT_JSON|GOOGLE_USER_CREDENTIALS_JSON',
];

function hasCred(env) {
  return Boolean(
    String(env.GOOGLE_USER_CREDENTIALS_JSON ?? '').trim()
    || String(env.GOOGLE_SERVICE_ACCOUNT_JSON ?? '').trim(),
  );
}

export function driveStageReady(env = process.env) {
  const miss = [];
  if (!String(env.OPSLY_DRIVE_ROOT_FOLDER_ID ?? '').trim()) miss.push('OPSLY_DRIVE_ROOT_FOLDER_ID');
  if (!hasCred(env)) miss.push('GOOGLE_USER_CREDENTIALS_JSON|GOOGLE_SERVICE_ACCOUNT_JSON');
  return miss.length ? { ok: false, missing: miss } : { ok: true };
}

function parseJson(raw, label) {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** @returns {{ kind: 'user'|'sa', authClient: object }} */
function buildAuth(env) {
  const userRaw = String(env.GOOGLE_USER_CREDENTIALS_JSON ?? '').trim();
  if (userRaw) {
    const creds = parseJson(userRaw, 'GOOGLE_USER_CREDENTIALS_JSON');
    const clientId = String(creds.client_id ?? '').trim();
    const clientSecret = String(creds.client_secret ?? '').trim();
    const refreshToken = String(creds.refresh_token ?? '').trim();
    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('GOOGLE_USER_CREDENTIALS_JSON needs client_id, client_secret, refresh_token');
    }
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refreshToken });
    return { kind: 'user', authClient: oauth2 };
  }
  const saRaw = String(env.GOOGLE_SERVICE_ACCOUNT_JSON ?? '').trim();
  if (!saRaw) {
    throw new Error('Drive staging: set GOOGLE_USER_CREDENTIALS_JSON or GOOGLE_SERVICE_ACCOUNT_JSON');
  }
  const creds = parseJson(saRaw, 'GOOGLE_SERVICE_ACCOUNT_JSON');
  if (creds.type !== 'service_account') {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON must be a service_account');
  }
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  return { kind: 'sa', authClient: auth };
}

async function driveClient(env) {
  const { kind, authClient } = buildAuth(env);
  const drive = google.drive({ version: 'v3', auth: authClient });
  return { kind, drive };
}

/**
 * SA no tiene cuota en My Drive. Solo Shared Drive (driveId) o OAuth usuario.
 */
export async function assertStagingRootWritable(drive, rootId, authKind) {
  const meta = await drive.files.get({
    fileId: rootId,
    fields: 'id,name,driveId,mimeType',
    supportsAllDrives: true,
  });
  if (authKind === 'sa' && !meta.data.driveId) {
    throw new Error(
      'Drive staging: OPSLY_DRIVE_ROOT_FOLDER_ID is My Drive; service accounts have 0 storage quota. '
        + 'Put staging under a Shared Drive (add the SA as Content manager) and set OPSLY_DRIVE_ROOT_FOLDER_ID '
        + '(or MAKE_OPSAFTERDARK_DRIVE_FOLDER_ID), or set GOOGLE_USER_CREDENTIALS_JSON for user-quota uploads.',
    );
  }
  return meta.data;
}

async function ensurePostStreamFolder(drive, rootId, folderIdFromEnv) {
  if (folderIdFromEnv) return folderIdFromEnv;
  const q = [
    `name='${FOLDER_NAME}'`,
    `'${rootId}' in parents`,
    "mimeType='application/vnd.google-apps.folder'",
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
 * @param {{ filePath: string, fileName?: string, env?: NodeJS.ProcessEnv, drive?: object, authKind?: 'user'|'sa' }} opts
 */
export async function stageVideoToDrive({ filePath, fileName, env = process.env, drive, authKind } = {}) {
  const ready = driveStageReady(env);
  if (!ready.ok) throw new Error(`Drive staging missing: ${ready.missing.join(', ')}`);
  if (!fs.existsSync(filePath)) throw new Error(`file missing: ${filePath}`);

  const name = fileName || path.basename(filePath);
  let driveApi = drive;
  let kind = authKind;
  if (!driveApi) {
    const built = await driveClient(env);
    driveApi = built.drive;
    kind = built.kind;
  } else if (!kind) {
    kind = String(env.GOOGLE_USER_CREDENTIALS_JSON ?? '').trim() ? 'user' : 'sa';
  }

  const rootId = String(env.OPSLY_DRIVE_ROOT_FOLDER_ID).trim();
  await assertStagingRootWritable(driveApi, rootId, kind);

  const folderId = await ensurePostStreamFolder(
    driveApi,
    rootId,
    String(env.MAKE_OPSAFTERDARK_DRIVE_FOLDER_ID ?? '').trim() || undefined,
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

  const publicUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  return {
    fileId,
    publicUrl,
    webViewLink: created.data.webViewLink ?? null,
    folderId,
    authKind: kind,
  };
}

/**
 * Borra de la carpeta de staging los clips con mas de `ttlHours` horas.
 * Solo toca esa carpeta (nunca la crea). Fallos no lanzan.
 */
export async function sweepDriveStaging({
  env = process.env,
  drive,
  nowMs = Date.now(),
  ttlHours = DRIVE_STAGE_TTL_HOURS,
  dry = false,
} = {}) {
  const ready = driveStageReady(env);
  if (!ready.ok) {
    return { checked: 0, deleted: [], errors: [], skipped: `faltan ${ready.missing.join(', ')}` };
  }
  const api = drive ?? (await driveClient(env)).drive;
  const rootId = String(env.OPSLY_DRIVE_ROOT_FOLDER_ID).trim();
  const explicit = String(env.MAKE_OPSAFTERDARK_DRIVE_FOLDER_ID ?? '').trim();
  let folderId = explicit;
  if (!folderId) {
    const found = await api.files.list({
      q: `name='${FOLDER_NAME}' and '${rootId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
      pageSize: 5,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    folderId = found.data.files?.[0]?.id;
  }
  if (!folderId) return { checked: 0, deleted: [], errors: [] };
  const cutoff = new Date(nowMs - ttlHours * 3600_000).toISOString();
  const list = await api.files.list({
    q: `'${folderId}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder' and createdTime < '${cutoff}'`,
    fields: 'files(id,name,createdTime)',
    pageSize: 100,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  const files = list.data.files ?? [];
  const deleted = [];
  const errors = [];
  for (const f of files) {
    if (dry) {
      deleted.push(f.id);
      continue;
    }
    try {
      await api.files.delete({ fileId: f.id, supportsAllDrives: true });
      deleted.push(f.id);
    } catch (e) {
      errors.push(`${f.id}: ${String(e.message).slice(0, 120)}`);
    }
  }
  return { checked: files.length, deleted, errors };
}
