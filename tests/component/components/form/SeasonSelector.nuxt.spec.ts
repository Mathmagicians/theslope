// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {mountSuspended} from "@nuxt/test-utils/runtime"
import {enableAutoUnmount} from '@vue/test-utils'
import type {BadgeProps} from '@nuxt/ui'
import {mountWithTooltipProvider, findByTestId, findComponentByTestId, resetStores, VIEWPORTS} from '~~/tests/component/testHelpers'
import {createResponsiveSizes, ICONS, SEASON_STATUS_GLYPHS} from '~/composables/useTheSlopeDesignSystem'
import {getSeasonStatus} from '~/utils/season'
import {SEASON_STATUS} from '~/config/seasonWords'
import SeasonSelector from '~/components/form/SeasonSelector.vue'
import {nextTick, ref} from 'vue'
import {SeasonFactory} from '../../../e2e/testDataFactories/seasonFactory'
import type {Season} from '~/composables/useSeasonValidation'

enableAutoUnmount(afterEach)

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

    beforeEach(() => {
        resetStores()
    })

    const createWrapper = (props: {
        modelValue: number | undefined
        seasons: Season[]
        loading?: boolean
        disabled?: boolean
    }, isMd = false) => mountWithTooltipProvider(SeasonSelector, {props, isMd})

    type WrapperType = Awaited<ReturnType<typeof createWrapper>>

    const getDropdown = (wrapper: Parameters<typeof findByTestId>[0]) => {
        return findByTestId(wrapper, DROPDOWN_TEST_ID)
    }

    const selectOption = async (wrapper: WrapperType, optionValue: number) => {
        // Find USelect component and trigger v-model update
        const uSelect = wrapper.findComponent({ name: 'USelect' })
        await uSelect.vm.$emit('update:modelValue', optionValue)
        await nextTick()
    }

    it('renders the dropdown with the "Vælg sæson" placeholder when seasons exist but none selected', async () => {
        const wrapper = await createWrapper({
            modelValue: undefined,
            seasons: mockSeasons
        })

        const dropdown = getDropdown(wrapper)
        expect(dropdown.exists()).toBe(true)
        expect(dropdown.text()).toContain('Vælg sæson')
    })

    it('emits update:modelValue when season is selected', async () => {
        const wrapper = await createWrapper({
            modelValue: undefined,
            seasons: mockSeasons
        })

        await selectOption(wrapper, 2) // ID of spring-2026

        const emitted = wrapper.emitted('update:modelValue')
        expect(emitted).toBeTruthy()
        expect(emitted?.[0]).toEqual([2]) // ID of spring-2026
    })

    it('handles empty seasons array with the "Ingen sæsoner" placeholder and no options', async () => {
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

    // setProps works on the mounted root alone
    it('displays the selected season and updates it when the modelValue prop changes', async () => {
        const wrapper = await mountSuspended(SeasonSelector, {
            props: {modelValue: 1, seasons: mockSeasons},
            global: {provide: {isMd: ref(false)}}
        })

        let dropdown = getDropdown(wrapper)
        expect(dropdown.text()).toContain('fall-2025')

        // Update modelValue prop
        await wrapper.setProps({modelValue: 2})
        await nextTick()

        dropdown = getDropdown(wrapper)
        expect(dropdown.text()).toContain('spring-2026')
    })

    it.each(VIEWPORTS)('$viewport: binds the season select size of its viewport', async ({isMd}) => {
        const wrapper = await createWrapper({modelValue: 1, seasons: mockSeasons}, isMd)
        expect(wrapper.findComponent({name: 'USelect'}).props('size')).toBe(createResponsiveSizes(ref(isMd)).seasonSelect)
    })

    it('every option carries its status, the archive icon for an ended season and the calendar otherwise, and the selected one shows its status glyph', async () => {
        const wrapper = await createWrapper({modelValue: 1, seasons: mockSeasons})
        const items = wrapper.findComponent({name: 'USelect'}).props('items') as Array<Season & {status: string, icon: string}>
        expect(items).toHaveLength(mockSeasons.length)
        for (const item of items) {
            expect(item.status).toBe(getSeasonStatus(item, new Date()))
            expect(item.icon).toBe(item.status === SEASON_STATUS.PAST ? ICONS.seasonPast : ICONS.calendar)
        }
        const glyph = findComponentByTestId<BadgeProps>(wrapper, 'UBadge', 'season-status-mark')
        expect(glyph.exists()).toBe(true)
        expect(glyph.classes()).toEqual(expect.arrayContaining(SEASON_STATUS_GLYPHS[getSeasonStatus(mockSeasons[0]!, new Date())].class.split(' ')))
    })
})
