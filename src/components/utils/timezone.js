/**
 * timezone.js — User-timezone-aware date utilities for VonyPortal.
 *
 * Strategy
 * ────────
 * • Everything stored in Supabase is either:
 *     a) A calendar-date string  "YYYY-MM-DD"  (loan dates, payment dates)
 *     b) A UTC timestamp string  "…T…Z"        (created_at, signed_date, etc.)
 *
 * • Calendar dates are timezone-agnostic — "Apr 8" means Apr 8 for every user.
 *   Use  toLocalDate()  from dateUtils.js  +  format()  from date-fns.
 *
 * • UTC timestamps must be converted to the user's configured timezone before
 *   display. Use  formatTZ()  from this file.
 *
 * • "Today" in calculations should reflect the user's timezone, not the
 *   browser's. Use  todayInTZ()  from this file.
 */

import { formatInTimeZone } from 'date-fns-tz';
import { format } from 'date-fns';

// ─── Retrieve user's chosen timezone ───────────────────────────────────────
export function getUserTimezone() {
  try {
    const auto = localStorage.getItem('vony.tz.auto');
    const isAuto = auto === null ? true : auto === 'true';
    if (isAuto) {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    }
    return (
      localStorage.getItem('vony.tz.value') ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      'UTC'
    );
  } catch {
    return 'UTC';
  }
}

// ─── "Today" as a plain midnight Date in the user's timezone ────────────────
// Returns a Date whose year/month/day matches today in the user's TZ.
// This is consistent with toLocalDate() — both return local-midnight Dates.
export function todayInTZ() {
  const tz = getUserTimezone();
  try {
    const dateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()); // gives "YYYY-MM-DD"
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  } catch {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }
}

// ─── Today as "YYYY-MM-DD" string in user's timezone ────────────────────────
// Use this wherever a date-input default or a stored payment_date needs today.
export function currentDateStringTZ() {
  const tz = getUserTimezone();
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()); // en-CA locale always gives "YYYY-MM-DD"
  } catch {
    return format(new Date(), 'yyyy-MM-dd');
  }
}

// ─── Format a UTC timestamp in the user's timezone ───────────────────────────
// Use this for fields that contain full ISO timestamps (created_at, signed_date…).
// Do NOT use this for calendar-date strings ("YYYY-MM-DD") — those are already
// timezone-agnostic and should be handled with toLocalDate() + format().
export function formatTZ(input, fmt) {
  if (!input) return '';
  try {
    const tz = getUserTimezone();
    return formatInTimeZone(new Date(input), tz, fmt);
  } catch {
    try { return format(new Date(input), fmt); }
    catch { return ''; }
  }
}
