import type { IncomingMessage, ServerResponse } from 'node:http';
import { jsonResponse, errorResponse } from '../router.js';
import { parseBody } from '../router.js';
import { verifyPlatformAdminToken, assertTenantSlugOrThrow } from '../utils.js';
import {
  initializeHiveHandler,
  handleSubmitObjective,
  handleGetObjectiveStatus,
  handleListActiveBots,
  handleGetHiveStats,
  handleShutdownHive,
} from '../../hive/http-handler.js';

export async function handleHiveObjective(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!verifyPlatformAdminToken(req)) {
    return errorResponse(res, 'unauthorized', 401);
  }
  return handleSubmitObjective(req, res);
}

export async function handleHiveInit(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!verifyPlatformAdminToken(req)) {
    return errorResponse(res, 'unauthorized', 401);
  }
  try {
    await initializeHiveHandler();
    return jsonResponse(res, { status: 'hive initialized' });
  } catch (err) {
    return errorResponse(res, String(err), 500);
  }
}

export async function handleHiveShutdown(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!verifyPlatformAdminToken(req)) {
    return errorResponse(res, 'unauthorized', 401);
  }
  return handleShutdownHive(req, res);
}

export async function handleHiveStats(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!verifyPlatformAdminToken(req)) {
    return errorResponse(res, 'unauthorized', 401);
  }
  return handleGetHiveStats(req, res);
}

export async function handleHiveBots(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!verifyPlatformAdminToken(req)) {
    return errorResponse(res, 'unauthorized', 401);
  }
  return handleListActiveBots(req, res);
}

export async function handleHiveObjectiveStatus(
  req: IncomingMessage,
  res: ServerResponse,
  taskId: string
): Promise<void> {
  if (!verifyPlatformAdminToken(req)) {
    return errorResponse(res, 'unauthorized', 401);
  }
  return handleGetObjectiveStatus(req, res, taskId);
}