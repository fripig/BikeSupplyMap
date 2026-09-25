export function formatDistance(meters: number): string {
  return `${Math.round(meters / 10) * 10} m`
}

// Data timestamps are shown as a Taipei calendar date (YYYY-MM-DD).
export function formatDataDate(iso: string): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(iso))
}
