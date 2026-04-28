// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {nextTick} from 'vue'
import DangerButton from '~/components/shared/DangerButton.vue'

/**
 * DangerButton regression tests
 *
 * Documents the existing 2-phase confirm pattern:
 *  - First click → arms the button (shows confirmLabel + countdown)
 *  - Second click → emits @confirm and resets
 *  - autoResetMs auto-resets without firing
 *  - Click-outside resets without firing
 *  - disabled / loading suppresses the click
 *
 * Added during the chef-swap feature (Phase 2) as a regression guard;
 * no API changes were made to DangerButton.
 */

const LABEL = 'Slet'
const CONFIRM_LABEL = 'Tryk igen for at slette...'

const mountButton = async (props: Record<string, unknown> = {}) =>
    await mountSuspended(DangerButton, {
        props: {label: LABEL, confirmLabel: CONFIRM_LABEL, ...props}
    })

const getButton = (wrapper: Awaited<ReturnType<typeof mountButton>>) => wrapper.find('button')

describe('DangerButton', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('GIVEN initial state WHEN rendered THEN shows label not confirmLabel', async () => {
        const wrapper = await mountButton()
        expect(getButton(wrapper).text()).toContain(LABEL)
        expect(getButton(wrapper).text()).not.toContain(CONFIRM_LABEL)
    })

    it('GIVEN initial state WHEN clicked THEN enters confirm mode', async () => {
        const wrapper = await mountButton()
        await getButton(wrapper).trigger('click')
        await nextTick()
        expect(getButton(wrapper).text()).toContain(CONFIRM_LABEL)
    })

    it('GIVEN confirm mode WHEN clicked again THEN emits confirm and resets', async () => {
        const wrapper = await mountButton()
        await getButton(wrapper).trigger('click')
        await nextTick()
        await getButton(wrapper).trigger('click')
        await nextTick()
        expect(wrapper.emitted('confirm')).toHaveLength(1)
        expect(getButton(wrapper).text()).toContain(LABEL)
        expect(getButton(wrapper).text()).not.toContain(CONFIRM_LABEL)
    })

    it('GIVEN confirm mode WHEN autoResetMs elapses THEN resets without firing confirm', async () => {
        const wrapper = await mountButton({autoResetMs: 1000})
        await getButton(wrapper).trigger('click')
        await nextTick()
        vi.advanceTimersByTime(1000)
        await nextTick()
        expect(wrapper.emitted('confirm')).toBeFalsy()
        expect(getButton(wrapper).text()).toContain(LABEL)
    })

    it('GIVEN confirm mode WHEN clicking outside THEN resets without firing confirm', async () => {
        const wrapper = await mountButton()
        await getButton(wrapper).trigger('click')
        await nextTick()
        document.body.dispatchEvent(new MouseEvent('click', {bubbles: true}))
        await nextTick()
        expect(wrapper.emitted('confirm')).toBeFalsy()
        expect(getButton(wrapper).text()).toContain(LABEL)
    })

    it.each([
        {desc: 'disabled', props: {disabled: true}},
        {desc: 'loading', props: {loading: true}}
    ])('GIVEN $desc WHEN clicked THEN does not enter confirm mode', async ({props}) => {
        const wrapper = await mountButton(props)
        await getButton(wrapper).trigger('click')
        await nextTick()
        expect(getButton(wrapper).text()).not.toContain(CONFIRM_LABEL)
    })
})
