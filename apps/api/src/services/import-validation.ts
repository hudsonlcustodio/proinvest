import { Decimal } from "decimal.js";

export function validateImportRow(row: Record<string, string>): string[] {
  const issues: string[] = [];
  for (const key of ["symbol", "side", "quantity", "entry_price", "currency", "opened_at"])
    if (!row[key]) issues.push(`MISSING_${key.toUpperCase()}`);
  if (row.side && row.side !== "BUY") issues.push("UNSUPPORTED_SIDE");
  for (const key of ["quantity", "entry_price"]) {
    if (!row[key]) continue;
    try {
      const value = new Decimal(row[key]!);
      if (!value.isFinite() || (key === "quantity" ? value.lte(0) : value.lt(0)) || value.decimalPlaces() > 18 || value.precision() > 38)
        issues.push(`INVALID_${key.toUpperCase()}`);
    } catch { issues.push(`INVALID_${key.toUpperCase()}`); }
  }
  if (row.currency && !/^[A-Z]{3,12}$/.test(row.currency.toUpperCase())) issues.push("INVALID_CURRENCY");
  if (row.opened_at) {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-])(\d{2}):(\d{2}))$/.exec(row.opened_at);
    const [year, month, day, hour, minute, second, offsetHour, offsetMinute] = match
      ? [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6]), Number(match[8] ?? 0), Number(match[9] ?? 0)]
      : [];
    const monthDays = year && month ? new Date(Date.UTC(year, month, 0)).getUTCDate() : 0;
    if (!match || !year || !month || month > 12 || !day || day > monthDays || hour! > 23 || minute! > 59 || second! > 59 ||
      offsetHour! > 23 || offsetMinute! > 59 || Number.isNaN(Date.parse(row.opened_at))) issues.push("INVALID_OPENED_AT");
  }
  return [...new Set(issues)];
}
