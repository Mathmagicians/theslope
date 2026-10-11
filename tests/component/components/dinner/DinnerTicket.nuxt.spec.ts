// @vitest-environment nuxt
/**
 * DinnerTicket - the ticket card of one booking row. Row 1 is three slots: the special slot (state | guest | allergy
 * cells), the type badge and how you eat; row 2 names the household a claimed ticket came from.
 * Real component and children, real design system (testing.md Rule 6).
 */
import {describe, it, expect, beforeAll} from 'vitest'
import DinnerTicket from '~/components/dinner/DinnerTicket.vue'
import {COMPONENTS, ICONS} from '~/composables/useTheSlopeDesignSystem'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {findByTestId, mountWithTooltipProvider} from '~~/tests/component/testHelpers'
import {TicketTypeSchema} from '~~/prisma/generated/zod'

const ALLERGY_TYPES = AllergyFactory.createMockAllergyTypes()
const TICKET_TYPES = TicketTypeSchema.options
const CELLS = ['ticket-state-cell', 'ticket-guest-cell', 'ticket-allergy-cell']

let ticketTypeConfig: ReturnType<typeof useTicket>['ticketTypeConfig']
let baseProps: Record<string, unknown>
beforeAll(() => {
    const {TicketTypeSchema, DinnerModeSchema} = useBookingValidation()
    ticketTypeConfig = useTicket().ticketTypeConfig
    baseProps = {
        ticketConfig: ticketTypeConfig[TicketTypeSchema.enum.ADULT],
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

describe('DinnerTicket', () => {
    describe.each([{viewport: 'desktop', isMd: true}, {viewport: 'phone', isMd: false}])('$viewport', ({isMd}) => {
        it.each([
            {desc: 'two allergy types', allergies: ALLERGY_TYPES, hasGlyph: true},
            {desc: 'no allergy types', allergies: [], hasGlyph: false}
        ])('GIVEN $desc THEN the allergy glyph shows: $hasGlyph', async ({allergies, hasGlyph}) => {
            const wrapper = await mountTicket({allergies}, isMd)

            expect(findByTestId(wrapper, 'ticket-allergy-icon').exists()).toBe(hasGlyph)
            expect(iconNames(wrapper).includes(ICONS.allergy)).toBe(hasGlyph)
        })

        it('GIVEN allergy types THEN the card names none of them', async () => {
            const wrapper = await mountTicket({allergies: ALLERGY_TYPES}, isMd)

            ALLERGY_TYPES.forEach(type => expect(wrapper.text()).not.toContain(type.name))
        })

        it.each([
            {desc: 'a normal ticket', props: {}},
            {desc: 'a claimed allergic guest ticket', props: {isClaimed: true, guestCount: 2, allergies: ALLERGY_TYPES}}
        ])('GIVEN $desc THEN the special slot renders its three cells', async ({props}) => {
            const wrapper = await mountTicket(props, isMd)

            CELLS.forEach(cell => expect(findByTestId(wrapper, cell).exists()).toBe(true))
        })
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
        })

        it.each(TICKET_TYPES)('GIVEN a %s guest ticket with allergies THEN both info glyphs bind the infoIcon token of the badge colour', async (ticketType) => {
            const ticketConfig = ticketTypeConfig[ticketType]
            const wrapper = await mountTicket({ticketConfig, guestCount: 1, allergies: ALLERGY_TYPES})
            const token = COMPONENTS.ticket.infoIcon[ticketConfig.color]

            bindsToken(wrapper, ICONS.userPlus, token)
            bindsToken(wrapper, ICONS.allergy, token)
        })

        it.each([
            {state: 'released', props: {isReleased: true}, icon: ICONS.released},
            {state: 'claimed', props: {isClaimed: true}, icon: ICONS.claim}
        ] as const)('GIVEN a $state ticket THEN the state glyph binds its state token', async ({state, props, icon}) => {
            const wrapper = await mountTicket(props)

            bindsToken(wrapper, icon, COMPONENTS.ticket.stateIcon[state])
        })

        it('GIVEN a claimed allergic guest ticket THEN the how-you-eat slot carries none of the special glyphs', async () => {
            const wrapper = await mountTicket({isClaimed: true, guestCount: 1, allergies: ALLERGY_TYPES})

            const modeSlotIcons = iconNamesIn(wrapper, 'ticket-mode-slot')
            const specialGlyphs = [ICONS.released, ICONS.claim, ICONS.userPlus, ICONS.allergy]
            specialGlyphs.forEach(glyph => expect(modeSlotIcons).not.toContain(glyph))
        })
    })

    describe('states', () => {
        it.each([
            {desc: 'released', props: {isReleased: true}, stateIcon: ICONS.released},
            {desc: 'claimed', props: {isClaimed: true, provenanceHousehold: 'Hansen'}, stateIcon: ICONS.claim},
            {desc: 'a guest ticket', props: {guestCount: 1}, stateIcon: ICONS.userPlus}
        ])('GIVEN $desc THEN the state glyph leads the badge', async ({props, stateIcon}) => {
            const wrapper = await mountTicket(props)

            expect(iconNames(wrapper)).toContain(stateIcon)
        })

        it('GIVEN a normal ticket THEN no state glyph shows', async () => {
            const wrapper = await mountTicket()

            const names = iconNames(wrapper)
            const stateIcons = [ICONS.released, ICONS.claim, ICONS.userPlus]
            stateIcons.forEach(icon => expect(names).not.toContain(icon))
        })

        it('GIVEN a claimed ticket THEN the second row names the household it came from', async () => {
            const wrapper = await mountTicket({isClaimed: true, provenanceHousehold: 'Hansen'})

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
