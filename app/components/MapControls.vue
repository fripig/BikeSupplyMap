<script setup lang="ts">
import type { Category } from '~/utils/geo'
import { CATEGORIES, CATEGORY_COLORS, CATEGORY_LABELS, RADIUS_OPTIONS } from '~/utils/categories'

const radius = defineModel<number>('radius', { required: true })
const categories = defineModel<Set<Category>>('categories', { required: true })
const showUrban = defineModel<boolean>('showUrban', { required: true })
const showCycling = defineModel<boolean>('showCycling', { required: true })
const showShelters = defineModel<boolean>('showShelters', { required: true })
defineProps<{ cyclingFailed?: boolean, shelterFailed?: boolean }>()

function toggle(category: Category) {
  const next = new Set(categories.value)
  if (next.has(category)) next.delete(category)
  else next.add(category)
  categories.value = next
}
</script>

<template>
  <label class="switch">
    <input v-model="showUrban" type="checkbox" role="switch">
    <span class="switch__track" aria-hidden="true" />
    <span>顯示市區站點</span>
  </label>

  <label class="switch">
    <input v-model="showCycling" type="checkbox" role="switch">
    <span class="switch__track" aria-hidden="true" />
    <span>都市自行車道</span>
  </label>
  <p v-if="cyclingFailed" class="switch__error" role="alert">自行車道資料載入失敗</p>

  <label class="switch">
    <input v-model="showShelters" type="checkbox" role="switch">
    <span class="switch__track" aria-hidden="true" />
    <span>躲雨點</span>
  </label>
  <p v-if="shelterFailed" class="switch__error" role="alert">躲雨點資料載入失敗</p>

  <fieldset class="controls">
    <legend class="controls__legend">範圍（直線距離）</legend>
    <div class="segmented" role="radiogroup" aria-label="範圍">
      <label v-for="option in RADIUS_OPTIONS" :key="option" class="segmented__item">
        <input v-model="radius" type="radio" name="radius" :value="option">
        <span>{{ option >= 1000 ? `${option / 1000} km` : `${option} m` }}</span>
      </label>
    </div>
  </fieldset>

  <fieldset class="controls controls--categories">
    <legend class="controls__legend">店家類型</legend>
    <div class="chips">
      <button
        v-for="category in CATEGORIES"
        :key="category"
        type="button"
        class="chip"
        :aria-pressed="categories.has(category)"
        @click="toggle(category)"
      >
        <span class="chip__dot" :style="{ background: CATEGORY_COLORS[category] }" aria-hidden="true" />
        {{ CATEGORY_LABELS[category] }}
      </button>
    </div>
  </fieldset>
</template>

<style>
.switch {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  min-height: 2rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.switch__error {
  margin: -0.5rem 0 0.75rem;
  color: #b42318;
  font-size: 0.8rem;
}

.switch input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.switch__track {
  position: relative;
  flex: none;
  width: 2.2rem;
  height: 1.25rem;
  border-radius: 999px;
  background: var(--border);
  transition: background 0.15s;
}

.switch__track::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: calc(1.25rem - 4px);
  height: calc(1.25rem - 4px);
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgb(0 0 0 / 30%);
  transition: transform 0.15s;
}

.switch input:checked + .switch__track {
  background: var(--accent);
}

.switch input:checked + .switch__track::after {
  transform: translateX(0.95rem);
}

.switch input:focus-visible + .switch__track {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.controls {
  margin: 0;
  padding: 0;
  border: 0;
}

.controls__legend {
  padding: 0;
  margin-bottom: 0.4rem;
  font-size: 0.8rem;
  color: var(--muted);
}

.segmented {
  display: flex;
  gap: 0.25rem;
}

.segmented__item {
  flex: 1;
}

.segmented__item input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.segmented__item span {
  display: block;
  padding: 0.5rem 0;
  text-align: center;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}

.segmented__item input:checked + span {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  font-weight: 600;
}

.segmented__item input:focus-visible + span {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.controls--categories {
  margin-top: 0.75rem;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: #fff;
  color: var(--muted);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}

.chip__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  opacity: 0.35;
}

.chip[aria-pressed="true"] {
  border-color: #1f2328;
  color: #1f2328;
  font-weight: 600;
}

.chip[aria-pressed="true"] .chip__dot {
  opacity: 1;
}

.chip:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
