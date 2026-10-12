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
import {COMPONENTS} from '~/composables/useTheSlopeDesignSystem'
import {useBookingValidation} from '~/composables/useBookingValidation'
import type {OrderDetail} from '~/composables/useBookingValidation'
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'
import type {HouseholdDisplay} from '~/composables/useCoreValidation'

// nuxt-auth-utils has no session in the test environment; the households store reads only while logged in
const {session, useUserSession} = await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).mockSession())
mockNuxtImport('useUserSession', () => useUserSession)
session.loggedIn.value = true

const {TicketTypeSchema, DinnerModeSchema} = useBookingValidation()
const TicketType = TicketTypeSchema.enum
const DinnerMode = DinnerModeSchema.enum

const GLUTEN: AllergyTypeDisplay = {id: 1, name: 'Gluten', description: 'Cøliaki', icon: '🌾'}
const MILK: AllergyTypeDisplay = {id: 2, name: 'Mælk', description: 'Laktoseintolerans', icon: '🥛'}

const ORDERS: OrderDetail[] = [
    OrderFactory.defaultOrderDetailWithAllergies(1, 'Anna', [GLUTEN], {dinnerMode: DinnerMode.DINEIN, ticketType: TicketType.ADULT}),
    OrderFactory.defaultOrderDetailWithAllergies(2, 'Bo', [MILK], {dinnerMode: DinnerMode.DINEIN, ticketType: TicketType.CHILD}),
    OrderFactory.defaultOrderDetailWithAllergies(3, 'Per', [], {dinnerMode: DinnerMode.TAKEAWAY, ticketType: TicketType.ADULT})
]

const HOUSEHOLDS: HouseholdDisplay[] = [{
    ...HouseholdFactory.defaultHouseholdData('kitchen'),
    id: 1,
    shortName: 'S_31',
    inhabitants: ORDERS.map(order => ({...HouseholdFactory.defaultInhabitantData(`kitchen-${order.inhabitantId}`), id: order.inhabitantId, householdId: 1}))
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

describe('KitchenPreparation fourth box', () => {
    const WAITLIST_BOX = 'kitchen-box-waitlist'
    const mountWith = async (waitlist: ReturnType<typeof WaitlistFactory.defaultQueueSummary> | null) => {
        const wrapper = await mountWithTooltipProvider(KitchenPreparation, {props: {orders: ORDERS, allergens: [], waitlist}, isMd: true})
        await flushPromises()
        return wrapper
    }

    it('GIVEN a queue with entries THEN the box reads VENTELISTE with the queue size, on the TIL SALG surface, and TIL SALG is gone', async () => {
        const queue = WaitlistFactory.defaultQueueSummary({entries: 4, portions: 2.5})
        const wrapper = await mountWith(queue)

        const box = findByTestId(wrapper, WAITLIST_BOX)
        expect(box.text()).toContain('VENTELISTE')
        expect(box.text()).toContain(String(queue.entries))
        expect(box.classes()).toEqual(expect.arrayContaining(COMPONENTS.kitchenPanel.WAITLIST.split(' ')))
        expect(findByTestId(wrapper, PANEL('RELEASED')).exists()).toBe(false)
    })

    it.each([
        {desc: 'an empty queue', waitlist: WaitlistFactory.defaultQueueSummary({entries: 0, portions: 0})},
        {desc: 'no queue read', waitlist: null}
    ])('GIVEN $desc THEN the box reads TIL SALG', async ({waitlist}) => {
        const wrapper = await mountWith(waitlist)

        expect(findByTestId(wrapper, PANEL('RELEASED')).text()).toContain('TIL SALG')
        expect(findByTestId(wrapper, WAITLIST_BOX).exists()).toBe(false)
    })
})
