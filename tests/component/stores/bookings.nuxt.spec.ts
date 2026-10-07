// @vitest-environment nuxt
import {setActivePinia, createPinia} from 'pinia'
import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest'
import {ref, computed} from 'vue'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {clearNuxtData} from '#app'
import {getQuery, type H3Event} from 'h3'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import {useBookingsStore} from '~/stores/bookings'
import {usePlanStore} from '~/stores/plan'
import {useCookingTeam} from '~/composables/useCookingTeam'
import {useBooking} from '~/composables/useBooking'
import {COLOR, EMPTY_STATE_MESSAGES} from '~/composables/useTheSlopeDesignSystem'
import type {CookingTeamDisplay} from '~/composables/useCookingTeamValidation'
import type {UserDetail} from '~/composables/useCoreValidation'
import type {Season} from '~/composables/useSeasonValidation'
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {formatDate} from '~/utils/date'
import {flushPromises} from '@vue/test-utils'
import {asyncDataStatus, resetStores} from '~~/tests/component/testHelpers'

const DINNER_ID = 100
const TEAM = SeasonFactory.defaultCookingTeamDisplay({id: 7, name: 'Madhold A - Winter 2026'})

// The test runtime has no session cookie and no /api/_auth endpoint, so the session is the one
// thing faked; the auth, plan and users stores are real
const {session} = vi.hoisted(() => ({session: {} as {user: {value: UserDetail | null}}}))
mockNuxtImport('useUserSession', () => {
    session.user = ref<UserDetail | null>(null)
    return () => ({
        loggedIn: computed(() => session.user.value !== null),
        user: session.user,
        session: ref(null),
        clear: vi.fn(),
        fetch: vi.fn()
    })
})

// The real showError swaps the test app for the Nuxt error page
const {showErrorSpy} = vi.hoisted(() => ({showErrorSpy: vi.fn()}))
mockNuxtImport('showError', () => showErrorSpy)

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
// The session user's household is the households store's default selection
const MY_HOUSEHOLD_ID = UserFactory.defaultUserWithInhabitant('bookings-store').Inhabitant!.household!.id
registerEndpoint(`/api/admin/household/${MY_HOUSEHOLD_ID}`, () => ({...HouseholdFactory.defaultHouseholdDetail('bookings-store'), id: MY_HOUSEHOLD_ID}))
registerEndpoint('/api/admin/household', () => [])
registerEndpoint('/api/team/my', () => [])
registerEndpoint('/api/admin/users/by-role/ALLERGYMANAGER', () => [])
registerEndpoint('/api/admin/users', () => [])
registerEndpoint('/api/admin/billing/periods', () => [])
registerEndpoint('/api/admin/billing/current-period', () => [])
registerEndpoint('/api/order', ordersEndpoint)
registerEndpoint(`/api/team/cooking/${DINNER_ID}/assign-role`, {method: 'POST', handler: assignRoleEndpoint})
registerEndpoint(`/api/chef/dinner/${DINNER_ID}`, {method: 'POST', handler: updateDinnerEndpoint})
registerEndpoint('/api/household/order/scaffold', {method: 'POST', handler: scaffoldEndpoint})
registerEndpoint('/api/admin/maintenance/daily', {method: 'POST', handler: dailyMaintenanceEndpoint})
registerEndpoint('/api/billing', householdBillingEndpoint)
registerEndpoint('/api/order/77', () => OrderFactory.defaultOrderDetail('order-history', {id: 77}))

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
let formatScaffoldResult: ReturnType<typeof useBooking>['formatScaffoldResult']
beforeAll(() => {
    // One pinia for the file: the Nuxt app keeps one asyncData entry per key across store instances
    setActivePinia(createPinia())
    session.user.value = me
    ;({getTeamShortName} = useCookingTeam())
    ;({formatScaffoldResult} = useBooking())
})

beforeEach(() => {
    clearNuxtData()
    useToast().clear()
    vi.clearAllMocks()
    assignRoleEndpoint.mockImplementation(() => dinnerResponse())
    updateDinnerEndpoint.mockImplementation(() => dinnerResponse())
    scaffoldEndpoint.mockImplementation(() => OrderFactory.defaultScaffoldOrdersResponse({created: 2}))
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

        expect(response.scaffoldResult.created).toBe(2)
        expect(store.isProcessingBookings).toBe(false)
    })

    it.each([
        {view: 'day', errored: 0, color: COLOR.success},
        {view: 'grid', errored: 1, color: COLOR.error}
    ])('reports the result in the toast it is given ($view view, errored $errored)', async ({view, errored, color}) => {
        const response = OrderFactory.defaultScaffoldOrdersResponse({created: 2, errored})
        scaffoldEndpoint.mockImplementation(() => response)
        const store = useBookingsStore()

        await store.processSingleEventBookings(1, DINNER_ID, [], false, {title: view, suffix: ' d. 01/01/2026'})

        expect(useToast().toasts.value.at(-1)).toMatchObject({
            title: view,
            description: `${formatScaffoldResult(response.scaffoldResult, 'past')} d. 01/01/2026`,
            color
        })
    })

    it('shows no toast when none is given', async () => {
        const store = useBookingsStore()

        await store.processMultipleEventsBookings(1, [DINNER_ID], [])

        expect(useToast().toasts.value).toHaveLength(0)
    })

    it('rethrows a failed scaffold and clears the processing flag', async () => {
        scaffoldEndpoint.mockImplementation(failure)
        const store = useBookingsStore()

        await expect(store.processMultipleEventsBookings(1, [DINNER_ID], [])).rejects.toBeTruthy()
        expect(store.isProcessingBookings).toBe(false)
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
        {dataset: 'selected dinner event', idleKey: 'dinner-event-detail-null', requestedKey: `dinner-event-detail-${ID}`,
            endpoint: dinnerEventDetailEndpoint, request: (store: Store) => store.loadDinnerEventDetail(ID)},
        {dataset: 'household billing', idleKey: 'bookings-store-household-billing', requestedKey: 'bookings-store-household-billing',
            endpoint: householdBillingEndpoint, request: (store: Store) => store.loadHouseholdBilling()},
        {dataset: 'selected billing period', idleKey: 'billing-period-null', requestedKey: `billing-period-${ID}`,
            endpoint: billingPeriodDetailEndpoint, request: (store: Store) => store.loadBillingPeriodDetail(ID)},
        {dataset: 'selected invoice', idleKey: 'invoice-transactions-null', requestedKey: `invoice-transactions-${ID}`,
            endpoint: invoiceTransactionsEndpoint, request: (store: Store) => store.loadInvoiceTransactions(ID)}
    ]

    it.each([
        ...gatedReads.map(({dataset, idleKey, endpoint}) => ({dataset, idleKey, endpoint})),
        {dataset: 'released counts', idleKey: 'bookings-store-released-counts', endpoint: ordersEndpoint}
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

describe('Bookings store — a selected dinner that no longer exists', () => {
    beforeEach(() => {
        resetStores()
        showErrorSpy.mockImplementation((error: {statusCode: number, message: string}) => createError(error))
    })

    it('drops the dinner selection and shows the error page with a dinnerGone line', async () => {
        const store = useBookingsStore()

        store.loadDinnerEventDetail(GONE_DINNER_ID)

        await vi.waitFor(() => expect(showErrorSpy).toHaveBeenCalledTimes(1))
        const shownLines = EMPTY_STATE_MESSAGES.dinnerGone.map(({emoji, text}) => `${emoji} ${text}`)
        expect(shownLines).toContain(showErrorSpy.mock.calls[0]![0].message)
        expect(store.selectedDinnerEventId).toBeNull()
        expect(goneDinnerEndpoint).toHaveBeenCalledTimes(1)
    })
})

describe('Bookings store — released tickets on locked dinners', () => {
    const lockedDinner = DinnerEventFactory.defaultDinnerEventDisplay('locked')

    beforeEach(() => {
        resetStores()
        selectSeason([lockedDinner])
        const {OrderStateSchema} = useBookingValidation()
        ordersEndpoint.mockImplementation(() => [
            OrderFactory.defaultOrder('released', {dinnerEventId: lockedDinner.id, state: OrderStateSchema.enum.RELEASED})
        ])
    })

    it('counts the released tickets of the selected season\'s locked dinners', async () => {
        const store = useBookingsStore()

        await vi.waitFor(() => expect(store.lockStatus.get(lockedDinner.id)?.total).toBe(1))
        expect(lastQuery(ordersEndpoint)).toMatchObject({dinnerEventIds: String(lockedDinner.id), allHouseholds: 'true'})
    })
})
