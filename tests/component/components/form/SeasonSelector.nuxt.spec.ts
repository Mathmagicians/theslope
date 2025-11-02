// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {mountSuspended} from "@nuxt/test-utils/runtime"
import SeasonSelector from '~/components/form/SeasonSelector.vue'
import {nextTick} from 'vue'
import {SeasonFactory} from '../../../e2e/testDataFactories/seasonFactory'
import type {Season} from '~/composables/useSeasonValidation'

describe('SeasonSelector', () => {

    const DROPDOWN_TEST_ID = 'season-selector'

    // Create mock seasons using factory
    const mockSeasons: Season[] = [
        {
            ...SeasonFactory.defaultSeason('fall-2025'),
            id: 1,
            shortName: 'fall-2025'
        },
        {
            ...SeasonFactory.defaultSeason('spring-2026'),
            id: 2,
            shortName: 'spring-2026',
            seasonDates: {start: new Date('2026-01-01'), end: new Date('2026-05-31')}
        }
    ]

    const createWrapper = async (props: {
        modelValue: number | undefined
        seasons: Season[]
        loading?: boolean
        disabled?: boolean
    }) => {
        return await mountSuspended(SeasonSelector, {props})
    }

    const getDropdown = (wrapper: any) => {
        return wrapper.find(`[data-testid="${DROPDOWN_TEST_ID}"]`)
    }

    const selectOption = async (wrapper: any, optionText: string) => {
        const dropdown = getDropdown(wrapper)
        await dropdown.trigger('click')
        await nextTick()

        // Find and click the option
        const option = wrapper.find(`[role="option"]:has-text("${optionText}")`)
        await option.trigger('click')
        await nextTick()
    }

    it('renders dropdown with seasons list', async () => {
        const wrapper = await createWrapper({
            modelValue: undefined,
            seasons: mockSeasons
        })

        const dropdown = getDropdown(wrapper)
        expect(dropdown.exists()).toBe(true)

        // Verify dropdown is interactive
        await dropdown.trigger('click')
        await nextTick()

        // Check that options are rendered
        const options = wrapper.findAll('[role="option"]')
        expect(options.length).toBe(2)
        expect(options[0].text()).toContain('fall-2025')
        expect(options[1].text()).toContain('spring-2026')
    })

    it('shows "Vælg sæson" placeholder when seasons exist but none selected', async () => {
        const wrapper = await createWrapper({
            modelValue: undefined,
            seasons: mockSeasons
        })

        const dropdown = getDropdown(wrapper)
        expect(dropdown.text()).toContain('Vælg sæson')
    })

    it('shows "Ingen sæsoner" placeholder when seasons array is empty', async () => {
        const wrapper = await createWrapper({
            modelValue: undefined,
            seasons: []
        })

        const dropdown = getDropdown(wrapper)
        expect(dropdown.text()).toContain('Ingen sæsoner')
    })

    it('displays selected season when modelValue is provided', async () => {
        const wrapper = await createWrapper({
            modelValue: 1,
            seasons: mockSeasons
        })

        const dropdown = getDropdown(wrapper)
        expect(dropdown.text()).toContain('fall-2025')
    })

    it('emits update:modelValue when season is selected', async () => {
        const wrapper = await createWrapper({
            modelValue: undefined,
            seasons: mockSeasons
        })

        await selectOption(wrapper, 'spring-2026')

        const emitted = wrapper.emitted('update:modelValue')
        expect(emitted).toBeTruthy()
        expect(emitted?.[0]).toEqual([2]) // ID of spring-2026
    })

    it('shows loading state', async () => {
        const wrapper = await createWrapper({
            modelValue: undefined,
            seasons: mockSeasons,
            loading: true
        })

        const dropdown = getDropdown(wrapper)
        // Check for loading indicator (implementation-specific)
        expect(dropdown.attributes('aria-busy')).toBe('true')
    })

    it('shows disabled state', async () => {
        const wrapper = await createWrapper({
            modelValue: 1,
            seasons: mockSeasons,
            disabled: true
        })

        const dropdown = getDropdown(wrapper)
        expect(dropdown.attributes('disabled')).toBeDefined()
    })

    it('handles empty seasons array without errors', async () => {
        const wrapper = await createWrapper({
            modelValue: undefined,
            seasons: []
        })

        const dropdown = getDropdown(wrapper)
        expect(dropdown.exists()).toBe(true)

        // Should show empty state placeholder
        expect(dropdown.text()).toContain('Ingen sæsoner')

        // Clicking should not cause errors
        await dropdown.trigger('click')
        await nextTick()

        const options = wrapper.findAll('[role="option"]')
        expect(options.length).toBe(0)
    })

    it('updates displayed value when modelValue prop changes', async () => {
        const wrapper = await createWrapper({
            modelValue: 1,
            seasons: mockSeasons
        })

        let dropdown = getDropdown(wrapper)
        expect(dropdown.text()).toContain('fall-2025')

        // Update modelValue prop
        await wrapper.setProps({modelValue: 2})
        await nextTick()

        dropdown = getDropdown(wrapper)
        expect(dropdown.text()).toContain('spring-2026')
    })
})