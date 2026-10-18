import {describe, it, expect} from 'vitest'
import {subMinutes} from 'date-fns'
import {useWaitlist, type TicketForSale} from '~/composables/useWaitlist'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useTicketPriceValidation} from '~/composables/useTicketPriceValidation'
import {useWaitlistValidation, type PlacementOrder, type TicketWaitlistDisplay} from '~/composables/useWaitlistValidation'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'

const {OrderStateSchema} = useBookingValidation()
const {TicketTypeSchema} = useTicketPriceValidation()
const {PlacementRecoverySchema} = useWaitlistValidation()
const TicketType = TicketTypeSchema.enum
const Recovery = PlacementRecoverySchema.enum

// Ticket price ids stand for a type; the season's prices carry each price's portions
const PRICE_ID = {[TicketType.ADULT]: 1, [TicketType.CHILD]: 2, [TicketType.BABY]: 3} as const
const PORTIONS = {[TicketType.ADULT]: 1, [TicketType.CHILD]: 0.5, [TicketType.BABY]: 0} as const
const TICKET_PRICES = Object.values(TicketType).map(ticketType => ({id: PRICE_ID[ticketType], ticketType, portions: PORTIONS[ticketType]}))
const portionsOf = useWaitlist().portionsOfEntryFor(TICKET_PRICES)
const ticketTypeOf = useWaitlist().ticketTypeOfEntry(TICKET_PRICES)

// The placing lease runs from a run's grab; NOW is the instant a run reads the queue
const LEASE_MINUTES = 10
const NOW = new Date(2026, 9, 1, 18, 0)
const grabbedAgo = (minutes: number) => ({placingAt: subMinutes(NOW, minutes)})
const {isHeld, isExpired} = useWaitlist().placingLease(NOW, LEASE_MINUTES)

type EntryOverrides = Partial<Pick<TicketWaitlistDisplay, 'isGuestTicket' | 'placingAt' | 'placingOrderId'>>
const entry = (id: number, ticketType: keyof typeof PRICE_ID, minute: number, overrides: EntryOverrides = {}): TicketWaitlistDisplay =>
    WaitlistFactory.defaultEntry({
        id, dinnerEventId: 100, inhabitantId: 40 + id, householdId: 9, ticketPriceId: PRICE_ID[ticketType],
        createdAt: new Date(2026, 9, 1, 12, minute), ...overrides
    })

describe('useWaitlist', () => {
    const {
        inQueueOrder, waitingLines, placementLines, positionOf, portionNeed, resolveWaitlistAssignment, placementRecoveryOf, placingOrderOf,
        finishedPlacementOutcomes
    } = useWaitlist()
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

    it('reports the entries that joined behind the line in join order, each at its place in its ticket type\'s line, with the size and the portion need of the queue that holds it at its join', () => {
        const {joinedOf} = useWaitlist()
        const [adult1, child2, adult3, child4] = queue
        const joined = (entry: TicketWaitlistDisplay, ticketType: keyof typeof PRICE_ID, position: number, queueSize: number, portionNeed: number) => ({
            position, joined: {dinnerEventId: 100, inhabitantId: entry.inhabitantId, bookedByUserId: 7, position, ticketType, queueSize, portionNeed}
        })

        expect(joinedOf([adult1!, child2!], [adult3!, child4!], TICKET_PRICES, 7)).toEqual([
            joined(adult3!, TicketType.ADULT, 2, 3, 2.5),
            joined(child4!, TicketType.CHILD, 2, 4, 3)
        ])
    })

    // What the sale to the waiting list would sell, read without writing; sellers are households 5, 6 and 7
    describe('previewSale', () => {
        const {previewSale} = useWaitlist()
        const ticket = (id: number, ticketType: keyof typeof PRICE_ID, minute: number, householdId: number, dinnerEventId = 100): TicketForSale =>
            ({id, dinnerEventId, ticketPriceId: PRICE_ID[ticketType], releasedAt: new Date(2026, 9, 1, 14, minute), householdId})
        const sale = (buyer: TicketWaitlistDisplay, ticketType: keyof typeof PRICE_ID, sellerHouseholdId: number) => ({
            dinnerEventId: buyer.dinnerEventId, ticketPriceId: PRICE_ID[ticketType], buyerInhabitantId: buyer.inhabitantId,
            buyerHouseholdId: buyer.order.householdId, sellerHouseholdId
        })
        const [adult1, child2, adult3] = queue

        it.each([
            {
                description: 'each line takes its type\'s tickets oldest released first; a line longer than its tickets waits',
                tickets: [ticket(70, TicketType.ADULT, 2, 5), ticket(71, TicketType.ADULT, 1, 6), ticket(72, TicketType.CHILD, 1, 7)],
                sold: [sale(adult1!, TicketType.ADULT, 6), sale(adult3!, TicketType.ADULT, 5), sale(child2!, TicketType.CHILD, 7)]
            },
            {
                description: 'tickets beyond a line\'s length stay for sale',
                tickets: [ticket(70, TicketType.ADULT, 0, 5), ticket(71, TicketType.ADULT, 1, 6), ticket(72, TicketType.ADULT, 2, 7)],
                sold: [sale(adult1!, TicketType.ADULT, 5), sale(adult3!, TicketType.ADULT, 6)]
            },
            {
                description: 'a ticket of a type nobody waits for, or of another dinner, sells to nobody',
                tickets: [ticket(70, TicketType.BABY, 0, 5), ticket(71, TicketType.ADULT, 1, 6, 101)],
                sold: []
            }
        ])('$description', ({tickets, sold}) => {
            expect(previewSale(queue, tickets, TICKET_PRICES)).toEqual({waitlistTicketsSold: sold})
        })

        it('sells nothing while nobody waits', () => {
            expect(previewSale([], [ticket(70, TicketType.ADULT, 0, 5)], TICKET_PRICES)).toEqual({waitlistTicketsSold: []})
        })
    })

    describe.each([
        {supply: 2.5, taken: [1, 2, 3], used: 2.5, waiting: [4], description: '2.5 portions feed voksen, barn, voksen; the last barn waits'},
        {supply: 3, taken: [1, 2, 3, 4], used: 3, waiting: [], description: '3 portions feed the whole queue'},
        {supply: 0.5, taken: [], used: 0, waiting: [1, 2, 3, 4], description: 'half a portion does not fit the head, and nobody overtakes'}
    ])('$description', ({supply, taken, used, waiting}) => {
        it('takes strictly in FIFO order', () => {
            const plan = resolveWaitlistAssignment(queue, supply, portionsOf, isHeld)
            expect(plan.take.map(t => t.entry.id)).toEqual(taken)
            expect(plan.portionsUsed).toBe(used)
            expect(plan.waiting.map(e => e.id)).toEqual(waiting)
        })
    })

    it('lets a zero-weight entry through on any supply and keeps the walk going', () => {
        const withBaby = [entry(1, TicketType.BABY, 0), entry(2, TicketType.ADULT, 1)]
        const plan = resolveWaitlistAssignment(withBaby, 1, portionsOf, isHeld)
        expect(plan.take.map(t => t.entry.id)).toEqual([1, 2])
        expect(plan.portionsUsed).toBe(1)
    })

    it('replays to the same plan on the same queue and supply', () => {
        const first = resolveWaitlistAssignment(queue, 2.5, portionsOf, isHeld)
        const second = resolveWaitlistAssignment(queue, 2.5, portionsOf, isHeld)
        expect(second).toEqual(first)
    })

    describe('a run that grabbed an entry holds it for the lease', () => {
        it.each([
            {description: 'an entry waiting in its line', placing: {}, held: false, expired: false},
            {description: 'a grab younger than the lease', placing: grabbedAgo(1), held: true, expired: false},
            {description: 'a grab as old as the lease', placing: grabbedAgo(LEASE_MINUTES), held: false, expired: true},
            {description: 'a grab older than the lease', placing: grabbedAgo(3 * LEASE_MINUTES), held: false, expired: true}
        ])('$description: held $held, expired $expired', ({placing, held, expired}) => {
            const candidate = entry(1, TicketType.ADULT, 0, placing)
            expect(isHeld(candidate)).toBe(held)
            expect(isExpired(candidate)).toBe(expired)
        })

        // The second voksen is grabbed; a fifth entry, voksen, joined last
        const withGrab = (placing: EntryOverrides) => [queue[0]!, queue[1]!, entry(3, TicketType.ADULT, 2, placing), queue[3]!, entry(5, TicketType.ADULT, 4)]

        it.each([
            {description: 'a line stops at the entry a run holds; the other lines run on', placing: grabbedAgo(1), adults: [1]},
            {description: 'a grab older than the lease stands at its place: the recovery settles it before the walk', placing: grabbedAgo(3 * LEASE_MINUTES), adults: [1, 3, 5]}
        ])('$description', ({placing, adults}) => {
            const lines = placementLines(withGrab(placing), ticketTypeOf, isHeld)

            expect(lines.get(TicketType.ADULT)?.map(e => e.id)).toEqual(adults)
            expect(lines.get(TicketType.CHILD)?.map(e => e.id)).toEqual([2, 4])
        })

        it('keeps a held entry at its place in the line the queue shows', () => {
            expect(positionOf(withGrab(grabbedAgo(1)), 5, ticketTypeOf)).toBe(3)
        })

        it('stops the portion walk at the first entry a run holds, so nobody overtakes it', () => {
            const plan = resolveWaitlistAssignment(withGrab(grabbedAgo(1)), 3, portionsOf, isHeld)

            expect(plan.take.map(t => t.entry.id)).toEqual([1, 2])
            expect(plan.portionsUsed).toBe(1.5)
            expect(plan.waiting.map(e => e.id)).toEqual([3, 4, 5])
        })
    })

    // The evidence a stopped run left: a portion's order is written after the grab, a sale's released ticket before it
    describe('recovery of a stopped placement', () => {
        const PLACING_AT = subMinutes(NOW, 3 * LEASE_MINUTES)
        const ORDER_ID = 77
        const grabbed = (placingOrderId: number | null) => ({...entry(1, TicketType.ADULT, 0, {placingOrderId}), placingAt: PLACING_AT})
        const writtenAfterGrab = PLACING_AT
        const releasedBeforeGrab = subMinutes(PLACING_AT, 60)
        const order = (createdAt: Date, overrides: Partial<PlacementOrder> = {}): PlacementOrder => ({
            ...OrderFactory.defaultOrder(undefined, {
                id: ORDER_ID, inhabitantId: grabbed(null).inhabitantId, isGuestTicket: false, state: OrderStateSchema.enum.BOOKED,
                ticketPriceId: PRICE_ID[TicketType.ADULT], createdAt
            }),
            sellerHouseholdId: null,
            ...overrides
        })

        describe('placingOrderOf', () => {
            // Three orders of the entry's inhabitant written since the grab
            const written = [ORDER_ID, ORDER_ID + 1, ORDER_ID + 2].map(id => order(writtenAfterGrab, {id}))

            it.each([
                {description: 'a recorded entry is served by its recorded order', placingOrderId: ORDER_ID + 2, serving: [], found: ORDER_ID + 2},
                {description: 'a recorded entry whose order is gone is served by none', placingOrderId: ORDER_ID + 9, serving: [], found: null},
                {description: 'an entry without a recorded order is served by the first order written since the grab', placingOrderId: null, serving: [], found: ORDER_ID},
                {description: 'the search passes over the orders that serve other entries', placingOrderId: null, serving: [ORDER_ID, ORDER_ID + 1], found: ORDER_ID + 2}
            ])('$description', ({placingOrderId, serving, found}) => {
                expect(placingOrderOf(grabbed(placingOrderId), written, new Set(serving))?.id ?? null).toBe(found)
            })
        })

        describe('finishedPlacementOutcomes', () => {
            const portionsOfAdult = PORTIONS[TicketType.ADULT]
            const {dinnerEventId, id: entryId, inhabitantId, isGuestTicket, order: {householdId, ticketPriceId}} = grabbed(null)

            it.each([
                {
                    description: 'the order written after the grab is the extra portion assigned to the entry',
                    found: order(writtenAfterGrab),
                    outcomes: {waitlistTicketsSold: [], waitlistPortionsAssigned: [{dinnerEventId, entryId, inhabitantId, isGuestTicket, portions: portionsOfAdult, orderId: ORDER_ID, ticketPriceId}]}
                },
                {
                    description: 'the released ticket older than the grab is sold to the entry by the household its claim names',
                    found: order(releasedBeforeGrab, {ticketPriceId: PRICE_ID[TicketType.CHILD], sellerHouseholdId: 3}),
                    outcomes: {waitlistTicketsSold: [{dinnerEventId, ticketPriceId: PRICE_ID[TicketType.CHILD], buyerInhabitantId: inhabitantId, buyerHouseholdId: householdId, sellerHouseholdId: 3}], waitlistPortionsAssigned: []}
                },
                {
                    description: 'a sold ticket whose claim names no household reports nothing',
                    found: order(releasedBeforeGrab),
                    outcomes: {waitlistTicketsSold: [], waitlistPortionsAssigned: []}
                }
            ])('$description', ({found, outcomes}) => {
                expect(finishedPlacementOutcomes(grabbed(null), found, portionsOf)).toEqual(outcomes)
            })
        })

        describe('placementRecoveryOf', () => it.each([
            {evidence: 'the recorded order is the portion\'s own, written after the grab', placingOrderId: ORDER_ID, found: order(writtenAfterGrab), recovery: Recovery.FINISH},
            {evidence: 'the recorded released ticket is booked on the entry\'s inhabitant with its guest flag', placingOrderId: ORDER_ID, found: order(releasedBeforeGrab), recovery: Recovery.FINISH},
            {evidence: 'the recorded released ticket is still released', placingOrderId: ORDER_ID, found: order(releasedBeforeGrab, {state: OrderStateSchema.enum.RELEASED}), recovery: Recovery.RELEASE},
            {evidence: 'the recorded released ticket went to another inhabitant', placingOrderId: ORDER_ID, found: order(releasedBeforeGrab, {inhabitantId: 99}), recovery: Recovery.RELEASE},
            {evidence: 'the recorded released ticket is the inhabitant\'s guest ticket', placingOrderId: ORDER_ID, found: order(releasedBeforeGrab, {isGuestTicket: true}), recovery: Recovery.RELEASE},
            {evidence: 'the recorded order is gone', placingOrderId: ORDER_ID, found: null, recovery: Recovery.RELEASE},
            {evidence: 'no order recorded, the search finds the order the portion run wrote', placingOrderId: null, found: order(writtenAfterGrab), recovery: Recovery.FINISH},
            {evidence: 'no order recorded, the search finds none', placingOrderId: null, found: null, recovery: Recovery.RELEASE}
        ])('$evidence: $recovery', ({placingOrderId, found, recovery}) => {
            expect(placementRecoveryOf(grabbed(placingOrderId), found)).toBe(recovery)
        }))
    })
})
