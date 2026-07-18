type RequestCookie = { name: string; value: string };

const AUTH_COOKIE_PATTERN = /^sb-.+-auth-token(?:\.(\d+))?$/;

function authCookieValue(requestCookies: RequestCookie[]): string {
  const matching = requestCookies
    .map((cookie) => {
      const match = cookie.name.match(AUTH_COOKIE_PATTERN);
      if (!match) return null;
      return {
        chunk: match[1] === undefined ? -1 : Number(match[1]),
        value: cookie.value,
      };
    })
    .filter((cookie): cookie is { chunk: number; value: string } => cookie !== null);

  const unchunked = matching.find((cookie) => cookie.chunk === -1);
  if (unchunked) return unchunked.value.trim();

  return matching
    .filter((cookie) => Number.isInteger(cookie.chunk) && cookie.chunk >= 0)
    .sort((left, right) => left.chunk - right.chunk)
    .map((cookie) => cookie.value)
    .join('')
    .trim();
}

export function extractSupabaseAccessTokenFromCookies(requestCookies: RequestCookie[]): string {
  const raw = authCookieValue(requestCookies);
  if (!raw) return '';

  const encoded = raw.startsWith('base64-') ? raw.slice('base64-'.length) : raw;

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as {
      access_token?: unknown;
    };
    return typeof parsed.access_token === 'string' ? parsed.access_token.trim() : '';
  } catch {
    return '';
  }
}
