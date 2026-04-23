/**
 * UTC-safe date/datetime formatters.
 * Using UTC methods ensures identical output on the Node.js server and the browser,
 * preventing React hydration mismatches caused by timezone differences.
 */

export function fmtDate(d?: string | Date | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  const day = String(dt.getUTCDate()).padStart(2, "0");
  const mon = String(dt.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${mon}/${dt.getUTCFullYear()}`;
}

export function fmtDateTime(d?: string | Date | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  const day = String(dt.getUTCDate()).padStart(2, "0");
  const mon = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const hr = String(dt.getUTCHours()).padStart(2, "0");
  const min = String(dt.getUTCMinutes()).padStart(2, "0");
  return `${day}/${mon}/${dt.getUTCFullYear()}, ${hr}:${min}`;
}
