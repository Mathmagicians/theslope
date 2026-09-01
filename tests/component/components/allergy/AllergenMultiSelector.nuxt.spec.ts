// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, mockComponent  } from "@nuxt/test-utils/runtime"
import AllergenMultiSelector from '~/components/allergy/AllergenMultiSelector.vue'
import { ref, h } from 'vue'
import { AllergyFactory } from '../../../e2e/testDataFactories/allergyFactory'

// Mock Heynabo composable to prevent URL resolution issues
mockNuxtImport('useHeynabo', () => {
    return () => ({
        getUserUrl: vi.fn((heynaboId: number) => `/user/${heynaboId}`)
    })
})

// Mock UserListItem to avoid tooltip provider issues in tests
mockComponent('UserListItem', {
    props: ['inhabitants', 'compact', 'label', 'labelPlural'],
    setup(props) {
        const count = Array.isArray(props.inhabitants) ? props.inhabitants.length : 1
        const names = Array.isArray(props.inhabitants)
            ? props.inhabitants.map((i: {name: string}) => i.name).join(', ')
            : props.inhabitants.name

        return () => h('div', { 'data-testid': 'user-list-item' }, [
            h('span', names),
            props.label && h('span', ` ${count} ${count === 1 ? props.label : (props.labelPlural || props.label)}`)
        ])
    }
})

describe('AllergenMultiSelector', () => {
    // Test data from factory
    const mockAllergyTypes = AllergyFactory.createMockAllergyTypesWithInhabitants()

    // DRY helper
    const createWrapper = async (props: Record<string, unknown> = {}) => {
        return await mountSuspended(AllergenMultiSelector, {
            props: {
                modelValue: [],
                allergyTypes: mockAllergyTypes,
                ...props
            },
            global: {
                provide: {
                    isMd: ref(true)
                }
            }
        })
    }

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

            const html = wrapper.html()
            expect(html).toContain('Unikke beboere berørt')
            expect(html).toContain('Anna')
            expect(html).toContain('Bob')
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

            expect(wrapper.find('[data-testid="compare-summary-bar"]').exists()).toBe(expected)
        })

        it('summarises selected count and unique affected inhabitants', async () => {
            // Mælk (Anna, Bob) + Gluten (Anna) → 2 selected, 2 unique inhabitants
            const wrapper = await createWrapper({ mode: 'edit', modelValue: [1, 3], showStatistics: true })

            const bar = wrapper.find('[data-testid="compare-summary-bar"]')
            expect(bar.text()).toContain('2 valgte')
            expect(bar.text()).toContain('2 beboere')
        })
    })
})
