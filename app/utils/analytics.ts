// Google Analytics events. gtag is defined only in production builds (see
// nuxt.config.ts), so in dev, tests and e2e runs every call does nothing.
export type EventParams = Record<string, string | number | boolean>

export function track(name: string, params: EventParams = {}) {
  const gtag = (globalThis as { gtag?: (...args: unknown[]) => void }).gtag
  if (typeof gtag === 'function') gtag('event', name, params)
}

// The event for following a Google Maps link: open_directions for walking
// directions, open_map_place for a place, or null for any other link. The
// link's data-ga-* attributes become the parameters, so data-ga-distance-m="120"
// gives distance_m: 120.
export function mapsLinkEvent(href: string, data: Record<string, string | undefined>): { name: string, params: EventParams } | null {
  const name = href.startsWith('https://www.google.com/maps/dir/')
    ? 'open_directions'
    : href.startsWith('https://www.google.com/maps/search/') ? 'open_map_place' : null
  if (!name) return null
  const params: EventParams = {}
  for (const [key, value] of Object.entries(data)) {
    if (!/^ga[A-Z]/.test(key) || value === undefined) continue
    const param = key.slice(2).replace(/[A-Z]/g, (c, i: number) => (i ? '_' : '') + c.toLowerCase())
    params[param] = /^\d+(\.\d+)?$/.test(value) ? Number(value) : value
  }
  return { name, params }
}

// Tracks clicks and middle-clicks on Google Maps links anywhere on the page.
// It listens in the capture phase, because Leaflet popups stop clicks from
// bubbling up to the document.
export function trackMapsLinks(doc: Document): () => void {
  const onClick = (e: MouseEvent) => {
    if (e.type === 'auxclick' && e.button !== 1) return
    const link = (e.target as Element | null)?.closest?.('a[href]')
    if (!(link instanceof HTMLAnchorElement)) return
    const event = mapsLinkEvent(link.href, link.dataset)
    if (event) track(event.name, event.params)
  }
  doc.addEventListener('click', onClick, true)
  doc.addEventListener('auxclick', onClick, true)
  return () => {
    doc.removeEventListener('click', onClick, true)
    doc.removeEventListener('auxclick', onClick, true)
  }
}
