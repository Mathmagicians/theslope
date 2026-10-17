import {nextTick, h, defineComponent, ref, isRef, effectScope, watch, type Component, type Ref} from 'vue'
import {expect, beforeEach, afterEach} from 'vitest'
import {TooltipProvider} from 'reka-ui'
import {mountSuspended, registerEndpoint} from '@nuxt/test-utils/runtime'
import {useNuxtApp, clearNuxtData, useAppConfig} from '#app'
import {getActivePinia, setActivePinia, type Pinia} from 'pinia'
import {flushPromises, type BaseWrapper, type VueWrapper} from '@vue/test-utils'
import {toCalendarDate} from '~/utils/date'
import {sumBy} from '~/utils/ledger'
import {TICKET_COUNTS} from '~/composables/useBilling'
import type {ReleasedTicketCounts} from '~/composables/useBooking'
import type {TicketType} from '~/composables/useBookingValidation'

/**
 * Generic polling function for component tests
 * Repeatedly checks condition until it returns true or max attempts reached
 *
 * @param condition - Function that checks if condition is met
 * @param maxAttempts - Maximum number of polling attempts (default: 20)
 * @returns void when condition is met
 *
 * @example
 * await pollFor(() => store.isPlanStoreReady)
 * await pollFor(() => store.isSeasonsInitialized, 10)
 */
export async function pollFor(
    condition: () => boolean,
    maxAttempts: number = 20,
    shouldFail: boolean = true
): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await nextTick()
        if (condition()) {
            return
        }
    }

    if( shouldFail) throw new Error(`Condition not met after ${maxAttempts} attempts`)
}

/** The status of a keyed useAsyncData dataset; stores expose flags, the status itself lives under the key */
export const asyncDataStatus = (key: string) => useNuxtApp()._asyncData[key]?.status.value

/**
 * Fresh stores over a fresh data layer per test. Every store of the app's pinia and of the active one is disposed,
 * and the app's pinia stays active, so a spec and the components it mounts share one store instance; clearNuxtData
 * keeps the keyed entries earlier stores registered, and a store left alive keeps watching them, so those go too
 */
export const resetStores = () => {
    const nuxtApp = useNuxtApp()
    const appPinia = nuxtApp.$pinia as Pinia
    new Set([getActivePinia(), appPinia]).forEach(pinia => pinia?._s.forEach(store => store.$dispose()))
    setActivePinia(appPinia)
    clearNuxtData()
    Object.keys(nuxtApp._asyncData).forEach(key => Reflect.deleteProperty(nuxtApp._asyncData, key))
}

/**
 * A scope per test for the composables a test body creates: the watchers they start stop with the test, as they do
 * when a component unmounts, so an earlier test's instance never answers a later test's route
 */
export const useTestScope = () => {
    let scope = effectScope()
    beforeEach(() => {
        scope = effectScope()
    })
    afterEach(() => scope.stop())
    return <T>(create: () => T): T => scope.run(create) as T
}

/** The store instance a mounted component uses: components inject the Nuxt app's pinia, not the spec's active one */
export const mountedStore = <S>(useStore: (pinia: Pinia) => S): S => useStore(useNuxtApp().$pinia as Pinia)

/** The datasets the stores request on creation, answered empty; a spec's own route for one of them registers after this call, as the last registration of a url answers */
export const registerEmptyStoreEndpoints = () => {
    registerEndpoint('/api/admin/season/active', () => null)
    registerEndpoint('/api/admin/season', () => [])
    registerEndpoint('/api/admin/household', () => [])
    registerEndpoint('/api/team/my', () => [])
    registerEndpoint('/api/admin/users/by-role/ALLERGYMANAGER', () => [])
    registerEndpoint('/api/admin/users', () => [])
    registerEndpoint('/api/admin/billing/periods', () => [])
    registerEndpoint('/api/admin/billing/current-period', () => [])
    registerEndpoint('/api/order', () => [])
}

/**
 * An endpoint that answers `body` once the test releases it: the window in which a dataset is pending. The latest
 * registration of a url answers, so `unregister` hands the url back to the one before it
 */
export const holdEndpoint = (url: string, body: unknown) => {
    let release: () => void = () => {}
    const released = new Promise<void>(resolve => {
        release = resolve
    })
    const unregister = registerEndpoint(url, async () => {
        await released
        return body
    })
    return {release, unregister}
}

/** Resolves once `condition` holds, watching the reactive state it reads: no polling window, the test's timeout bounds it */
export const untilTrue = (condition: () => boolean): Promise<void> => new Promise(resolve => {
    const stop = watch(condition, holds => {
        if (!holds) return
        // An immediate hit runs before `stop` is assigned
        queueMicrotask(() => stop())
        resolve()
    }, {immediate: true})
})

/** The kitchen's rates the money components calculate with, read from the app config inside a hook or a test */
export const kitchenConfig = () => {
    const kitchen = useAppConfig().theslope?.kitchen
    return {baseRatePercent: kitchen?.baseRatePercent ?? 5, vatPercent: kitchen?.vatPercent ?? 25}
}

// Anything with find/findAll: a mountSuspended root, a findComponent() result or a DOMWrapper
type Searchable = Pick<BaseWrapper<Node>, 'find' | 'findAll'>

export const findByTestId = (wrapper: Searchable, testId: string) =>
    wrapper.find(`[data-testid="${testId}"]`)

export const findAllByTestId = (wrapper: Searchable, testId: string) =>
    wrapper.findAll(`[data-testid="${testId}"]`)

/** The row UTable renders from its `#loading` slot while it binds `loading` and holds no rows */
export const findLoadingRow = (wrapper: Searchable) => wrapper.find('[data-slot="loading"]')

export const findAllLoadingRows = (wrapper: Searchable) => wrapper.findAll('[data-slot="loading"]')

/** Whether the table binds `loading`: UTable runs its loading bar under the column headers, a bar that carries no attribute */
export const isTableLoading = (wrapper: Pick<VueWrapper, 'findComponent'>): boolean =>
    wrapper.findComponent({name: 'UTable'}).props('loading') === true

export const clickByTestId = async (wrapper: Searchable, testId: string) => {
    await findByTestId(wrapper, testId).trigger('click')
    await nextTick()
}

// Component constructor shape findComponent() keys its typed overload on (@vue/test-utils
// does not export its DefinedComponent alias)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MountableComponent = new (...args: any[]) => any

/**
 * Wraps a component in reka-ui's TooltipProvider - the context UApp supplies in the
 * running app and every UTooltip requires. Lets specs render UserListItem (and any
 * other tooltip-bearing component) for real instead of mocking it.
 */
export const withTooltipProvider = (component: Component, props: Record<string, unknown> = {}) =>
    defineComponent({
        render: () => h(TooltipProvider, {}, () => h(component, props))
    })

/** The two layouts a responsive token answers for: the phone, and md and up */
export const VIEWPORTS = [
    {viewport: 'phone', isMd: false},
    {viewport: 'md', isMd: true}
] as const

type TicketTypeCounts = Partial<Record<TicketType, number>>
/** A locked dinner's supply from its tickets for sale and its waiting list per ticket type, with the totals and the compact counts */
export const lockedDinnerSupply = (byType: TicketTypeCounts = {}, queuedByType: TicketTypeCounts = {}): ReleasedTicketCounts => ({
    total: sumBy(Object.values(byType), count => count), formatted: TICKET_COUNTS.compact.text(byType), byType,
    queued: sumBy(Object.values(queuedByType), count => count), queuedFormatted: TICKET_COUNTS.compact.text(queuedByType), queuedByType
})

/**
 * mountSuspended under a TooltipProvider and return the wrapper of the component itself,
 * so find/text/emitted/props read the component rather than the provider shell.
 * `isMd` provides the layout's responsive breakpoint ref when given (null: not measured yet); pass a ref to change the breakpoint after mount.
 */
export const mountWithTooltipProvider = async <T extends MountableComponent>(
    component: T,
    {props = {}, isMd}: {props?: Record<string, unknown>, isMd?: boolean | null | Ref<boolean | null>} = {}
) => {
    const root = await mountSuspended(
        withTooltipProvider(component, props),
        isMd === undefined ? {} : {global: {provide: {isMd: isRef(isMd) ? isMd : ref(isMd)}}}
    )
    return root.findComponent(component)
}

/**
 * Opens a UPopover by clicking its trigger, then lets reka-ui mount the teleported content.
 */
export const openPopover = async (wrapper: Searchable) => {
    await wrapper.find('[aria-expanded]').trigger('click')
    await flushPromises()
    await nextTick()
}

/** A Date as its calendar day ('2025-01-05'): the model may carry local or UTC midnight of the same day */
export const calendarDay = (date: Date) => toCalendarDate(date)!.toString()

/** Ranges as calendar days, for asserting emitted DateRange payloads */
export const asCalendarDays = (ranges: Array<{start: Date, end: Date}>) =>
    ranges.map(range => ({start: calendarDay(range.start), end: calendarDay(range.end)}))

/** The typed date segments (reka DateField) of one kind, in field order: one per date field below `wrapper` */
export const findDateSegments = (wrapper: Searchable, segment: 'day' | 'month' | 'year') =>
    wrapper.findAll(`[data-segment="${segment}"]`)

/** Types digits into one segment and waits a tick; the field commits when every segment holds a value */
export const typeIntoSegment = async (segment: {trigger: (e: string, o: {key: string}) => Promise<unknown>}, keys: string[]) => {
    for (const key of keys) await segment.trigger('keydown', {key})
    await nextTick()
}

/**
 * Asserts the OUTCOME of the shared calendar grid token (COMPONENTS.calendarGrid): every
 * rendered month shows one Monday-first week header of 7 single-letter days. That a
 * UCalendar binds the token is the architecture spec's rule (designSystemUsage); how the
 * grid looks (hidden outside-view days, head-cell type) is the visual check's.
 */
export const expectSharedCalendarGrid = (wrapper: Pick<VueWrapper, 'findAll'>) => {
    // A picker's open calendar teleports to body (UPopover): read the document when the wrapper subtree holds no grid
    const inWrapper = wrapper.findAll('th').map(th => th.text())
    const headDays = (inWrapper.length ? inWrapper : Array.from(document.querySelectorAll('th')).map(th => th.textContent ?? ''))
        .map(text => text.trim()).filter(Boolean)
    expect(headDays.length).toBeGreaterThan(0)
    expect(headDays.length % 7).toBe(0)
    headDays.filter((_, i) => i % 7 === 0).forEach(monday => expect(monday).toBe('M'))
}
