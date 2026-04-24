/**
 * Consistent date utility for VonyPortal.
 *
 * Calendar-date strings (e.g. "2025-03-15") are parsed as local midnight so
 * they never shift across time zones. All "today" calculations use the user's
 * configured timezone (from Settings → General → Timezone).
 *
 * For displaying UTC timestamps (created_at, signed_date…) use formatTZ()
 * from ./timezone.js instead.
 */
import { todayInTZ } from './timezone';

/**
 * Parse a date string or Date into a local-midnight Date.
 * Handles:
 *  - "2025-03-15"            → local Mar 15
 *  - "2025-03-15T00:00:00Z"  → local Mar 15 (strips UTC offset)
 *  - Date objects             → cloned and zeroed to local midnight
 */
export function toLocalDate(input) {
  if (!input) return null;
  if (typeof input === 'string') {
    // If it's a date-only string like "2025-03-15", parse as local
    const dateOnly = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnly) {
      return new Date(
        parseInt(dateOnly[1]),
        parseInt(dateOnly[2]) - 1,
        parseInt(dateOnly[3])
      );
    }
  }
  // For Date objects or full ISO strings, clone and zero to local midnight
  const d = new Date(input);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get today's date at midnight in the user's configured timezone.
 * Delegates to todayInTZ() so the result is always consistent with
 * the user's Settings → General → Timezone preference.
 */
export function getLocalToday() {
  return todayInTZ();
}

/**
 * Calculate the number of whole days between two dates (a - b).
 * Positive = a is in the future relative to b.
 * Both dates are normalised to local midnight first.
 */
export function daysBetween(a, b) {
  const da = toLocalDate(a);
  const db = toLocalDate(b);
  if (!da || !db) return null;
  return Math.round((da - db) / (1000 * 60 * 60 * 24));
}

/**
 * Days until a given date from today.
 * Positive = in the future, negative = overdue, 0 = today.
 */
export function daysUntil(date) {
  return daysBetween(date, getLocalToday());
}