const NAME_PREFIX = /^YouBike2\.0_/

function toStation(record, city, lat, lng) {
  if (record.act !== '1') return null
  return {
    id: String(record.sno),
    name: String(record.sna).replace(NAME_PREFIX, ''),
    city,
    district: record.sarea,
    lat: Number(lat),
    lng: Number(lng),
  }
}

export function normalizeTaipei(record) {
  return toStation(record, '臺北市', record.latitude, record.longitude)
}

export function normalizeNewTaipei(record) {
  return toStation(record, '新北市', record.lat, record.lng)
}
