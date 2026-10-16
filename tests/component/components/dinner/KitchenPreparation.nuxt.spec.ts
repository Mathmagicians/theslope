// @vitest-environment nuxt
/**
 * KitchenPreparation - the kitchen stats on /chef and /dinner.
 *
 * Real component, real households store, real design system (testing.md Rule 6); only HTTP and the
 * session are faked. The households store resolves each order's household for the expanded list.
 */
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {nextTick, type ComponentPublicInstance} from 'vue'
import {flushPromises, type VueWrapper} from '@vue/test-utils'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import KitchenPreparation from '~/components/dinner/KitchenPreparation.vue'
import AllergyTypeDisplayComponent from '~/components/allergy/AllergyTypeDisplay.vue'
import {mountWithTooltipProvider, findByTestId, clickByTestId} from '~~/tests/component/testHelpers'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {ICONS} from '~/composables/useTheSlopeDesignSystem'
import {useBookingValidation} from '~/composables/useBookingValidation'
import type {OrderDetail} from '~/composables/useBookingValidation'
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'
import {getHouseholdShortName, type HouseholdDisplay} from '~/composables/useCoreValidation'

// nuxt-auth-utils has no session in the test environment; the households store reads only while logged in
const {session, useUserSession} = await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).mockSession())
mockNuxtImport('useUserSession', () => useUserSession)
session.loggedIn.value = true

const {TicketTypeSchema, DinnerModeSchema, OrderStateSchema} = useBookingValidation()
const TicketType = TicketTypeSchema.enum
const DinnerMode = DinnerModeSchema.enum
const OrderState = OrderStateSchema.enum

const GLUTEN: AllergyTypeDisplay = {id: 1, name: 'Gluten', description: 'Cøliaki', icon: '🌾'}
const MILK: AllergyTypeDisplay = {id: 2, name: 'Mælk', description: 'Laktoseintolerans', icon: '🥛'}

const ORDERS: OrderDetail[] = [
    OrderFactory.defaultOrderDetailWithAllergies(1, 'Anna', [GLUTEN], {dinnerMode: DinnerMode.DINEIN, ticketType: TicketType.ADULT}),
    OrderFactory.defaultOrderDetailWithAllergies(2, 'Bo', [MILK], {dinnerMode: DinnerMode.DINEIN, ticketType: TicketType.CHILD}),
    OrderFactory.defaultOrderDetailWithAllergies(3, 'Per', [], {dinnerMode: DinnerMode.TAKEAWAY, ticketType: TicketType.ADULT})
]

// A released ticket for sale; on the waiting list two children of the diners' household and an adult of a neighbour
const SALE_ORDER = OrderFactory.defaultOrderDetailWithAllergies(4, 'Maria', [], {dinnerMode: DinnerMode.DINEIN, ticketType: TicketType.ADULT, state: OrderState.RELEASED})
const QUEUED = {knud: {id: 11, name: 'Knud', householdId: 2}, emil: {id: 12, name: 'Emil', householdId: 1}, liva: {id: 13, name: 'Liva', householdId: 1}}
const queuedIn = (householdId: number) => Object.values(QUEUED).filter(person => person.householdId === householdId)
    .map(({id, name}) => ({...HouseholdFactory.defaultInhabitantData(`kitchen-${id}`), id, name, householdId}))

const HOUSEHOLDS: HouseholdDisplay[] = [{
    ...HouseholdFactory.defaultHouseholdData('kitchen'),
    id: 1,
    shortName: 'S_31',
    inhabitants: [
        ...[...ORDERS, SALE_ORDER].map(order => ({...HouseholdFactory.defaultInhabitantData(`kitchen-${order.inhabitantId}`), id: order.inhabitantId, householdId: 1})),
        ...queuedIn(1)
    ]
}, {
    ...HouseholdFactory.defaultHouseholdData('kitchen-neighbour'),
    id: 2,
    address: 'Nørrevang 12',
    shortName: 'N_12',
    inhabitants: queuedIn(2)
}] as HouseholdDisplay[]

registerEndpoint('/api/admin/household', () => HOUSEHOLDS)

const PANEL = (mode: string) => `kitchen-panel-${mode}`
const ALLERGY_HEAD = 'kitchen-allergy-head'
const ALLERGY_OVERVIEW = 'kitchen-allergy-overview'
const HOUSEHOLD_LIST = 'kitchen-household-list'

const mountKitchen = async (allergens: AllergyTypeDisplay[] = [GLUTEN, MILK]) => {
    const wrapper = await mountWithTooltipProvider(KitchenPreparation, {props: {orders: ORDERS, allergens}, isMd: true})
    await flushPromises()
    await nextTick()
    return wrapper
}

describe('KitchenPreparation allergy line', () => {
    let wrapper: Awaited<ReturnType<typeof mountKitchen>>

    beforeEach(async () => {
        wrapper = await mountKitchen()
    })

    const allergiesIn = (element: ReturnType<typeof findByTestId>) =>
        element.findAllComponents(AllergyTypeDisplayComponent) as VueWrapper<ComponentPublicInstance<{allergyType: AllergyTypeDisplay, compact: boolean, showName: boolean}>>[]
    // The list opens with the overview line; a diner's allergy types are the ones outside it
    const allergiesInDinersOf = (list: ReturnType<typeof findByTestId>) => {
        const overview = findByTestId(list, ALLERGY_OVERVIEW)
        return allergiesIn(list).filter(allergy => !overview.exists() || !overview.element.contains(allergy.element))
    }
    const allergenNamesIn = (list: ReturnType<typeof findByTestId>) => allergiesInDinersOf(list).map(allergy => allergy.props('allergyType').name)

    describe('GIVEN SPISESAL with an allergic adult and an allergic child', () => {
        it('THEN the panel head shows the allergy kuverter and no diner names', () => {
            const panel = findByTestId(wrapper, PANEL(DinnerMode.DINEIN))
            expect(findByTestId(panel, ALLERGY_HEAD).text()).toBe('1,5 kuv.')
            expect(panel.text()).not.toContain('Anna')
        })

        it('WHEN the panel opens THEN the overview lists the total and each menu allergen as its compact allergy type with its kuverter, in menu order', async () => {
            await clickByTestId(wrapper, PANEL(DinnerMode.DINEIN))
            const overview = findByTestId(wrapper, ALLERGY_OVERVIEW)
            expect(overview.findAll(':scope > span').map(part => part.text())).toEqual(['1,5 kuv.', `| ${GLUTEN.icon}Gluten · 1`, `| ${MILK.icon}Mælk · 0,5`])
            const allergies = allergiesIn(overview)
            expect(allergies.map(allergy => allergy.props('allergyType'))).toEqual([expect.objectContaining(GLUTEN), expect.objectContaining(MILK)])
            expect(allergies.every(allergy => allergy.props('compact') && allergy.props('showName'))).toBe(true)
        })

        it('WHEN the panel opens THEN each allergic diner carries one compact allergy type with its name per allergy, no badge, no tooltip', async () => {
            await clickByTestId(wrapper, PANEL(DinnerMode.DINEIN))
            const list = findByTestId(wrapper, HOUSEHOLD_LIST)
            const allergies = allergiesInDinersOf(list)
            expect(allergenNamesIn(list)).toEqual([GLUTEN.name, MILK.name])
            expect(allergies.map(allergy => allergy.text())).toEqual([GLUTEN, MILK].map(({icon, name}) => `${icon}${name}`))
            expect(allergies.every(allergy => allergy.props('compact') && allergy.props('showName'))).toBe(true)
            expect(list.findAllComponents({name: 'UBadge'})).toHaveLength(0)
            expect(list.findAllComponents({name: 'UTooltip'})).toHaveLength(0)
        })
    })

    describe('GIVEN TAKEAWAY without an allergic diner', () => {
        it('THEN the panel head has no allergy line', () => {
            expect(findByTestId(findByTestId(wrapper, PANEL(DinnerMode.TAKEAWAY)), ALLERGY_HEAD).exists()).toBe(false)
        })

        it('WHEN the panel opens THEN the list has no overview and no allergy types', async () => {
            await clickByTestId(wrapper, PANEL(DinnerMode.TAKEAWAY))
            const list = findByTestId(wrapper, HOUSEHOLD_LIST)
            expect(list.text()).toContain('Per')
            expect(findByTestId(wrapper, ALLERGY_OVERVIEW).exists()).toBe(false)
            expect(allergiesIn(list)).toHaveLength(0)
        })
    })

    describe.each([
        {menu: 'a menu without allergens', allergens: []},
        {menu: 'a menu whose allergen nobody carries', allergens: [{...GLUTEN, id: 99, name: 'Sesam'}]}
    ])('GIVEN SPISESAL with allergic diners and $menu', ({allergens}) => {
        beforeEach(async () => {
            wrapper = await mountKitchen(allergens)
        })

        it('THEN the panel head has no allergy line', () => {
            expect(findByTestId(findByTestId(wrapper, PANEL(DinnerMode.DINEIN)), ALLERGY_HEAD).exists()).toBe(false)
        })

        it('WHEN the panel opens THEN the list has no overview and no allergy types', async () => {
            await clickByTestId(wrapper, PANEL(DinnerMode.DINEIN))
            const list = findByTestId(wrapper, HOUSEHOLD_LIST)
            expect(list.text()).toContain('Anna')
            expect(findByTestId(wrapper, ALLERGY_OVERVIEW).exists()).toBe(false)
            expect(allergiesIn(list)).toHaveLength(0)
        })
    })

    it('GIVEN a menu with milk only WHEN SPISESAL opens THEN only the milk diner carries an allergy type and the head counts milk', async () => {
        wrapper = await mountKitchen([MILK])
        expect(findByTestId(findByTestId(wrapper, PANEL(DinnerMode.DINEIN)), ALLERGY_HEAD).text()).toBe('0,5 kuv.')
        await clickByTestId(wrapper, PANEL(DinnerMode.DINEIN))
        expect(allergenNamesIn(findByTestId(wrapper, HOUSEHOLD_LIST))).toEqual([MILK.name])
    })
})

describe('KitchenPreparation TIL SALG box', () => {
    const FOR_SALE = PANEL(OrderState.RELEASED)
    const WAITLIST_PART = 'kitchen-waitlist-part'
    const WAITLIST_LINES = 'kitchen-waitlist-lines'
    const [OWN, NEIGHBOUR] = HOUSEHOLDS.map(household => getHouseholdShortName(household.address))
    const entryOf = (inhabitantId: number, minute: number) =>
        WaitlistFactory.defaultEntry({id: inhabitantId, inhabitantId, createdAt: new Date(2026, 9, 19, 12, minute)})
    // One adult and two children waiting, the lines in ticket type order and each in join order
    const QUEUE = WaitlistFactory.defaultQueueSummary({
        entries: 3,
        portions: 2,
        lines: [
            {ticketType: TicketType.ADULT, entries: [entryOf(QUEUED.knud.id, 3)]},
            {ticketType: TicketType.CHILD, entries: [entryOf(QUEUED.emil.id, 1), entryOf(QUEUED.liva.id, 2)]}
        ]
    })
    const CHILD_QUEUE = WaitlistFactory.defaultQueueSummary({entries: 2, portions: 1, lines: QUEUE.lines.filter(line => line.ticketType === TicketType.CHILD)})

    const mountWith = async (waitlist: ReturnType<typeof WaitlistFactory.defaultQueueSummary> | null, orders: OrderDetail[] = ORDERS) => {
        const wrapper = await mountWithTooltipProvider(KitchenPreparation, {props: {orders, allergens: [], waitlist}, isMd: true})
        await flushPromises()
        return wrapper
    }

    // A waiting-list row as the other boxes' household rows read: household, ticket count, each person with the place in its line
    const householdRowsIn = (lines: ReturnType<typeof findByTestId>) =>
        lines.findAll('[data-testid="kitchen-waitlist-household"]').map(row => row.findAll('span').map(segment => segment.text()))
    const iconsIn = (element: ReturnType<typeof findByTestId>) =>
        (element.findAllComponents({name: 'UIcon'}) as VueWrapper<ComponentPublicInstance<{name: string}>>[]).map(icon => icon.props('name'))

    it('GIVEN one adult and two children waiting THEN TIL SALG carries the waiting-list part with the queue\'s kuverter and its ticket count', async () => {
        const wrapper = await mountWith(QUEUE)

        const box = findByTestId(wrapper, FOR_SALE)
        expect(box.text()).toContain('TIL SALG')
        const part = findByTestId(box, WAITLIST_PART)
        for (const text of ['VENTELISTE', '2 kuv.', 'Voksen: 1', 'Barn: 2', 'Baby: 0', '# 3']) expect(part.text()).toContain(text)
        expect(part.text()).not.toContain('%')
    })

    it('GIVEN a queue THEN each part of TIL SALG carries its icon beside its kuverter, as the allergy line does: the released icon, the hourglass', async () => {
        const wrapper = await mountWith(QUEUE)

        // The line that reads exactly the kuverter: an icon renders no text
        const kuverterLine = (element: ReturnType<typeof findByTestId>, kuverter: string) =>
            element.findAll('div').find(line => line.text() === kuverter)!
        const box = findByTestId(wrapper, FOR_SALE)
        expect(iconsIn(kuverterLine(box, '0 kuv.'))).toEqual([ICONS.released])
        expect(iconsIn(kuverterLine(findByTestId(box, WAITLIST_PART), '2 kuv.'))).toEqual([ICONS.waitlist])
    })

    it.each([
        {desc: 'an empty queue', waitlist: WaitlistFactory.defaultQueueSummary({entries: 0, portions: 0, lines: []})},
        {desc: 'no queue read', waitlist: null}
    ])('GIVEN $desc THEN TIL SALG has no waiting-list part', async ({waitlist}) => {
        const wrapper = await mountWith(waitlist)

        expect(findByTestId(wrapper, FOR_SALE).text()).toContain('TIL SALG')
        expect(findByTestId(wrapper, WAITLIST_PART).exists()).toBe(false)
    })

    it('GIVEN a ticket for sale and children waiting WHEN TIL SALG opens THEN the TIL SALG heading and the seller\'s row come first, then the VENTELISTE heading and the household\'s children in join order', async () => {
        const wrapper = await mountWith(CHILD_QUEUE, [...ORDERS, SALE_ORDER])
        await clickByTestId(wrapper, FOR_SALE)

        const list = findByTestId(wrapper, HOUSEHOLD_LIST)
        const lines = findByTestId(list, WAITLIST_LINES)
        expect(householdRowsIn(lines)).toEqual([[OWN, '·', '2B', '·', `${QUEUED.emil.name} (B #1), ${QUEUED.liva.name} (B #2)`]])
        const text = list.text()
        expect(text.indexOf('TIL SALG')).toBeLessThan(text.indexOf(SALE_ORDER.inhabitant.name))
        expect(text.indexOf(SALE_ORDER.inhabitant.name)).toBeLessThan(text.indexOf('VENTELISTE'))
    })

    it('GIVEN nothing for sale and a queue across two households WHEN TIL SALG opens THEN the list holds one row per household, in the order their first member joined', async () => {
        const wrapper = await mountWith(QUEUE)
        await clickByTestId(wrapper, FOR_SALE)

        const list = findByTestId(wrapper, HOUSEHOLD_LIST)
        expect(householdRowsIn(findByTestId(list, WAITLIST_LINES))).toEqual([
            [OWN, '·', '2B', '·', `${QUEUED.emil.name} (B #1), ${QUEUED.liva.name} (B #2)`],
            [NEIGHBOUR, '·', '1V', '·', `${QUEUED.knud.name} (V #1)`]
        ])
        expect(list.text()).not.toContain('Anna')
    })
})
