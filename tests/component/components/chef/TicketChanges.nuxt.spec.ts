// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {flushPromises, enableAutoUnmount} from '@vue/test-utils'
import {nextTick} from 'vue'
import {getQuery, type H3Event} from 'h3'
import TicketChanges from '~/components/chef/TicketChanges.vue'
import {useBookingValidation, type TicketChange} from '~/composables/useBookingValidation'
import {useTicket} from '~/composables/useTicket'
import {formatPortions} from '~/utils/utils'
import {mountWithTooltipProvider, findByTestId, findAllByTestId, clickByTestId, resetStores, registerEmptyStoreEndpoints} from '~~/tests/component/testHelpers'

/**
 * TicketChanges: closed until its toggle opens; then the dinner's changes from the menu deadline, newest first, with
 * the household, the event, the moved ticket, the composition and Indtægter; the rest behind "Vis fuld historik".
 * The bookings store is real; the HTTP behind it is the one thing faked.
 */
const DINNER_ID = 7
const {OrderAuditActionSchema, TicketTypeSchema} = useBookingValidation()
const {formatPrice} = useTicket()
const Action = OrderAuditActionSchema.enum
const TicketType = TicketTypeSchema.enum
const SINCE = new Date('2026-04-03T18:00:00')

const change = (overrides: Partial<TicketChange>): TicketChange => ({
    id: 1, timestamp: new Date('2026-04-05T08:02:00'), action: Action.USER_BOOKED, householdShortname: 'S_31', ticketType: TicketType.ADULT,
    delta: {ADULT: 1, CHILD: 0, BABY: 0}, counts: {ADULT: 29, CHILD: 11, BABY: 3}, portions: 34.5, revenue: 172500, ...overrides
})
const recent = [
    change({id: 3, timestamp: new Date('2026-04-09T19:10:00'), action: Action.USER_CLAIMED, householdShortname: 'S_14', ticketType: TicketType.CHILD, delta: {ADULT: 0, CHILD: 0, BABY: 0}}),
    change({id: 2, timestamp: new Date('2026-04-05T08:02:00')})
]
const older = [change({id: 1, timestamp: new Date('2026-04-02T20:15:00'), action: Action.SYSTEM_CREATED, householdShortname: null, ticketType: null, delta: {ADULT: 28, CHILD: 11, BABY: 3}, counts: {ADULT: 28, CHILD: 11, BABY: 3}, portions: 33.5, revenue: 167500})]

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

    it('GIVEN the closed pane THEN nothing is read; WHEN opened THEN the changes since Framelding closed come newest first with household, event, ticket, composition and Indtægter; WHEN "Vis fuld historik" is clicked THEN the whole history is read and the deadline line goes', async () => {
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
        expect(rows[0]!.text()).toContain('Købt fra anden')
        expect(rows[1]!.text()).toContain('Bestilt')
        expect(rows[1]!.text()).toContain('+1 V')
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
        expect(allRows[2]!.text()).toContain('Automatisk bestilling')
        expect(allRows[2]!.text()).toContain('+28 V')
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
        expect(rows[0]!.text()).toContain('Købt fra anden')
        expect(findByTestId(wrapper, 'ticket-changes-deadline').text()).toContain('Framelding lukker')
        expect(findByTestId(wrapper, 'ticket-changes-more').exists()).toBe(true)

        await clickByTestId(wrapper, 'ticket-changes-more')
        await flushPromises()
        await nextTick()
        expect(wrapper.findAll('tbody tr')).toHaveLength(3)
        expect(findByTestId(wrapper, 'ticket-changes-deadline').exists()).toBe(false)
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
