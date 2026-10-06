// @vitest-environment nuxt
import {setActivePinia, createPinia} from 'pinia'
import {beforeAll, beforeEach, describe, expect, it, vi} from 'vitest'
import {ref, computed} from 'vue'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {clearNuxtData} from '#app'
import {getQuery, type H3Event} from 'h3'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import {useBookingsStore} from '~/stores/bookings'
import {useCookingTeam} from '~/composables/useCookingTeam'
import {useBooking} from '~/composables/useBooking'
import {COLOR} from '~/composables/useTheSlopeDesignSystem'
import type {CookingTeamDisplay} from '~/composables/useCookingTeamValidation'
import type {UserDetail} from '~/composables/useCoreValidation'
import {formatDate} from '~/utils/date'

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

const assignRoleEndpoint = vi.fn()
const updateDinnerEndpoint = vi.fn()
const ordersEndpoint = vi.fn()
const scaffoldEndpoint = vi.fn()
const dailyMaintenanceEndpoint = vi.fn()
const householdBillingEndpoint = vi.fn()

registerEndpoint('/api/admin/season/active', () => null)
registerEndpoint('/api/admin/season', () => [])
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

describe('Bookings store — orders', () => {
    it('loads the orders of the selected dinners, parsed to domain types', async () => {
        const order = OrderFactory.defaultOrder('bookings-store', {dinnerEventId: DINNER_ID})
        ordersEndpoint.mockImplementation(() => [order])
        const store = useBookingsStore()

        store.loadOrdersForDinners(DINNER_ID)

        await vi.waitFor(() => expect(store.orders).toHaveLength(1))
        expect(store.orders[0]!.createdAt).toBeInstanceOf(Date)
        expect(ordersEndpoint).toHaveBeenCalled()
    })
})

describe('Bookings store — upcoming orders', () => {
    const SEASON_ID = 3

    it.each([
        {scope: 'all households', householdId: null, param: 'allHouseholds', value: 'true'},
        {scope: 'one household', householdId: 5, param: 'householdId', value: '5'}
    ])('reads the season\'s upcoming orders for $scope with their dinner context', async ({householdId, param, value}) => {
        ordersEndpoint.mockImplementation(() => [OrderFactory.defaultOrder('upcoming', {dinnerEventId: DINNER_ID})])
        const store = useBookingsStore()

        store.loadUpcomingOrders(SEASON_ID, householdId)

        await vi.waitFor(() => expect(store.upcomingOrders).toHaveLength(1))
        const query = getQuery(ordersEndpoint.mock.calls.at(-1)![0] as H3Event)
        expect(query).toMatchObject({upcomingForSeason: String(SEASON_ID), includeDinnerContext: 'true', [param]: value})
    })

    it('requests nothing without a season', async () => {
        const store = useBookingsStore()

        store.loadUpcomingOrders(null)

        await vi.waitFor(() => expect(store.isUpcomingOrdersLoading).toBe(false))
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
    it('reads the billing of the loaded household, parsed to domain types', async () => {
        const HOUSEHOLD_ID = 4
        householdBillingEndpoint.mockImplementation(() => BillingFactory.defaultHouseholdBilling(HOUSEHOLD_ID))
        const store = useBookingsStore()

        store.loadHouseholdBilling(HOUSEHOLD_ID)

        await vi.waitFor(() => expect(store.householdBilling?.householdId).toBe(HOUSEHOLD_ID))
        expect(store.householdBilling!.currentPeriod.periodStart).toBeInstanceOf(Date)
        expect(getQuery(householdBillingEndpoint.mock.calls.at(-1)![0] as H3Event)).toEqual({householdId: String(HOUSEHOLD_ID)})
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
