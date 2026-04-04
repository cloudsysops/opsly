function tenantsBaseDir(): string {
  const dir = process.env.PLATFORM_TENANTS_DIR;
  if (!dir || dir.length === 0) {
    throw new Error("PLATFORM_TENANTS_DIR must be set for Docker tenant paths");
  }
  return dir;
}

export function getTenantsBaseDir(): string {
  return tenantsBaseDir();
}
