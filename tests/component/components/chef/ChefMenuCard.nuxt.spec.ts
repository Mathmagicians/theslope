// @vitest-environment nuxt
import {describe, it, expect, vi, beforeAll} from 'vitest'
import {mountSuspended, mockNuxtImport, mockComponent} from '@nuxt/test-utils/runtime'
import {findByTestId, clickByTestId} from '~~/tests/component/testHelpers'
import ChefMenuCard from '~/components/chef/ChefMenuCard.vue'
import AllergyTypeDisplay from '~/components/allergy/AllergyTypeDisplay.vue'
import {ref, h, type ComponentPublicInstance} from 'vue'
import {flushPromises, type VueWrapper} from '@vue/test-utils'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {formatPortions} from '~/utils/utils'
import {FORM_MODES} from '~/types/form'
import {COMPONENTS, ICONS, getRandomEmptyMessage} from '~/composables/useTheSlopeDesignSystem'

/**
 * ChefMenuCard Unit Tests
 *
 * Focus: Allergen ID extraction from dinner event
 * The bug fix: allergens array contains AllergyType objects with `id`,
 * NOT join table objects with `allergyTypeId`
 */

// Mock stores
mockNuxtImport('useAllergiesStore', () => {
    return () => ({
        allergyTypes: ref(AllergyFactory.createMockAllergyTypesWithInhabitants()),
        isAllergyTypesInitialized: ref(true)
    })
})

mockNuxtImport('usePlanStore', () => {
    return () => ({
        assignRoleToDinner: vi.fn()
    })
})

mockNuxtImport('useAuthStore', () => {
    return () => ({
        user: ref({Inhabitant: {id: 1, name: 'Test User'}})
    })
})

// Mock complex child components
mockComponent('AllergenMultiSelector', {
    props: ['modelValue', 'allergyTypes', 'tickets'],
    emits: ['update:modelValue'],
    setup(props) {
        return () => h('div', {'data-testid': 'allergen-selector'}, [
            h('span', `Selected: ${props.modelValue?.join(', ') || 'none'}`),
            h('span', `Tickets: ${props.tickets?.length ?? 'none'}`)
        ])
    }
})

mockComponent('DinnerBookingForm', {
    props: ['household', 'dinnerEvent', 'orders', 'ticketPrices', 'mode'],
    setup() {
        return () => h('div', {'data-testid': 'booking-form'}, 'Booking Form')
    }
})

describe('ChefMenuCard', () => {
    // @nuxt/test-utils 4 starts Nuxt in beforeAll: composables run there, not in the describe body
    let defaultDeadlines: ReturnType<ReturnType<typeof useSeason>['deadlinesForSeason']>
    beforeAll(() => {
        const {deadlinesForSeason} = useSeason()
        defaultDeadlines = deadlinesForSeason(SeasonFactory.defaultSeason())
    })

    // DRY: Create wrapper with defaults
    const createWrapper = async (props: Record<string, unknown> = {}) => {
        return await mountSuspended(ChefMenuCard, {
            props: {
                dinnerEvent: DinnerEventFactory.defaultDinnerEventDetail(),
                deadlines: defaultDeadlines,
                formMode: FORM_MODES.EDIT,
                showAllergens: true,
                ...props
            },
            global: {
                provide: {
                    isMd: ref(true)
                }
            }
        })
    }

    // Factory: Create dinner event with allergens
    const createDinnerEventWithAllergens = (allergenIds: number[]) => ({
        ...DinnerEventFactory.defaultDinnerEventDetail(),
        allergens: allergenIds.map(id => ({
            id,
            name: `Allergen ${id}`,
            description: `Description for allergen ${id}`,
            icon: '🥜'
        }))
    })

    const ALLERGEN_LINE = 'chef-allergen-line'
    const ALLERGEN_OVERVIEW = 'chef-allergen-overview'
    const ALLERGEN_LABEL = 'chef-allergen-label'
    const ALLERGEN_SELECTOR = 'allergen-selector'

    // The selector opens behind "Rediger allergener"
    const openAllergenEditor = async (wrapper: Awaited<ReturnType<typeof createWrapper>>) => {
        await clickByTestId(wrapper, 'edit-allergens')
        return findByTestId(wrapper, ALLERGEN_SELECTOR)
    }

    describe('Allergen ID Extraction', () => {
        it.each([
            {
                name: 'single allergen',
                allergenIds: [1],
                expectedIds: [1]
            },
            {
                name: 'multiple allergens',
                allergenIds: [1, 3, 5],
                expectedIds: [1, 3, 5]
            },
            {
                name: 'empty allergens',
                allergenIds: [],
                expectedIds: []
            }
        ])('extracts $name correctly', async ({allergenIds, expectedIds}) => {
            const dinnerEvent = createDinnerEventWithAllergens(allergenIds)
            const wrapper = await createWrapper({dinnerEvent})

            // The AllergenMultiSelector should receive the extracted IDs
            const selector = await openAllergenEditor(wrapper)
            expect(selector.exists()).toBe(true)

            // Verify the text shows the correct IDs
            const text = selector.text()
            if (expectedIds.length === 0) {
                expect(text).toContain('none')
            } else {
                expectedIds.forEach(id => {
                    expect(text).toContain(String(id))
                })
            }
        })

        it('uses id property NOT allergyTypeId (bug fix verification)', async () => {
            // This test verifies the bug fix: we use a.id not a.allergyTypeId
            const dinnerEvent = {
                ...DinnerEventFactory.defaultDinnerEventDetail(),
                allergens: [
                    {id: 42, name: 'Test Allergen', description: 'Test', icon: '🥜'}
                ]
            }

            const wrapper = await createWrapper({dinnerEvent})
            const selector = await openAllergenEditor(wrapper)

            // Should show id=42, not undefined (which would happen with allergyTypeId)
            expect(selector.text()).toContain('42')
            expect(selector.text()).not.toContain('undefined')
        })
    })

    describe('Empty Allergens', () => {
        it('handles dinner event without allergens array', async () => {
            const dinnerEvent = {
                ...DinnerEventFactory.defaultDinnerEventDetail(),
                allergens: undefined
            }

            const wrapper = await createWrapper({dinnerEvent})
            expect(findByTestId(wrapper, ALLERGEN_LINE).text()).toContain(getRandomEmptyMessage('noAllergens').text)

            // Should show empty selection, not crash
            const selector = await openAllergenEditor(wrapper)
            expect(selector.text()).toContain('none')
        })
    })

    describe('Allergen line', () => {
        const {TicketTypeSchema} = useBookingValidation()
        const TicketType = TicketTypeSchema.enum
        const [MILK, NUTS, GLUTEN] = AllergyFactory.createMockAllergyTypesWithInhabitants()
        // Adult 1 kuv., child 0,5; Cy carries only an allergen the menu does not name
        const tickets = [
            OrderFactory.defaultOrderDetailWithAllergies(1, 'Anna', [MILK!], {ticketType: TicketType.ADULT}),
            OrderFactory.defaultOrderDetailWithAllergies(2, 'Bo', [MILK!, NUTS!], {ticketType: TicketType.CHILD}),
            OrderFactory.defaultOrderDetailWithAllergies(3, 'Cy', [NUTS!], {ticketType: TicketType.ADULT})
        ]

        it.each([FORM_MODES.VIEW, FORM_MODES.EDIT])('GIVEN a menu with milk and gluten in %s mode THEN shows the total and each menu allergen as its compact allergy type with its kuverter, a zero included', async (formMode) => {
            const dinnerEvent = {...DinnerEventFactory.defaultDinnerEventDetail(), allergens: [MILK!, GLUTEN!], tickets}
            const wrapper = await createWrapper({dinnerEvent, formMode})

            const overview = findByTestId(wrapper, ALLERGEN_OVERVIEW)
            expect(overview.findAll(':scope > span').map(part => part.text())).toEqual([
                `${formatPortions(1.5)} kuv.`,
                `| ${MILK!.icon}${MILK!.name} · ${formatPortions(1.5)}`,
                `| ${GLUTEN!.icon}${GLUTEN!.name} · ${formatPortions(0)}`
            ])
            const allergens = overview.findAllComponents(AllergyTypeDisplay) as VueWrapper<ComponentPublicInstance<{allergyType: unknown, compact: boolean, showName: boolean}>>[]
            expect(allergens.map(allergen => allergen.props('allergyType'))).toEqual([expect.objectContaining(MILK!), expect.objectContaining(GLUTEN!)])
            expect(allergens.every(allergen => allergen.props('compact') && allergen.props('showName'))).toBe(true)
        })

        it.each([FORM_MODES.VIEW, FORM_MODES.EDIT])('GIVEN a menu with milk in %s mode THEN the allergy glyph leads the Allergener title and the overview carries none', async (formMode) => {
            const dinnerEvent = {...DinnerEventFactory.defaultDinnerEventDetail(), allergens: [MILK!], tickets}
            const wrapper = await createWrapper({dinnerEvent, formMode})

            const label = findByTestId(wrapper, ALLERGEN_LABEL)
            expect(label.text()).toBe('Allergener')
            expect(label.element.firstElementChild).toBe(label.findComponent({name: 'UIcon'}).element)
            expect(label.findComponent({name: 'UIcon'}).props('name')).toBe(ICONS.allergy)
            const icons = findByTestId(wrapper, ALLERGEN_OVERVIEW).findAllComponents({name: 'UIcon'}) as VueWrapper<ComponentPublicInstance<{name: string}>>[]
            expect(icons.filter(icon => icon.props('name') === ICONS.allergy)).toHaveLength(0)
        })

        it('GIVEN a menu without allergens THEN reads the no-allergens message', async () => {
            const dinnerEvent = {...DinnerEventFactory.defaultDinnerEventDetail(), allergens: [], tickets}
            const wrapper = await createWrapper({dinnerEvent, formMode: FORM_MODES.VIEW})

            expect(findByTestId(wrapper, ALLERGEN_LINE).text()).toContain(getRandomEmptyMessage('noAllergens').text)
            expect(findByTestId(wrapper, ALLERGEN_OVERVIEW).exists()).toBe(false)
        })

        it('hands the dinner tickets to the allergen editor', async () => {
            const dinnerEvent = {...DinnerEventFactory.defaultDinnerEventDetail(), allergens: [MILK!], tickets}
            const wrapper = await createWrapper({dinnerEvent})

            const selector = await openAllergenEditor(wrapper)
            expect(selector.text()).toContain(`Tickets: ${tickets.length}`)
        })
    })

    describe('Menu action row (EDIT mode)', () => {
        it('shows a labelled primary edit, secondary publish, and a quiet overflow trigger', async () => {
            const wrapper = await createWrapper()

            // Primary action is labelled (no longer a bare pencil icon)
            expect(findByTestId(wrapper, 'edit-menu').text()).toContain('Rediger menu')
            expect(wrapper.find('[name="announce-dinner"]').text()).toContain('Publicer')
            // Overflow trigger is the quiet icon-only "..." (no label)
            expect(findByTestId(wrapper, 'dinner-more-actions').exists()).toBe(true)
        })

        it('keeps the cancel-dinner action behind the overflow panel', async () => {
            const wrapper = await createWrapper()

            // Danger zone is collapsed by default - cancel action is not in the DOM
            expect(findByTestId(wrapper, 'dinner-danger-zone').exists()).toBe(false)

            // Opening the overflow panel reveals the danger zone
            await clickByTestId(wrapper, 'dinner-more-actions')
            await flushPromises()

            const dangerZone = findByTestId(wrapper, 'dinner-danger-zone')
            expect(dangerZone.exists()).toBe(true)
            expect(dangerZone.text()).toContain('Aflys middagen')
        })
    })

    describe('Mode Rendering', () => {
        it.each([
            {formMode: FORM_MODES.EDIT, showAllergens: true, shouldShowAllergenLine: true},
            {formMode: FORM_MODES.VIEW, showAllergens: true, shouldShowAllergenLine: true},
            {formMode: FORM_MODES.VIEW, showAllergens: false, shouldShowAllergenLine: false}
        ])('renders allergen display with formMode=$formMode showAllergens=$showAllergens', async ({formMode, showAllergens, shouldShowAllergenLine}) => {
            const dinnerEvent = createDinnerEventWithAllergens([1, 2])
            const wrapper = await createWrapper({dinnerEvent, formMode, showAllergens})

            expect(findByTestId(wrapper, ALLERGEN_LINE).exists()).toBe(shouldShowAllergenLine)
        })
    })

    describe('Chef portrait', () => {
        type IconWrapper = VueWrapper<ComponentPublicInstance<{name: string}>>
        const chef = {id: 7, heynaboId: 7, householdId: 1, name: 'Anna', lastName: 'Kok', pictureUrl: null, birthDate: null}
        const classesOf = (token: string) => token.split(' ')

        it.each([
            {name: 'a wanted poster without a chef', chef: null, testId: 'chef-wanted', framed: true},
            {name: 'the chef without a poster frame', chef, testId: 'chef-display', framed: false}
        ])('renders $name', async ({chef: dinnerChef, testId, framed}) => {
            const dinnerEvent = {...DinnerEventFactory.defaultDinnerEventDetail(), chef: dinnerChef}
            const wrapper = await createWrapper({dinnerEvent, formMode: FORM_MODES.VIEW})

            const portrait = findByTestId(wrapper, testId)
            expect(portrait.classes()).toEqual(expect.arrayContaining(classesOf(COMPONENTS.wantedPoster.trigger)))
            const frameClasses = classesOf(COMPONENTS.wantedPoster.frame)
            expect(frameClasses.every(name => portrait.classes().includes(name))).toBe(framed)
        })

        it('renders the chef glyph as the hat on the wanted poster', async () => {
            const wrapper = await createWrapper({formMode: FORM_MODES.VIEW})

            const icons = findByTestId(wrapper, 'chef-wanted').findAllComponents({name: 'UIcon'})
            const hat = icons.find((icon: IconWrapper) => icon.props('name') === ICONS.chef)
            expect(hat).toBeDefined()
            expect(hat!.classes()).toEqual(expect.arrayContaining(classesOf(COMPONENTS.wantedPoster.hat)))
        })
    })
})
