import { createServerClient } from "@supabase/ssr";

/**
 * Obtiene el access token de la sesión Supabase activa (Server Side).
 * Retorna null si no hay sesión o si Supabase no está configurado.
 * Nunca lanza — los errores se registran y se retorna null para que
 * el caller decida si continuar sin token (modo demo) o rechazar la petición.
 */
export async function getServerAuthToken(): Promise<string | null> {
  try {
    const cookieStore = await import("next/headers").then((m) => m.cookies());
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setAll(cookiesToSet: any) {
            try {
              cookiesToSet.forEach(({ name, value, options }: any) =>
                cookieStore.set(name, value, options),
              );
            } catch {
              // Ignore cookie set errors in client-components
            }
          },
        },
      },
    );
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn("[session-auth] Error al obtener sesión:", error.message);
      return null;
    }
    return data.session?.access_token ?? null;
  } catch (err) {
    console.warn("[session-auth] Supabase no disponible:", err);
    return null;
  }
}
