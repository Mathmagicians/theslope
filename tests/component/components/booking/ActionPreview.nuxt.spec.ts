import {describe, it, expect} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import ActionPreview from '~/components/booking/ActionPreview.vue'
import type {ActionPreviewItem} from '~/composables/useBookingUi'
import {useBookingValidation} from '~/composables/useBookingValidation'

const Action = useBookingValidation().BookingActionSchema.enum

describe('ActionPreview', () => {
    const createItem = (overrides: Partial<ActionPreviewItem> = {}): ActionPreviewItem => ({
        name: 'Anna',
        action: Action.BOOK,
        icon: 'i-heroicons-plus-circle',
        color: 'primary',
        text: 'Anna tilmeldes',
        ...overrides
    })

    describe('rendering', () => {
        it('renders nothing when items array is empty', async () => {
            const wrapper = await mountSuspended(ActionPreview, {
                props: {items: []}
            })

            // Should render empty (no UAlert)
            expect(wrapper.text()).toBe('')
        })

        it('renders alert with default title when items provided', async () => {
            const wrapper = await mountSuspended(ActionPreview, {
                props: {items: [createItem()]}
            })

            // UAlert renders, verify by checking title text
            expect(wrapper.text()).toContain('Du er ved at ændre familiens booking')
            expect(wrapper.text()).toContain('Anna tilmeldes')
        })

        it('renders custom title when provided', async () => {
            const wrapper = await mountSuspended(ActionPreview, {
                props: {
                    items: [createItem()],
                    title: 'Custom title'
                }
            })

            expect(wrapper.text()).toContain('Custom title')
        })

        it('renders all items as list', async () => {
            const items = [
                createItem({text: 'Anna tilmeldes'}),
                createItem({text: 'Peter frameldes', action: Action.CANCEL, color: 'error'})
            ]
            const wrapper = await mountSuspended(ActionPreview, {
                props: {items}
            })

            const listItems = wrapper.findAll('li')
            expect(listItems).toHaveLength(2)
            expect(wrapper.text()).toContain('Anna tilmeldes')
            expect(wrapper.text()).toContain('Peter frameldes')
        })
    })

    describe('colors', () => {
        it.each([
            {color: 'primary' as const, action: Action.BOOK},
            {color: 'error' as const, action: Action.CANCEL},
            {color: 'info' as const, action: Action.BUY},
            {color: 'info' as const, action: Action.QUEUE},
            {color: 'neutral' as const, action: Action.CHANGE_MODE}
        ])('renders $action with $color badge', async ({color, action}) => {
            const item = createItem({action, color, text: `Test ${action}`})
            const wrapper = await mountSuspended(ActionPreview, {
                props: {items: [item]}
            })

            // Badge should exist with correct text
            expect(wrapper.text()).toContain(`Test ${action}`)
        })
    })
})
