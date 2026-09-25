// Brand rules are matched case-insensitively with spaces removed, so
// "OK mart" / "OKmart" and "7-Eleven" / "7-ELEVEN" are treated alike.
const EXCLUDED = ['蝦皮']

// Vending machines count when any `;`-separated value of their `vending` tag is
// food or drink, or when the tag is missing (mappers often leave drink machines
// untagged).
const VENDING_FOOD = new Set(['drinks', 'water', 'coffee', 'food', 'ice_cream', 'sweets', 'bread', 'milk', 'snacks', 'beverages'])

const isFoodVending = (vending) =>
  vending == null || vending.split(';').some((v) => VENDING_FOOD.has(v.trim()))

const HYPERMARKET = ['家樂福', '好市多', 'costco', '大潤發', '愛買']
const HYPERMARKET_EXCEPT = ['超市', 'market']

const BRAND_RULES = [
  ['supermarket', ['全聯', '美廉社', '家樂福超市', '家樂福market', '頂好', 'wellcome', '聖德科斯', '楓康']],
  ['convenience', ['7-eleven', '統一超商', '全家', 'familymart', '萊爾富', 'hi-life', 'ok超商', 'okmart']],
]

const SHOP_TAG_FALLBACK = {
  convenience: 'convenience',
  supermarket: 'supermarket',
  general: 'grocery',
  variety_store: 'grocery',
  greengrocer: 'grocery',
}

const fold = (s) => (s ?? '').toLowerCase().replace(/\s+/g, '')
const containsAny = (text, words) => words.some((w) => text.includes(w))

// Brand groups are checked in the spec's order: hypermarket, supermarket, convenience.
function categoryFromText(text, allText) {
  if (!text) return null
  if (containsAny(text, HYPERMARKET) && !containsAny(allText, HYPERMARKET_EXCEPT)) return 'hypermarket'
  for (const [category, words] of BRAND_RULES) {
    if (containsAny(text, words)) return category
  }
  return null
}

export function classifyShop(element) {
  const tags = element.tags ?? {}
  const brand = fold(tags.brand)
  const name = fold(tags.name)
  const allText = `${brand} ${name}`

  if (containsAny(allText, EXCLUDED)) return null

  // Vending machines never fall through to brand rules, so a 7-Eleven machine
  // is not counted as a convenience store.
  const isVending = tags.amenity === 'vending_machine'
  if (isVending && !isFoodVending(tags.vending)) return null

  const category = isVending ? 'vending'
    : categoryFromText(brand, allText)
      ?? categoryFromText(name, allText)
      ?? SHOP_TAG_FALLBACK[tags.shop]
  if (!category) return null

  const lat = element.lat ?? element.center?.lat
  const lng = element.lon ?? element.center?.lon
  if (typeof lat !== 'number' || typeof lng !== 'number') return null

  return {
    id: `${element.type[0]}${element.id}`,
    name: tags.name ?? null,
    category,
    lat,
    lng,
    // Kept for the route-side vending popup; not published in shops.json.
    ...(isVending ? { vending: tags.vending ?? null } : {}),
  }
}
