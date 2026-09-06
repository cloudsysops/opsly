/**
 * Next.js startup hook (runs once per server process, before any request).
 *
 * This is where the Peskids environment boundary is enforced: if the process is
 * configured as staging but is pointed at the production Supabase project (or
 * the reverse), the server refuses to start instead of quietly serving real
 * customer data from the wrong deployment.
 *
 * Deliberately NOT skippable by an env var — an escape hatch here would defeat
 * the whole control. The only exemption is `next build`, which imports this
 * module while collecting page data and has no runtime secrets available.
 */

export async function register(): Promise<void> {
  // Edge runtime has no server lifecycle to protect and no service-role access.
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  // `next build` sets this phase; runtime secrets are not present then.
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }

  const { checkEnvironmentBoundary } = await import('./lib/runtime-environment');
  const result = checkEnvironmentBoundary(process.env);

  if (!result.ok) {
    // One structured line so the failure is greppable in container logs.
    console.error(
      JSON.stringify({
        component: 'peskids.startup',
        event: 'environment_boundary_failed',
        environment: result.environment,
        supabase_project_ref: result.supabaseProjectRef,
        violations: result.violations.map((violation) => violation.code),
      })
    );
    for (const violation of result.violations) {
      console.error(`[peskids.startup] ${violation.code}: ${violation.message}`);
    }
    throw new Error(
      `Peskids refused to start: environment boundary violated (${result.violations
        .map((violation) => violation.code)
        .join(', ')})`
    );
  }

  console.info(
    JSON.stringify({
      component: 'peskids.startup',
      event: 'environment_boundary_ok',
      environment: result.environment,
      supabase_project_ref: result.supabaseProjectRef,
    })
  );
}
