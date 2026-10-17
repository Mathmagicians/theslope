// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {flushPromises, enableAutoUnmount} from '@vue/test-utils'
import {nextTick} from 'vue'
import {getQuery, type H3Event} from 'h3'
import TicketChanges from '~/components/chef/TicketChanges.vue'
import {useBookingValidation, type TicketChange, type TicketType} from '~/composables/useBookingValidation'
import {ticketChangeWord} from '~/composables/useBookingUi'
import {useTicket} from '~/composables/useTicket'
import {formatPortions} from '~/utils/utils'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {mountWithTooltipProvider, findByTestId, findAllByTestId, clickByTestId, resetStores, registerEmptyStoreEndpoints} from '~~/tests/component/testHelpers'

/**
 * TicketChanges: closed until its toggle opens; then the dinner's changes from the menu deadline, newest first, with
 * the household, the ticket events, the composition and Indtægter; the rest behind "Vis fuld historik".
 * The bookings store is real; the HTTP behind it is the one thing faked.
 */
const DINNER_ID = 7
const SYSTEM_USER_ID = 99
const {TicketChangeKindSchema, TicketTypeSchema} = useBookingValidation()
const {formatPrice, ticketTypeWords} = useTicket()
const Kind = TicketChangeKindSchema.enum
const TicketType = TicketTypeSchema.enum
const counts = OrderFactory.ticketCounts
const SINCE = new Date('2026-04-03T18:00:00')
// A ticket chip as the pane writes it: the count and the type's letter
const chip = (count: number, ticketType: TicketType) => `${count} ${ticketTypeWords[ticketType].compactLabel}`

const change = (overrides: Partial<TicketChange>): TicketChange => ({
    id: 1, timestamp: new Date('2026-04-05T08:02:00'), performedByUserId: 31, bySystem: false, households: ['S_31'],
    events: [{change: Kind.BOOK, tickets: counts(1, 0, 0)}], counts: counts(29, 11, 3), portions: 34.5, revenue: 172500, ...overrides
})
const recent = [
    change({id: 3, timestamp: new Date('2026-04-09T19:10:00'), performedByUserId: 14, households: ['S_14'], events: [{change: Kind.BUY, tickets: counts(0, 1, 0)}]}),
    change({id: 2, timestamp: new Date('2026-04-05T08:02:00')})
]
const older = [change({
    id: 1, timestamp: new Date('2026-04-02T20:15:00'), performedByUserId: SYSTEM_USER_ID, bySystem: true, households: ['S_31', 'S_22'],
    events: [{change: Kind.BOOK, tickets: counts(28, 11, 3)}], counts: counts(28, 11, 3), portions: 33.5, revenue: 167500
})]

const historyEndpoint = vi.fn((event: H3Event) => {
    const since = getQuery(event).since
    return {dinnerEventId: DINNER_ID, since: since ?? null, changes: since ? recent : [...recent, ...older], olderCount: since ? older.length : 0}
})
// The bookings store's own datasets and the stores it reaches for
registerEmptyStoreEndpoints()
registerEndpoint(`/api/chef/dinner/${DINNER_ID}/order-history`, historyEndpoint)

// The next test's resetStores drops the datasets a still-mounted pane reads
enableAutoUnmount(afterEach)

const mount =(props: Record<string, unknown> = {}) => mountWithTooltipProvider(TicketChanges, {
    props: {dinnerEventId: DINNER_ID, since: SINCE, ...props},
    isMd: true
})
type Wrapper = Awaited<ReturnType<typeof mount>>

const open = async (wrapper: Wrapper) => {
    await clickByTestId(wrapper, 'ticket-changes-toggle')
    await flushPromises()
    await nextTick()
}

describe('TicketChanges', () => {
    beforeEach(() => {
        resetStores()
        historyEndpoint.mockClear()
    })

    it('GIVEN the closed pane THEN nothing is read; WHEN opened THEN the changes since Framelding closed come newest first with household, ticket events, composition and Indtægter; WHEN "Vis fuld historik" is clicked THEN the whole history is read and the deadline line goes', async () => {
        const wrapper = await mount()
        expect(wrapper.text()).toContain('Se billetændringer')
        expect(wrapper.findAll('tbody tr')).toHaveLength(0)
        expect(historyEndpoint).not.toHaveBeenCalled()

        await open(wrapper)

        expect(historyEndpoint).toHaveBeenCalledTimes(1)
        expect(getQuery(historyEndpoint.mock.calls[0]![0] as H3Event)).toMatchObject({since: SINCE.toISOString()})
        const rows = wrapper.findAll('tbody tr')
        expect(rows).toHaveLength(2)
        expect(rows[0]!.text()).toContain('09/04/2026 19:10')
        expect(rows[0]!.text()).toContain('S_14')
        expect(rows[0]!.text()).toContain(ticketChangeWord(Kind.BUY))
        expect(rows[1]!.text()).toContain(ticketChangeWord(Kind.BOOK))
        expect(rows[1]!.text()).toContain(chip(1, TicketType.ADULT))
        expect(rows[1]!.text()).toContain(`${formatPortions(34.5)} kuverter`)
        expect(findAllByTestId(wrapper, 'ticket-change-revenue')[1]!.text()).toBe(`${formatPrice(172500)} kr`)
        expect(findByTestId(wrapper, 'ticket-changes-deadline').text()).toContain('Framelding lukker · 03/04/2026 18:00')
        expect(findByTestId(wrapper, 'ticket-changes-more').exists()).toBe(true)

        await clickByTestId(wrapper, 'ticket-changes-more')
        await flushPromises()
        await nextTick()

        expect(getQuery(historyEndpoint.mock.calls.at(-1)![0] as H3Event)).not.toHaveProperty('since')
        const allRows = wrapper.findAll('tbody tr')
        expect(allRows).toHaveLength(3)
        expect(allRows[2]!.text()).toContain('System')
        expect(allRows[2]!.text()).toContain(ticketChangeWord(Kind.BOOK))
        expect(allRows[2]!.text()).toContain(chip(28, TicketType.ADULT))
        expect(findByTestId(wrapper, 'ticket-changes-deadline').exists()).toBe(false)
        expect(findByTestId(wrapper, 'ticket-changes-more').exists()).toBe(false)
    })

    it('GIVEN Framelding still ahead WHEN opened THEN the newest change shows alone in the full history columns, with the rest behind the button', async () => {
        const ahead = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        const wrapper = await mount({since: ahead})
        await open(wrapper)
        // The history is read whole, since nothing has moved since a moment still ahead
        expect(getQuery(historyEndpoint.mock.calls[0]![0] as H3Event)).not.toHaveProperty('since')
        const rows = wrapper.findAll('tbody tr')
        expect(rows).toHaveLength(1)
        expect(rows[0]!.text()).toContain('09/04/2026 19:10')
        expect(rows[0]!.text()).toContain('S_14')
        expect(rows[0]!.text()).toContain(ticketChangeWord(Kind.BUY))
        expect(findByTestId(wrapper, 'ticket-changes-deadline').text()).toContain('Framelding lukker')
        expect(findByTestId(wrapper, 'ticket-changes-more').exists()).toBe(true)

        await clickByTestId(wrapper, 'ticket-changes-more')
        await flushPromises()
        await nextTick()
        expect(wrapper.findAll('tbody tr')).toHaveLength(3)
        expect(findByTestId(wrapper, 'ticket-changes-deadline').exists()).toBe(false)
    })

    it('GIVEN lines of several ticket events WHEN opened THEN Ændring reads each event\'s word with its tickets in the action order, a ticket type change from → to and the close by its word; Husstand names one household, the system\'s line over several as System and a user\'s by their names', async () => {
        const lines = [
            change({id: 14, performedByUserId: SYSTEM_USER_ID, bySystem: true, households: ['S_31', 'S_22', 'S_14'], events: [{change: Kind.CLOSE, tickets: counts(30, 11, 3)}]}),
            change({id: 13, performedByUserId: 22, households: ['S_22'], events: [{change: Kind.CHANGE_PRICE, tickets: counts(1, 0, 0), from: counts(0, 1, 0)}]}),
            change({id: 12, events: [{change: Kind.BOOK, tickets: counts(0, 1, 0)}, {change: Kind.RELEASE, tickets: counts(2, 0, 0)}]}),
            change({id: 11, households: ['S_31', 'S_22'], events: [{change: Kind.CANCEL, tickets: counts(1, 0, 0)}]})
        ]
        historyEndpoint.mockImplementationOnce(() => ({dinnerEventId: DINNER_ID, since: SINCE.toISOString(), changes: lines, olderCount: 0}))
        const wrapper = await mount()
        await open(wrapper)

        const rows = wrapper.findAll('tbody tr')
        const read = (row: typeof rows[number]) => ({
            household: row.findAll('td')[1]!.text(),
            events: findAllByTestId(row, 'ticket-change-event').map(event => ({
                word: findByTestId(event, 'ticket-change-word').text(),
                chips: findAllByTestId(event, 'ticket-change-chip').map(badge => badge.text()),
                arrow: event.text().includes('→')
            }))
        })
        expect(rows.map(read)).toEqual([
            {household: 'System', events: [{word: ticketChangeWord(Kind.CLOSE), chips: [], arrow: false}]},
            {household: 'S_22', events: [{word: ticketChangeWord(Kind.CHANGE_PRICE), chips: [chip(1, TicketType.CHILD), chip(1, TicketType.ADULT)], arrow: true}]},
            {household: 'S_31', events: [
                {word: ticketChangeWord(Kind.BOOK), chips: [chip(1, TicketType.CHILD)], arrow: false},
                {word: ticketChangeWord(Kind.RELEASE), chips: [chip(2, TicketType.ADULT)], arrow: false}
            ]},
            {household: 'S_31, S_22', events: [{word: ticketChangeWord(Kind.CANCEL), chips: [chip(1, TicketType.ADULT)], arrow: false}]}
        ])
        expect(rows[2]!.findAll('td')[2]!.text()).toContain(`${chip(1, TicketType.CHILD)}, ${ticketChangeWord(Kind.RELEASE)}`)
    })

    it('GIVEN no change since the deadline but older ones WHEN opened THEN the table says so and the full history stays a click away', async () => {
        historyEndpoint.mockImplementationOnce(() => ({dinnerEventId: DINNER_ID, since: SINCE.toISOString(), changes: [], olderCount: 2}))
        const wrapper = await mount()
        await open(wrapper)
        expect(findByTestId(wrapper, 'ticket-changes-none-since').text()).toContain(useTheSlopeDesignSystem().getRandomEmptyMessage('noTicketChanges').text)
        expect(findByTestId(wrapper, 'ticket-changes-more').exists()).toBe(true)
    })

    it('GIVEN no history at all WHEN opened THEN the table says so and offers no more', async () => {
        historyEndpoint.mockImplementationOnce(() => ({dinnerEventId: DINNER_ID, since: SINCE.toISOString(), changes: [], olderCount: 0}))
        const wrapper = await mount()
        await open(wrapper)
        expect(findByTestId(wrapper, 'ticket-changes-none-since').text()).toContain(useTheSlopeDesignSystem().getRandomEmptyMessage('noTicketChanges').text)
        expect(findByTestId(wrapper, 'ticket-changes-more').exists()).toBe(false)
    })
})
