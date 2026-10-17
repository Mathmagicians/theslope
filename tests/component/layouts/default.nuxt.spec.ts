// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {registerEndpoint, mountSuspended} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {resetStores} from '~~/tests/component/testHelpers'
import {defineComponent, h, inject, nextTick, type Ref} from 'vue'
import {TooltipProvider} from 'reka-ui'
import DefaultLayout from '~/layouts/default.vue'

registerEndpoint('/api/_auth/session', () => ({}))

enableAutoUnmount(afterEach)

beforeEach(() => {
    resetStores()
})

/**
 * The layout measures the md breakpoint after mount, so `isMd` is null until then: a page's default that
 * reads the viewport waits for the measurement instead of taking the server's guess.
 */
describe('default layout isMd', () => {
    it('is null while the page sets up, and a boolean once the layout has measured', async () => {
        const seen: Array<boolean | null> = []
        let isMd: Ref<boolean | null> | undefined
        const Probe = defineComponent({
            setup() {
                isMd = inject<Ref<boolean | null>>('isMd')
                seen.push(isMd!.value)
                return () => h('div')
            }
        })

        // The header renders tooltips; UApp supplies their provider in the running app
        await mountSuspended(defineComponent({render: () => h(TooltipProvider, {}, () => h(DefaultLayout, {}, {default: () => h(Probe)}))}))
        await nextTick()

        expect(seen[0]).toBeNull()
        expect(typeof isMd!.value).toBe('boolean')
    })
})
