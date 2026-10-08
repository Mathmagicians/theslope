// @vitest-environment nuxt
/**
 * KitchenPreparation - the kitchen stats on /chef and /dinner.
 *
 * Real component, real households store, real design system (testing.md Rule 6); only HTTP and the
 * session are faked. The households store resolves each order's household for the expanded list.
 */
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {nextTick} from 'vue'
import {flushPromises} from '@vue/test-utils'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import KitchenPreparation from '~/components/dinner/KitchenPreparation.vue'
import {mountWithTooltipProvider, findByTestId, clickByTestId} from '~~/tests/component/testHelpers'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'
import type {OrderDetail} from '~/composables/useBookingValidation'
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'
import type {HouseholdDisplay} from '~/composables/useCoreValidation'

// nuxt-auth-utils has no session in the test environment; the households store reads only while logged in
mockNuxtImport('useUserSession', () => () => ({
    loggedIn: ref(true),
    user: ref(null),
    session: ref(null),
    clear: vi.fn(),
    fetch: vi.fn()
}))

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

const mountKitchen = async () => {
    const wrapper = await mountWithTooltipProvider(KitchenPreparation, {props: {orders: ORDERS}, isMd: true})
    await flushPromises()
    await nextTick()
    return wrapper
}

describe('KitchenPreparation allergy line', () => {
    let wrapper: Awaited<ReturnType<typeof mountKitchen>>

    beforeEach(async () => {
        wrapper = await mountKitchen()
    })

    describe('GIVEN SPISESAL with an allergic adult and an allergic child', () => {
        it('THEN the panel head shows the allergy kuverter and no diner names', () => {
            const panel = findByTestId(wrapper, PANEL(DinnerMode.DINEIN))
            expect(findByTestId(panel, ALLERGY_HEAD).text()).toBe('1,5 kuv.')
            expect(panel.text()).not.toContain('Anna')
        })

        it('WHEN the panel opens THEN the overview lists the total and each allergen by kuverter, most first', async () => {
            await clickByTestId(wrapper, PANEL(DinnerMode.DINEIN))
            const parts = findByTestId(wrapper, ALLERGY_OVERVIEW).findAll(':scope > span').map(part => part.text())
            expect(parts).toEqual(['1,5 kuv.', '| Gluten · 1', '| Mælk · 0,5'])
        })

        it('WHEN the panel opens THEN each allergic diner carries a chip per allergy, named by its aria-label', async () => {
            await clickByTestId(wrapper, PANEL(DinnerMode.DINEIN))
            const list = findByTestId(wrapper, HOUSEHOLD_LIST)
            expect(list.findAll('[aria-label]').map(chip => chip.attributes('aria-label'))).toEqual([GLUTEN.name, MILK.name])
        })
    })

    describe('GIVEN TAKEAWAY without an allergic diner', () => {
        it('THEN the panel head has no allergy line', () => {
            expect(findByTestId(findByTestId(wrapper, PANEL(DinnerMode.TAKEAWAY)), ALLERGY_HEAD).exists()).toBe(false)
        })

        it('WHEN the panel opens THEN the list has no overview and no chips', async () => {
            await clickByTestId(wrapper, PANEL(DinnerMode.TAKEAWAY))
            const list = findByTestId(wrapper, HOUSEHOLD_LIST)
            expect(list.text()).toContain('Per')
            expect(findByTestId(wrapper, ALLERGY_OVERVIEW).exists()).toBe(false)
            expect(list.findAll('[aria-label]')).toHaveLength(0)
        })
    })
})
