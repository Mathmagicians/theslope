import {describe, it, expect} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import ActionPreview from '~/components/booking/ActionPreview.vue'
import type {ActionPreviewDay, ActionPreviewItem} from '~/composables/useBookingUi'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {BOOKING_WORDS} from '~/config/bookingWords'
import {COMPONENTS, ICONS} from '~/composables/useTheSlopeDesignSystem'
import {findByTestId, findAllByTestId} from '~~/tests/component/testHelpers'

const Action = useBookingValidation().BookingActionSchema.enum

describe('ActionPreview', () => {
    const line = (overrides: Partial<ActionPreviewItem> = {}): ActionPreviewItem => ({
        name: 'Anna',
        action: Action.BOOK,
        icon: ICONS.plusCircle,
        color: 'primary',
        text: 'Anna tilmeldes',
        ...overrides
    })
    const day = (dinnerEventId: number, label: string, lines: ActionPreviewItem[]): ActionPreviewDay =>
        ({dinnerEventId, date: new Date(2026, 9, 18 + dinnerEventId), label, lines})

    const TWO_DAYS = [
        day(4, 'to 22/10/2026', [line({text: 'Anna ændrer spisemåde til Takeaway'}), line({name: 'Lars', text: 'Lars ændrer spisemåde til Takeaway'})]),
        day(5, 'fr 23/10/2026', [line({text: 'Anna frigiver sin billet', action: Action.RELEASE, color: 'error'})])
    ]

    const mount = (props: {days: ActionPreviewDay[], title?: string, pending?: boolean}) => mountSuspended(ActionPreview, {props})
    const separators = (wrapper: Awaited<ReturnType<typeof mount>>) => wrapper.findAllComponents({name: 'USeparator'})

    it('renders nothing without days or a pending preview', async () => {
        const wrapper = await mount({days: []})
        expect(wrapper.text()).toBe('')
    })

    it.each([
        {desc: 'the family\'s title by default', title: undefined, shown: BOOKING_WORDS.preview.title},
        {desc: 'the title given', title: BOOKING_WORDS.preview.guestTitle, shown: BOOKING_WORDS.preview.guestTitle}
    ])('heads the lines with $desc', async ({title, shown}) => {
        const wrapper = await mount({days: TWO_DAYS, title})
        expect(findByTestId(wrapper, 'action-preview').text()).toContain(shown)
    })

    it('renders each day under a separator on the moment kind that names the day, its lines below it in order', async () => {
        const wrapper = await mount({days: TWO_DAYS})

        expect(separators(wrapper).map(separator => separator.props('label'))).toEqual(TWO_DAYS.map(({label}) => label))
        separators(wrapper).forEach(separator => expect(separator.props('ui')).toEqual(COMPONENTS.separator.moment.ui))
        expect(findAllByTestId(wrapper, 'action-preview-day').map(group => group.findAll('li').map(item => item.text())))
            .toEqual(TWO_DAYS.map(({lines}) => lines.map(({text}) => text)))
    })

    it('a one-day preview shows its day separator too', async () => {
        const wrapper = await mount({days: TWO_DAYS.slice(0, 1)})
        expect(separators(wrapper).map(separator => separator.props('label'))).toEqual([TWO_DAYS[0]!.label])
    })

    it('a line\'s badge wears the line\'s colour and glyph', async () => {
        const wrapper = await mount({days: TWO_DAYS.slice(1)})
        const badge = wrapper.findComponent({name: 'UBadge'})
        expect(badge.props('color')).toBe('error')
        expect(badge.findComponent({name: 'UIcon'}).props('name')).toBe(ICONS.plusCircle)
    })

    it('while the preview is pending it shows the loader line with the spinning sync glyph in place of the lines', async () => {
        const wrapper = await mount({days: TWO_DAYS, pending: true})

        const loader = findByTestId(wrapper, 'action-preview-loading')
        expect(loader.text()).toBe(BOOKING_WORDS.preferencePreviewLoading)
        expect(loader.findComponent({name: 'UIcon'}).props('name')).toBe(ICONS.sync)
        expect(findByTestId(wrapper, 'action-preview').exists()).toBe(false)
    })
})
