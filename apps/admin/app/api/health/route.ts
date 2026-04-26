export async function GET(): Promise<Response> {
  const timestamp = new Date().toISOString();

  return Response.json(
    {
      status: 'ok',
      app: 'admin',
      timestamp,
      version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
    },
    { status: 200 }
  );
}
