function parseErrorMessage(data: unknown): string {
  if (
    data !== null &&
    typeof data === 'object' &&
    'error' in data &&
    typeof (data as { error: unknown }).error === 'string'
  ) {
    return (data as { error: string }).error;
  }
  return 'Request failed';
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error('Invalid JSON response');
  }
}

export async function requestPortalApi<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init);
  const data = await parseJson(res);

  if (!res.ok) {
    throw new Error(parseErrorMessage(data));
  }

  return data as T;
}
