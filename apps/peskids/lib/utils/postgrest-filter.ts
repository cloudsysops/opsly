/**
 * Escape a value for safe interpolation into a PostgREST filter string
 * (Supabase `.or()`, `.filter()`), where `,` `.` `(` `)` are syntactically
 * meaningful (condition separators, operator delimiters, grouping).
 *
 * PostgREST's documented escape hatch is to wrap the value in double quotes;
 * within a quoted value, only `"` and `\` need escaping. This keeps `%`
 * wildcards for ilike patterns working unchanged.
 */
export function pgFilterValue(value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `"${escaped}"`
}
