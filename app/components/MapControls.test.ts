// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MapControls from './MapControls.vue'
import { CATEGORIES } from '~/utils/categories'

const mountControls = (showUrban: boolean, extra: Record<string, unknown> = {}) => mount(MapControls, {
  props: {
    radius: 500,
    categories: new Set(CATEGORIES),
    showRiverside: true,
    showUrban,
    showCycling: false,
    showShelters: false,
    showToilets: false,
    showShowers: false,
    loops: [],
    shownLoops: new Set<string>(),
    'onUpdate:showRiverside': () => {},
    'onUpdate:showUrban': () => {},
    'onUpdate:showCycling': () => {},
    'onUpdate:showShelters': () => {},
    'onUpdate:showToilets': () => {},
    'onUpdate:showShowers': () => {},
    'onUpdate:shownLoops': () => {},
    ...extra,
  },
})
const switchLabelled = (wrapper: ReturnType<typeof mountControls>, label: string) =>
  wrapper.findAll('.switch').find((s) => s.text() === label)!

describe('MapControls station switches', () => {
  it('lists 河濱站點 then 市區站點 first, reflecting their states', () => {
    const wrapper = mountControls(false)
    const [riverside, urban] = wrapper.findAll('.switch')
    expect([riverside!.text(), urban!.text()]).toEqual(['河濱站點', '市區站點'])
    for (const s of [riverside!, urban!]) expect(s.find('input').attributes('role')).toBe('switch')
    expect(riverside!.find<HTMLInputElement>('input').element.checked).toBe(true)
    expect(urban!.find<HTMLInputElement>('input').element.checked).toBe(false)
  })

  it('emits each switch\'s new value when toggled', async () => {
    const wrapper = mountControls(false)
    await switchLabelled(wrapper, '河濱站點').find('input').setValue(false)
    await switchLabelled(wrapper, '市區站點').find('input').setValue(true)
    expect(wrapper.emitted('update:showRiverside')).toEqual([[false]])
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

describe.each([
  ['廁所', 'showToilets', 'toiletFailed', '廁所資料載入失敗'],
  ['淋浴', 'showShowers', 'showerFailed', '淋浴資料載入失敗'],
])('MapControls %s switch', (label, model, failedProp, message) => {
  it('starts off and emits when toggled', async () => {
    const wrapper = mountControls(false)
    const input = switchLabelled(wrapper, label).find<HTMLInputElement>('input')
    expect(input.attributes('role')).toBe('switch')
    expect(input.element.checked).toBe(false)
    await input.setValue(true)
    expect(wrapper.emitted(`update:${model}`)).toEqual([[true]])
  })

  it('shows its load failure message only when loading failed', () => {
    expect(mountControls(false).text()).not.toContain(message)
    expect(mountControls(false, { [failedProp]: true }).text()).toContain(message)
  })
})

describe('MapControls loop switches', () => {
  const LOOPS = ['環騎臺北替代道路（深南路-南深路段）', '北臺濱海環線（環島1-1）']
  const group = (wrapper: ReturnType<typeof mountControls>) =>
    wrapper.findAll('fieldset').find((f) => f.find('legend').text() === '環線')

  it('shows no 環線 group without optional loops', () => {
    expect(group(mountControls(false))).toBeUndefined()
  })

  it('lists one switch per loop in order, checked as in the model', () => {
    const wrapper = mountControls(false, { loops: LOOPS, shownLoops: new Set([LOOPS[1]]) })
    const switches = group(wrapper)!.findAll('.switch')
    expect(switches.map((s) => s.text())).toEqual(LOOPS)
    for (const s of switches) expect(s.find('input').attributes('role')).toBe('switch')
    expect(switches.map((s) => s.find<HTMLInputElement>('input').element.checked)).toEqual([false, true])
  })

  it('emits a new set with the toggled loop added or removed', async () => {
    const shown = new Set([LOOPS[1]!])
    const wrapper = mountControls(false, { loops: LOOPS, shownLoops: shown })
    const [first, second] = group(wrapper)!.findAll('.switch input')
    await first!.setValue(true)
    await second!.setValue(false)
    const emitted = wrapper.emitted('update:shownLoops')!.map(([s]) => [...(s as Set<string>)])
    expect(emitted).toEqual([[LOOPS[1], LOOPS[0]], []])
    expect([...shown]).toEqual([LOOPS[1]])
  })
})
