// Requests pages 0, 1, 2… until a page comes back with fewer than `pageSize`
// records, and returns every record in order.
export async function fetchAllPages(fetchPage, pageSize) {
  const records = []
  for (let page = 0; ; page++) {
    const batch = await fetchPage(page)
    records.push(...batch)
    if (batch.length < pageSize) return records
  }
}
