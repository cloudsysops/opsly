import { execa } from 'execa';
import { getCache, setCache } from './redis-cache';
import { CACHE_TTL } from './constants';

const CACHE_KEY = 'docker:running_count';

/**
 * Cuenta contenedores en ejecución vía CLI `docker` (socket montado en el contenedor API).
 * Devuelve null si docker no está disponible o falla el comando.
 *
 * Optimización Bolt: Cacheado en Redis (60s) para evitar shell-outs constantes al socket de Docker.
 */
export async function countRunningDockerContainers(): Promise<number | null> {
  const cached = await getCache<number>(CACHE_KEY);
  if (cached !== null) {
    return cached;
  }

  try {
    const result = await execa('docker', ['ps', '-q'], {
      reject: false,
    });
    if (result.exitCode !== 0 || typeof result.stdout !== 'string') {
      return null;
    }
    const lines = result.stdout
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);
    const count = lines.length;

    // Cacheamos el resultado para evitar saturar el socket de Docker en peticiones frecuentes
    await setCache(CACHE_KEY, count, CACHE_TTL.SHORT);

    return count;
  } catch {
    return null;
  }
}
