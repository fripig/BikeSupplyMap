// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MapControls from './MapControls.vue'
import { CATEGORIES } from '~/utils/categories'

const mountControls = (showUrban: boolean) => mount(MapControls, {
  props: {
    radius: 500,
    categories: new Set(CATEGORIES),
    showUrban,
    'onUpdate:showUrban': () => {},
  },
})

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
