/**
 * Date utility functions for SainiVerse couple memory website
 */

/**
 * Calculates total days together from a start date string (YYYY-MM-DD)
 * @param {string} [startDateStr]
 * @returns {{ days: number, years: number, months: number, formatted: string }}
 */
export function calculateDaysTogether(startDateStr) {
  const envDate = import.meta.env?.VITE_ANNIVERSARY_DATE;
  const targetDateStr = startDateStr || envDate || '2023-09-24';

  let start;
  if (typeof targetDateStr === 'string' && targetDateStr.includes('-')) {
    const [y, m, d] = targetDateStr.split('-').map(Number);
    start = new Date(y, (m || 1) - 1, d || 1);
  } else {
    start = new Date(targetDateStr);
  }
  const now = new Date();

  // If invalid date, fallback gracefully
  if (isNaN(start.getTime())) {
    return { days: 365, years: 1, months: 0, formatted: '365 Days Together' };
  }

  // Normalize to local midnight for exact calendar day counting
  const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = Math.max(0, nowMidnight.getTime() - startMidnight.getTime());
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // Accurate calendar arithmetic for exact years, months, and days
  let years = nowMidnight.getFullYear() - startMidnight.getFullYear();
  let months = nowMidnight.getMonth() - startMidnight.getMonth();
  let remDays = nowMidnight.getDate() - startMidnight.getDate();

  if (remDays < 0) {
    months -= 1;
    const prevMonthDays = new Date(nowMidnight.getFullYear(), nowMidnight.getMonth(), 0).getDate();
    remDays += prevMonthDays;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return {
    days: diffDays,
    years: Math.max(0, years),
    months: Math.max(0, months),
    remainingDays: Math.max(0, remDays),
    formatted: `${diffDays.toLocaleString()} Days Together`,
  };
}

/**
 * Formats a memory date into a romantic, readable string
 * e.g., "Saturday, October 14, 2023"
 * @param {string | number | Date} dateInput
 * @returns {string}
 */
export function formatMemoryDate(dateInput) {
  if (!dateInput) return 'Special Memory';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats month and year for timeline grouping
 * e.g., "October 2024"
 * @param {string | number | Date} dateInput
 * @returns {string}
 */
export function formatTimelinePeriod(dateInput) {
  if (!dateInput) return 'Treasured Moments';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Treasured Moments';

  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Returns a short relative time string (e.g. "Just now", "3 days ago")
 * @param {string | number | Date} dateInput
 * @returns {string}
 */
export function formatRelativeTime(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatMemoryDate(dateInput);
}
