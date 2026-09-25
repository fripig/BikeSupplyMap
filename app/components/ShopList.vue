<script setup lang="ts">
import type { NearbyShop, Station } from '~/utils/geo'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '~/utils/categories'
import { formatDistance } from '~/utils/format'
import { directionsUrl } from '~/utils/links'

defineProps<{
  station: Station
  items: NearbyShop[]
  noCategorySelected?: boolean
}>()
</script>

<template>
  <div>
    <p v-if="noCategorySelected" class="empty">請至少選擇一種店家類型</p>
    <p v-else-if="items.length === 0" class="empty">這個範圍內沒有店家，試試擴大範圍</p>
    <ol v-else class="shop-list">
      <li v-for="{ shop, distance } in items" :key="shop.id" class="shop">
        <span class="shop__dot" :style="{ background: CATEGORY_COLORS[shop.category] }" aria-hidden="true" />
        <div class="shop__body">
          <div class="shop__name">{{ shop.name ?? CATEGORY_LABELS[shop.category] }}</div>
          <div class="shop__meta">{{ CATEGORY_LABELS[shop.category] }} · 直線距離 {{ formatDistance(distance) }}</div>
        </div>
        <a
          class="shop__link"
          :href="directionsUrl(station, shop)"
          target="_blank"
          rel="noopener"
          :aria-label="`以 Google 地圖步行導航到 ${shop.name ?? CATEGORY_LABELS[shop.category]}`"
        >步行導航</a>
      </li>
    </ol>
  </div>
</template>

<style>
.empty {
  margin: 0;
  padding: 1rem 0;
  color: var(--muted);
}

.shop-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.shop {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--border);
}

.shop__dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.shop__body {
  flex: 1;
  min-width: 0;
}

.shop__name {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.shop__meta {
  font-size: 0.8rem;
  color: var(--muted);
}

.shop__link {
  flex: none;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--accent);
  border-radius: 6px;
  color: var(--accent);
  font-size: 0.85rem;
  text-decoration: none;
  white-space: nowrap;
}

.shop__link:hover {
  background: var(--accent);
  color: #fff;
}
</style>
