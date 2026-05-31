/**
 * Shared date formatting utilities.
 * All dates use DD/MM/YYYY format consistently across the application.
 * Time uses 12-hour format with uppercase AM/PM, regardless of browser/OS locale.
 */

// Format date only as DD/MM/YYYY
// e.g., "26/05/2026"
export function formatDate(dateString) {
  if (!dateString) return 'N/A'
  const d = new Date(dateString)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

// Format time only as HH:MM AM/PM
// e.g., "02:30 PM"
export function formatTime(dateString) {
  if (!dateString) return 'N/A'
  const d = new Date(dateString)
  let hours = d.getHours()
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const period = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${String(hours).padStart(2, '0')}:${minutes} ${period}`
}

// Format date with time in 12-hour format
// e.g., "26/05/2026, 02:30 PM"
export function formatDateTime(dateString) {
  if (!dateString) return 'N/A'
  return `${formatDate(dateString)}, ${formatTime(dateString)}`
}

// Shorter format with date and time (same as formatDateTime for DD/MM/YYYY)
// e.g., "26/05/2026, 02:30 PM"
export function formatDateTimeShort(dateString) {
  if (!dateString) return '-'
  return `${formatDate(dateString)}, ${formatTime(dateString)}`
}

// Full format with long month name — still DD/MM/YYYY for date portion
// e.g., "26/05/2026, 02:30 PM"
export function formatDateTimeFull(dateString) {
  if (!dateString) return 'N/A'
  return `${formatDate(dateString)}, ${formatTime(dateString)}`
}