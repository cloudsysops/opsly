import { execa } from 'execa';

import { CACHE_TTL } from './constants';
import { getCache, setCache } from './redis-cache';

const DOCKER_CMD_TIMEOUT_MS = 2000;
const CACHE_KEY_COUNT = 'docker:running_count';

/**
 * Cuenta contenedores en ejecución vía CLI `docker` (socket montado en el contenedor API).
 * Devuelve null si docker no está disponible o falla el comando.
 */
export async function countRunningDockerContainers(): Promise<number | null> {
  // Bolt Optimization: check cache first to avoid expensive CLI call (~1.1s)
  const cached = await getCache<number>(CACHE_KEY_COUNT);
  if (cached !== null) {
    return cached;
  }

  try {
    const result = await execa('docker', ['ps', '-q'], {
      reject: false,
      timeout: DOCKER_CMD_TIMEOUT_MS,
    });
    if (result.exitCode !== 0 || typeof result.stdout !== 'string') {
      return null;
    }
    const lines = result.stdout
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);
    const count = lines.length;

    // Background cache set to avoid blocking
    void setCache(CACHE_KEY_COUNT, count, CACHE_TTL.SHORT);

    return count;
  } catch {
    return null;
  }
}
