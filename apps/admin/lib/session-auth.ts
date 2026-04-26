import { createBrowserClient, createServerClient, type SetAllCookies } from '@supabase/ssr';

function readPublicSupabaseConfig(): { url: string; anon: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    return null;
  }
  return { url, anon };
}

async function getBrowserAuthToken(): Promise<string | null> {
  try {
    const config = readPublicSupabaseConfig();
    if (config === null) {
      return null;
    }
    const supabase = createBrowserClient(config.url, config.anon);
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('[session-auth] Error al obtener sesión browser:', error.message);
      return null;
    }
    return data.session?.access_token ?? null;
  } catch (err) {
    console.warn('[session-auth] Browser Supabase no disponible:', err);
    return null;
  }
}

/**
 * Obtiene el access token de la sesión Supabase activa (Server Side).
 * Retorna null si no hay sesión o si Supabase no está configurado.
 * Nunca lanza — los errores se registran y se retorna null para que
 * el caller decida si continuar sin token (modo demo) o rechazar la petición.
 */
async function getServerAuthToken(): Promise<string | null> {
  try {
    const config = readPublicSupabaseConfig();
    if (config === null) {
      return null;
    }
    const cookieStore = await import('next/headers').then((m) => m.cookies());
    const supabase = createServerClient(config.url, config.anon, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Ignore cookie set errors in client-components
          }
        },
      },
    });
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('[session-auth] Error al obtener sesión:', error.message);
      return null;
    }
    return data.session?.access_token ?? null;
  } catch (err) {
    console.warn('[session-auth] Supabase no disponible:', err);
    return null;
  }
}

export async function getSessionAuthToken(): Promise<string | null> {
  if (typeof window !== 'undefined') {
    return getBrowserAuthToken();
  }
  return getServerAuthToken();
}
