// @vitest-environment nuxt
import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { nextTick, ref } from 'vue'
import AllergenSelector from '~/components/shared/AllergenSelector.vue'
import { AllergyFactory } from '~/tests/e2e/testDataFactories/allergyFactory'

describe('AllergenSelector', () => {
  const ELEMENT_NAMES = {
    checkbox: (id: number) => `allergen-${id}`
  } as const

  // Use factory mock data
  const mockAllergyTypes = AllergyFactory.createMockAllergyTypes()

  // Helper: Create wrapper with common setup
  const createWrapper = async (props = {}) => {
    return await mountSuspended(AllergenSelector, {
      props: {
        modelValue: [],
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

  // Helper: Wait for store to load
  const waitForLoad = async () => {
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  beforeEach(() => {
    // Mock allergies endpoint
    registerEndpoint('/api/admin/allergy-type', {
      method: 'GET',
      handler: () => mockAllergyTypes
    })
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

      await waitForLoad()

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
      await waitForLoad()

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

      await waitForLoad()

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

      await waitForLoad()

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

      await waitForLoad()

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

      await waitForLoad()

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

      await waitForLoad()

      const firstCheckbox = wrapper.find(`[name="${ELEMENT_NAMES.checkbox(1)}"]`)
      await firstCheckbox.setValue(true)
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeFalsy()
    })
  })
})
