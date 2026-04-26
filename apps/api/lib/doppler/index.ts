export function isDopplerConfigured(): boolean {
  return Boolean(
    process.env.DOPPLER_PROJECT?.length ||
    process.env.DOPPLER_ENVIRONMENT?.length ||
    process.env.DOPPLER_CONFIG?.length
  );
}
