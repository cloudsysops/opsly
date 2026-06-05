/** peskids → PESKIDS, panini-lab → PANINI_LAB */
export function slugToEnvPrefix(slug: string): string {
  return slug.toUpperCase().replace(/-/g, '_');
}
