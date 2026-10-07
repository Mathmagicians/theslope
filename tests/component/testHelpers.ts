import {nextTick, h, defineComponent, ref, isRef, type Component, type Ref} from 'vue'
import {expect} from 'vitest'
import {TooltipProvider} from 'reka-ui'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {useNuxtApp, clearNuxtData} from '#app'
import {createPinia, getActivePinia, setActivePinia} from 'pinia'
import {flushPromises, type BaseWrapper, type VueWrapper} from '@vue/test-utils'
import {toCalendarDate} from '~/utils/date'

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
 * Fresh stores over a fresh data layer per test: clearNuxtData keeps the keyed entries earlier stores
 * registered, and an earlier store left alive keeps watching them; a new app has neither
 */
export const resetStores = () => {
    const nuxtApp = useNuxtApp()
    getActivePinia()?._s.forEach(store => store.$dispose())
    setActivePinia(createPinia())
    clearNuxtData()
    Object.keys(nuxtApp._asyncData).forEach(key => delete nuxtApp._asyncData[key])
}

// Anything with find/findAll: a mountSuspended root, a findComponent() result or a DOMWrapper
type Searchable = Pick<BaseWrapper<Node>, 'find' | 'findAll'>

export const findByTestId = (wrapper: Searchable, testId: string) =>
    wrapper.find(`[data-testid="${testId}"]`)

export const findAllByTestId = (wrapper: Searchable, testId: string) =>
    wrapper.findAll(`[data-testid="${testId}"]`)

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

/**
 * mountSuspended under a TooltipProvider and return the wrapper of the component itself,
 * so find/text/emitted/props read the component rather than the provider shell.
 * `isMd` provides the layout's responsive breakpoint ref when given; pass a ref to change the breakpoint after mount.
 */
export const mountWithTooltipProvider = async <T extends MountableComponent>(
    component: T,
    {props = {}, isMd}: {props?: Record<string, unknown>, isMd?: boolean | Ref<boolean>} = {}
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
