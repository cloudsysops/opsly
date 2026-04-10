import { createServerSupabase } from "./supabase/server";

/**
 * Obtiene el access token de la sesión Supabase activa (Server Side).
 * Retorna null si no hay sesión o si Supabase no está configurado.
 * Nunca lanza — los errores se registran y se retorna null para que
 * el caller decida si continuar sin token (modo demo) o rechazar la petición.
 */
export async function getServerAuthToken(): Promise<string | null> {
  try {
    const supabase = await createServerSupabase();
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
