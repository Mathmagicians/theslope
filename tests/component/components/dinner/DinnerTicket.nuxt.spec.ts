// @vitest-environment nuxt
/**
 * DinnerTicket - the ticket card of one booking row. Row 1 is three slots: the special slot (state | guest | allergy
 * cells), the type badge and how you eat; row 2 names the household a claimed ticket came from.
 * Real component and children, real design system (testing.md Rule 6).
 */
import {describe, it, expect, beforeAll, beforeEach, afterEach} from 'vitest'
import {h} from 'vue'
import {enableAutoUnmount} from '@vue/test-utils'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import DinnerTicket from '~/components/dinner/DinnerTicket.vue'
import {COMPONENTS, ICONS} from '~/composables/useTheSlopeDesignSystem'
import {TicketState} from '~/composables/useBookingValidation'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {findByTestId, mountWithTooltipProvider, resetStores} from '~~/tests/component/testHelpers'

const ALLERGY_TYPES = AllergyFactory.createMockAllergyTypes()
const TICKET_TYPES = useBookingValidation().TicketTypeSchema.options
const CELLS = ['ticket-state-cell', 'ticket-guest-cell', 'ticket-allergy-cell']

enableAutoUnmount(afterEach)

beforeEach(() => {
    resetStores()
})

let baseProps: Record<string, unknown>
beforeAll(() => {
    const {TicketTypeSchema, DinnerModeSchema} = useBookingValidation()
    baseProps = {
        ticketConfig: ticketTypePresentation(TicketTypeSchema.enum.ADULT),
        price: 5500,
        dinnerMode: DinnerModeSchema.enum.DINEIN
    }
})

const mountTicket = (props: Record<string, unknown> = {}, isMd = true) =>
    mountWithTooltipProvider(DinnerTicket, {props: {...baseProps, ...props}, isMd})

type Mounted = Awaited<ReturnType<typeof mountTicket>>

const icons = (wrapper: Mounted) => wrapper.findAllComponents({name: 'UIcon'})
const iconNames = (wrapper: Mounted) => icons(wrapper).map(icon => icon.props('name') as string)
// The glyphs inside one part of the card, found by its test id
const iconNamesIn = (wrapper: Mounted, testId: string) => {
    const part = findByTestId(wrapper, testId).element
    return icons(wrapper).filter(icon => part.contains(icon.element)).map(icon => icon.props('name') as string)
}
const iconNamed = (wrapper: Mounted, name: string) => icons(wrapper).find(icon => icon.props('name') === name)!
const bindsToken = (wrapper: Mounted, name: string, token: string) =>
    expect(iconNamed(wrapper, name).classes()).toEqual(expect.arrayContaining(token.split(' ')))

// No outcome depends on the width: the ticket binds static sizes, so the cases mount once
describe('DinnerTicket', () => {
    it('GIVEN allergy types THEN the card names none of them', async () => {
        const wrapper = await mountTicket({allergies: ALLERGY_TYPES})

        ALLERGY_TYPES.forEach(type => expect(wrapper.text()).not.toContain(type.name))
    })

    it('GIVEN a normal ticket THEN the special slot renders its three cells, empty', async () => {
        const wrapper = await mountTicket()

        CELLS.forEach(cell => expect(findByTestId(wrapper, cell).exists()).toBe(true))
    })

    describe('special slot', () => {
        it.each([
            {desc: 'a guest ticket', props: {guestCount: 1}, guest: true, allergy: false},
            {desc: 'an allergic eater', props: {allergies: ALLERGY_TYPES}, guest: false, allergy: true},
            {desc: 'an allergic guest', props: {guestCount: 2, allergies: ALLERGY_TYPES}, guest: true, allergy: true},
            {desc: 'neither', props: {}, guest: false, allergy: false}
        ])('GIVEN $desc THEN the guest cell shows its glyph: $guest, the allergy cell: $allergy', async ({props, guest, allergy}) => {
            const wrapper = await mountTicket(props)

            expect(iconNamesIn(wrapper, 'ticket-guest-cell').includes(ICONS.userPlus)).toBe(guest)
            expect(iconNamesIn(wrapper, 'ticket-allergy-cell').includes(ICONS.allergy)).toBe(allergy)
            expect(findByTestId(wrapper, 'ticket-allergy-icon').exists()).toBe(allergy)
        })

        it.each(TICKET_TYPES)('GIVEN a %s guest ticket with allergies THEN both info glyphs bind the infoIcon token of the badge colour', async (ticketType) => {
            const ticketConfig = ticketTypePresentation(ticketType)
            const wrapper = await mountTicket({ticketConfig, guestCount: 1, allergies: ALLERGY_TYPES})
            const token = COMPONENTS.ticket.infoIcon[ticketConfig.color]

            bindsToken(wrapper, ICONS.userPlus, token)
            bindsToken(wrapper, ICONS.allergy, token)
        })

        it.each([
            {state: TicketState.released, icon: ICONS.released},
            {state: TicketState.claimed, icon: ICONS.claim},
            {state: TicketState.queued, icon: ICONS.waitlist}
        ] as const)('GIVEN a $state ticket THEN the state glyph binds its state token', async ({state, icon}) => {
            const wrapper = await mountTicket({ticketState: state})

            bindsToken(wrapper, icon, COMPONENTS.ticket.stateIcon[state])
        })

        it('GIVEN a claimed allergic guest ticket THEN the how-you-eat slot carries none of the special glyphs', async () => {
            const wrapper = await mountTicket({ticketState: TicketState.claimed, guestCount: 1, allergies: ALLERGY_TYPES})

            const modeSlotIcons = iconNamesIn(wrapper, 'ticket-mode-slot')
            const specialGlyphs = [ICONS.released, ICONS.claim, ICONS.userPlus, ICONS.allergy]
            specialGlyphs.forEach(glyph => expect(modeSlotIcons).not.toContain(glyph))
        })
    })

    describe('states', () => {
        it('GIVEN a normal ticket THEN no state glyph shows', async () => {
            const wrapper = await mountTicket()

            const names = iconNames(wrapper)
            const stateIcons = [ICONS.released, ICONS.claim, ICONS.userPlus]
            stateIcons.forEach(icon => expect(names).not.toContain(icon))
        })

        it('GIVEN a claimed ticket THEN the second row names the household it came from', async () => {
            const wrapper = await mountTicket({ticketState: TicketState.claimed, provenanceHousehold: 'Hansen'})

            expect(wrapper.text()).toContain('fra Hansen')
        })

        it.each([
            {guestCount: 1, label: 'Gæst'},
            {guestCount: 2, label: '2 Gæster'}
        ])('GIVEN guestCount $guestCount THEN the badge reads $label', async ({guestCount, label}) => {
            const wrapper = await mountTicket({guestCount})

            expect(wrapper.findComponent({name: 'UBadge'}).text()).toContain(label)
        })
    })
})

describe('DinnerTicket on the waiting list', () => {
    it('GIVEN a queued ticket THEN the hourglass sits in the state cell and the card wears the queued face, apart from the normal one', async () => {
        const wrapper = await mountTicket({ticketState: TicketState.queued})

        expect(iconNamesIn(wrapper, 'ticket-state-cell')).toEqual([ICONS.waitlist])
        expect(wrapper.classes()).toEqual(COMPONENTS.ticket.face.queued.split(' '))
        expect(wrapper.classes()).not.toEqual(COMPONENTS.ticket.face.normal.split(' '))
    })

    it.each([
        {desc: 'a queued ticket', ticketState: TicketState.queued, ghost: true},
        {desc: 'a booked ticket', ticketState: TicketState.normal, ghost: false}
    ])('GIVEN $desc THEN the mode slot shows the mode ghosted: $ghost', async ({ticketState, ghost}) => {
        const wrapper = await mountTicket({ticketState})

        const selector = wrapper.findComponent({name: 'DinnerModeSelector'})
        expect(selector.props()).toMatchObject({modelValue: baseProps.dinnerMode, ghost})
    })
})

describe('DinnerTicket for a queued guest', () => {
    it('GIVEN a queued guest THEN the state cell carries the hourglass and the guest cell the guest glyph', async () => {
        const wrapper = await mountTicket({ticketState: TicketState.queued, guestCount: 1})

        expect(iconNamesIn(wrapper, 'ticket-state-cell')).toEqual([ICONS.waitlist])
        expect(iconNamesIn(wrapper, 'ticket-guest-cell')).toEqual([ICONS.userPlus])
    })
})

describe('DinnerTicket for a ticket price', () => {
    it('GIVEN a note and no dinner mode THEN the second row shows the note and the end slot takes the mode slot', async () => {
        const {TicketTypeSchema} = useBookingValidation()
        const wrapper = await mountSuspended(DinnerTicket, {
            props: {ticketConfig: ticketTypePresentation(TicketTypeSchema.enum.CHILD), price: 1700, note: 'Under 12 år · Barn'},
            slots: {end: () => h('button', {'data-testid': 'ticket-end'}, 'Fjern')}
        })

        expect(wrapper.text()).toContain('Under 12 år · Barn')
        expect(findByTestId(wrapper, 'ticket-mode-slot').find('[data-testid="ticket-end"]').exists()).toBe(true)
        expect(wrapper.findComponent({name: 'DinnerModeSelector'}).exists()).toBe(false)
    })
})
