import { getServiceClient } from "../../../lib/supabase";

export async function GET(): Promise<Response> {
  let supabaseOk = false;
  try {
    const { error } = await getServiceClient()
      .schema("platform")
      .from("tenants")
      .select("id")
      .limit(1);
    supabaseOk = error === null;
  } catch (e) {
    console.error("health supabase:", e);
    supabaseOk = false;
  }

  const status = supabaseOk ? ("ok" as const) : ("degraded" as const);

  return Response.json({
    status,
    supabase: supabaseOk,
    timestamp: new Date().toISOString(),
    version: process.env.OPSLY_VERSION ?? "0.0.0",
  });
}
