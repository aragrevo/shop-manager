import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TZDate } from "@date-fns/tz";

const DEFAULT_TIMEZONE = "Europe/Madrid";

export type DateInput = Date | number | string;

export function toZonedDate(
  value: DateInput,
  timeZone: string = DEFAULT_TIMEZONE,
): TZDate {
  const date = value instanceof Date ? value : new Date(value);
  return new TZDate(date, timeZone);
}

export function formatDate(
  value: DateInput,
  timeZone: string = DEFAULT_TIMEZONE,
  pattern = "d MMM yyyy",
): string {
  return format(toZonedDate(value, timeZone), pattern, { locale: es });
}

export function formatDateTime(
  value: DateInput,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  return formatDate(value, timeZone, "d MMM yyyy, HH:mm");
}

export function formatMonth(
  value: DateInput,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  return formatDate(value, timeZone, "LLL yyyy");
}
