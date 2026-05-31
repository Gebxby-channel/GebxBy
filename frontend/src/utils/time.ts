const INDONESIA_TIME_ZONE = 'Asia/Jakarta';

export function formatIndonesiaDate(dateString?: string, uppercase = true) {
  if (!dateString) return uppercase ? 'NO DATE' : 'No date';
  const formatted = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: INDONESIA_TIME_ZONE,
  }).format(new Date(dateString));
  return uppercase ? formatted.toUpperCase() : formatted;
}

export function formatIndonesiaDateTime(dateString?: string, uppercase = false) {
  if (!dateString) return uppercase ? 'NO DATE' : 'No date';
  const formatted = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: INDONESIA_TIME_ZONE,
  }).format(new Date(dateString));
  return uppercase ? formatted.toUpperCase() : formatted;
}

export function formatIndonesiaShortTime(dateString?: string) {
  if (!dateString) return 'NO DATE';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: INDONESIA_TIME_ZONE,
  }).format(new Date(dateString));
}
