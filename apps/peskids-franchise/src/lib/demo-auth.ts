export function isFranchiseDemoAuthEnabled(
  input: {
    nodeEnv?: string;
    configured?: string;
  } = {}
): boolean {
  const nodeEnv = input.nodeEnv ?? process.env.NODE_ENV;
  const configured = input.configured ?? process.env.FRANCHISE_DEMO_AUTH_ENABLED;
  return nodeEnv !== 'production' && configured === 'true';
}
