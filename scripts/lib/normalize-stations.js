const NAME_PREFIX = /^YouBike2\.0_/

// A missing, empty or non-numeric coordinate drops the record, so a schema change
// in a source lowers the station count and trips the minimum-count check.
const toCoordinate = (value) => (value === '' || value == null ? NaN : Number(value))

function toStation(record, city, rawLat, rawLng) {
  if (record.act !== '1') return null
  const lat = toCoordinate(rawLat)
  const lng = toCoordinate(rawLng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return {
    id: String(record.sno),
    name: String(record.sna).replace(NAME_PREFIX, ''),
    city,
    district: record.sarea,
    lat,
    lng,
  }
}

export function normalizeTaipei(record) {
  return toStation(record, '臺北市', record.latitude, record.longitude)
}

export function normalizeNewTaipei(record) {
  return toStation(record, '新北市', record.lat, record.lng)
}
