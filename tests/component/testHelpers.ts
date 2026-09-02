import {nextTick, h, defineComponent, ref, type Component} from 'vue'
import {TooltipProvider} from 'reka-ui'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import type {BaseWrapper} from '@vue/test-utils'

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
 * `isMd` provides the layout's responsive breakpoint ref when given.
 */
export const mountWithTooltipProvider = async <T extends MountableComponent>(
    component: T,
    {props = {}, isMd}: {props?: Record<string, unknown>, isMd?: boolean} = {}
) => {
    const root = await mountSuspended(
        withTooltipProvider(component, props),
        isMd === undefined ? {} : {global: {provide: {isMd: ref(isMd)}}}
    )
    return root.findComponent(component)
}
