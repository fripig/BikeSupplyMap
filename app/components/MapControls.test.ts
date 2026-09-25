// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MapControls from './MapControls.vue'
import { CATEGORIES } from '~/utils/categories'

const mountControls = (showUrban: boolean, extra: Record<string, unknown> = {}) => mount(MapControls, {
  props: {
    radius: 500,
    categories: new Set(CATEGORIES),
    showUrban,
    showCycling: false,
    showShelters: false,
    'onUpdate:showUrban': () => {},
    'onUpdate:showCycling': () => {},
    'onUpdate:showShelters': () => {},
    ...extra,
  },
})
const switchLabelled = (wrapper: ReturnType<typeof mountControls>, label: string) =>
  wrapper.findAll('.switch').find((s) => s.text() === label)!

describe('MapControls urban station switch', () => {
  it('is labelled 顯示市區站點 and reflects an off state', () => {
    const wrapper = mountControls(false)
    const input = wrapper.find<HTMLInputElement>('.switch input')
    expect(wrapper.find('.switch').text()).toBe('顯示市區站點')
    expect(input.attributes('role')).toBe('switch')
    expect(input.element.checked).toBe(false)
  })

  it('emits the new value when toggled', async () => {
    const wrapper = mountControls(false)
    await wrapper.find('.switch input').setValue(true)
    expect(wrapper.emitted('update:showUrban')).toEqual([[true]])
  })
})

describe('MapControls urban bike-path switch', () => {
  it('is labelled 都市自行車道, starts off, and emits when toggled', async () => {
    const wrapper = mountControls(false)
    const input = switchLabelled(wrapper, '都市自行車道').find<HTMLInputElement>('input')
    expect(input.element.checked).toBe(false)
    await input.setValue(true)
    expect(wrapper.emitted('update:showCycling')).toEqual([[true]])
  })

  it('shows the load failure message only when loading failed', () => {
    expect(mountControls(false).text()).not.toContain('自行車道資料載入失敗')
    expect(mountControls(false, { cyclingFailed: true }).text()).toContain('自行車道資料載入失敗')
  })
})

describe('MapControls rain shelter switch', () => {
  it('is labelled 躲雨點, starts off, and emits when toggled', async () => {
    const wrapper = mountControls(false)
    const input = switchLabelled(wrapper, '躲雨點').find<HTMLInputElement>('input')
    expect(input.attributes('role')).toBe('switch')
    expect(input.element.checked).toBe(false)
    await input.setValue(true)
    expect(wrapper.emitted('update:showShelters')).toEqual([[true]])
  })

  it('shows the load failure message only when loading failed', () => {
    expect(mountControls(false).text()).not.toContain('躲雨點資料載入失敗')
    expect(mountControls(false, { shelterFailed: true }).text()).toContain('躲雨點資料載入失敗')
  })
})
