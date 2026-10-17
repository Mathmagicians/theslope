import {describe, it, expect} from 'vitest'
import {useWaitlist} from '~/composables/useWaitlist'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useTicketPriceValidation} from '~/composables/useTicketPriceValidation'
import type {TicketWaitlistDisplay} from '~/composables/useWaitlistValidation'

const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
const {TicketTypeSchema} = useTicketPriceValidation()
const TicketType = TicketTypeSchema.enum

// Ticket price ids stand for a type; the season's prices carry each price's portions
const PRICE_ID = {[TicketType.ADULT]: 1, [TicketType.CHILD]: 2, [TicketType.BABY]: 3} as const
const PORTIONS = {[TicketType.ADULT]: 1, [TicketType.CHILD]: 0.5, [TicketType.BABY]: 0} as const
const TICKET_PRICES = Object.values(TicketType).map(ticketType => ({id: PRICE_ID[ticketType], ticketType, portions: PORTIONS[ticketType]}))
const portionsOf = useWaitlist().portionsOfEntryFor(TICKET_PRICES)
const ticketTypeOf = useWaitlist().ticketTypeOfEntry(TICKET_PRICES)

const entry = (id: number, ticketType: keyof typeof PRICE_ID, minute: number, isGuestTicket = false): TicketWaitlistDisplay => ({
    id,
    dinnerEventId: 100,
    inhabitantId: 40 + id,
    isGuestTicket,
    createdAt: new Date(2026, 9, 1, 12, minute),
    order: {
        dinnerEventId: 100,
        inhabitantId: 40 + id,
        bookedByUserId: 7,
        ticketPriceId: PRICE_ID[ticketType],
        priceAtBooking: ticketType === TicketType.ADULT ? 4000 : ticketType === TicketType.CHILD ? 1700 : 0,
        householdId: 9,
        dinnerMode: DinnerModeSchema.enum.DINEIN,
        state: OrderStateSchema.enum.BOOKED,
        isGuestTicket
    }
})

describe('useWaitlist', () => {
    const {inQueueOrder, waitingLines, positionOf, portionNeed, resolveWaitlistAssignment} = useWaitlist()
    // Joined in the order voksen, barn, voksen, barn
    const queue = [entry(1, TicketType.ADULT, 0), entry(2, TicketType.CHILD, 1), entry(3, TicketType.ADULT, 2), entry(4, TicketType.CHILD, 3)]

    it('orders the queue by join time, then by id', () => {
        const shuffled = [queue[3]!, queue[0]!, {...queue[2]!, createdAt: queue[1]!.createdAt}, queue[1]!]
        expect(inQueueOrder(shuffled).map(e => e.id)).toEqual([1, 2, 3, 4])
    })

    it('splits the queue into one line per ticket type, each in join order', () => {
        const lines = waitingLines([queue[3]!, queue[2]!, queue[1]!, queue[0]!], ticketTypeOf)

        expect(lines.get(TicketType.ADULT)?.map(e => e.id)).toEqual([1, 3])
        expect(lines.get(TicketType.CHILD)?.map(e => e.id)).toEqual([2, 4])
        expect(lines.has(TicketType.BABY)).toBe(false)
    })

    it.each([
        {entryId: 3, position: 2, description: 'the second adult is second in the adult line'},
        {entryId: 99, position: null, description: 'an entry outside the queue has no place'}
    ])('$description', ({entryId, position}) => {
        expect(positionOf(queue, entryId, ticketTypeOf)).toBe(position)
    })

    it('weighs an entry at the portions its price carries', () => {
        expect(portionsOf(entry(1, TicketType.CHILD, 0))).toBe(PORTIONS[TicketType.CHILD])
    })

    it('weighs an entry whose price is outside the season at nothing', () => {
        expect(useWaitlist().portionsOfEntryFor([])(entry(1, TicketType.ADULT, 0))).toBe(0)
    })

    it('sums the portion need of the queue', () => {
        expect(portionNeed(queue, portionsOf)).toBe(3)
    })

    describe.each([
        {supply: 2.5, taken: [1, 2, 3], used: 2.5, waiting: [4], description: '2.5 portions feed voksen, barn, voksen; the last barn waits'},
        {supply: 3, taken: [1, 2, 3, 4], used: 3, waiting: [], description: '3 portions feed the whole queue'},
        {supply: 0.5, taken: [], used: 0, waiting: [1, 2, 3, 4], description: 'half a portion does not fit the head, and nobody overtakes'}
    ])('$description', ({supply, taken, used, waiting}) => {
        it('takes strictly in FIFO order', () => {
            const plan = resolveWaitlistAssignment(queue, supply, portionsOf)
            expect(plan.take.map(t => t.entry.id)).toEqual(taken)
            expect(plan.portionsUsed).toBe(used)
            expect(plan.waiting.map(e => e.id)).toEqual(waiting)
        })
    })

    it('lets a zero-weight entry through on any supply and keeps the walk going', () => {
        const withBaby = [entry(1, TicketType.BABY, 0), entry(2, TicketType.ADULT, 1)]
        const plan = resolveWaitlistAssignment(withBaby, 1, portionsOf)
        expect(plan.take.map(t => t.entry.id)).toEqual([1, 2])
        expect(plan.portionsUsed).toBe(1)
    })

    it('replays to the same plan on the same queue and supply', () => {
        const first = resolveWaitlistAssignment(queue, 2.5, portionsOf)
        const second = resolveWaitlistAssignment(queue, 2.5, portionsOf)
        expect(second).toEqual(first)
    })
})
