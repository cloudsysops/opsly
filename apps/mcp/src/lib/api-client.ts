import { HTTP_TIMEOUT_MS, OPSLY_API_URL } from './constants.js';

const ADMIN_TOKEN = process.env.PLATFORM_ADMIN_TOKEN || '';

export async function opslyFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  const url = `${OPSLY_API_URL}${path}`;

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
        'x-admin-token': ADMIN_TOKEN,
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Opsly API ${response.status}: ${errorBody}`);
    }

    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timeout);
  }
}
