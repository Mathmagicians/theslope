// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import type { DOMWrapper, VueWrapper } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'
import AllergenMultiSelector from '~/components/allergy/AllergenMultiSelector.vue'
import AllergyTypeDisplay from '~/components/allergy/AllergyTypeDisplay.vue'
import { AllergyFactory } from '../../../e2e/testDataFactories/allergyFactory'
import { OrderFactory } from '~~/tests/e2e/testDataFactories/orderFactory'
import { useBookingValidation } from '~/composables/useBookingValidation'
import { ICONS } from '~/composables/useTheSlopeDesignSystem'
import {formatPortions} from '~/utils/utils'
import { ALLERGY_TEST_IDS } from './allergyTestIds'
import { mountWithTooltipProvider, findByTestId, clickByTestId } from '~~/tests/component/testHelpers'

const {TicketTypeSchema} = useBookingValidation()
const TicketType = TicketTypeSchema.enum

describe('AllergenMultiSelector', () => {
    // Test data from factory
    const mockAllergyTypes = AllergyFactory.createMockAllergyTypesWithInhabitants()
    const [MILK, NUTS, GLUTEN] = mockAllergyTypes as [typeof mockAllergyTypes[number], typeof mockAllergyTypes[number], typeof mockAllergyTypes[number]]

    // This dinner's diners: two children carry milk, one of them and an adult carry nuts (child 0,5 kuv., adult 1)
    const tickets = [
        OrderFactory.defaultOrderDetailWithAllergies(1, 'Anna', [MILK], {ticketType: TicketType.CHILD}),
        OrderFactory.defaultOrderDetailWithAllergies(2, 'Bo', [MILK, NUTS], {ticketType: TicketType.CHILD}),
        OrderFactory.defaultOrderDetailWithAllergies(3, 'Cy', [NUTS], {ticketType: TicketType.ADULT})
    ]

    // DRY helper - mounts on the desktop breakpoint
    const createWrapper = (props: Record<string, unknown> = {}) =>
        mountWithTooltipProvider(AllergenMultiSelector, {
            props: {
                modelValue: [],
                allergyTypes: mockAllergyTypes,
                tickets,
                ...props
            },
            isMd: true
        })

    const partsOf = (line: DOMWrapper<Element>) => line.findAll(':scope > span').map(part => part.text())

    describe('Edit Mode', () => {
        it('renders table with allergen data', async () => {
            const wrapper = await createWrapper()

            const html = wrapper.html()
            // Verify all allergy types are rendered
            expect(html).toContain('Mælk')
            expect(html).toContain('Jordnødder')
            expect(html).toContain('Gluten')
            expect(html).toContain('Antal')
        })

        it.each([
            { showStatistics: true, shouldShow: true },
            { showStatistics: false, shouldShow: false }
        ])('allergy panel with showStatistics=$showStatistics', async ({ showStatistics, shouldShow }) => {
            const wrapper = await createWrapper({ modelValue: [MILK.id, GLUTEN.id], showStatistics })

            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.allergyPanel).exists()).toBe(shouldShow)
        })

        it('shows empty statistics message when no selection', async () => {
            const wrapper = await createWrapper({ modelValue: [], showStatistics: true })

            expect(wrapper.html()).toContain('Vælg allergener')
        })

        it.each([
            { showNewBadge: true, expectedText: 'Nyt' },
            { showNewBadge: false, notExpectedText: 'Nyt' }
        ])('new badge column with showNewBadge=$showNewBadge', async ({ showNewBadge, expectedText, notExpectedText }) => {
            const wrapper = await createWrapper({ showNewBadge })

            const html = wrapper.html()
            if (expectedText) {
                expect(html).toContain(expectedText)
            }
            if (notExpectedText) {
                expect(html).not.toContain(notExpectedText)
            }
        })
    })

    describe('Counts from this dinner\'s diners', () => {
        it('shows each allergen\'s kuverter in the count column, a zero included', async () => {
            const wrapper = await createWrapper()

            const counts = mockAllergyTypes.map(allergyType => findByTestId(wrapper, ALLERGY_TEST_IDS.count(allergyType.id)).text())
            expect(counts).toEqual([formatPortions(1), formatPortions(1.5), formatPortions(0)])
        })

        it('renders no count column and no allergy panel without tickets', async () => {
            const wrapper = await createWrapper({ modelValue: [MILK.id], tickets: undefined })

            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.count(MILK.id)).exists()).toBe(false)
            expect(wrapper.html()).not.toContain('Antal')
            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.allergyPanel).exists()).toBe(false)
        })
    })

    describe('Allergy panel', () => {
        // Milk and gluten selected: Anna and Bo carry milk, nobody carries gluten
        const selection = [MILK.id, GLUTEN.id]

        it('carries the allergy glyph, the title and the overview of the selected allergens, each its compact allergy type', async () => {
            const wrapper = await createWrapper({ modelValue: selection })

            const panel = wrapper.findAllComponents({ name: 'UAlert' })
                .find(alert => alert.attributes('data-testid') === ALLERGY_TEST_IDS.allergyPanel)
            expect(panel?.props('icon')).toBe(ICONS.allergy)
            expect(panel?.text()).toContain('Allergier blandt gæsterne')
            expect(partsOf(findByTestId(wrapper, ALLERGY_TEST_IDS.allergyPanelOverview))).toEqual([
                `${formatPortions(1)} kuv.`,
                `| ${MILK.icon}${MILK.name} · ${formatPortions(1)}`,
                `| ${GLUTEN.icon}${GLUTEN.name} · ${formatPortions(0)}`
            ])
            const allergens = findByTestId(wrapper, ALLERGY_TEST_IDS.allergyPanelOverview).findAllComponents(AllergyTypeDisplay) as VueWrapper<ComponentPublicInstance<{allergyType: unknown, compact: boolean, showName: boolean}>>[]
            expect(allergens.map(allergen => allergen.props('allergyType'))).toEqual([expect.objectContaining(MILK), expect.objectContaining(GLUTEN)])
            expect(allergens.every(allergen => allergen.props('compact') && allergen.props('showName'))).toBe(true)
        })

        it('opens the names with one compact allergy type and its name per matching allergy behind Hvem', async () => {
            const wrapper = await createWrapper({ modelValue: selection })
            const who = () => findByTestId(wrapper, ALLERGY_TEST_IDS.allergyPanelWho)

            expect(who().attributes('aria-expanded')).toBe('false')
            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.allergyPanelNames).exists()).toBe(false)

            await clickByTestId(wrapper, ALLERGY_TEST_IDS.allergyPanelWho)

            expect(who().attributes('aria-expanded')).toBe('true')
            const names = findByTestId(wrapper, ALLERGY_TEST_IDS.allergyPanelNames)
            expect(names.text()).toContain('Anna')
            expect(names.text()).toContain('Bo')
            expect(names.text()).not.toContain('Cy')
            const allergies = names.findAllComponents(AllergyTypeDisplay) as VueWrapper<ComponentPublicInstance<{allergyType: {name: string}, compact: boolean, showName: boolean}>>[]
            expect(allergies.map(allergy => allergy.props('allergyType').name)).toEqual([MILK.name, MILK.name])
            expect(allergies.map(allergy => allergy.text())).toEqual([MILK, MILK].map(({icon, name}) => `${icon}${name}`))
            expect(allergies.every(allergy => allergy.props('compact') && allergy.props('showName'))).toBe(true)
            expect(names.findAllComponents({ name: 'UBadge' })).toHaveLength(0)
            expect(names.findAllComponents({ name: 'UTooltip' })).toHaveLength(0)

            await clickByTestId(wrapper, ALLERGY_TEST_IDS.allergyPanelWho)

            expect(who().attributes('aria-expanded')).toBe('false')
            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.allergyPanelNames).exists()).toBe(false)
        })
    })

    describe('Props and Data Flow', () => {
        it('renders correctly with all props', async () => {
            const wrapper = await createWrapper({
                modelValue: [1, 2],
                showStatistics: true,
                showNewBadge: true,
                readonly: false
            })

            expect(wrapper.props('modelValue')).toEqual([1, 2])
            expect(wrapper.props('showStatistics')).toBe(true)
            expect(wrapper.props('showNewBadge')).toBe(true)
            expect(wrapper.props('readonly')).toBe(false)
        })
    })

    // On mobile the allergy panel lands below the list, so a fixed bar
    // summarises the selection and jumps to the panel on tap.
    describe('Sticky Mobile Summary', () => {
        it.each([
            { modelValue: [MILK.id, GLUTEN.id], tickets, expected: true },
            { modelValue: [], tickets, expected: false },
            { modelValue: [MILK.id, GLUTEN.id], tickets: undefined, expected: false }
        ])('bar rendered=$expected with selection=$modelValue', async ({ modelValue, tickets, expected }) => {
            const wrapper = await createWrapper({ modelValue, tickets, showStatistics: true })

            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.summaryBar).exists()).toBe(expected)
        })

        it('summarises the selected count and the kuverter of the diners carrying them', async () => {
            const wrapper = await createWrapper({ modelValue: [MILK.id, GLUTEN.id], showStatistics: true })

            const bar = findByTestId(wrapper, ALLERGY_TEST_IDS.summaryBar)
            expect(bar.text()).toContain('2 valgte')
            expect(bar.text()).toContain(`${formatPortions(1)} kuv.`)
        })
    })
})
