// @vitest-environment nuxt
import {describe, it, expect, beforeAll, beforeEach, afterEach} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {mountWithTooltipProvider, findByTestId, findAllByTestId, clickByTestId, resetStores, registerEmptyStoreEndpoints, iconNamesIn} from '~~/tests/component/testHelpers'
import ChefMenuCard from '~/components/chef/ChefMenuCard.vue'
import AllergyTypeDisplay from '~/components/allergy/AllergyTypeDisplay.vue'
import AllergenMultiSelector from '~/components/allergy/AllergenMultiSelector.vue'
import {nextTick, type ComponentPublicInstance} from 'vue'
import {flushPromises, enableAutoUnmount, type VueWrapper} from '@vue/test-utils'
import {useAllergiesStore} from '~/stores/allergies'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {formatPortions} from '~/utils/utils'
import {formatDate, DATE_SETTINGS} from '~/utils/date'
import {FORM_MODES} from '~/types/form'
import {ICONS, getRandomEmptyMessage} from '~/composables/useTheSlopeDesignSystem'
import {WAITLIST_TEST_IDS} from '../dinner/waitlistTestIds'
import {SUPPLY_WORDS} from '~/composables/useBookingUi'

/**
 * ChefMenuCard: the allergen line and its editor over the dinner's allergens (the catalog's `id`, not a join row's
 * `allergyTypeId`), the action row, the chef portrait, the Madbestilling row and the extra-portions form.
 * Real component tree and real stores (testing.md Rule 6); only HTTP is faked.
 */
registerEmptyStoreEndpoints()
registerEndpoint('/api/admin/allergy-type', () => AllergyFactory.createMockAllergyTypesWithInhabitants())

// The next test's resetStores drops the datasets a still-mounted card reads
enableAutoUnmount(afterEach)

beforeEach(() => {
    resetStores()
})

// The allergen section renders over the catalog the store holds
const mountCard = async (props: Record<string, unknown>) => {
    await useAllergiesStore().loadAllergyTypes()
    return mountWithTooltipProvider(ChefMenuCard, {props, isMd: true})
}

describe('ChefMenuCard', () => {
    // @nuxt/test-utils 4 starts Nuxt in beforeAll: composables run there, not in the describe body
    let defaultDeadlines: ReturnType<ReturnType<typeof useSeason>['deadlinesForSeason']>
    beforeAll(() => {
        const {deadlinesForSeason} = useSeason()
        defaultDeadlines = deadlinesForSeason(SeasonFactory.defaultSeason(), new Date())
    })

    const createWrapper = (props: Record<string, unknown> = {}) => mountCard({
        dinnerEvent: DinnerEventFactory.defaultDinnerEventDetail(),
        deadlines: defaultDeadlines,
        formMode: FORM_MODES.EDIT,
        showAllergens: true,
        ...props
    })

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

    // The selector opens behind "Rediger allergener"
    const openAllergenEditor = async (wrapper: Awaited<ReturnType<typeof createWrapper>>) => {
        await clickByTestId(wrapper, 'edit-allergens')
        return wrapper.findComponent(AllergenMultiSelector)
    }

    describe('Empty Allergens', () => {
        it('handles dinner event without allergens array', async () => {
            const dinnerEvent = {
                ...DinnerEventFactory.defaultDinnerEventDetail(),
                allergens: undefined
            }

            const wrapper = await createWrapper({dinnerEvent})
            expect(findByTestId(wrapper, ALLERGEN_LINE).text()).toContain(getRandomEmptyMessage('noAllergens', new Date()).text)

            // An empty selection, no crash
            const selector = await openAllergenEditor(wrapper)
            expect(selector.props('modelValue')).toEqual([])
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

        // The line renders the same in both modes; EDIT only adds the Rediger allergener button
        it('GIVEN a menu with milk and gluten THEN shows the total and each menu allergen as its compact allergy type with its kuverter, a zero included, under the Allergener title its glyph leads', async () => {
            const dinnerEvent = {...DinnerEventFactory.defaultDinnerEventDetail(), allergens: [MILK!, GLUTEN!], tickets}
            const wrapper = await createWrapper({dinnerEvent, formMode: FORM_MODES.VIEW})

            const overview = findByTestId(wrapper, ALLERGEN_OVERVIEW)
            expect(overview.findAll(':scope > span').map(part => part.text())).toEqual([
                `${formatPortions(1.5)} kuv.`,
                '|',
                `${MILK!.icon}${MILK!.name} · ${formatPortions(1.5)}`,
                '|',
                `${GLUTEN!.icon}${GLUTEN!.name} · ${formatPortions(0)}`
            ])
            const allergens = overview.findAllComponents(AllergyTypeDisplay) as VueWrapper<ComponentPublicInstance<{allergyType: unknown, compact: boolean, showName: boolean}>>[]
            expect(allergens.map(allergen => allergen.props('allergyType'))).toEqual([expect.objectContaining(MILK!), expect.objectContaining(GLUTEN!)])
            expect(allergens.every(allergen => allergen.props('compact') && allergen.props('showName'))).toBe(true)

            const label = findByTestId(wrapper, ALLERGEN_LABEL)
            expect(label.text()).toBe('Allergener')
            expect(label.element.firstElementChild).toBe(label.findComponent({name: 'UIcon'}).element)
            expect(iconNamesIn(label)).toEqual([ICONS.allergy])
            expect(iconNamesIn(overview)).not.toContain(ICONS.allergy)
        })

        it('GIVEN a menu without allergens THEN reads the no-allergens message', async () => {
            const dinnerEvent = {...DinnerEventFactory.defaultDinnerEventDetail(), allergens: [], tickets}
            const wrapper = await createWrapper({dinnerEvent, formMode: FORM_MODES.VIEW})

            expect(findByTestId(wrapper, ALLERGEN_LINE).text()).toContain(getRandomEmptyMessage('noAllergens', new Date()).text)
            expect(findByTestId(wrapper, ALLERGEN_OVERVIEW).exists()).toBe(false)
        })

        it('hands the allergen editor each allergen id, not a join row allergyTypeId, and the dinner tickets', async () => {
            const dinnerEvent = {...DinnerEventFactory.defaultDinnerEventDetail(), allergens: [MILK!, GLUTEN!], tickets}
            const wrapper = await createWrapper({dinnerEvent})

            const selector = await openAllergenEditor(wrapper)
            expect(selector.props('modelValue')).toEqual([MILK!.id, GLUTEN!.id])
            expect(selector.props('tickets')).toHaveLength(tickets.length)
        })
    })

    describe('Menu action row (EDIT mode)', () => {
        it('shows a labelled primary edit, secondary publish, and a quiet overflow trigger that keeps the cancel-dinner action', async () => {
            const wrapper = await createWrapper()

            // The primary action is labelled, the overflow trigger is the quiet icon-only one
            expect(findByTestId(wrapper, 'edit-menu').text()).toContain('Rediger menu')
            expect(wrapper.find('[name="announce-dinner"]').text()).toContain('Publicer')
            expect(findByTestId(wrapper, 'dinner-more-actions').exists()).toBe(true)

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
        it('hides the allergen line when showAllergens is off', async () => {
            const dinnerEvent = createDinnerEventWithAllergens([1, 2])
            const wrapper = await createWrapper({dinnerEvent, formMode: FORM_MODES.VIEW, showAllergens: false})

            expect(findByTestId(wrapper, ALLERGEN_LINE).exists()).toBe(false)
        })
    })

    describe('Chef portrait', () => {
        const chef ={id: 7, heynaboId: 7, householdId: 1, name: 'Anna', lastName: 'Kok', pictureUrl: null, birthDate: null}

        it('renders a wanted poster without a chef, the chef glyph as its hat', async () => {
            const dinnerEvent = {...DinnerEventFactory.defaultDinnerEventDetail(), chef: null}
            const wrapper = await createWrapper({dinnerEvent, formMode: FORM_MODES.VIEW})

            expect(iconNamesIn(findByTestId(wrapper, 'chef-wanted'))).toContain(ICONS.chef)
        })

        it('renders the chef', async () => {
            const dinnerEvent = {...DinnerEventFactory.defaultDinnerEventDetail(), chef}
            const wrapper = await createWrapper({dinnerEvent, formMode: FORM_MODES.VIEW})

            expect(findByTestId(wrapper, 'chef-display').exists()).toBe(true)
        })
    })
})

// ---- Madbestilling: the chef's grocery lines sit with the other edits as one row, the editor behind its button ----

describe('ChefMenuCard — Madbestilling', () => {
    let deadlines: ReturnType<ReturnType<typeof useSeason>['deadlinesForSeason']>
    beforeAll(() => {
        deadlines = useSeason().deadlinesForSeason(SeasonFactory.defaultSeason(), new Date())
    })

    const mountChefCard = (props: Record<string, unknown> = {}) => mountCard({
        dinnerEvent: DinnerEventFactory.defaultDinnerEventDetail(),
        deadlines,
        formMode: FORM_MODES.EDIT,
        showStateControls: true,
        ...props
    })

    it('GIVEN the chef\'s card WHEN rendering THEN the Madbestilling row sits above the Budget pane and the stepper', async () => {
        const wrapper = await mountChefCard()
        const html = wrapper.html()
        const lines = html.indexOf('data-testid="chef-expenses-section"')
        const budget = html.indexOf('name="toggle-budget-details"')
        expect(lines).toBeGreaterThan(-1)
        expect(budget).toBeGreaterThan(lines)
        expect(findByTestId(wrapper, 'expense-row').text()).toContain('Madbestilling')
        expect(findByTestId(wrapper, 'expense-empty').text()).toBe('Madbestilling mangler')
        expect(findByTestId(wrapper, 'expense-edit').text()).toContain('Rediger madbestilling')
    })

    it('GIVEN a team member in view mode WHEN rendering THEN the row shows without its button', async () => {
        const wrapper = await mountChefCard({formMode: FORM_MODES.VIEW})
        expect(findByTestId(wrapper, 'expense-row').exists()).toBe(true)
        expect(findByTestId(wrapper, 'expense-edit').exists()).toBe(false)
    })

    it('GIVEN a card without state controls WHEN rendering THEN no Madbestilling section shows', async () => {
        const wrapper = await mountChefCard({showStateControls: false})
        expect(findByTestId(wrapper, 'chef-expenses-section').exists()).toBe(false)
    })

    it('GIVEN the lines WHEN they emit add and remove THEN the card bubbles add-expense and remove-expense', async () => {
        const wrapper = await mountChefCard()
        const lines = wrapper.findComponent({name: 'ExpenseLines'})
        lines.vm.$emit('add', {amount: 126500})
        lines.vm.$emit('remove', 9)
        expect(wrapper.emitted('add-expense')).toEqual([[{amount: 126500}]])
        expect(wrapper.emitted('remove-expense')).toEqual([[9]])
    })

    it('GIVEN a round of several dinners WHEN the editor opens THEN the hint reads Rådighedsbeløb and the round as a sentence', async () => {
        const team = SeasonFactory.defaultCookingTeamDisplay({name: 'Madhold 2'})
        const roundRows = [
            {dinnerEventId: 1, date: new Date('2026-04-12T18:00:00'), menuTitle: 'Lasagne', isCurrent: true, budgetGross: 10000, spentGross: 4000},
            {dinnerEventId: 2, date: new Date('2026-04-13T18:00:00'), menuTitle: 'Risotto', isCurrent: false, budgetGross: 10000, spentGross: 0}
        ]
        const wrapper = await mountChefCard({
            dinnerEvent: {...DinnerEventFactory.defaultDinnerEventDetail(), cookingTeam: team, cookingTeamId: team.id},
            roundRows,
            teamNumber: 2
        })
        await clickByTestId(wrapper, 'expense-edit')
        await flushPromises()
        await wrapper.vm.$nextTick()
        expect(findByTestId(wrapper, 'expense-table').text()).toContain('Rådighedsbeløb')
        const [first, last] = roundRows.map(row => formatDate(row.date, DATE_SETTINGS.DAY_MONTH_MASK))
        expect(findByTestId(wrapper, 'expense-hint-heading').text()).toBe(`${useCookingTeam().getTeamShortName('Madhold 2')}, periode ${first}-${last}`)
        expect(findAllByTestId(wrapper, 'expense-hint-row')).toHaveLength(6)
    })
})

// ---- Frigiv portioner: the chef releases portions to the queue from the Flere menu or from the queue's CTA ----

describe('ChefMenuCard — release portions', () => {
    let deadlines: ReturnType<ReturnType<typeof useSeason>['deadlinesForSeason']>
    beforeAll(() => {
        deadlines = useSeason().deadlinesForSeason(SeasonFactory.defaultSeason(), new Date())
    })

    const QUEUE = WaitlistFactory.defaultQueueSummary({entries: 4, portions: 2.5})

    const mountChefCard = (waitlist: ReturnType<typeof WaitlistFactory.defaultQueueSummary> | null) =>
        mountCard({dinnerEvent: DinnerEventFactory.defaultDinnerEventDetail(), deadlines, formMode: FORM_MODES.EDIT, waitlist})

    const submitRelease = async (wrapper: Awaited<ReturnType<typeof mountChefCard>>) => {
        await clickByTestId(wrapper, WAITLIST_TEST_IDS.extraPortionsSubmit)
        await flushPromises()
        await nextTick()
    }

    it.each([
        {desc: 'a queue with entries', waitlist: QUEUE, cta: true},
        {desc: 'an empty queue', waitlist: WaitlistFactory.defaultQueueSummary({entries: 0, portions: 0}), cta: false},
        {desc: 'no queue read', waitlist: null, cta: false}
    ])('GIVEN $desc THEN the CTA under the action row shows: $cta', async ({waitlist, cta}) => {
        const wrapper = await mountChefCard(waitlist)

        expect(findByTestId(wrapper, WAITLIST_TEST_IDS.extraPortionsCta).exists()).toBe(cta)
    })

    it('GIVEN two adults and two children waiting THEN the alert names the waiting list per ticket type with its portions', async () => {
        const {TicketTypeSchema} = useBookingValidation()
        const lineOf = (ticketType: typeof TicketTypeSchema.enum[keyof typeof TicketTypeSchema.enum], ids: number[]) =>
            ({ticketType, entries: ids.map(id => WaitlistFactory.defaultEntry({id}))})
        const queue = WaitlistFactory.defaultQueueSummary({entries: 4, portions: 3, lines: [
            lineOf(TicketTypeSchema.enum.ADULT, [1, 3]), lineOf(TicketTypeSchema.enum.CHILD, [2, 4])
        ]})
        const queuedFormatted = useBilling().formatTicketCounts({[TicketTypeSchema.enum.ADULT]: 2, [TicketTypeSchema.enum.CHILD]: 2})

        const wrapper = await mountChefCard(queue)

        expect(findByTestId(wrapper, WAITLIST_TEST_IDS.chefAlert).text())
            .toContain(`${SUPPLY_WORDS.queuedCount(queuedFormatted)} · ${formatPortions(queue.portions)} portioner`)
    })

    it.each([
        {trigger: 'the Flere entry', open: async (wrapper: Awaited<ReturnType<typeof mountChefCard>>) => {
            await clickByTestId(wrapper, 'dinner-more-actions')
            await flushPromises()
            await clickByTestId(wrapper, WAITLIST_TEST_IDS.extraPortionsEntry)
        }},
        {trigger: 'the CTA', open: (wrapper: Awaited<ReturnType<typeof mountChefCard>>) => clickByTestId(wrapper, WAITLIST_TEST_IDS.extraPortionsCta)}
    ])('$trigger opens the release form prefilled with the queue\'s portion need, and Frigiv emits the portions', async ({open}) => {
        const wrapper = await mountChefCard(QUEUE)
        expect(findByTestId(wrapper, WAITLIST_TEST_IDS.extraPortionsForm).exists()).toBe(false)

        await open(wrapper)

        const form = findByTestId(wrapper, WAITLIST_TEST_IDS.extraPortionsForm)
        expect((form.find('input').element as HTMLInputElement).value).toBe(String(QUEUE.portions))
        await submitRelease(wrapper)
        expect(wrapper.emitted('extra-portions')).toEqual([[QUEUE.portions]])
        expect(findByTestId(wrapper, WAITLIST_TEST_IDS.extraPortionsForm).exists()).toBe(false)
    })

    it('Fortryd closes the form without releasing', async () => {
        const wrapper = await mountChefCard(QUEUE)
        await clickByTestId(wrapper, WAITLIST_TEST_IDS.extraPortionsCta)

        await clickByTestId(wrapper, WAITLIST_TEST_IDS.extraPortionsCancel)

        expect(findByTestId(wrapper, WAITLIST_TEST_IDS.extraPortionsForm).exists()).toBe(false)
        expect(wrapper.emitted('extra-portions')).toBeUndefined()
    })

    it('a draft above the release limit blocks the emit', async () => {
        const wrapper = await mountChefCard(QUEUE)
        await clickByTestId(wrapper, WAITLIST_TEST_IDS.extraPortionsCta)

        await findByTestId(wrapper, WAITLIST_TEST_IDS.extraPortionsForm).find('input').setValue('1000')
        await submitRelease(wrapper)

        expect(wrapper.emitted('extra-portions')).toBeUndefined()
    })
})
