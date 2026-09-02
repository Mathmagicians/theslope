// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import AllergenMultiSelector from '~/components/allergy/AllergenMultiSelector.vue'
import UserListItem from '~/components/shared/UserListItem.vue'
import { AllergyFactory } from '../../../e2e/testDataFactories/allergyFactory'
import { ALLERGY_TEST_IDS } from './allergyTestIds'
import { mountWithTooltipProvider, findByTestId } from '~~/tests/component/testHelpers'

// AllergyTypeCard reads the active season's ticket prices from the plan store - fake its HTTP (Rule 6)
registerEndpoint('/api/admin/season/active', () => null)
registerEndpoint('/api/admin/season', () => [])

describe('AllergenMultiSelector', () => {
    // Test data from factory
    const mockAllergyTypes = AllergyFactory.createMockAllergyTypesWithInhabitants()

    // DRY helper - renders the real UserListItem (avatar tooltips need the provider)
    const createWrapper = (props: Record<string, unknown> = {}) =>
        mountWithTooltipProvider(AllergenMultiSelector, {
            props: {
                modelValue: [],
                allergyTypes: mockAllergyTypes,
                ...props
            },
            isMd: true
        })

    describe('View Mode', () => {
        it.each([
            {
                name: 'selected allergens as badges',
                modelValue: [1, 3],
                expectedTexts: ['Mælk', 'Gluten'],
                notExpectedText: 'Jordnødder'
            },
            {
                name: 'empty state',
                modelValue: [],
                expectedTexts: ['Ingen allergener'],  // Less verbatim - matches "Ingen allergener i menuen"
                notExpectedText: 'Mælk'
            }
        ])('renders $name', async ({ modelValue, expectedTexts, notExpectedText }) => {
            const wrapper = await createWrapper({
                mode: 'view',
                modelValue
            })

            const html = wrapper.html()
            expectedTexts.forEach(text => {
                expect(html).toContain(text)
            })
            if (notExpectedText) {
                expect(html).not.toContain(notExpectedText)
            }
        })

        it.each([
            { showStatistics: true, shouldShow: true },
            { showStatistics: false, shouldShow: false }
        ])('shows statistics when showStatistics=$showStatistics', async ({ showStatistics, shouldShow }) => {
            const wrapper = await createWrapper({
                mode: 'view',
                modelValue: [1, 3],
                showStatistics
            })

            const html = wrapper.html()
            if (shouldShow) {
                expect(html).toContain('berørt af allergener')
            } else {
                expect(html).not.toContain('berørt af allergener')
            }
        })
    })

    describe('Edit Mode', () => {
        it('renders table with allergen data', async () => {
            const wrapper = await createWrapper({ mode: 'edit' })

            const html = wrapper.html()
            // Verify all allergy types are rendered
            expect(html).toContain('Mælk')
            expect(html).toContain('Jordnødder')
            expect(html).toContain('Gluten')
            expect(html).toContain('Antal')
        })

        it.each([
            { showStatistics: true, expectedTexts: ['📊 Statistik', 'Berørte beboere', 'Fordeling pr. allergen'] },
            { showStatistics: false, notExpectedText: '📊 Statistik' }
        ])('statistics panel with showStatistics=$showStatistics', async ({ showStatistics, expectedTexts, notExpectedText }) => {
            const wrapper = await createWrapper({
                mode: 'edit',
                modelValue: [1, 3],
                showStatistics
            })

            const html = wrapper.html()
            if (expectedTexts) {
                expectedTexts.forEach(text => expect(html).toContain(text))
            }
            if (notExpectedText) {
                expect(html).not.toContain(notExpectedText)
            }
        })

        it('shows empty statistics message when no selection', async () => {
            const wrapper = await createWrapper({
                mode: 'edit',
                modelValue: [],
                showStatistics: true
            })

            expect(wrapper.html()).toContain('Vælg allergener')
        })

        it.each([
            { showNewBadge: true, expectedText: 'Nyt' },
            { showNewBadge: false, notExpectedText: 'Nyt' }
        ])('new badge column with showNewBadge=$showNewBadge', async ({ showNewBadge, expectedText, notExpectedText }) => {
            const wrapper = await createWrapper({
                mode: 'edit',
                showNewBadge
            })

            const html = wrapper.html()
            if (expectedText) {
                expect(html).toContain(expectedText)
            }
            if (notExpectedText) {
                expect(html).not.toContain(notExpectedText)
            }
        })
    })

    describe('Statistics Calculation', () => {
        it('shows unique inhabitants across multiple allergens', async () => {
            // Allergen 1 (Mælk): Anna + Bob (2 people)
            // Allergen 3 (Gluten): Anna (duplicate)
            // Should show 2 unique inhabitants total
            const wrapper = await createWrapper({
                mode: 'edit',
                modelValue: [1, 3],
                showStatistics: true
            })

            expect(wrapper.html()).toContain('Unikke beboere berørt')
            // The "Berørte beboere" list is the first UserListItem in the statistics panel
            const affected = wrapper.findComponent(UserListItem).props('inhabitants') as {name: string}[]
            expect(affected.map(i => i.name).sort()).toEqual(['Anna', 'Bob'])
        })

        it('shows breakdown by allergen', async () => {
            const wrapper = await createWrapper({
                mode: 'edit',
                modelValue: [1, 2],
                showStatistics: true
            })

            const html = wrapper.html()
            expect(html).toContain('Fordeling pr. allergen')
            expect(html).toContain('Mælk')
            expect(html).toContain('Jordnødder')
        })
    })

    describe('Props and Data Flow', () => {
        it('renders correctly with all props', async () => {
            const wrapper = await createWrapper({
                mode: 'edit',
                modelValue: [1, 2],
                showStatistics: true,
                showNewBadge: true,
                readonly: false
            })

            expect(wrapper.props('mode')).toBe('edit')
            expect(wrapper.props('modelValue')).toEqual([1, 2])
            expect(wrapper.props('showStatistics')).toBe(true)
            expect(wrapper.props('showNewBadge')).toBe(true)
            expect(wrapper.props('readonly')).toBe(false)
        })

        it('displays selected allergens in both modes', async () => {
            const selectedIds = [1, 3]

            const viewWrapper = await createWrapper({
                mode: 'view',
                modelValue: selectedIds
            })

            const editWrapper = await createWrapper({
                mode: 'edit',
                modelValue: selectedIds
            })

            // Both should display Mælk and Gluten
            expect(viewWrapper.html()).toContain('Mælk')
            expect(viewWrapper.html()).toContain('Gluten')
            expect(editWrapper.html()).toContain('Mælk')
            expect(editWrapper.html()).toContain('Gluten')
        })
    })

    // On mobile the statistics panel lands below the list, so a sticky bar
    // summarises the selection and jumps to the 📊 panel on tap.
    describe('Sticky Mobile Summary', () => {
        it.each([
            { modelValue: [1, 3], expected: true },
            { modelValue: [], expected: false }
        ])('bar rendered=$expected with selection=$modelValue', async ({ modelValue, expected }) => {
            const wrapper = await createWrapper({ mode: 'edit', modelValue, showStatistics: true })

            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.summaryBar).exists()).toBe(expected)
        })

        it('summarises selected count and unique affected inhabitants', async () => {
            // Mælk (Anna, Bob) + Gluten (Anna) → 2 selected, 2 unique inhabitants
            const wrapper = await createWrapper({ mode: 'edit', modelValue: [1, 3], showStatistics: true })

            const bar = findByTestId(wrapper, ALLERGY_TEST_IDS.summaryBar)
            expect(bar.text()).toContain('2 valgte')
            expect(bar.text()).toContain('2 beboere')
        })
    })
})
