/**
 * Money utilities. Single strategy across the app: amounts are stored and
 * passed around as INTEGER minor units (cents). 12.50 EUR -> 1250.
 * Never use floating point for money in persistence or arithmetic.
 */

const DEFAULT_LOCALE = "es-ES";
const DEFAULT_CURRENCY = "EUR";

export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

export function fromMinorUnits(minor: number): number {
  return minor / 100;
}

/**
 * Parses a user-entered amount into integer minor units (cents).
 * Accepts "12,50", "12.50", "1.234,56", "1,234.56", "12".
 * Returns null when the input is not a valid non-negative amount.
 */
export function parseMoney(input: string): number | null {
  const raw = input.trim();
  if (raw.length === 0) return null;

  const cleaned = raw.replace(/[^\d.,-]/g, "");
  if (cleaned.length === 0) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const decimalSeparator =
    lastComma > lastDot ? "," : lastDot > -1 ? "." : null;

  let normalized = cleaned;
  if (decimalSeparator) {
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    normalized = cleaned.split(thousandsSeparator).join("");
    normalized = normalized.replace(decimalSeparator, ".");
  } else {
    normalized = cleaned.replace(/[.,]/g, "");
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;

  return Math.round(value * 100);
}

export function formatCurrency(
  minorUnits: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(fromMinorUnits(minorUnits));
}
