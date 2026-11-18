/** Escape a value for a CSV cell and neutralize spreadsheet formulas (=, +, -, @, tab, CR). */
export function csvCell(value: unknown, sep = ';'): string {
  let s = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) s = `'${s}`;
  if (s.includes('"') || s.includes(sep) || s.includes('\n') || s.includes('\r')) {
    s = `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
export const csvRow = (cells: unknown[], sep = ';') => cells.map((c) => csvCell(c, sep)).join(sep);
