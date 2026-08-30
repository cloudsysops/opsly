export function generateCSV(
  rows: Record<string, any>[],
  columns: string[]
): string {
  if (rows.length === 0) {
    return columns.map((col) => escapeCSV(formatColumnHeader(col))).join(",") + "\n";
  }

  // Header row - format column names as Title Case
  const header = columns
    .map((col) => formatColumnHeader(col))
    .map((h) => escapeCSV(h))
    .join(",");

  // Data rows
  const dataRows = rows.map((row) =>
    columns
      .map((col) => {
        const value = row[col];
        return escapeCSV(formatValue(value));
      })
      .join(",")
  );

  return [header, ...dataRows].join("\n");
}

function formatColumnHeader(col: string): string {
  return col
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    // Format currency-like values with decimals
    if (Number.isFinite(value) && !Number.isInteger(value)) {
      return value.toFixed(2);
    }
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }
  return String(value);
}

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
