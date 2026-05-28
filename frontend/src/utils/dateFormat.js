/**
 * Shared date formatting utilities.
 * Ensures consistent AM/PM uppercase format across all pages,
 * regardless of browser/OS locale differences (Windows often renders lowercase am/pm).
 */

// Format date with time in 12-hour format with uppercase AM/PM
// e.g., "26 May 2026, 02:30 PM"
export function formatDateTime(dateString) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase())
}

// Shorter format for mobile views
// e.g., "26 May, 02:30 PM"
export function formatDateTimeShort(dateString) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase())
}

// Full format with long month name
// e.g., "26 May 2026, 02:30 PM"
export function formatDateTimeFull(dateString) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase())
}