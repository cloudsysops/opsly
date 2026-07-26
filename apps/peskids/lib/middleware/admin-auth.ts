export async function validateAdminJWT(request: Request): Promise<{
  isAdmin: boolean;
  tenantId?: string;
  error?: string;
}> {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return { isAdmin: false, error: 'Missing authorization header' };
    }

    const token = authHeader.slice(7);

    // TODO: Integrate with your actual JWT validation
    // For now, check if token exists and is not empty
    if (!token || token.length < 20) {
      return { isAdmin: false, error: 'Invalid token' };
    }

    // Placeholder: In production, validate JWT signature and claims
    // Example: const decoded = await verifyJWT(token);
    // const isAdmin = decoded.claims.role === 'admin';

    return { isAdmin: true };
  } catch (error) {
    return { isAdmin: false, error: String(error) };
  }
}
