// Factory for waiting-list test data
import type {BrowserContext} from '@playwright/test'
import {expect} from '@playwright/test'
import testHelpers from '../testHelpers'
import {useWaitlistValidation, type TicketWaitlistDetail, type WaitlistQueueSummary, type WaitlistAssignmentResult, type TicketWaitlistDisplay} from '~/composables/useWaitlistValidation'
import {useBookingValidation, type DesiredOrder, type ScaffoldResult} from '~/composables/useBookingValidation'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'

const {headers} = testHelpers
const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()

const entriesEndpoint = (dinnerEventIds: number[]) =>
    `/api/order/waitlist?${dinnerEventIds.map(id => `dinnerEventIds=${id}`).join('&')}`
const extraPortionsEndpoint = (dinnerEventId: number) => `/api/chef/dinner/${dinnerEventId}/extra-portions`

export class WaitlistFactory {
    // The desired order that targets an entry: its wish, with the overrides applied
    static readonly wishOf = (entry: TicketWaitlistDisplay, overrides: Partial<DesiredOrder> = {}): DesiredOrder => ({
        inhabitantId: entry.inhabitantId,
        dinnerEventId: entry.dinnerEventId,
        dinnerMode: entry.order.dinnerMode,
        ticketPriceId: entry.order.ticketPriceId,
        isGuestTicket: entry.isGuestTicket,
        allergyTypeIds: entry.order.allergyTypeIds,
        state: OrderStateSchema.enum.BOOKED,
        waitlistEntryId: entry.id,
        ...overrides
    })

    // An entry as the household read returns it; the held order follows the entry's keys and mode
    static readonly defaultEntry = (overrides: Partial<Omit<TicketWaitlistDetail, 'order'>> & {dinnerMode?: TicketWaitlistDetail['order']['dinnerMode'], ticketPriceId?: number, householdId?: number} = {}): TicketWaitlistDetail => {
        const {dinnerMode = DinnerModeSchema.enum.DINEIN, ticketPriceId = 1, householdId = 1, ...entry} = overrides
        const keys = {id: 1, dinnerEventId: 1, inhabitantId: 1, isGuestTicket: false, position: 1, createdAt: new Date(), ...entry}
        return {
            ...keys,
            order: {
                dinnerEventId: keys.dinnerEventId,
                inhabitantId: keys.inhabitantId,
                bookedByUserId: 1,
                ticketPriceId,
                priceAtBooking: 5500,
                householdId,
                dinnerMode,
                state: OrderStateSchema.enum.BOOKED,
                isGuestTicket: keys.isGuestTicket
            }
        }
    }

    static readonly defaultQueueSummary = (overrides: Partial<WaitlistQueueSummary> = {}): WaitlistQueueSummary => ({
        dinnerEventId: 1,
        entries: 4,
        portions: 2.5,
        lines: [],
        ...overrides
    })

    static readonly defaultAssignmentResult = (overrides: Partial<WaitlistAssignmentResult> = {}): WaitlistAssignmentResult => ({
        dinnerEventId: 1,
        supplyPortions: 2.5,
        assigned: [],
        portionsUsed: 0,
        waiting: 0,
        ...overrides
    })

    // A desired order on a closed dinner through the scaffold: a released ticket at the price, else a queue entry
    static readonly queue = async (
        context: BrowserContext, householdId: number, seasonId: number, order: DesiredOrder, adminBypass?: boolean
    ): Promise<ScaffoldResult> => {
        const response = await OrderFactory.scaffoldOrders(context, {householdId, seasonId, dinnerEventIds: [order.dinnerEventId], orders: [order]}, 200, adminBypass)
        return response!.scaffoldResult
    }

    // NONE on the entry through the scaffold
    static readonly leave = (context: BrowserContext, seasonId: number, entry: TicketWaitlistDisplay, adminBypass?: boolean): Promise<ScaffoldResult> =>
        WaitlistFactory.queue(context, entry.order.householdId, seasonId, WaitlistFactory.wishOf(entry, {dinnerMode: DinnerModeSchema.enum.NONE}), adminBypass)

    // Every entry of the dinners in queue order
    static readonly entries = async (context: BrowserContext, dinnerEventIds: number[], expectedStatus = 200): Promise<TicketWaitlistDisplay[]> => {
        const {TicketWaitlistDisplaySchema} = useWaitlistValidation()
        const response = await context.request.get(entriesEndpoint(dinnerEventIds), {headers})
        const body = response.status() === expectedStatus ? null : await response.text()
        expect(response.status(), `Unexpected status reading the queue entries: ${body}`).toBe(expectedStatus)
        return expectedStatus === 200 ? TicketWaitlistDisplaySchema.array().parse(await response.json()) : []
    }

    static readonly addExtraPortions = async (context: BrowserContext, dinnerEventId: number, portions: number, expectedStatus = 200): Promise<WaitlistAssignmentResult | null> => {
        const {WaitlistAssignmentResultSchema} = useWaitlistValidation()
        const response = await context.request.post(extraPortionsEndpoint(dinnerEventId), {headers, data: {portions}})
        const body = response.status() === expectedStatus ? null : await response.text()
        expect(response.status(), `Unexpected status releasing portions: ${body}`).toBe(expectedStatus)
        return expectedStatus === 200 ? WaitlistAssignmentResultSchema.parse(await response.json()) : null
    }

    // Cleanup: the entries still queued on the dinners leave; a dinner's deletion cascades to the rest
    static readonly cleanupEntries = async (context: BrowserContext, seasonId: number, dinnerEventIds: number[]): Promise<void> => {
        for (const entry of await WaitlistFactory.entries(context, dinnerEventIds)) {
            await WaitlistFactory.leave(context, seasonId, entry, true)
        }
    }
}
