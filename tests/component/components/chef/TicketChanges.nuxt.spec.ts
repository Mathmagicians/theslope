// @vitest-environment nuxt
import {describe, it, expect, beforeAll, beforeEach, afterEach, vi} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {flushPromises, enableAutoUnmount} from '@vue/test-utils'
import {nextTick} from 'vue'
import {getQuery, type H3Event} from 'h3'
import TicketChanges from '~/components/chef/TicketChanges.vue'
import {useBookingValidation, type TicketChange, type TicketType} from '~/composables/useBookingValidation'
import {ticketChangeWord, ticketChangeSeller} from '~/composables/useBookingUi'
import {useBooking} from '~/composables/useBooking'
import {useTicket} from '~/composables/useTicket'
import {useBilling} from '~/composables/useBilling'
import {BOOKING_WORDS} from '~/config/bookingWords'
import {formatPortions} from '~/utils/utils'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {mountWithTooltipProvider, findByTestId, findAllByTestId, clickByTestId, resetStores, registerEmptyStoreEndpoints} from '~~/tests/component/testHelpers'

/**
 * TicketChanges: closed until its toggle opens; then the dinner's changes from the menu deadline, newest first, with
 * the household, the actor, the ticket events, the composition and Indtægter, and the moment Framelding closes as a row
 * of its own; the rest behind "Vis fuld historik".
 * The bookings store is real; the HTTP behind it is the one thing faked.
 */
const DINNER_ID = 7
const SYSTEM_USER_ID = 99
const {TicketChangeKindSchema, TicketTypeSchema, OrderAuditSourceSchema} = useBookingValidation()
const {formatPrice} = useTicket()
const Kind = TicketChangeKindSchema.enum
const TicketType = TicketTypeSchema.enum
const CORRECTION = OrderAuditSourceSchema.enum['admin-correction']
const WORDS = BOOKING_WORDS.ticketChange
const counts = OrderFactory.ticketCounts
const SINCE = new Date('2026-04-03T18:00:00')
// A ticket chip as the pane writes it: the tickets of one type as the ticket counts read them
const chip = (count: number, ticketType: TicketType) => useBilling().formatTicketCounts({[ticketType]: count})

// A line on a dinner holding 43 tickets
const change = (overrides: Partial<TicketChange>): TicketChange =>
    OrderFactory.defaultTicketChange({counts: counts(29, 11, 3), portions: 34.5, revenue: 172500, ...overrides})
const recent = [
    change({id: 3, timestamp: new Date('2026-04-09T19:10:00'), performedByUserId: 14, performedByName: 'Anna H.', households: ['S_14'], events: [{change: Kind.BUY, tickets: counts(0, 1, 0)}]}),
    change({id: 2, timestamp: new Date('2026-04-05T08:02:00')})
]
const older = [change({
    id: 1, timestamp: new Date('2026-04-02T20:15:00'), performedByUserId: SYSTEM_USER_ID, performedByName: WORDS.bySystem, bySystem: true, households: ['S_31', 'S_22'],
    events: [{change: Kind.BOOK, tickets: counts(28, 11, 3)}], counts: counts(28, 11, 3), portions: 33.5, revenue: 167500
})]

const historyEndpoint = vi.fn<(event: H3Event) => unknown>((event: H3Event) => {
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
const showFullHistory = async (wrapper: Wrapper) => {
    await clickByTestId(wrapper, 'ticket-changes-more')
    await flushPromises()
    await nextTick()
}

const bodyRows = (wrapper: Wrapper) => wrapper.findAll('tbody tr')
type BodyRow = ReturnType<typeof bodyRows>[number]
const isDeadlineRow = (row: BodyRow) => findByTestId(row, 'ticket-changes-deadline').exists()
// The rows of changes: every body row but the deadline's
const changeRows = (wrapper: Wrapper) => bodyRows(wrapper).filter(row => !isDeadlineRow(row))
const DEADLINE_ROW = 'the deadline row'
const emptyCell = (wrapper: Wrapper) => wrapper.find('td[data-slot="empty"]')
const classesOf = (token: string) => token.split(' ')

describe('TicketChanges', () => {
    let formatMoment: (date: Date) => string
    // The body rows down the table: a change by its moment, and the deadline row
    const readRows = (wrapper: Wrapper) => bodyRows(wrapper).map(row => isDeadlineRow(row) ? DEADLINE_ROW : row.findAll('td')[0]!.text())
    const momentsOf = (lines: TicketChange[]) => lines.map(line => formatMoment(line.timestamp))

    beforeAll(() => {
        ({formatMoment} = useBooking())
    })

    beforeEach(() => {
        resetStores()
        historyEndpoint.mockClear()
    })

    it('GIVEN the closed pane THEN nothing is read; WHEN opened THEN the changes since Framelding closed come newest first with household, actor, ticket events, composition and Indtægter, the deadline row last; WHEN "Vis fuld historik" is clicked THEN the whole history is read and the deadline row stands between the changes since it and the older ones', async () => {
        const wrapper = await mount()
        expect(wrapper.text()).toContain(WORDS.title)
        expect(bodyRows(wrapper)).toHaveLength(0)
        expect(historyEndpoint).not.toHaveBeenCalled()

        await open(wrapper)

        expect(historyEndpoint).toHaveBeenCalledTimes(1)
        expect(getQuery(historyEndpoint.mock.calls[0]![0] as H3Event)).toMatchObject({since: SINCE.toISOString()})
        expect(wrapper.findAll('thead th').map(header => header.text())).toEqual(Object.values(WORDS.columns))
        expect(readRows(wrapper)).toEqual([...momentsOf(recent), DEADLINE_ROW])
        const rows = changeRows(wrapper)
        expect(rows[0]!.text()).toContain('S_14')
        expect(findByTestId(rows[0]!, 'ticket-change-performer').text()).toBe(recent[0]!.performedByName)
        expect(rows[0]!.text()).toContain(ticketChangeWord(Kind.BUY))
        expect(rows[1]!.text()).toContain(ticketChangeWord(Kind.BOOK))
        expect(rows[1]!.text()).toContain(chip(1, TicketType.ADULT))
        expect(rows[1]!.text()).toContain(WORDS.portions(formatPortions(34.5)))
        expect(findAllByTestId(wrapper, 'ticket-change-revenue')[1]!.text()).toBe(`${formatPrice(172500)} kr`)
        expect(findByTestId(wrapper, 'ticket-changes-deadline').text()).toContain(WORDS.deadline(formatMoment(SINCE)))
        expect(findByTestId(wrapper, 'ticket-changes-more').exists()).toBe(true)

        await showFullHistory(wrapper)

        expect(getQuery(historyEndpoint.mock.calls.at(-1)![0] as H3Event)).not.toHaveProperty('since')
        expect(readRows(wrapper)).toEqual([...momentsOf(recent), DEADLINE_ROW, ...momentsOf(older)])
        const oldest = changeRows(wrapper)[2]!
        expect(oldest.text()).toContain(WORDS.bySystem)
        expect(findByTestId(oldest, 'ticket-change-performer').text()).toBe(WORDS.bySystem)
        expect(oldest.text()).toContain(ticketChangeWord(Kind.BOOK))
        expect(oldest.text()).toContain(chip(28, TicketType.ADULT))
        expect(findByTestId(wrapper, 'ticket-changes-more').exists()).toBe(false)
    })

    it('GIVEN the changes since the deadline WHEN opened THEN the table binds the history token, whose rows keep their width on a phone, and the deadline row\'s Dato cell spans every column while its other cells step aside', async () => {
        const {COMPONENTS} = useTheSlopeDesignSystem()
        const wrapper = await mount()
        await open(wrapper)

        const columnCount = wrapper.findAll('thead th').length
        const [moment, ...beside] = bodyRows(wrapper).find(isDeadlineRow)!.findAll('td')
        expect(moment!.attributes('colspan')).toBe(String(columnCount))
        expect(beside).toHaveLength(columnCount - 1)
        beside.forEach(cell => expect(cell.classes()).toEqual(expect.arrayContaining(classesOf(COMPONENTS.table.spannedCell))))
        changeRows(wrapper).flatMap(row => row.findAll('td'))
            .forEach(cell => expect(cell.classes()).toEqual(expect.arrayContaining(classesOf(COMPONENTS.table.historyUi.td))))
    })

    it('GIVEN the changes on the way WHEN opened THEN the table shows its loading row until they land', async () => {
        let land = () => {}
        historyEndpoint.mockImplementationOnce(() => new Promise(resolve => {
            land = () => resolve({dinnerEventId: DINNER_ID, since: SINCE.toISOString(), changes: recent, olderCount: 0})
        }))
        const wrapper = await mount()
        await clickByTestId(wrapper, 'ticket-changes-toggle')
        await vi.waitFor(() => expect(historyEndpoint).toHaveBeenCalled())

        expect(wrapper.find('tbody').text()).toContain('Henter...')

        land()
        await vi.waitFor(() => expect(changeRows(wrapper)).toHaveLength(recent.length))
        expect(wrapper.find('tbody').text()).not.toContain('Henter...')
    })

    it('GIVEN Framelding still ahead WHEN opened THEN the newest change shows alone in the full history columns with the deadline row under it; WHEN the full history loads THEN every change stands under the deadline row', async () => {
        const ahead = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        const wrapper = await mount({since: ahead})
        await open(wrapper)
        // The history is read whole, since nothing has moved since a moment still ahead
        expect(getQuery(historyEndpoint.mock.calls[0]![0] as H3Event)).not.toHaveProperty('since')
        expect(readRows(wrapper)).toEqual([...momentsOf(recent.slice(0, 1)), DEADLINE_ROW])
        const [newest] = changeRows(wrapper)
        expect(newest!.text()).toContain('S_14')
        expect(newest!.text()).toContain(ticketChangeWord(Kind.BUY))
        expect(findByTestId(wrapper, 'ticket-changes-deadline').text()).toContain(WORDS.deadline(formatMoment(ahead)))
        expect(findByTestId(wrapper, 'ticket-changes-more').exists()).toBe(true)

        await showFullHistory(wrapper)

        expect(readRows(wrapper)).toEqual([DEADLINE_ROW, ...momentsOf([...recent, ...older])])
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

        const rows = changeRows(wrapper)
        const read = (row: BodyRow) => ({
            household: row.findAll('td')[1]!.text(),
            events: findAllByTestId(row, 'ticket-change-event').map(event => ({
                word: findByTestId(event, 'ticket-change-word').text(),
                chips: findAllByTestId(event, 'ticket-change-chip').map(badge => badge.text()),
                arrow: event.text().includes('→')
            }))
        })
        expect(rows.map(read)).toEqual([
            {household: WORDS.bySystem, events: [{word: ticketChangeWord(Kind.CLOSE), chips: [], arrow: false}]},
            {household: 'S_22', events: [{word: ticketChangeWord(Kind.CHANGE_PRICE), chips: [chip(1, TicketType.CHILD), chip(1, TicketType.ADULT)], arrow: true}]},
            {household: 'S_31', events: [
                {word: ticketChangeWord(Kind.BOOK), chips: [chip(1, TicketType.CHILD)], arrow: false},
                {word: ticketChangeWord(Kind.RELEASE), chips: [chip(2, TicketType.ADULT)], arrow: false}
            ]},
            {household: 'S_31, S_22', events: [{word: ticketChangeWord(Kind.CANCEL), chips: [chip(1, TicketType.ADULT)], arrow: false}]}
        ])
        expect(findByTestId(rows[2]!, 'ticket-change-event').element.closest('td')!.textContent).toContain(`${chip(1, TicketType.CHILD)}, ${ticketChangeWord(Kind.RELEASE)}`)
    })

    it.each([
        {event: {change: Kind.CANCEL, reason: CORRECTION}, word: 'frameldt, ADMIN korrektion'},
        {event: {change: Kind.BOOK, reason: CORRECTION}, word: 'tilmeldt, ADMIN korrektion'},
        {event: {change: Kind.EXTRA_PORTIONS}, word: 'ekstra tilmeldt'}
    ])('GIVEN a line of $event.change with the reason $event.reason WHEN opened THEN Ændring reads "$word"', async ({event, word}) => {
        historyEndpoint.mockImplementationOnce(() => ({dinnerEventId: DINNER_ID, since: SINCE.toISOString(), changes: [change({id: 21, events: [{...event, tickets: counts(0, 1, 0)}]})], olderCount: 0}))
        const wrapper = await mount()
        await open(wrapper)

        expect(findByTestId(wrapper, 'ticket-change-word').text()).toBe(word)
    })

    it('GIVEN a line of sales from two households WHEN opened THEN each sale reads its word, its tickets and the seller it was bought from', async () => {
        const sales = change({id: 31, performedByUserId: 14, households: ['S_14'], events: [
            {change: Kind.BUY, tickets: counts(1, 0, 0), seller: 'S_32'},
            {change: Kind.BUY, tickets: counts(0, 1, 0), seller: 'S_22'}
        ]})
        historyEndpoint.mockImplementationOnce(() => ({dinnerEventId: DINNER_ID, since: SINCE.toISOString(), changes: [sales], olderCount: 0}))
        const wrapper = await mount()
        await open(wrapper)

        expect(findAllByTestId(wrapper, 'ticket-change-event').map(event => ({
            word: findByTestId(event, 'ticket-change-word').text(),
            chips: findAllByTestId(event, 'ticket-change-chip').map(badge => badge.text()),
            seller: findByTestId(event, 'ticket-change-seller').text()
        }))).toEqual([
            {word: ticketChangeWord(Kind.BUY), chips: [chip(1, TicketType.ADULT)], seller: ticketChangeSeller('S_32')},
            {word: ticketChangeWord(Kind.BUY), chips: [chip(1, TicketType.CHILD)], seller: ticketChangeSeller('S_22')}
        ])
    })

    it('GIVEN no change since the deadline but older ones WHEN opened THEN the table says so with the deadline line under it and the full history stays a click away', async () => {
        historyEndpoint.mockImplementationOnce(() => ({dinnerEventId: DINNER_ID, since: SINCE.toISOString(), changes: [], olderCount: 2}))
        const wrapper = await mount()
        await open(wrapper)
        expect(findByTestId(emptyCell(wrapper), 'ticket-changes-none-since').text()).toContain(useTheSlopeDesignSystem().getRandomEmptyMessage('noTicketChanges').text)
        expect(findByTestId(emptyCell(wrapper), 'ticket-changes-deadline').text()).toContain(WORDS.deadline(formatMoment(SINCE)))
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
