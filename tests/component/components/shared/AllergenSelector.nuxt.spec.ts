// @vitest-environment nuxt
import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { nextTick, ref } from 'vue'
import AllergenSelector from '~/components/shared/AllergenSelector.vue'
import { AllergyFactory } from '~~/tests/e2e/testDataFactories/allergyFactory'

describe('AllergenSelector', () => {
  const ELEMENT_NAMES = {
    checkbox: (id: number) => `allergen-${id}`
  } as const

  // Mock allergy types data (passed as props)
  const mockAllergyTypes = AllergyFactory.createMockAllergyTypes()

  // Helper: Create wrapper with common setup
  const createWrapper = async (props = {}) => {
    return await mountSuspended(AllergenSelector, {
      props: {
        modelValue: [],
        allergyTypes: mockAllergyTypes, // Pass data as prop (single source of truth)
        mode: 'view',
        ...props
      },
      global: {
        provide: {
          isMd: ref(true)
        }
      }
    })
  }

  beforeEach(() => {
    // No store mocking needed - component receives data via props
  })

  describe('View Mode', () => {
    it.each([
      { selected: [1], expectedBadges: 1, desc: 'single allergen' },
      { selected: [1, 2], expectedBadges: 2, desc: 'multiple allergens' },
      { selected: [], expectedBadges: 0, desc: 'no allergens (empty state)' }
    ])('displays $desc correctly', async ({ selected, expectedBadges }) => {
      const wrapper = await createWrapper({
        modelValue: selected,
        mode: 'view'
      })

      if (expectedBadges === 0) {
        const alert = wrapper.find('[class*="alert"]')
        expect(alert.exists()).toBe(true)
      } else {
        const badges = wrapper.findAll('[class*="badge"]')
        expect(badges.length).toBeGreaterThanOrEqual(expectedBadges)
      }
    })
  })

  describe('Edit Mode', () => {
    it('renders checkbox for each allergen type', async () => {
      const wrapper = await createWrapper({ mode: 'edit' })

      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      expect(checkboxes.length).toBe(mockAllergyTypes.length)
    })

    it.each([
      { initial: [], toggle: 1, expected: [1], desc: 'selecting first allergen' },
      { initial: [1], toggle: 1, expected: [], desc: 'deselecting allergen' },
      { initial: [1], toggle: 2, expected: [1, 2], desc: 'selecting second allergen' }
    ])('emits update:modelValue when $desc', async ({ initial, toggle, expected }) => {
      const wrapper = await createWrapper({
        modelValue: initial,
        mode: 'edit'
      })

      const checkbox = wrapper.find(`[name="${ELEMENT_NAMES.checkbox(toggle)}"]`)
      await checkbox.setValue(!initial.includes(toggle))
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      expect(emitted?.[0]?.[0]).toEqual(expected)
    })

    it.each([
      { selected: [1], id: 1, shouldBeChecked: true },
      { selected: [1], id: 2, shouldBeChecked: false },
      { selected: [1, 2], id: 1, shouldBeChecked: true },
      { selected: [1, 2], id: 2, shouldBeChecked: true }
    ])('checkbox $id is checked=$shouldBeChecked when selected=$selected', async ({ selected, id, shouldBeChecked }) => {
      const wrapper = await createWrapper({
        modelValue: selected,
        mode: 'edit'
      })

      const checkbox = wrapper.find(`[name="${ELEMENT_NAMES.checkbox(id)}"]`)
      expect((checkbox.element as HTMLInputElement).checked).toBe(shouldBeChecked)
    })
  })

  describe('Inhabitant Statistics', () => {
    it.each([
      { showStats: true, shouldExist: true },
      { showStats: false, shouldExist: false }
    ])('statistics panel exists=$shouldExist when showInhabitantStats=$showStats', async ({ showStats, shouldExist }) => {
      const wrapper = await createWrapper({
        modelValue: [1, 2],
        mode: 'edit',
        showInhabitantStats: showStats
      })

      const statsTitle = wrapper.findAll('h3').find(h3 => h3.text().includes('Statistik'))
      expect(statsTitle !== undefined).toBe(shouldExist)
    })
  })

  describe('Readonly Mode', () => {
    it('disables all checkboxes when readonly=true', async () => {
      const wrapper = await createWrapper({
        mode: 'edit',
        readonly: true
      })

      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      checkboxes.forEach(checkbox => {
        expect((checkbox.element as HTMLInputElement).disabled).toBe(true)
      })
    })

    it('does not emit updates when readonly=true', async () => {
      const wrapper = await createWrapper({
        mode: 'edit',
        readonly: true
      })

      const firstCheckbox = wrapper.find(`[name="${ELEMENT_NAMES.checkbox(1)}"]`)
      await firstCheckbox.setValue(true)
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeFalsy()
    })
  })
})
