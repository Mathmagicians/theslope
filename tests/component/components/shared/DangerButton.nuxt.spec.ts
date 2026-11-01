// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {nextTick, type ComponentPublicInstance} from 'vue'
import DangerButton from '~/components/shared/DangerButton.vue'
import type {ButtonProps} from '@nuxt/ui'
import {resetStores} from '~~/tests/component/testHelpers'
import {COLOR, NOISE, COMPONENTS} from '~/composables/useTheSlopeDesignSystem'

enableAutoUnmount(afterEach)

/**
 * The two-click confirm: the first click arms the button, the second emits confirm and disarms it; the timeout and a
 * click outside disarm it without firing, and a disabled or loading button stays unarmed
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
        resetStores()
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('GIVEN initial state WHEN rendered THEN shows label not confirmLabel, and WHEN clicked THEN enters confirm mode', async () => {
        const wrapper = await mountButton()
        expect(getButton(wrapper).text()).toContain(LABEL)
        expect(getButton(wrapper).text()).not.toContain(CONFIRM_LABEL)

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

// The button's face per state: quiet until armed, then loud in its mode's colour with the mode's ring and countdown wipe
describe('DangerButton faces', () => {
    const DANGER = COMPONENTS.dangerButton
    const buttonProps = (wrapper: Awaited<ReturnType<typeof mountButton>>) =>
        wrapper.findComponent<ComponentPublicInstance<ButtonProps>>({name: 'UButton'}).props()

    beforeEach(() => {
        resetStores()
    })

    it('GIVEN initial state THEN the root binds its token and the button reads neutral and medium without the armed ring', async () => {
        const wrapper = await mountButton()

        expect(wrapper.classes()).toEqual(DANGER.root.split(' '))
        expect(buttonProps(wrapper)).toMatchObject({color: COLOR.neutral, variant: NOISE.medium})
        expect(getButton(wrapper).classes()).not.toEqual(expect.arrayContaining(DANGER.danger.armed.split(' ')))
    })

    it.each([
        {mode: 'a destructive action', undo: false, face: DANGER.danger, color: COLOR.error},
        {mode: 'an undo', undo: true, face: DANGER.undo, color: COLOR.success}
    ])('GIVEN $mode WHEN armed THEN the button turns loud in its colour with its ring and its countdown wipe', async ({undo, face, color}) => {
        const wrapper = await mountButton({undo})

        await getButton(wrapper).trigger('click')
        await nextTick()

        expect(buttonProps(wrapper)).toMatchObject({color, variant: NOISE.loud})
        expect(getButton(wrapper).classes()).toEqual(expect.arrayContaining(face.armed.split(' ')))
        const wipe = getButton(wrapper).attributes('style')
        expect(wipe).toContain(`var(${face.countdown.dark})`)
        expect(wipe).toContain(`var(${face.countdown.light})`)
    })
})
