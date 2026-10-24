// Builds a tour page like taiwanbike.tw serves it: a __NUXT_DATA__ payload in
// which every value is its own entry referred to by index, the data object is
// entry 3 behind a ShallowReactive wrapper, and `values` sit under made-up keys.
export function tourPage(...values) {
  const entries = [['ShallowReactive', 1], { data: 2 }, ['ShallowReactive', 3], {}]
  const encode = (v) => {
    const i = entries.length
    if (Array.isArray(v)) {
      entries.push(null)
      entries[i] = v.map(encode)
    } else if (v && typeof v === 'object') {
      entries.push(null)
      const o = {}
      for (const k in v) o[k] = encode(v[k])
      entries[i] = o
    } else entries.push(v)
    return i
  }
  values.forEach((v, n) => { entries[3][`$f${n}`] = encode(v) })
  return `<html><body><div id="__nuxt"></div><script type="application/json" data-nuxt-data="nuxt-app" data-ssr="true" id="__NUXT_DATA__">${JSON.stringify(entries)}</script></body></html>`
}

// A tour record with the fields tour-routes.js reads.
export const tourRecord = (id, name, geometry) => ({ type: 'tour', info: { id, name, length: 1000 }, route: [], geometry })
export const lineString = (coordinates) => ({ color: '#FF00FF', geometry: { type: 'LineString', coordinates } })
export const multiLineString = (coordinates) => ({ color: '#FF00FF', geometry: { type: 'MultiLineString', coordinates } })
