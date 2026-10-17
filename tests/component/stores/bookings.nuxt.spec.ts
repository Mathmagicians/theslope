// @vitest-environment nuxt
import {setActivePinia, createPinia} from 'pinia'
import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest'
import {ref, type MaybeRefOrGetter} from 'vue'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {clearNuxtData} from '#app'
import {getQuery, readBody, type H3Event} from 'h3'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import {ExpenseFactory} from '~~/tests/e2e/testDataFactories/expenseFactory'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {useBookingsStore} from '~/stores/bookings'
import {usePlanStore} from '~/stores/plan'
import {useCookingTeam} from '~/composables/useCookingTeam'
import {COLOR, COMPONENTS, EMPTY_STATE_MESSAGES} from '~/composables/useTheSlopeDesignSystem'
import type {CookingTeamDisplay} from '~/composables/useCookingTeamValidation'
import type {Season} from '~/composables/useSeasonValidation'
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {formatDate} from '~/utils/date'
import {addDays} from 'date-fns'
import {flushPromises} from '@vue/test-utils'
import {asyncDataStatus, resetStores, registerEmptyStoreEndpoints, holdEndpoint} from '~~/tests/component/testHelpers'
const Action = useBookingValidation().BookingActionSchema.enum

const DINNER_ID = 100
const TEAM = SeasonFactory.defaultCookingTeamDisplay({id: 7, name: 'Madhold A - Winter 2026'})

// The test runtime has no session cookie and no /api/_auth endpoint, so the session is the one
// thing faked; the auth, plan and users stores are real
const {session, useUserSession} = await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).mockSession())
mockNuxtImport('useUserSession', () => useUserSession)

// The real showError swaps the test app for the Nuxt error page
const {showErrorSpy} = vi.hoisted(() => ({showErrorSpy: vi.fn()}))
mockNuxtImport('showError', () => showErrorSpy)

// The stores' own datasets answer empty; the routes this spec drives register after, and the last registration answers
registerEmptyStoreEndpoints()

const GONE_DINNER_ID = 404
const goneDinnerEndpoint = vi.fn(() => {
    throw createError({statusCode: 404})
})
registerEndpoint(`/api/admin/dinner-event/${GONE_DINNER_ID}`, goneDinnerEndpoint)

const assignRoleEndpoint = vi.fn()
const updateDinnerEndpoint = vi.fn()
const ordersEndpoint = vi.fn()
const scaffoldEndpoint = vi.fn()
const dailyMaintenanceEndpoint = vi.fn()
const householdBillingEndpoint = vi.fn()
const dinnerEventDetailEndpoint = vi.fn(() => DinnerEventFactory.defaultDinnerEventDetail('gated'))
const billingPeriodDetailEndpoint = vi.fn(() => BillingFactory.defaultSummaryData('gated'))
const invoiceTransactionsEndpoint = vi.fn(() => [])

registerEndpoint('/api/admin/dinner-event/1', dinnerEventDetailEndpoint)
registerEndpoint('/api/admin/billing/periods/1', billingPeriodDetailEndpoint)
registerEndpoint('/api/admin/billing/invoices/1', invoiceTransactionsEndpoint)
const GONE_ID = 404
const notFound = () => {
    throw createError({statusCode: 404})
}
const goneBillingPeriodEndpoint = vi.fn(notFound)
const goneInvoiceEndpoint = vi.fn(notFound)
registerEndpoint(`/api/admin/billing/periods/${GONE_ID}`, goneBillingPeriodEndpoint)
registerEndpoint(`/api/admin/billing/invoices/${GONE_ID}`, goneInvoiceEndpoint)
const billingPeriodsEndpoint = vi.fn(() => [BillingFactory.defaultSummaryData('gated')])
const BILLING_PERIOD_KEY = 'bookings-store-selected-billing-period'
const INVOICE_KEY = 'bookings-store-selected-invoice'
const SEASON_ID = 9
const seasonsEndpoint = vi.fn((): Season[] => [])
const activeSeasonIdEndpoint = vi.fn((): number | null => null)
const seasonByIdEndpoint = vi.fn((): Season | null => null)
registerEndpoint('/api/admin/season/active', activeSeasonIdEndpoint)
registerEndpoint(`/api/admin/season/${SEASON_ID}`, seasonByIdEndpoint)
registerEndpoint('/api/admin/season', seasonsEndpoint)
const SEASON = {...SeasonFactory.defaultSeason('bookings-store'), id: SEASON_ID}
const selectSeason = (dinnerEvents: DinnerEventDisplay[] = []) => {
    seasonsEndpoint.mockReturnValue([SEASON])
    activeSeasonIdEndpoint.mockReturnValue(SEASON_ID)
    seasonByIdEndpoint.mockReturnValue({...SEASON, dinnerEvents})
}
const {TicketTypeSchema} = useBookingValidation()
const TicketType = TicketTypeSchema.enum
// Ids on the season's prices: a waiting-list entry names its price by id, the store reads the ticket type off it
const ticketPrices = SEASON.ticketPrices.map((price, index) => ({...price, id: index + 1}))
const priceOf = (ticketType: typeof TicketType[keyof typeof TicketType]) => ticketPrices.find(price => price.ticketType === ticketType)!.id!
// The session user's household is the households store's default selection
const MY_HOUSEHOLD_ID = UserFactory.defaultUserWithInhabitant('bookings-store').Inhabitant!.household!.id
registerEndpoint(`/api/admin/household/${MY_HOUSEHOLD_ID}`, () => ({...HouseholdFactory.defaultHouseholdDetail('bookings-store'), id: MY_HOUSEHOLD_ID}))
registerEndpoint('/api/admin/billing/periods', billingPeriodsEndpoint)
const currentPeriodEndpoint = vi.fn((): unknown[] => [])
registerEndpoint('/api/admin/billing/current-period', currentPeriodEndpoint)
const waitlistEntriesEndpoint = vi.fn((): unknown[] => [])
registerEndpoint('/api/order/waitlist', waitlistEntriesEndpoint)
registerEndpoint('/api/order', ordersEndpoint)
registerEndpoint(`/api/team/cooking/${DINNER_ID}/assign-role`, {method: 'POST', handler: assignRoleEndpoint})
registerEndpoint(`/api/chef/dinner/${DINNER_ID}`, {method: 'POST', handler: updateDinnerEndpoint})
registerEndpoint('/api/household/order/scaffold', {method: 'POST', handler: scaffoldEndpoint})
registerEndpoint('/api/admin/maintenance/daily', {method: 'POST', handler: dailyMaintenanceEndpoint})
registerEndpoint('/api/billing', householdBillingEndpoint)
registerEndpoint('/api/order/77', () => OrderFactory.defaultOrderDetail('order-history', {id: 77}))

const WAITLIST_DINNER_ID = 1
const extraPortionsEndpoint = vi.fn()
registerEndpoint(`/api/chef/dinner/${WAITLIST_DINNER_ID}/extra-portions`, {method: 'POST', handler: extraPortionsEndpoint})

const failure = () => {
    throw createError({statusCode: 500})
}

const dinnerResponse = (cookingTeam: CookingTeamDisplay | null = TEAM) => ({
    ...DinnerEventFactory.defaultDinnerEventDetail(),
    id: DINNER_ID,
    menuTitle: 'Updated Menu',
    cookingTeamId: cookingTeam?.id ?? null,
    cookingTeam
})

const toastTitles = () => useToast().toasts.value.map(toast => String(toast.title))

const me = UserFactory.defaultUserWithInhabitant('bookings-store')
const ME = me.Inhabitant!.id

let getTeamShortName: ReturnType<typeof useCookingTeam>['getTeamShortName']
beforeAll(() => {
    // One pinia for the file: the Nuxt app keeps one asyncData entry per key across store instances
    setActivePinia(createPinia())
    session.user.value = me
    ;({getTeamShortName} = useCookingTeam())
})

beforeEach(() => {
    clearNuxtData()
    useToast().clear()
    vi.clearAllMocks()
    assignRoleEndpoint.mockImplementation(() => dinnerResponse())
    updateDinnerEndpoint.mockImplementation(() => dinnerResponse())
    scaffoldEndpoint.mockImplementation(() => OrderFactory.defaultScaffoldOrdersResponse({totals: {[Action.BOOK]: 2}}))
    dailyMaintenanceEndpoint.mockImplementation(() => OrderFactory.defaultDailyMaintenanceResult())
})

afterEach(() => {
    seasonsEndpoint.mockReturnValue([])
    activeSeasonIdEndpoint.mockReturnValue(null)
    seasonByIdEndpoint.mockReturnValue(null)
})

describe('Bookings store — updateDinnerEventField', () => {
    it.each([
        {desc: 'vacant chef + team → auto-claims',           chefId: null, team: TEAM as CookingTeamDisplay | null, claimed: true,  claimCalls: 1, expectChef: true,  expectTeam: true,  expectDate: true},
        {desc: 'vacant chef + no team → auto-claims',        chefId: null, team: null,                              claimed: true,  claimCalls: 1, expectChef: true,  expectTeam: false, expectDate: true},
        {desc: 'chef already set → plain "Menu gemt" toast', chefId: ME,   team: TEAM as CookingTeamDisplay | null, claimed: false, claimCalls: 0, expectChef: false, expectTeam: false, expectDate: false}
    ])('$desc', async ({chefId, team, claimed, claimCalls, expectChef, expectTeam, expectDate}) => {
        const dinner = dinnerResponse(team)
        updateDinnerEndpoint.mockImplementation(() => dinner)
        const store = useBookingsStore()

        const result = await store.updateDinnerEventField(DINNER_ID, {menuTitle: 'X'}, chefId)

        expect(result?.dinner.id).toBe(DINNER_ID)
        expect(result?.wasAutoClaimed).toBe(claimed)
        expect(assignRoleEndpoint).toHaveBeenCalledTimes(claimCalls)

        const title = toastTitles().at(-1) ?? ''
        expect(title).toContain('Menu gemt')
        expect(title.includes('chefkok')).toBe(expectChef)
        expect(title.includes(formatDate(dinner.date))).toBe(expectDate)
        if (team) expect(title.includes(getTeamShortName(team.name))).toBe(expectTeam)
        // Full season-suffixed name should never leak — short name only
        if (team) expect(title).not.toContain(team.name)
    })

    it('toggles isDinnerUpdating across the call', async () => {
        const store = useBookingsStore()
        expect(store.isDinnerUpdating).toBe(false)
        const promise = store.updateDinnerEventField(DINNER_ID, {menuTitle: 'X'}, ME)
        expect(store.isDinnerUpdating).toBe(true)
        await promise
        expect(store.isDinnerUpdating).toBe(false)
    })

    it('resolves null and saves nothing when the update fails', async () => {
        updateDinnerEndpoint.mockImplementation(failure)
        const store = useBookingsStore()

        expect(await store.updateDinnerEventField(DINNER_ID, {menuTitle: 'X'}, ME)).toBeNull()
        expect(toastTitles()).not.toContain('Menu gemt')
        expect(store.isDinnerUpdating).toBe(false)
    })
})

const lastQuery = (endpoint: typeof ordersEndpoint) => getQuery(endpoint.mock.calls.at(-1)![0] as H3Event)

describe('Bookings store — orders', () => {
    beforeEach(() => {
        resetStores()
        ordersEndpoint.mockImplementation(() => [OrderFactory.defaultOrder('bookings-store', {dinnerEventId: DINNER_ID})])
    })

    it('loads the orders of the selected dinners, parsed to domain types', async () => {
        const store = useBookingsStore()

        store.loadOrdersForDinners({dinnerEventIds: [DINNER_ID]})

        await vi.waitFor(() => expect(store.orders).toHaveLength(1))
        expect(store.orders[0]!.createdAt).toBeInstanceOf(Date)
        expect(ordersEndpoint).toHaveBeenCalled()
    })

    it('scopes the orders to a household, with provenance', async () => {
        const HOUSEHOLD_ID = 5
        const store = useBookingsStore()

        store.loadOrdersForDinners({dinnerEventIds: [DINNER_ID], householdId: HOUSEHOLD_ID, includeProvenance: true})

        await vi.waitFor(() => expect(lastQuery(ordersEndpoint)).toEqual(
            {dinnerEventIds: String(DINNER_ID), householdId: String(HOUSEHOLD_ID), includeProvenance: 'true'}))
    })

    it('follows the page\'s selection through a getter', async () => {
        const selectedDinnerId = ref(DINNER_ID)
        const store = useBookingsStore()
        store.loadOrdersForDinners(() => ({dinnerEventIds: [selectedDinnerId.value]}))
        await vi.waitFor(() => expect(lastQuery(ordersEndpoint)).toEqual({dinnerEventIds: String(DINNER_ID)}))

        selectedDinnerId.value = DINNER_ID + 1

        await vi.waitFor(() => expect(lastQuery(ordersEndpoint)).toEqual({dinnerEventIds: String(DINNER_ID + 1)}))
    })
})

describe('Bookings store — upcoming orders', () => {
    beforeEach(() => {
        resetStores()
        selectSeason()
        ordersEndpoint.mockImplementation(() => [OrderFactory.defaultOrder('upcoming', {dinnerEventId: DINNER_ID})])
    })

    it.each([
        {scope: 'all households', allHouseholds: true, param: 'allHouseholds', value: 'true'},
        {scope: 'the selected household', allHouseholds: false, param: 'householdId', value: String(MY_HOUSEHOLD_ID)}
    ])('reads the selected season\'s upcoming orders for $scope with their dinner context', async ({allHouseholds, param, value}) => {
        const store = useBookingsStore()

        store.loadUpcomingOrders(allHouseholds)

        await vi.waitFor(() => expect(store.upcomingOrders).toHaveLength(1))
        expect(lastQuery(ordersEndpoint)).toMatchObject({upcomingForSeason: String(SEASON_ID), includeDinnerContext: 'true', [param]: value})
    })

    it('requests nothing without a season', async () => {
        seasonsEndpoint.mockReturnValue([])
        activeSeasonIdEndpoint.mockReturnValue(null)
        const store = useBookingsStore()

        store.loadUpcomingOrders(true)

        await vi.waitFor(() => expect(usePlanStore().isPlanStoreReady).toBe(true))
        expect(store.upcomingOrders).toEqual([])
        expect(ordersEndpoint).not.toHaveBeenCalled()
    })
})

describe('Bookings store — scaffold bookings', () => {
    it('returns the scaffold response and clears the processing flag', async () => {
        const store = useBookingsStore()

        const promise = store.processSingleEventBookings(1, DINNER_ID, [OrderFactory.defaultDesiredOrder({dinnerEventId: DINNER_ID})])
        expect(store.isProcessingBookings).toBe(true)
        const response = await promise

        expect(response.scaffoldResult.totals[Action.BOOK]).toBe(2)
        expect(store.isProcessingBookings).toBe(false)
    })

    it.each([
        {view: 'day', failedOrders: 0, color: COLOR.success, description: 'Anna: 2 tilmeldt d. 01/01/2026'},
        {view: 'grid', failedOrders: 1, color: COLOR.error, description: 'Anna: 2 tilmeldt, 1 opdatering fejlede d. 01/01/2026'}
    ])('reports the result in the toast it is given ($view view, $failedOrders failed)', async ({view, failedOrders, color, description}) => {
        const results = [1, 2].map(dinnerEventId => OrderFactory.defaultBookingResult({inhabitantName: 'Anna', dinnerEventId, action: Action.BOOK}))
        const failed = Array.from({length: failedOrders}, () => OrderFactory.defaultBookingResult({inhabitantName: 'Anna', dinnerEventId: 3, action: Action.BOOK}))
        scaffoldEndpoint.mockImplementation(() => OrderFactory.defaultScaffoldOrdersResponse({totals: {[Action.BOOK]: 2}, results, failed, errored: failed.length}))
        const store = useBookingsStore()

        await store.processSingleEventBookings(1, DINNER_ID, [], false, {title: view, suffix: ' d. 01/01/2026'})

        expect(useToast().toasts.value.at(-1)).toMatchObject({
            title: view,
            description,
            color,
            ui: {description: COMPONENTS.bookingResult.lines}
        })
    })

    it('shows no toast when none is given', async () => {
        const store = useBookingsStore()

        await store.processMultipleEventsBookings(1, [DINNER_ID], [])

        expect(useToast().toasts.value).toHaveLength(0)
    })

    it('reports each person\'s queued places and the queue they left in the toast, one line per person', async () => {
        const anna = {inhabitantId: 1, inhabitantName: 'Anna'}
        const bo = {inhabitantId: 2, inhabitantName: 'Bo'}
        const results = [
            OrderFactory.defaultBookingResult({...anna, dinnerEventId: DINNER_ID, action: Action.QUEUE}),
            OrderFactory.defaultBookingResult({...bo, dinnerEventId: DINNER_ID, action: Action.QUEUE}),
            OrderFactory.defaultBookingResult({...anna, dinnerEventId: DINNER_ID + 1, action: Action.LEAVE})
        ]
        const positions = [
            {inhabitantId: anna.inhabitantId, dinnerEventId: DINNER_ID, isGuestTicket: false, position: 3, ticketType: TicketType.ADULT},
            {inhabitantId: bo.inhabitantId, dinnerEventId: DINNER_ID, isGuestTicket: false, position: 1, ticketType: TicketType.CHILD}
        ]
        scaffoldEndpoint.mockImplementation(() => OrderFactory.defaultScaffoldOrdersResponse({totals: {[Action.QUEUE]: 2, [Action.LEAVE]: 1}, results, positions}))
        const store = useBookingsStore()

        await store.processSingleEventBookings(1, DINNER_ID, [], false, {title: 'day'})

        expect(useToast().toasts.value.at(-1)!.description).toBe('Anna: 1 på ventelisten (Voksen #3), 1 forlod ventelisten\nBo: 1 på ventelisten (Barn #1)')
    })

    it('sends an admin correction as one scaffold with adminBypass, a new guest booked on the household\'s inhabitant', async () => {
        const sent: {query: Record<string, unknown>, body: unknown}[] = []
        scaffoldEndpoint.mockImplementation(async (event: H3Event) => {
            sent.push({query: getQuery(event), body: await readBody(event)})
            return OrderFactory.defaultScaffoldOrdersResponse({totals: {[Action.CANCEL]: 1}})
        })
        const store = useBookingsStore()
        const regular = OrderFactory.defaultDesiredOrder({dinnerEventId: DINNER_ID, orderId: 5, inhabitantId: 2})
        const guest = OrderFactory.defaultDesiredOrder({dinnerEventId: DINNER_ID, inhabitantId: 99, isGuestTicket: true})

        const result = await store.processAdminCorrection(7, DINNER_ID, [regular, guest], 3)

        expect(sent).toEqual([{query: {adminBypass: 'true'}, body: {householdId: 7, dinnerEventIds: [DINNER_ID], orders: [regular, {...guest, inhabitantId: 3}]}}])
        expect(result.totals[Action.CANCEL]).toBe(1)
    })

    it('rethrows a failed scaffold and clears the processing flag', async () => {
        scaffoldEndpoint.mockImplementation(failure)
        const store = useBookingsStore()

        await expect(store.processMultipleEventsBookings(1, [DINNER_ID], [])).rejects.toBeTruthy()
        expect(store.isProcessingBookings).toBe(false)
    })
})

// One write for every booking change: after it, each dataset a booking touches re-reads once
describe('Bookings store — one booking write', () => {
    // A dinner past its booking deadline on view: the household's orders, the tickets for sale, the waiting list and its Detail read it
    const dinner = {...DinnerEventFactory.defaultDinnerEventDisplay('one-write'), id: 1, date: addDays(new Date(), 1)}
    const {OrderStateSchema} = useBookingValidation()
    const queries = (endpoint: typeof ordersEndpoint) => endpoint.mock.calls.map(([event]) => getQuery(event as H3Event))

    beforeEach(() => {
        resetStores()
        selectSeason([dinner])
        ordersEndpoint.mockImplementation(() => [])
    })

    it('a booking save re-reads the household\'s orders, the tickets for sale, the waiting list and the dinner on view, each once', async () => {
        const store = useBookingsStore()
        store.loadOrdersForDinners({dinnerEventIds: [dinner.id], householdId: MY_HOUSEHOLD_ID})
        store.selectDinnerDate(() => new Date(dinner.date))
        await vi.waitFor(() => expect(asyncDataStatus('bookings-store-selected-dinner-event')).toBe('success'))
        await vi.waitFor(() => expect(store.lockStatus.has(dinner.id)).toBe(true))
        await flushPromises()
        ordersEndpoint.mockClear()
        waitlistEntriesEndpoint.mockClear()
        dinnerEventDetailEndpoint.mockClear()

        await store.processSingleEventBookings(MY_HOUSEHOLD_ID, dinner.id, [])

        expect(queries(ordersEndpoint)).toEqual(expect.arrayContaining([
            expect.objectContaining({householdId: String(MY_HOUSEHOLD_ID)}),
            expect.objectContaining({state: OrderStateSchema.enum.RELEASED, allHouseholds: 'true'})
        ]))
        expect(ordersEndpoint).toHaveBeenCalledTimes(2)
        expect(waitlistEntriesEndpoint).toHaveBeenCalledTimes(1)
        expect(dinnerEventDetailEndpoint).toHaveBeenCalledTimes(1)
    })

    // A table shows its loading row while the orders are in flight: for a new selection and for a save's re-read alike
    type Store = ReturnType<typeof useBookingsStore>
    const loadDinner = (store: Store) => store.loadOrdersForDinners({dinnerEventIds: [dinner.id], householdId: MY_HOUSEHOLD_ID})

    it.each([
        {when: 'the orders of a new selection', before: async () => {}, read: loadDinner},
        {when: 'a booking save\'s re-read of the orders', before: async (store: Store) => {
            loadDinner(store)
            await vi.waitFor(() => expect(asyncDataStatus('bookings-store-orders')).toBe('success'))
        }, read: (store: Store) => store.processSingleEventBookings(MY_HOUSEHOLD_ID, dinner.id, [])}
    ])('WHEN $when are on the way THEN the bookings read as reloading, until they land', async ({before, read}) => {
        const store = useBookingsStore()
        await before(store)
        const held = holdEndpoint('/api/order', [])
        // A save still in flight would answer into the next case's datasets
        let pending: unknown
        try {
            pending = read(store)
            await vi.waitFor(() => expect(asyncDataStatus('bookings-store-orders')).toBe('pending'))

            expect(store.isBookingsReloading).toBe(true)

            held.release()
            await vi.waitFor(() => expect(store.isBookingsReloading).toBe(false))
        } finally {
            held.release()
            await Promise.resolve(pending).catch(() => undefined)
            held.unregister()
        }
    })

    it('reads a failed orders read as no longer reloading: the error toast ends the wait', async () => {
        ordersEndpoint.mockImplementation(failure)
        const store = useBookingsStore()

        store.loadOrdersForDinners({dinnerEventIds: [dinner.id], householdId: MY_HOUSEHOLD_ID})

        await vi.waitFor(() => expect(store.isOrdersErrored).toBe(true))
        expect(store.isBookingsReloading).toBe(false)
    })
})

describe('Bookings store — daily maintenance', () => {
    it('keeps the result and reports it in a toast', async () => {
        const store = useBookingsStore()

        await store.runDailyMaintenance()

        expect(store.hasDailyMaintenanceResult).toBe(true)
        expect(store.hasDailyMaintenanceError).toBe(false)
        expect(toastTitles()).toContain('Daglig vedligeholdelse afsluttet')
    })

    it('exposes the error of a failed run', async () => {
        dailyMaintenanceEndpoint.mockImplementation(failure)
        const store = useBookingsStore()

        await store.runDailyMaintenance()

        expect(store.hasDailyMaintenanceError).toBe(true)
        expect(store.hasDailyMaintenanceResult).toBe(false)
        expect(store.dailyMaintenanceError?.message).toBeTruthy()
        expect(toastTitles()).not.toContain('Daglig vedligeholdelse afsluttet')
    })
})

describe('Bookings store — household billing', () => {
    it('reads the billing of the selected household, parsed to domain types', async () => {
        resetStores()
        householdBillingEndpoint.mockImplementation(() => BillingFactory.defaultHouseholdBilling(MY_HOUSEHOLD_ID))
        const store = useBookingsStore()

        store.loadHouseholdBilling()

        await vi.waitFor(() => expect(store.householdBilling?.householdId).toBe(MY_HOUSEHOLD_ID))
        expect(store.householdBilling!.currentPeriod.periodStart).toBeInstanceOf(Date)
        expect(lastQuery(householdBillingEndpoint)).toEqual({householdId: String(MY_HOUSEHOLD_ID)})
    })
})

describe('Bookings store — order detail', () => {
    it('fetchOrderDetail returns the order with its history, parsed to domain types', async () => {
        const store = useBookingsStore()

        const detail = await store.fetchOrderDetail(77)

        expect(detail.id).toBe(77)
        expect(detail.dinnerEvent.date).toBeInstanceOf(Date)
    })
})

describe('Bookings store — gated reads', () => {
    type Store = ReturnType<typeof useBookingsStore>
    const ID = 1

    beforeEach(() => {
        resetStores()
        selectSeason()
        ordersEndpoint.mockImplementation(() => [OrderFactory.defaultOrder('gated', {dinnerEventId: DINNER_ID})])
        householdBillingEndpoint.mockImplementation(() => BillingFactory.defaultHouseholdBilling(MY_HOUSEHOLD_ID))
    })

    const gatedReads = [
        {dataset: 'orders', idleKey: 'bookings-store-orders', requestedKey: 'bookings-store-orders',
            endpoint: ordersEndpoint, request: (store: Store) => store.loadOrdersForDinners({dinnerEventIds: [ID]})},
        {dataset: 'upcoming orders', idleKey: 'bookings-store-upcoming-orders', requestedKey: 'bookings-store-upcoming-orders',
            endpoint: ordersEndpoint, request: (store: Store) => store.loadUpcomingOrders(true)},
        {dataset: 'household billing', idleKey: 'bookings-store-household-billing', requestedKey: 'bookings-store-household-billing',
            endpoint: householdBillingEndpoint, request: (store: Store) => store.loadHouseholdBilling()},
        {dataset: 'billing periods', idleKey: 'bookings-store-billing-periods', requestedKey: 'bookings-store-billing-periods',
            endpoint: billingPeriodsEndpoint, request: (store: Store) => store.loadBillingOverview(() => true)},
        {dataset: 'current period', idleKey: 'bookings-store-current-period', requestedKey: 'bookings-store-current-period',
            endpoint: currentPeriodEndpoint, request: (store: Store) => store.loadBillingOverview(() => true)},
        {dataset: 'selected billing period', idleKey: BILLING_PERIOD_KEY, requestedKey: BILLING_PERIOD_KEY,
            endpoint: billingPeriodDetailEndpoint, request: (store: Store) => {
                store.loadBillingOverview(() => true)
                store.selectBillingPeriod(() => ID)
            }},
        {dataset: 'selected invoice', idleKey: INVOICE_KEY, requestedKey: INVOICE_KEY,
            endpoint: invoiceTransactionsEndpoint, request: (store: Store) => {
                store.loadBillingOverview(() => true)
                store.selectBillingPeriod(() => ID)
                store.selectInvoice(() => ID)
            }}
    ]

    it.each([
        ...gatedReads.map(({dataset, idleKey, endpoint}) => ({dataset, idleKey, endpoint})),
        {dataset: 'released counts', idleKey: 'bookings-store-released-counts', endpoint: ordersEndpoint},
        {dataset: 'waiting list', idleKey: 'bookings-store-waitlist-entries', endpoint: waitlistEntriesEndpoint}
    ])('$dataset is idle and unrequested while its condition is false', async ({idleKey, endpoint}) => {
        const store = useBookingsStore()
        await vi.waitFor(() => expect(usePlanStore().isPlanStoreReady).toBe(true))

        expect(endpoint).not.toHaveBeenCalled()
        expect(asyncDataStatus(idleKey)).toBe('idle')
        expect(store.isBookingsStoreReady).toBe(true)
    })

    it.each(gatedReads)('$dataset fetches once its condition holds', async ({requestedKey, endpoint, request}) => {
        const store = useBookingsStore()

        request(store)

        await vi.waitFor(() => expect(asyncDataStatus(requestedKey)).toBe('success'))
        expect(endpoint).toHaveBeenCalled()
    })

    it('reads unrequested orders as neither loading, errored, loaded nor empty', async () => {
        const store = useBookingsStore()
        await flushPromises()

        expect({
            isOrdersLoading: store.isOrdersLoading,
            isOrdersErrored: store.isOrdersErrored,
            isOrdersInitialized: store.isOrdersInitialized,
            isNoOrders: store.isNoOrders
        }).toEqual({isOrdersLoading: false, isOrdersErrored: false, isOrdersInitialized: false, isNoOrders: false})
    })

    it('is ready once the requested orders have loaded', async () => {
        const store = useBookingsStore()
        store.loadOrdersForDinners({dinnerEventIds: [ID]})
        expect(store.isBookingsStoreReady).toBe(false)

        await vi.waitFor(() => expect(store.isBookingsStoreReady).toBe(true))
        expect(store.isOrdersInitialized).toBe(true)
    })
})

describe('Bookings store — the dinner on the selected date', () => {
    const DETAIL_KEY = 'bookings-store-selected-dinner-event'
    const selectedDinner = {...DinnerEventFactory.defaultDinnerEventDisplay('selected-date'), id: 1}
    const goneDinner = {...selectedDinner, id: GONE_DINNER_ID}
    const dinnerDate = new Date(selectedDinner.date)

    beforeEach(() => {
        resetStores()
        showErrorSpy.mockImplementation((error: {statusCode: number, message: string}) => createError(error))
    })

    it('is idle and unrequested with no date selected', async () => {
        selectSeason([selectedDinner])
        useBookingsStore()

        await vi.waitFor(() => expect(usePlanStore().isPlanStoreReady).toBe(true))
        expect(asyncDataStatus(DETAIL_KEY)).toBe('idle')
        expect(dinnerEventDetailEndpoint).not.toHaveBeenCalled()
    })

    it('loads the Detail of the season\'s dinner on the selected date once the season has loaded', async () => {
        selectSeason([selectedDinner])
        const store = useBookingsStore()

        store.selectDinnerDate(() => dinnerDate)

        await vi.waitFor(() => expect(asyncDataStatus(DETAIL_KEY)).toBe('success'))
        expect(store.selectedDinnerEventId).toBe(selectedDinner.id)
        expect(dinnerEventDetailEndpoint).toHaveBeenCalledTimes(1)
    })

    it('reads idle and unrequested when no dinner falls on the selected date', async () => {
        selectSeason([selectedDinner])
        const store = useBookingsStore()

        store.selectDinnerDate(() => addDays(dinnerDate, 1))

        await vi.waitFor(() => expect(usePlanStore().isSelectedSeasonInitialized).toBe(true))
        await flushPromises()
        expect(store.selectedDinnerEventId).toBeNull()
        expect(asyncDataStatus(DETAIL_KEY)).toBe('idle')
        expect(dinnerEventDetailEndpoint).not.toHaveBeenCalled()
    })

    it('drops the date selection and shows the error page with a dinnerGone line when the dinner no longer exists', async () => {
        selectSeason([goneDinner])
        const store = useBookingsStore()

        store.selectDinnerDate(() => dinnerDate)

        await vi.waitFor(() => expect(showErrorSpy).toHaveBeenCalledTimes(1))
        const shownLines = EMPTY_STATE_MESSAGES.dinnerGone.map(({emoji, text}) => `${emoji} ${text}`)
        expect(shownLines).toContain(showErrorSpy.mock.calls[0]![0].message)
        expect(store.selectedDinnerEventId).toBeNull()
        expect(goneDinnerEndpoint).toHaveBeenCalledTimes(1)
    })
})

describe('Bookings store — the billing selection a getter names', () => {
    type Store = ReturnType<typeof useBookingsStore>
    type Choice = MaybeRefOrGetter<number | null>
    const ID = 1
    const SUMMARY = BillingFactory.defaultSummaryData('selection')

    describe.each([
        {
            dataset: 'billing period', key: BILLING_PERIOD_KEY, toast: 'Kan ikke finde faktureringsperioden',
            detailEndpoint: billingPeriodDetailEndpoint, goneEndpoint: goneBillingPeriodEndpoint, listEndpoint: billingPeriodsEndpoint,
            listWith: (ids: number[]) => billingPeriodsEndpoint.mockReturnValue(ids.map(id => ({...SUMMARY, id}))),
            select: (store: Store, choice: Choice) => {
                store.loadBillingOverview(() => true)
                store.selectBillingPeriod(choice)
            },
            selectedId: (store: Store) => store.selectedBillingPeriodId
        },
        {
            dataset: 'invoice', key: INVOICE_KEY, toast: 'Kan ikke finde fakturaen',
            detailEndpoint: invoiceTransactionsEndpoint, goneEndpoint: goneInvoiceEndpoint, listEndpoint: billingPeriodDetailEndpoint,
            listWith: (ids: number[]) => billingPeriodDetailEndpoint.mockReturnValue({...SUMMARY, invoices: ids.map(id => ({...SUMMARY.invoices[0]!, id}))}),
            select: (store: Store, choice: Choice) => {
                store.loadBillingOverview(() => true)
                store.selectBillingPeriod(() => ID)
                store.selectInvoice(choice)
            },
            selectedId: (store: Store) => store.selectedInvoiceId
        }
    ])('$dataset', ({key, toast, detailEndpoint, goneEndpoint, listEndpoint, listWith, select, selectedId}) => {
        beforeEach(() => {
            resetStores()
            listWith([ID])
        })

        it('a getter naming it loads it, and the choice stays out of the store state', async () => {
            const store = useBookingsStore()

            select(store, () => ID)

            await vi.waitFor(() => expect(asyncDataStatus(key)).toBe('success'))
            expect(selectedId(store)).toBe(ID)
            expect(detailEndpoint).toHaveBeenCalled()
            expect(Object.values(store.$state)).not.toContain(ID)
        })

        it.each([
            {by: 'a getter naming nothing', choice: null},
            {by: 'a getter naming an unknown id', choice: 999}
        ])('$by selects nothing and leaves the dataset idle and unrequested', async ({choice}) => {
            const store = useBookingsStore()

            select(store, () => choice)

            await flushPromises()
            await flushPromises()
            expect(selectedId(store)).toBeNull()
            expect(asyncDataStatus(key)).toBe('idle')
            expect(detailEndpoint).not.toHaveBeenCalled()
        })

        it('follows its getter with no further setter call, and a cleared choice deselects', async () => {
            const store = useBookingsStore()
            const choice = ref<number | null>(ID)

            select(store, choice)
            await vi.waitFor(() => expect(asyncDataStatus(key)).toBe('success'))

            choice.value = null

            await vi.waitFor(() => expect(asyncDataStatus(key)).toBe('idle'))
            expect(selectedId(store)).toBeNull()
        })

        it('one that no longer exists: toasts it, drops the choice and refreshes what it resolves against', async () => {
            listWith([ID, GONE_ID])
            const store = useBookingsStore()
            select(store, () => GONE_ID)

            await vi.waitFor(() => expect(goneEndpoint).toHaveBeenCalledTimes(1))
            await vi.waitFor(() => expect(selectedId(store)).toBeNull())
            await vi.waitFor(() => expect(listEndpoint.mock.calls.length).toBeGreaterThan(1))
            expect(goneEndpoint).toHaveBeenCalledTimes(1)
            expect(toastTitles()).toContain(toast)
        })

        it('after a 404 the page\'s getter still drives the selection', async () => {
            listWith([ID, GONE_ID])
            const store = useBookingsStore()
            const choice = ref<number | null>(GONE_ID)
            select(store, choice)
            await vi.waitFor(() => expect(goneEndpoint).toHaveBeenCalledTimes(1))
            await vi.waitFor(() => expect(selectedId(store)).toBeNull())

            choice.value = ID

            await vi.waitFor(() => expect(asyncDataStatus(key)).toBe('success'))
            expect(selectedId(store)).toBe(ID)
        })
    })
})

describe('Bookings store — tickets for sale and waiting lists on locked dinners', () => {
    const lockedDinner = DinnerEventFactory.defaultDinnerEventDisplay('locked')

    beforeEach(() => {
        resetStores()
        selectSeason([lockedDinner])
        const {OrderStateSchema} = useBookingValidation()
        ordersEndpoint.mockImplementation(() => [
            OrderFactory.defaultOrder('released', {dinnerEventId: lockedDinner.id, state: OrderStateSchema.enum.RELEASED})
        ])
    })

    afterEach(() => {
        waitlistEntriesEndpoint.mockImplementation(() => [])
    })

    it('counts the released tickets of the selected season\'s locked dinners', async () => {
        const store = useBookingsStore()

        await vi.waitFor(() => expect(store.lockStatus.get(lockedDinner.id)?.total).toBe(1))
        expect(lastQuery(ordersEndpoint)).toMatchObject({dinnerEventIds: String(lockedDinner.id), allHouseholds: 'true'})
    })

    it('sizes the waiting lists of the selected season\'s locked dinners and counts each by ticket type', async () => {
        ordersEndpoint.mockImplementation(() => [])
        seasonByIdEndpoint.mockReturnValue({...SEASON, ticketPrices, dinnerEvents: [lockedDinner]})
        const queue = [TicketType.ADULT, TicketType.ADULT, TicketType.CHILD]
        waitlistEntriesEndpoint.mockImplementation(() => queue.map((ticketType, index) =>
            WaitlistFactory.defaultEntry({id: 21 + index, dinnerEventId: lockedDinner.id, ticketPriceId: priceOf(ticketType)})))
        const store = useBookingsStore()
        const queuedFormatted = useBilling().formatTicketCounts({[TicketType.ADULT]: 2, [TicketType.CHILD]: 1})

        await vi.waitFor(() => expect(store.lockStatus.get(lockedDinner.id)).toMatchObject({total: 0, queued: 3, queuedFormatted}))
        expect(lastQuery(waitlistEntriesEndpoint)).toEqual({dinnerEventIds: String(lockedDinner.id)})
    })
})

// ---- Expense lines (the chef's grocery lines on a dinner) ----

const EXPENSE_LINE = ExpenseFactory.defaultExpense({id: 9, dinnerEventId: DINNER_ID, amount: 101200, description: 'Grønt + kolonial'})
const addExpenseEndpoint = vi.fn(() => EXPENSE_LINE)
const removeExpenseEndpoint = vi.fn(() => EXPENSE_LINE)
registerEndpoint(`/api/chef/dinner/${DINNER_ID}/expenses`, {method: 'PUT', handler: addExpenseEndpoint})
registerEndpoint(`/api/chef/dinner/${DINNER_ID}/expenses/${EXPENSE_LINE.id}`, {method: 'DELETE', handler: removeExpenseEndpoint})

describe('Bookings store — expense lines', () => {
    beforeEach(() => {
        addExpenseEndpoint.mockImplementation(() => EXPENSE_LINE)
        removeExpenseEndpoint.mockImplementation(() => EXPENSE_LINE)
    })

    it('adds a line: the parsed line comes back and the toast names it', async () => {
        const store = useBookingsStore()
        const line = await store.addExpense(DINNER_ID, ExpenseFactory.defaultExpenseCreate())
        expect(line).toEqual(EXPENSE_LINE)
        expect(addExpenseEndpoint).toHaveBeenCalledTimes(1)
        expect(toastTitles().at(-1)).toBe('Indkøb gemt')
        expect(store.isDinnerUpdating).toBe(false)
    })

    it('removes a line: the removed line comes back and the toast names it', async () => {
        const store = useBookingsStore()
        const removed = await store.removeExpense(DINNER_ID, EXPENSE_LINE.id)
        expect(removed).toEqual(EXPENSE_LINE)
        expect(removeExpenseEndpoint).toHaveBeenCalledTimes(1)
        expect(toastTitles().at(-1)).toBe('Indkøb slettet')
    })

    it.each([
        {desc: 'add', act: (store: ReturnType<typeof useBookingsStore>) => store.addExpense(DINNER_ID, ExpenseFactory.defaultExpenseCreate()), endpoint: addExpenseEndpoint, title: 'Indkøb gemt'},
        {desc: 'remove', act: (store: ReturnType<typeof useBookingsStore>) => store.removeExpense(DINNER_ID, EXPENSE_LINE.id), endpoint: removeExpenseEndpoint, title: 'Indkøb slettet'}
    ])('resolves null without a success toast when the $desc fails', async ({act, endpoint, title}) => {
        endpoint.mockImplementation(failure)
        const store = useBookingsStore()
        expect(await act(store)).toBeNull()
        expect(toastTitles()).not.toContain(title)
        expect(store.isDinnerUpdating).toBe(false)
    })
})

// ---- Ticket changes (the chef's Billetændringer) ----

const TICKET_CHANGE = OrderFactory.defaultTicketChange()
const ticketChangesEndpoint = vi.fn((event: H3Event) => ({
    dinnerEventId: DINNER_ID,
    since: getQuery(event).since ?? null,
    changes: [TICKET_CHANGE],
    olderCount: 3
}))
registerEndpoint(`/api/chef/dinner/${DINNER_ID}/order-history`, ticketChangesEndpoint)

describe('Bookings store — ticket changes', () => {
    it('reads the changes from a moment and hands back the parsed response', async () => {
        const store = useBookingsStore()
        const since = new Date('2026-04-03T18:00:00Z')
        const response = await store.fetchTicketChanges(DINNER_ID, since)
        expect(response.changes[0]!.timestamp).toBeInstanceOf(Date)
        expect(response.changes[0]).toMatchObject({households: TICKET_CHANGE.households, revenue: TICKET_CHANGE.revenue})
        expect(response.olderCount).toBe(3)
        expect(lastQuery(ticketChangesEndpoint)).toMatchObject({since: since.toISOString()})
    })

    it('reads the whole history without a since', async () => {
        const store = useBookingsStore()
        await store.fetchTicketChanges(DINNER_ID)
        expect(lastQuery(ticketChangesEndpoint)).not.toHaveProperty('since')
    })
})

describe('Bookings store — waiting list', () => {
    const ENTRIES_KEY = 'bookings-store-waitlist-entries'
    // Open for booking: the season's queue sizes stay idle, so the endpoint answers the page's entries alone
    const queuedDinner = {...DinnerEventFactory.defaultDinnerEventDisplay('waitlist'), id: WAITLIST_DINNER_ID, date: addDays(new Date(), SEASON.ticketIsCancellableDaysBefore + 20)}
    const OTHER_HOUSEHOLD_ID = MY_HOUSEHOLD_ID + 1
    // The dinner's queue: another household's adult first, then this household's child
    const QUEUE = [
        WaitlistFactory.defaultEntry({id: 21, dinnerEventId: WAITLIST_DINNER_ID, householdId: OTHER_HOUSEHOLD_ID, ticketPriceId: priceOf(TicketType.ADULT), createdAt: new Date('2026-10-01T10:00:00Z')}),
        WaitlistFactory.defaultEntry({id: 22, dinnerEventId: WAITLIST_DINNER_ID, householdId: MY_HOUSEHOLD_ID, ticketPriceId: priceOf(TicketType.CHILD), createdAt: new Date('2026-10-01T11:00:00Z')})
    ]
    const releasedBodies: unknown[] = []

    beforeEach(() => {
        resetStores()
        selectSeason([queuedDinner])
        seasonByIdEndpoint.mockReturnValue({...SEASON, ticketPrices, dinnerEvents: [queuedDinner]})
        ordersEndpoint.mockImplementation(() => [])
        // The read answers the queue as stored: the position is the client's to derive
        waitlistEntriesEndpoint.mockImplementation(() => [...QUEUE].reverse().map(({position: _position, ...entry}) => entry))
        releasedBodies.length = 0
        extraPortionsEndpoint.mockImplementation(async (event: H3Event) => {
            releasedBodies.push(await readBody(event))
            return WaitlistFactory.defaultAssignmentResult({
                dinnerEventId: WAITLIST_DINNER_ID,
                assigned: [1, 2].map(entryId => ({entryId, inhabitantId: entryId, isGuestTicket: false, portions: 1, orderId: 100 + entryId, ticketPriceId: 1})),
                portionsUsed: 2,
                waiting: 1
            })
        })
    })

    it('reads every household\'s entries on the dinners the page shows, parsed to domain types, and derives the household\'s place within its ticket type\'s line: the adult ahead waits in another line', async () => {
        const store = useBookingsStore()

        store.loadOrdersForDinners({dinnerEventIds: [WAITLIST_DINNER_ID]})

        await vi.waitFor(() => expect(store.waitlistEntries).toHaveLength(QUEUE.length))
        expect(store.waitlistEntries[0]!.createdAt).toBeInstanceOf(Date)
        expect(lastQuery(waitlistEntriesEndpoint)).toEqual({dinnerEventIds: String(WAITLIST_DINNER_ID)})
        await vi.waitFor(() => expect(store.householdWaitlist).toHaveLength(1))
        expect(store.householdWaitlist[0]).toMatchObject({id: 22, position: 1})
    })

    it('stays idle and unrequested while the page shows no dinners', async () => {
        const store = useBookingsStore()

        store.loadOrdersForDinners({dinnerEventIds: []})

        await vi.waitFor(() => expect(usePlanStore().isPlanStoreReady).toBe(true))
        await flushPromises()
        expect(asyncDataStatus(ENTRIES_KEY)).toBe('idle')
        expect(waitlistEntriesEndpoint).not.toHaveBeenCalled()
    })

    it('derives the queue on the dinner on view: its size, its portion need and one line per ticket type', async () => {
        const store = useBookingsStore()

        store.loadOrdersForDinners({dinnerEventIds: [WAITLIST_DINNER_ID]})
        store.selectDinnerDate(() => new Date(queuedDinner.date))

        await vi.waitFor(() => expect(store.selectedDinnerWaitlist).toMatchObject({dinnerEventId: WAITLIST_DINNER_ID, entries: 2, portions: 1.5}))
        expect(store.selectedDinnerWaitlist!.lines.map(({ticketType, entries}) => [ticketType, entries.map(entry => entry.id)]))
            .toEqual([[TicketType.ADULT, [21]], [TicketType.CHILD, [22]]])
    })

    it('releases portions, toasts the tickets handed out and the entries still waiting, and re-reads the queue', async () => {
        const store = useBookingsStore()
        store.loadOrdersForDinners({dinnerEventIds: [WAITLIST_DINNER_ID]})
        await vi.waitFor(() => expect(waitlistEntriesEndpoint).toHaveBeenCalledTimes(1))

        const result = await store.addExtraPortions(WAITLIST_DINNER_ID, 2.5)

        expect(result?.assigned).toHaveLength(2)
        expect(releasedBodies).toEqual([{portions: 2.5}])
        expect(String(useToast().toasts.value.at(-1)?.description)).toMatch(/2 .*1 /)
        expect(waitlistEntriesEndpoint).toHaveBeenCalledTimes(2)
    })
})
