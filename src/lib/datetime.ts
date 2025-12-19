import { format } from "date-fns";

/**
 * Parses timestamps returned from the backend.
 *
 * Some endpoints return values like `2025-12-20 10:10:00+00` (note the space instead of `T`).
 * iOS Safari is strict and can treat these as invalid dates, causing blank screens.
 */
export function parseDbTimestamp(value?: string | null): Date | null {
  if (!value) return null;

  let v = value.trim();

  // Normalize "YYYY-MM-DD HH:mm:ss+00" -> "YYYY-MM-DDTHH:mm:ss+00"
  if (v.includes(" ") && !v.includes("T")) {
    v = v.replace(" ", "T");
  }

  // Normalize timezone offsets like "+00" / "-03" -> "+00:00" / "-03:00"
  if (/([+-]\d{2})$/.test(v)) {
    v = v.replace(/([+-]\d{2})$/, "$1:00");
  }

  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function formatDbDate(
  value: string | null | undefined,
  pattern: string,
  options?: Parameters<typeof format>[2]
): string {
  const d = parseDbTimestamp(value);
  if (!d) return "—";

  try {
    return format(d, pattern, options);
  } catch {
    return "—";
  }
}
