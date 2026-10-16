import {describe, it, expect, beforeAll} from 'vitest'
import {addDays, addYears, differenceInDays, nextDay, type Day} from 'date-fns'
import {useBooking, emptyOrderBuckets, actionOfUpdate, plannedActions, countTotals, DINNER_STEP_MAP, DinnerStepState, CONSUMABLE_DINNER_STATES, CLOSABLE_ORDER_STATES, decideOrderAction, resolveDesiredOrdersToBuckets, generateDesiredOrdersFromPreferences, resolveOrdersFromPreferencesToBuckets, getNewOrderAction, bookingOutcome, ticketsForSaleOf, EMPTY_RELEASED_TICKET_COUNTS, buildDesiredOrder, buildGuestDesiredOrder, findRegularOrder, type OrderDecisionInput, type BookingIntent, type TicketPriceResolver} from '~/composables/useBooking'
import {useBillingValidation} from '~/composables/useBillingValidation'
import {MODE_WORDS, ACTION_WORDS, ORDER_STATE_LABELS} from '~/composables/useBookingUi'
import {useBookingValidation, type OrderDisplay, type DinnerMode, type DesiredOrder} from '~/composables/useBookingValidation'
import type {TicketWaitlistDisplay} from '~/composables/useWaitlistValidation'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {WEEKDAYS, type WeekDayMap} from '~/types/dateTypes'
import appConfig from '~/app.config'

// Shared test constant: days offset for dinners before cancellation deadline
const {OrderBucketSchema, BookingActionSchema, DinnerStateSchema: DinnerStateEnumSchema, OrderStateSchema: OrderStateEnumSchema, DinnerModeSchema: DinnerModeEnumSchema, TicketTypeSchema: TicketTypeEnumSchema} = useBookingValidation()
const Bucket = OrderBucketSchema.enum
const Action = BookingActionSchema.enum
const DinnerStates = DinnerStateEnumSchema.enum
const OrderStates = OrderStateEnumSchema.enum
const DinnerModes = DinnerModeEnumSchema.enum
const TicketTypes = TicketTypeEnumSchema.enum

const FAR_FUTURE_DAYS = appConfig.theslope.defaultSeason.ticketIsCancellableDaysBefore + 20

// Helper: days from today to next occurrence of weekday (0=Sun..6=Sat), at least minDaysAhead from now
const today = new Date()
const daysToWeekday = (dayOfWeek: Day, minDaysAhead: number = FAR_FUTURE_DAYS): number =>
    differenceInDays(nextDay(addDays(today, minDaysAhead), dayOfWeek), today)

// @nuxt/test-utils 4 starts Nuxt in beforeAll: composables run there, not in the describe body
type UseBookingT = ReturnType<typeof useBooking>
type UseBookingUiT = ReturnType<typeof useBookingUi>
let buildDinnerUrl: UseBookingT['buildDinnerUrl']
let createHeynaboEventPayload: UseBookingT['createHeynaboEventPayload']
let HEYNABO_EVENT_TEMPLATE: UseBookingT['HEYNABO_EVENT_TEMPLATE']
let canCancelDinner: UseBookingT['canCancelDinner']
let getStepConfig: UseBookingT['getStepConfig']
let getDinnerStepState: UseBookingT['getDinnerStepState']
let getPastDinnerIds: UseBookingT['getPastDinnerIds']
let prepareTransactionData: UseBookingT['prepareTransactionData']
let buildOrderSnapshot: UseBookingT['buildOrderSnapshot']
let getLockedFutureDinnerIds: UseBookingT['getLockedFutureDinnerIds']
let computeLockStatus: UseBookingT['computeLockStatus']
let countReleasedOrdersByDinner: UseBookingT['countReleasedOrdersByDinner']
let getBookingOptions: UseBookingT['getBookingOptions']
let groupGuestOrders: UseBookingT['groupGuestOrders']
let getDayBillSummary: UseBookingT['getDayBillSummary']
let hasChanges: UseBookingT['hasChanges']
let countChanges: UseBookingT['countChanges']
let getPowerChanges: UseBookingT['getPowerChanges']
let getPowerConsensus: UseBookingT['getPowerConsensus']
let formatActionPreview: UseBookingUiT['formatActionPreview']
let defaultDeadlines: ReturnType<ReturnType<typeof useSeason>['deadlinesForSeason']>
let resolveTicketPrice: ReturnType<typeof useTicket>['resolveTicketPrice']
beforeAll(() => {
    ({
        buildDinnerUrl,
        createHeynaboEventPayload,
        HEYNABO_EVENT_TEMPLATE,
        canCancelDinner,
        getStepConfig,
        getDinnerStepState,
        getPastDinnerIds,
        prepareTransactionData,
        buildOrderSnapshot,
        getLockedFutureDinnerIds,
        computeLockStatus,
        countReleasedOrdersByDinner,
        getBookingOptions,
        groupGuestOrders,
        getDayBillSummary,
        hasChanges,
        countChanges,
        getPowerChanges,
        getPowerConsensus
    } = useBooking());
    ({formatActionPreview} = useBookingUi())
    resolveTicketPrice = useTicket().resolveTicketPrice

    const {deadlinesForSeason} = useSeason()
    defaultDeadlines = deadlinesForSeason(SeasonFactory.defaultSeason())
})

describe('useBooking', () => {

    describe('buildDinnerUrl', () => {
        it.each([
            {
                name: 'single digit day and month',
                date: new Date(2025, 0, 5), // Jan 5, 2025
                baseUrl: 'https://skraaningen.dk',
                expected: 'https://skraaningen.dk/dinner?date=05/01/25'
            },
            {
                name: 'double digit day and month',
                date: new Date(2025, 10, 15), // Nov 15, 2025
                baseUrl: 'https://skraaningen.dk',
                expected: 'https://skraaningen.dk/dinner?date=15/11/25'
            },
            {
                name: 'end of year',
                date: new Date(2025, 11, 31), // Dec 31, 2025
                baseUrl: 'https://example.com',
                expected: 'https://example.com/dinner?date=31/12/25'
            },
            {
                name: 'different base URL',
                date: new Date(2026, 5, 20), // Jun 20, 2026
                baseUrl: 'http://localhost:3000',
                expected: 'http://localhost:3000/dinner?date=20/06/26'
            }
        ])('formats URL correctly for $name', ({date, baseUrl, expected}) => {
            expect(buildDinnerUrl(baseUrl, date)).toBe(expected)
        })
    })

    describe('HEYNABO_EVENT_TEMPLATE', () => {
        it('contains required template keys', () => {
            expect(HEYNABO_EVENT_TEMPLATE.WARNING_ROBOT).toContain('skraaningen.dk')
            expect(HEYNABO_EVENT_TEMPLATE.WARNING_EDIT).toBeDefined()
            expect(HEYNABO_EVENT_TEMPLATE.CHEF_PREFIX).toBeDefined()
            expect(HEYNABO_EVENT_TEMPLATE.BOOKING_TEXT).toBeDefined()
            expect(HEYNABO_EVENT_TEMPLATE.SIGNATURE_PREFIX).toBeDefined()
            expect(HEYNABO_EVENT_TEMPLATE.SEPARATOR).toBeDefined()
        })
    })

    describe('createHeynaboEventPayload', () => {
        const baseUrl = 'https://skraaningen.dk'

        // Use future date to ensure getNextDinnerDate returns a valid range
        const futureDinnerEvent = (overrides: Partial<ReturnType<typeof DinnerEventFactory.defaultDinnerEventDetail>> = {}) => {
            const futureDate = new Date()
            futureDate.setDate(futureDate.getDate() + 7) // 1 week from now
            futureDate.setHours(0, 0, 0, 0)
            return {
                ...DinnerEventFactory.defaultDinnerEventDetail(),
                date: futureDate,
                menuTitle: 'Pasta Carbonara',
                menuDescription: 'Creamy Italian pasta with bacon',
                ...overrides
            }
        }

        describe('basic payload structure', () => {
            it('creates payload with correct name format', () => {
                const payload = createHeynaboEventPayload(futureDinnerEvent(), baseUrl)
                expect(payload.name).toBe('Fællesspisning - Pasta Carbonara')
            })

            it('sets the constant event fields', () => {
                const payload = createHeynaboEventPayload(futureDinnerEvent(), baseUrl)
                expect(payload).toMatchObject({
                    status: 'PUBLISHED',
                    public: false,
                    locationText: 'Fælleshuset',
                    guestsAllowed: true,
                    takeAwayAllowed: true,
                    commentsAllowed: true,
                    visibleToEveryone: true,
                    vegetarian: false,
                    type: null,
                    groupId: null,
                    locationId: null,
                    minParticipants: null,
                    maxParticipants: null
                })
            })

            it('sets price to zero for all categories', () => {
                const payload = createHeynaboEventPayload(futureDinnerEvent(), baseUrl)
                expect(payload.price).toEqual({adult: 0, child: 0, taxIncluded: true})
            })
        })

        describe('time range (uses configured duration from useSeason)', () => {
            it('formats start and end as ISO strings', () => {
                const payload = createHeynaboEventPayload(futureDinnerEvent(), baseUrl)

                expect(payload.start).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
                expect(payload.end).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
            })

            it('end time is 1 hour after start time (configured in useSeason)', () => {
                const payload = createHeynaboEventPayload(futureDinnerEvent(), baseUrl)

                const startTime = new Date(payload.start)
                const endTime = new Date(payload.end)
                const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60)

                expect(durationMinutes).toBe(60)
            })
        })

        describe('description building', () => {
            it('includes warning with robot emoji and skraaningen.dk reference', () => {
                const payload = createHeynaboEventPayload(futureDinnerEvent(), baseUrl)
                expect(payload.description).toContain('🤖')
                expect(payload.description).toContain('skraaningen.dk')
            })

            it('includes booking link with formatted date', () => {
                const event = futureDinnerEvent()
                const payload = createHeynaboEventPayload(event, baseUrl)

                const day = String(event.date.getDate()).padStart(2, '0')
                const month = String(event.date.getMonth() + 1).padStart(2, '0')
                const year = String(event.date.getFullYear()).slice(-2)

                expect(payload.description).toContain(`dinner?date=${day}/${month}/${year}`)
            })

            it.each([
                {
                    name: 'uses menuDescription when provided',
                    menuDescription: 'Special description',
                    shouldContain: 'Special description'
                },
                {
                    name: 'falls back to menuTitle when menuDescription is null',
                    menuDescription: null,
                    shouldContain: 'Pasta Carbonara'
                }
            ])('$name', ({menuDescription, shouldContain}) => {
                const payload = createHeynaboEventPayload(futureDinnerEvent({menuDescription}), baseUrl)
                expect(payload.description).toContain(shouldContain)
            })

            it.each([
                {name: 'includes cooking team name when provided', cookingTeam: SeasonFactory.defaultCookingTeamDisplay({name: 'Team Alpha'}), shouldContain: 'Team Alpha'},
                {name: 'uses fallback when null', cookingTeam: null, shouldContain: 'Madholdet'},
                {name: 'uses fallback when undefined', cookingTeam: undefined, shouldContain: 'Madholdet'}
            ])('$name', ({cookingTeam, shouldContain}) => {
                const payload = createHeynaboEventPayload(futureDinnerEvent({cookingTeam}), baseUrl)

                expect(payload.description).toContain(shouldContain)
            })

            it('includes chef name with initials when chef is assigned', () => {
                const chef = {id: 1, heynaboId: 101, householdId: 1, name: 'Anna', lastName: 'Berg Hansen', pictureUrl: null}
                const payload = createHeynaboEventPayload(futureDinnerEvent({chef}), baseUrl)

                expect(payload.description).toContain('Anna B.H.')
            })

            it('omits chef line when chef is not assigned', () => {
                const payload = createHeynaboEventPayload(futureDinnerEvent({chef: null}), baseUrl)

                expect(payload.description).not.toContain('chefkok')
            })
        })
    })

    describe('canCancelDinner', () => {
        it.each([
            {state: DinnerStates.SCHEDULED, expected: true, description: 'can cancel SCHEDULED dinners'},
            {state: DinnerStates.ANNOUNCED, expected: true, description: 'can cancel ANNOUNCED dinners'},
            {state: DinnerStates.CANCELLED, expected: false, description: 'cannot cancel already CANCELLED dinners'},
            {state: DinnerStates.CONSUMED, expected: false, description: 'cannot cancel CONSUMED dinners'}
        ])('$description', ({state, expected}) => {
            const dinnerEvent = {state: state as keyof typeof DinnerState}
            expect(canCancelDinner(dinnerEvent)).toBe(expected)
        })
    })

    describe('getDinnerStepState', () => {
        // Future date to ensure canModifyOrders returns true
        const futureDate = () => {
            const date = new Date()
            date.setDate(date.getDate() + 14)
            return date
        }

        // Past date to ensure canModifyOrders returns false
        const pastDate = () => {
            const date = new Date()
            date.setDate(date.getDate() - 7)
            return date
        }

        it.each([
            {
                description: 'returns SCHEDULED for SCHEDULED state',
                state: DinnerStates.SCHEDULED,
                date: futureDate(),
                totalCost: 0,
                expected: DinnerStepState.SCHEDULED
            },
            {
                description: 'returns ANNOUNCED for ANNOUNCED with open booking',
                state: DinnerStates.ANNOUNCED,
                date: futureDate(),
                totalCost: 0,
                expected: DinnerStepState.ANNOUNCED
            },
            {
                description: 'returns BOOKING_CLOSED for ANNOUNCED with closed booking',
                state: DinnerStates.ANNOUNCED,
                date: pastDate(),
                totalCost: 0,
                expected: DinnerStepState.BOOKING_CLOSED
            },
            {
                description: 'returns GROCERIES_DONE for ANNOUNCED with closed booking and groceries done',
                state: DinnerStates.ANNOUNCED,
                date: pastDate(),
                totalCost: 10000,
                expected: DinnerStepState.GROCERIES_DONE
            },
            {
                description: 'returns CONSUMED for CONSUMED state',
                state: DinnerStates.CONSUMED,
                date: pastDate(),
                totalCost: 10000,
                expected: DinnerStepState.CONSUMED
            }
        ])('$description', ({state, date, totalCost, expected}) => {
            const dinnerEvent = {state: state as keyof typeof DinnerState, date, totalCost}
            expect(getDinnerStepState(dinnerEvent, defaultDeadlines)).toBe(expected)
        })
    })

    describe('DINNER_STEP_MAP', () => {
        it('returns correct step number for each state', () => {
            expect(DINNER_STEP_MAP[DinnerStepState.SCHEDULED].step).toBe(0)
            expect(DINNER_STEP_MAP[DinnerStepState.ANNOUNCED].step).toBe(1)
            expect(DINNER_STEP_MAP[DinnerStepState.BOOKING_CLOSED].step).toBe(2)
            expect(DINNER_STEP_MAP[DinnerStepState.GROCERIES_DONE].step).toBe(3)
            expect(DINNER_STEP_MAP[DinnerStepState.CONSUMED].step).toBe(4)
        })

        it('getStepConfig returns step config based on getDinnerStepState', () => {
            const futureDate = new Date()
            futureDate.setDate(futureDate.getDate() + 14)

            const dinnerEvent = {state: DinnerStates.SCHEDULED, date: futureDate, totalCost: 0}
            expect(getStepConfig(dinnerEvent, defaultDeadlines).step).toBe(0)
        })
    })

    describe('State Constants', () => {
        it.each([
            {constant: CONSUMABLE_DINNER_STATES, included: [DinnerStates.SCHEDULED, DinnerStates.ANNOUNCED], excluded: [DinnerStates.CANCELLED, DinnerStates.CONSUMED]},
            {constant: CLOSABLE_ORDER_STATES, included: [OrderStates.BOOKED, OrderStates.RELEASED], excluded: [OrderStates.CANCELLED, OrderStates.CLOSED]}
        ])('$constant includes correct states and excludes others', ({constant, included, excluded}) => {
            expect(constant).toHaveLength(2)
            included.forEach(s => expect(constant).toContain(s))
            excluded.forEach(s => expect(constant).not.toContain(s))
        })
    })

    describe('getPastDinnerIds', () => {
        const daysFromNow = (days: number) => {
            const d = new Date()
            d.setDate(d.getDate() + days)
            d.setHours(12, 0, 0, 0)
            return d
        }

        it.each([
            {desc: 'empty input', dinners: [], expectedIds: []},
            {desc: 'all future', dinners: [{id: 1, date: daysFromNow(1)}, {id: 2, date: daysFromNow(2)}], expectedIds: []},
            {desc: 'all past', dinners: [{id: 1, date: daysFromNow(-1)}, {id: 2, date: daysFromNow(-2)}], expectedIds: [1, 2]},
            {desc: 'mixed', dinners: [{id: 1, date: daysFromNow(-1)}, {id: 2, date: daysFromNow(1)}, {id: 3, date: daysFromNow(-2)}], expectedIds: [1, 3]}
        ])('$desc → returns $expectedIds', ({dinners, expectedIds}) => {
            const result = getPastDinnerIds(dinners)
            expect(result.sort()).toEqual(expectedIds.sort())
        })
    })

    describe('prepareTransactionData', () => {
        const {OrderSnapshotSchema} = useBillingValidation()

        it.each([
            {desc: 'with user', order: OrderFactory.defaultOrderForTransaction('test'), expectedEmail: 'daisy-test@andeby.dk'},
            {desc: 'without user', order: {...OrderFactory.defaultOrderForTransaction('test'), bookedByUser: null}, expectedEmail: ''}
        ])('$desc → snapshot roundtrips, email is $expectedEmail', ({order, expectedEmail}) => {
            const results = prepareTransactionData([order])
            expect(results).toHaveLength(1)
            const result = results[0]!

            const snapshot = OrderSnapshotSchema.parse(JSON.parse(result.orderSnapshot))
            expect(snapshot.dinnerEvent.id).toBe(order.dinnerEvent.id)
            expect(snapshot.inhabitant.id).toBe(order.inhabitant.id)
            expect(result.userEmailHandle).toBe(expectedEmail)
        })

        // ADR-010: isGuestTicket must be preserved through billing pipeline
        it.each([
            {desc: 'guest ticket true', isGuestTicket: true},
            {desc: 'guest ticket false', isGuestTicket: false}
        ])('$desc → isGuestTicket preserved in snapshot', ({isGuestTicket}) => {
            const order = {...OrderFactory.defaultOrderForTransaction('guest-test'), isGuestTicket}
            const results = prepareTransactionData([order])
            const snapshot = OrderSnapshotSchema.parse(JSON.parse(results[0]!.orderSnapshot))
            expect(snapshot.isGuestTicket).toBe(isGuestTicket)
        })
    })

    describe('buildOrderSnapshot', () => {

        // Base order data reused across tests: Anna of household 7, with one allergy per catalog type
        const allergyTypes = AllergyFactory.createMockAllergyTypes()
        const baseOrder = () => {
            const order = OrderFactory.defaultOrderDetailWithAllergies(10, 'Anna', allergyTypes, {id: 42, dinnerEventId: 5, ticketPriceId: 1, priceAtBooking: 5500})
            return {...order, inhabitant: {...order.inhabitant, householdId: 7, lastName: 'Berg Larsen'}}
        }

        it('builds snapshot with all fields from order', () => {
            const snapshot = buildOrderSnapshot(baseOrder(), 'AR_7')

            expect(snapshot.id).toBe(42)
            expect(snapshot.inhabitantId).toBe(10)
            expect(snapshot.dinnerEventId).toBe(5)
            expect(snapshot.ticketPriceId).toBe(1)
            expect(snapshot.priceAtBooking).toBe(5500)
            expect(snapshot.dinnerMode).toBe(DinnerModes.DINEIN)
            expect(snapshot.state).toBe(OrderStates.BOOKED)
        })

        it('formats inhabitantNameWithInitials using formatNameWithInitials', () => {
            const snapshot = buildOrderSnapshot(baseOrder(), 'AR_7')
            // "Anna Berg Larsen" → "Anna B.L."
            expect(snapshot.inhabitantNameWithInitials).toBe('Anna B.L.')
        })

        it('includes householdShortname from parameter', () => {
            const snapshot = buildOrderSnapshot(baseOrder(), 'S31_2')
            expect(snapshot.householdShortname).toBe('S31_2')
        })

        it('includes householdId from inhabitant', () => {
            const snapshot = buildOrderSnapshot(baseOrder(), 'AR_7')
            expect(snapshot.householdId).toBe(7)
        })

        it('extracts allergy type names from nested allergies', () => {
            const snapshot = buildOrderSnapshot(baseOrder(), 'AR_7')
            expect(snapshot.allergies).toEqual(allergyTypes.map(type => type.name))
        })

        it('handles empty allergies array', () => {
            const order = {...baseOrder(), inhabitant: {...baseOrder().inhabitant, allergies: []}}
            const snapshot = buildOrderSnapshot(order, 'AR_7')
            expect(snapshot.allergies).toEqual([])
        })

        it('handles undefined allergies (defaults to empty)', () => {
            const order = {...baseOrder(), inhabitant: {...baseOrder().inhabitant, allergies: undefined}}
            const snapshot = buildOrderSnapshot(order, 'AR_7')
            expect(snapshot.allergies).toEqual([])
        })

        it.each([
            {state: OrderStates.BOOKED},
            {state: OrderStates.RELEASED},
            {state: OrderStates.CLOSED}
        ])('preserves order state $state', ({state}) => {
            const order = {...baseOrder(), state}
            const snapshot = buildOrderSnapshot(order, 'AR_7')
            expect(snapshot.state).toBe(state)
        })
    })

})

// =============================================================================
// getNewOrderAction - Shared decision logic for new bookings
// =============================================================================

describe('getNewOrderAction', () => {
    const RA = useBookingValidation().BookingRowActionSchema.enum

    it.each([
        { canModify: true, expected: RA.process },
        { canModify: false, expected: RA.claim }  // the executor settles the supply: a released ticket, else the queue
    ])('canModify=$canModify → $expected', ({ canModify, expected }) => {
        expect(getNewOrderAction(canModify)).toBe(expected)
    })
})

// =============================================================================
// bookingOutcome - what a bucket does to the supply at the instant it executes
// =============================================================================

describe('bookingOutcome', () => {
    it.each([
        {bucket: Bucket.create, ticketsForSale: 0, expected: Action.BOOK},
        {bucket: Bucket.claim, ticketsForSale: 2, expected: Action.BUY},
        {bucket: Bucket.claim, ticketsForSale: 0, expected: Action.QUEUE},
        {bucket: Bucket.leave, ticketsForSale: 0, expected: Action.LEAVE},
        {bucket: Bucket.requeue, ticketsForSale: 1, expected: Action.REQUEUE},
        {bucket: Bucket.idempotent, ticketsForSale: 1, expected: Action.CHANGE_MODE},
        {bucket: null, ticketsForSale: 1, expected: Action.CHANGE_MODE}
    ])('$bucket with $ticketsForSale for sale → $expected', ({bucket, ticketsForSale, expected}) => {
        expect(bookingOutcome(bucket, {ticketsForSale})).toBe(expected)
    })
})

// A claim buys from the dinner's tickets for sale of the ticket type its price names
describe('ticketsForSaleOf', () => {
    const TicketType = TicketTypes
    const ticketPrices = TicketFactory.defaultTicketPrices()
    const priceIdOf = (ticketType: typeof TicketType[keyof typeof TicketType]) => ticketPrices.find(price => price.ticketType === ticketType)!.id!
    const counts = {...EMPTY_RELEASED_TICKET_COUNTS, total: 3, byType: {[TicketType.ADULT]: 2, [TicketType.CHILD]: 1}}

    it.each([
        {ticketType: TicketType.ADULT, forSale: 2},
        {ticketType: TicketType.CHILD, forSale: 1},
        {ticketType: TicketType.BABY, forSale: 0}
    ])('a claim at a $ticketType price finds the $forSale tickets for sale of its type', ({ticketType, forSale}) => {
        expect(ticketsForSaleOf(counts, ticketPrices, priceIdOf(ticketType))).toBe(forSale)
    })

    it('a claim at a price outside the season finds nothing for sale', () => {
        expect(ticketsForSaleOf(counts, ticketPrices, 99)).toBe(0)
    })
})

// =============================================================================
// actionOfUpdate, plannedActions, countTotals - one plan for the preview and the scaffold
// =============================================================================

describe('actionOfUpdate', () => {
    const {OrderStateSchema} = useBookingValidation()
    const OS = OrderStateSchema.enum
    const existingOf = (state: typeof OS[keyof typeof OS], ticketPriceId = 1) =>
        (OrderFactory.defaultOrder(undefined, {id: 10, state, ticketPriceId}))
    const incomingOf = (state: typeof OS[keyof typeof OS], ticketPriceId = 1) =>
        ({...OrderFactory.defaultDesiredOrder(), orderId: 10, state, ticketPriceId})

    it.each([
        {name: 'a booked ticket released', incoming: incomingOf(OS.RELEASED), existing: existingOf(OS.BOOKED), expected: Action.RELEASE},
        {name: 'a released ticket booked again', incoming: incomingOf(OS.BOOKED), existing: existingOf(OS.RELEASED), expected: Action.RECLAIM},
        {name: 'a booked ticket at another price', incoming: incomingOf(OS.BOOKED, 2), existing: existingOf(OS.BOOKED), expected: Action.CHANGE_PRICE},
        {name: 'a released ticket at another price', incoming: incomingOf(OS.RELEASED, 2), existing: existingOf(OS.RELEASED), expected: Action.CHANGE_PRICE},
        {name: 'a booked ticket in another mode', incoming: incomingOf(OS.BOOKED), existing: existingOf(OS.BOOKED), expected: Action.CHANGE_MODE}
    ])('$name → $expected', ({incoming, existing, expected}) => {
        expect(actionOfUpdate(incoming, existing)).toBe(expected)
    })
})

describe('plannedActions', () => {
    const {OrderStateSchema} = useBookingValidation()
    const order = (inhabitantId: number, overrides: Partial<DesiredOrder> = {}): DesiredOrder =>
        ({...OrderFactory.defaultDesiredOrder(), inhabitantId, ...overrides})
    const released = OrderFactory.defaultOrder(undefined, {id: 50, state: OrderStateSchema.enum.BOOKED, ticketPriceId: 1})

    it('names the action of every order in the buckets, a claim settled by the supply', () => {
        const buckets = {
            create: [order(1)], update: [order(2, {orderId: 50, state: OrderStateSchema.enum.RELEASED, ticketPriceId: 1})],
            idempotent: [order(3)], delete: [order(4)], claim: [order(5, {dinnerEventId: 1}), order(6, {dinnerEventId: 2})],
            leave: [order(7)], requeue: [order(8)]
        }
        const forSale = (desired: DesiredOrder) => ({ticketsForSale: desired.dinnerEventId === 1 ? 1 : 0})

        const actions = plannedActions(buckets, new Map([[50, released]]), forSale)

        expect(actions.map(({order, action}) => [order.inhabitantId, action])).toEqual([
            [5, Action.BUY], [6, Action.QUEUE], [1, Action.BOOK], [7, Action.LEAVE], [8, Action.REQUEUE], [4, Action.CANCEL], [2, Action.RELEASE]
        ])
    })
})

describe('countTotals', () => {
    it('counts the items per action, every action present', () => {
        const item = (action: typeof Action[keyof typeof Action]) => ({...OrderFactory.defaultBookingResult(), action})

        const totals = countTotals([item(Action.BOOK), item(Action.BOOK), item(Action.RELEASE)])

        expect(totals).toEqual({...Object.fromEntries(BookingActionSchema.options.map(action => [action, 0])), [Action.BOOK]: 2, [Action.RELEASE]: 1})
    })
})

// =============================================================================
// decideOrderAction - Pure decision function tests
// =============================================================================

describe('decideOrderAction', () => {
    const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
    const DinnerMode = DinnerModeSchema.enum
    const OrderState = OrderStateSchema.enum

    // Helper to create desired order
    const createDesired = (overrides: Partial<DesiredOrder> = {}): DesiredOrder => ({
        inhabitantId: 1,
        dinnerEventId: 101,
        dinnerMode: DinnerMode.DINEIN,
        ticketPriceId: 1,
        isGuestTicket: false,
        state: OrderState.BOOKED,
        ...overrides
    })

    // Helper to create existing order
    const createExisting = (overrides: Partial<OrderDisplay> = {}): OrderDisplay =>
        OrderFactory.defaultOrder(undefined, {
            id: 42,
            inhabitantId: 1,
            dinnerEventId: 101,
            ticketPriceId: 1,
            dinnerMode: DinnerMode.DINEIN,
            state: OrderState.BOOKED,
            ...overrides
        })

    // Helper to create decision input
    const createInput = (
        desired: DesiredOrder,
        existing: OrderDisplay | null,
        beforeCancellationDeadline = true,
        canEditMode = true,
        existingEntry: TicketWaitlistDisplay | null = null
    ): OrderDecisionInput => ({ desired, existing, existingEntry, beforeCancellationDeadline, canEditMode })

    describe('decision matrix (9 cases)', () => {
        it.each([
            // Case 1: No orderId + eating mode + before deadline → create (state: BOOKED)
            {
                desc: 'no orderId + DINEIN + before deadline → create BOOKED',
                desired: createDesired({ dinnerMode: DinnerMode.DINEIN }),
                existing: null,
                beforeDeadline: true,
                canEditMode: true,
                expectedBucket: Bucket.create,
                expectedState: OrderState.BOOKED
            },
            // Case 2: No orderId + NONE → null (skip)
            {
                desc: 'no orderId + NONE → skip (null)',
                desired: createDesired({ dinnerMode: DinnerMode.NONE }),
                existing: null,
                beforeDeadline: true,
                canEditMode: true,
                expectedBucket: null,
                expectedState: null
            },
            // Case 3: No orderId + eating mode + after deadline → claim (a released ticket, else the queue)
            {
                desc: 'no orderId + DINEIN + after deadline → claim BOOKED',
                desired: createDesired({ dinnerMode: DinnerMode.DINEIN }),
                existing: null,
                beforeDeadline: false,
                canEditMode: false,
                expectedBucket: Bucket.claim,
                expectedState: OrderState.BOOKED
            },
            // Case 5: orderId + NONE + before deadline → delete
            {
                desc: 'orderId + NONE + before deadline → delete',
                desired: createDesired({ orderId: 42, dinnerMode: DinnerMode.NONE }),
                existing: createExisting(),
                beforeDeadline: true,
                canEditMode: true,
                expectedBucket: Bucket.delete,
                expectedState: undefined  // delete doesn't set state
            },
            // Case 6: orderId + NONE + after deadline → update (RELEASED)
            {
                desc: 'orderId + NONE + after deadline → update RELEASED',
                desired: createDesired({ orderId: 42, dinnerMode: DinnerMode.NONE }),
                existing: createExisting(),
                beforeDeadline: false,
                canEditMode: false,
                expectedBucket: Bucket.update,
                expectedState: OrderState.RELEASED
            },
            // Case 7: orderId + RELEASED + eating mode → update (BOOKED, reclaim own)
            {
                desc: 'orderId + existing RELEASED + DINEIN → update BOOKED (reclaim)',
                desired: createDesired({ orderId: 42, dinnerMode: DinnerMode.DINEIN }),
                existing: createExisting({ state: OrderState.RELEASED }),
                beforeDeadline: false,
                canEditMode: false,
                expectedBucket: Bucket.update,
                expectedState: OrderState.BOOKED
            },
            // Case 8a: orderId + eating mode + unchanged BOOKED → idempotent (preserves state)
            {
                desc: 'orderId + same mode + same price + BOOKED → idempotent preserves BOOKED',
                desired: createDesired({ orderId: 42, dinnerMode: DinnerMode.DINEIN, ticketPriceId: 1 }),
                existing: createExisting({ dinnerMode: DinnerMode.DINEIN, ticketPriceId: 1, state: OrderState.BOOKED }),
                beforeDeadline: true,
                canEditMode: true,
                expectedBucket: Bucket.idempotent,
                expectedState: OrderState.BOOKED  // preserved from existing
            },
            // Case 8b: orderId + NONE unchanged on RELEASED → idempotent (preserves RELEASED state)
            {
                desc: 'orderId + NONE + RELEASED → idempotent preserves RELEASED',
                desired: createDesired({ orderId: 42, dinnerMode: DinnerMode.NONE, ticketPriceId: 1 }),
                existing: createExisting({ dinnerMode: DinnerMode.NONE, ticketPriceId: 1, state: OrderState.RELEASED }),
                beforeDeadline: false,  // after deadline
                canEditMode: false,
                expectedBucket: Bucket.idempotent,
                expectedState: OrderState.RELEASED  // preserved from existing
            },
            // Case 9a: orderId + mode changed → update
            {
                desc: 'orderId + mode changed (DINEIN→TAKEAWAY) → update BOOKED',
                desired: createDesired({ orderId: 42, dinnerMode: DinnerMode.TAKEAWAY }),
                existing: createExisting({ dinnerMode: DinnerMode.DINEIN }),
                beforeDeadline: true,
                canEditMode: true,
                expectedBucket: Bucket.update,
                expectedState: OrderState.BOOKED
            },
            // Case 9b: orderId + price changed → update
            {
                desc: 'orderId + price changed → update BOOKED',
                desired: createDesired({ orderId: 42, ticketPriceId: 2 }),
                existing: createExisting({ ticketPriceId: 1 }),
                beforeDeadline: true,
                canEditMode: true,
                expectedBucket: Bucket.update,
                expectedState: OrderState.BOOKED
            },
            // Case 10: Price healing - RELEASED + NONE + price mismatch → update (not idempotent)
            // This ensures price correction happens even when order is already released
            {
                desc: 'orderId + RELEASED + NONE + price mismatch → update (price healing)',
                desired: createDesired({ orderId: 42, dinnerMode: DinnerMode.NONE, ticketPriceId: 2 }),
                existing: createExisting({ state: OrderState.RELEASED, ticketPriceId: 1 }),
                beforeDeadline: false,
                canEditMode: false,
                expectedBucket: Bucket.update,
                expectedState: OrderState.RELEASED
            },
            // Case 11: Price healing - RELEASED + NONE + null ticketPriceId → update
            // Handles the production case where ticketPriceId was SET NULL by cascade
            {
                desc: 'orderId + RELEASED + NONE + null ticketPriceId → update (price healing)',
                desired: createDesired({ orderId: 42, dinnerMode: DinnerMode.NONE, ticketPriceId: 2 }),
                existing: createExisting({ state: OrderState.RELEASED, ticketPriceId: null as unknown as number }),
                beforeDeadline: false,
                canEditMode: false,
                expectedBucket: Bucket.update,
                expectedState: OrderState.RELEASED
            }
        ])('$desc', ({ desired, existing, beforeDeadline, canEditMode, expectedBucket, expectedState }) => {
            const input = createInput(desired, existing, beforeDeadline, canEditMode)
            const result = decideOrderAction(input, DinnerMode, OrderState)

            if (expectedBucket === null) {
                expect(result).toBeNull()
            } else {
                expect(result).not.toBeNull()
                expect(result!.bucket).toBe(expectedBucket)
                if (expectedState !== undefined) {
                    expect(result!.order.state).toBe(expectedState)
                }
            }
        })
    })

    describe('mode deadline enforcement', () => {
        it('preserves existing mode when canEditMode=false', () => {
            const desired = createDesired({ orderId: 42, dinnerMode: DinnerMode.TAKEAWAY })
            const existing = createExisting({ dinnerMode: DinnerMode.DINEIN })
            const input = createInput(desired, existing, false, false)  // after mode deadline

            const result = decideOrderAction(input, DinnerMode, OrderState)

            expect(result!.order.dinnerMode).toBe(DinnerMode.DINEIN)  // preserved
        })

        it('allows mode change when canEditMode=true', () => {
            const desired = createDesired({ orderId: 42, dinnerMode: DinnerMode.TAKEAWAY })
            const existing = createExisting({ dinnerMode: DinnerMode.DINEIN })
            const input = createInput(desired, existing, true, true)  // before mode deadline

            const result = decideOrderAction(input, DinnerMode, OrderState)

            expect(result!.order.dinnerMode).toBe(DinnerMode.TAKEAWAY)  // changed
        })
    })

    describe('queue entry rows', () => {
        const entry = WaitlistFactory.defaultEntry({id: 7, inhabitantId: 1, dinnerEventId: 101, dinnerMode: DinnerMode.DINEIN, ticketPriceId: 1})

        it.each([
            {desc: 'NONE on an entry → leave', desired: createDesired({waitlistEntryId: 7, dinnerMode: DinnerMode.NONE}), canEditMode: true, expectedBucket: Bucket.leave, expectedMode: DinnerMode.NONE},
            {desc: 'another mode on an entry → requeue', desired: createDesired({waitlistEntryId: 7, dinnerMode: DinnerMode.TAKEAWAY}), canEditMode: true, expectedBucket: Bucket.requeue, expectedMode: DinnerMode.TAKEAWAY},
            {desc: 'another price on an entry → requeue', desired: createDesired({waitlistEntryId: 7, ticketPriceId: 2}), canEditMode: true, expectedBucket: Bucket.requeue, expectedMode: DinnerMode.DINEIN},
            {desc: 'the entry unchanged → idempotent', desired: createDesired({waitlistEntryId: 7}), canEditMode: true, expectedBucket: Bucket.idempotent, expectedMode: DinnerMode.DINEIN},
            {desc: 'another mode after the mode deadline → idempotent, the wish keeps its mode', desired: createDesired({waitlistEntryId: 7, dinnerMode: DinnerMode.TAKEAWAY}), canEditMode: false, expectedBucket: Bucket.idempotent, expectedMode: DinnerMode.DINEIN}
        ])('$desc', ({desired, canEditMode, expectedBucket, expectedMode}) => {
            const result = decideOrderAction(createInput(desired, null, false, canEditMode, entry), DinnerMode, OrderState)

            expect(result).toMatchObject({bucket: expectedBucket, order: {waitlistEntryId: 7, dinnerMode: expectedMode}})
        })

        it('skips a desired order naming an entry that left the queue (placed or swept)', () => {
            const result = decideOrderAction(createInput(createDesired({waitlistEntryId: 7}), null, false, false), DinnerMode, OrderState)

            expect(result).toBeNull()
        })
    })

    describe('error cases', () => {
        it('throws when orderId provided but existing not found', () => {
            const desired = createDesired({ orderId: 999 })
            const input = createInput(desired, null, true, true)

            expect(() => decideOrderAction(input, DinnerMode, OrderState))
                .toThrow('Order 999 not found in existing orders')
        })
    })
})

// =============================================================================
// resolveDesiredOrdersToBuckets - Batch processor tests
// =============================================================================

describe('resolveDesiredOrdersToBuckets', () => {
    const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
    const DinnerMode = DinnerModeSchema.enum
    const OrderState = OrderStateSchema.enum

    // Helper functions
    const createDesired = (inhabitantId: number, dinnerEventId: number, overrides: Partial<DesiredOrder> = {}): DesiredOrder => ({
        inhabitantId,
        dinnerEventId,
        dinnerMode: DinnerMode.DINEIN,
        ticketPriceId: 1,
        isGuestTicket: false,
        state: OrderState.BOOKED,
        ...overrides
    })

    const createExisting = (id: number, inhabitantId: number, dinnerEventId: number, overrides: Partial<OrderDisplay> = {}): OrderDisplay =>
        OrderFactory.defaultOrder(undefined, {
            id,
            inhabitantId,
            dinnerEventId,
            ticketPriceId: 1,
            dinnerMode: DinnerMode.DINEIN,
            state: OrderState.BOOKED,
            ...overrides
        })

    // Far future date - before all deadlines
    const farFutureDate = new Date()
    farFutureDate.setDate(farFutureDate.getDate() + 30)

    const dinnerEventById = new Map([[101, { date: farFutureDate }]])
    const canModifyOrders = () => true
    const canEditDiningMode = () => true

    it.each([
        {
            desc: 'all new orders (no existing)',
            desired: [createDesired(1, 101)],
            existing: [],
            expected: { create: 1, update: 0, delete: 0, idempotent: 0, claim: 0 }
        },
        {
            desc: 'existing matches incoming (idempotent)',
            desired: [createDesired(1, 101, { orderId: 42 })],
            existing: [createExisting(42, 1, 101)],
            expected: { create: 0, update: 0, delete: 0, idempotent: 1, claim: 0 }
        },
        {
            desc: 'mode change → update',
            desired: [createDesired(1, 101, { orderId: 42, dinnerMode: DinnerMode.TAKEAWAY })],
            existing: [createExisting(42, 1, 101, { dinnerMode: DinnerMode.DINEIN })],
            expected: { create: 0, update: 1, delete: 0, idempotent: 0, claim: 0 }
        },
        {
            desc: 'price change → update',
            desired: [createDesired(1, 101, { orderId: 42, ticketPriceId: 2 })],
            existing: [createExisting(42, 1, 101, { ticketPriceId: 1 })],
            expected: { create: 0, update: 1, delete: 0, idempotent: 0, claim: 0 }
        },
        {
            desc: 'NONE before deadline → delete',
            desired: [createDesired(1, 101, { orderId: 42, dinnerMode: DinnerMode.NONE })],
            existing: [createExisting(42, 1, 101)],
            expected: { create: 0, update: 0, delete: 1, idempotent: 0, claim: 0 }
        },
        {
            desc: 'mixed: create + idempotent',
            desired: [
                createDesired(1, 101, { orderId: 42 }),
                createDesired(2, 101)  // no orderId = new
            ],
            existing: [createExisting(42, 1, 101)],
            expected: { create: 1, update: 0, delete: 0, idempotent: 1, claim: 0 }
        }
    ])('$desc', ({ desired, existing, expected }) => {
        const result = resolveDesiredOrdersToBuckets(
            desired,
            existing,
            dinnerEventById,
            canModifyOrders,
            canEditDiningMode,
            DinnerMode,
            OrderState
        )

        expect(result.create).toHaveLength(expected.create)
        expect(result.update).toHaveLength(expected.update)
        expect(result.delete).toHaveLength(expected.delete)
        expect(result.idempotent).toHaveLength(expected.idempotent)
        expect(result.claim).toHaveLength(expected.claim)
    })

    describe('claim and queue buckets (after deadline)', () => {
        // Past date - after all deadlines
        const pastDate = new Date()
        pastDate.setDate(pastDate.getDate() + 1)  // Tomorrow = after deadline

        const pastEventById = new Map([[201, { date: pastDate }]])
        const cannotModify = () => false
        const cannotEdit = () => false

        const regularEntry = WaitlistFactory.defaultEntry({id: 7, inhabitantId: 1, dinnerEventId: 201, ticketPriceId: 1})

        it.each([
            {
                desc: 'new orders after deadline → claim each, whatever is for sale',
                desired: [createDesired(1, 201, { ticketPriceId: 1 }), createDesired(2, 201, { ticketPriceId: 2 })],
                entries: [],
                expected: { claim: 2, leave: 0, requeue: 0, idempotent: 0 }
            },
            {
                desc: 'NONE on the entry it names → leave',
                desired: [createDesired(1, 201, { waitlistEntryId: 7, dinnerMode: DinnerMode.NONE })],
                entries: [regularEntry],
                expected: { claim: 0, leave: 1, requeue: 0, idempotent: 0 }
            },
            {
                desc: 'a new price on the entry it names → requeue',
                desired: [createDesired(1, 201, { waitlistEntryId: 7, ticketPriceId: 2 })],
                entries: [regularEntry],
                expected: { claim: 0, leave: 0, requeue: 1, idempotent: 0 }
            },
            {
                desc: 'a regular order for an inhabitant already queued → the entry, unchanged',
                desired: [createDesired(1, 201)],
                entries: [regularEntry],
                expected: { claim: 0, leave: 0, requeue: 0, idempotent: 1 }
            },
            {
                desc: 'a guest order of a queued member → claim, a guest is never the member\'s own entry',
                desired: [createDesired(1, 201, { isGuestTicket: true })],
                entries: [regularEntry],
                expected: { claim: 1, leave: 0, requeue: 0, idempotent: 0 }
            }
        ])('$desc', ({ desired, entries, expected }) => {
            const result = resolveDesiredOrdersToBuckets(
                desired,
                [],
                pastEventById,
                cannotModify,
                cannotEdit,
                DinnerMode,
                OrderState,
                entries
            )

            expect(result.create).toHaveLength(0)
            expect({
                claim: result.claim.length, leave: result.leave.length, requeue: result.requeue.length, idempotent: result.idempotent.length
            }).toEqual(expected)
        })
    })

    it('throws for unknown dinnerEventId', () => {
        const desired = [createDesired(1, 999)]  // unknown event

        expect(() => resolveDesiredOrdersToBuckets(
            desired,
            [],
            dinnerEventById,
            canModifyOrders,
            canEditDiningMode,
            DinnerMode,
            OrderState
        )).toThrow('Dinner event 999 not found')
    })
})

// =============================================================================
// buildDesiredOrder - one booking intent → DesiredOrder (grid, preview, day view)
// =============================================================================

describe('buildDesiredOrder', () => {
    const {DinnerModeSchema, OrderStateSchema, TicketTypeSchema} = useBookingValidation()
    const DinnerMode = DinnerModeSchema.enum
    const OrderState = OrderStateSchema.enum
    const TicketType = TicketTypeSchema.enum

    const ticketPrices = TicketFactory.defaultTicketPrices()
    const priceIdOf = (ticketType: typeof TicketType[keyof typeof TicketType]) =>
        ticketPrices.find(tp => tp.ticketType === ticketType)!.id!
    const resolver: TicketPriceResolver = (birthDate, priceAtBooking, referenceDate) =>
        resolveTicketPrice(birthDate, priceAtBooking, ticketPrices, referenceDate)

    const EVENT_DAYS_AHEAD = 30
    const dinnerEvent = DinnerEventFactory.dinnerEventAt(101, EVENT_DAYS_AHEAD)
    const inhabitant = {...HouseholdFactory.defaultInhabitantData(), id: 1}
    const intent: BookingIntent = {inhabitantId: inhabitant.id, dinnerEventId: dinnerEvent.id, dinnerMode: DinnerMode.TAKEAWAY}

    const order = (id: number, isGuestTicket: boolean): OrderDisplay =>
        OrderFactory.defaultOrder(undefined, {id, inhabitantId: inhabitant.id, dinnerEventId: dinnerEvent.id, ticketPriceId: priceIdOf(TicketType.ADULT), isGuestTicket})
    const REGULAR_ID = 42
    const GUEST_ID = 7

    const build = (existingOrders: OrderDisplay[], inhabitants = [inhabitant], resolve = resolver) =>
        buildDesiredOrder(intent, existingOrders, inhabitants, [dinnerEvent], resolve, OrderState.BOOKED)

    it.each([
        {desc: 'new booking', existingOrders: [], expectedOrderId: undefined},
        {desc: 'existing regular order', existingOrders: [order(REGULAR_ID, false)], expectedOrderId: REGULAR_ID},
        {desc: 'guest-only order on the event', existingOrders: [order(GUEST_ID, true)], expectedOrderId: undefined},
        {desc: 'guest listed before regular order', existingOrders: [order(GUEST_ID, true), order(REGULAR_ID, false)], expectedOrderId: REGULAR_ID}
    ])('$desc → orderId $expectedOrderId', ({existingOrders, expectedOrderId}) => {
        expect(build(existingOrders)).toEqual({
            ...intent,
            ticketPriceId: priceIdOf(TicketType.ADULT),
            isGuestTicket: false,
            orderId: expectedOrderId,
            state: OrderState.BOOKED
        })
    })

    it('prices a new booking by age on the dinner date', () => {
        // 11 today, 12 on the dinner date
        const birthDate = addDays(addYears(today, -12), EVENT_DAYS_AHEAD - 10)
        expect(build([], [{...inhabitant, birthDate}])?.ticketPriceId).toBe(priceIdOf(TicketType.ADULT))
    })

    it('returns null when no ticket price resolves', () => {
        expect(build([], [inhabitant], () => undefined)).toBeNull()
    })

    describe('findRegularOrder', () => {
        it.each([
            {desc: 'no orders', orders: [], expectedId: undefined},
            {desc: 'guest-only order', orders: [order(GUEST_ID, true)], expectedId: undefined},
            {desc: 'guest listed before regular order', orders: [order(GUEST_ID, true), order(REGULAR_ID, false)], expectedId: REGULAR_ID}
        ])('$desc → order $expectedId', ({orders, expectedId}) => {
            expect(findRegularOrder(orders, inhabitant.id, dinnerEvent.id)?.id).toBe(expectedId)
        })

        it('finds the inhabitant\'s own queue entry, never a guest entry they booked', () => {
            const entries = [true, false].map((isGuestTicket, index) =>
                WaitlistFactory.defaultEntry({id: index + 1, inhabitantId: inhabitant.id, dinnerEventId: dinnerEvent.id, isGuestTicket}))
            expect(findRegularOrder(entries, inhabitant.id, dinnerEvent.id)?.id).toBe(2)
        })
    })

    describe('buildGuestDesiredOrder', () => {
        const guestOrders = [order(GUEST_ID, true), order(GUEST_ID + 1, true)]
        const buildGuest = (orders: OrderDisplay[], resolve = resolver) =>
            buildGuestDesiredOrder({guestOrders: orders, dinnerMode: DinnerMode.TAKEAWAY}, resolve, OrderState.BOOKED)

        it('turns a guest group of N orders into N guest DesiredOrders in the new mode', () => {
            expect(buildGuest(guestOrders)).toEqual(guestOrders.map(o => ({
                inhabitantId: inhabitant.id,
                dinnerEventId: dinnerEvent.id,
                dinnerMode: DinnerMode.TAKEAWAY,
                ticketPriceId: priceIdOf(TicketType.ADULT),
                isGuestTicket: true,
                orderId: o.id,
                state: OrderState.BOOKED
            })))
        })

        it('prices a group whose ticket price is gone by its price at booking', () => {
            const adultPrice = ticketPrices.find(tp => tp.ticketType === TicketType.ADULT)!.price
            const orphaned = guestOrders.map(o => ({...o, ticketPriceId: null, priceAtBooking: adultPrice}))
            expect(buildGuest(orphaned).map(o => o.ticketPriceId)).toEqual(guestOrders.map(() => priceIdOf(TicketType.ADULT)))
        })

        it.each([
            {desc: 'an empty group', orders: [], resolve: resolver},
            {desc: 'a group with no resolvable price', orders: guestOrders.map(o => ({...o, ticketPriceId: null})), resolve: () => undefined}
        ])('returns [] for $desc', ({orders, resolve}) => {
            expect(buildGuest(orders, resolve)).toEqual([])
        })
    })

    describe('power mode targets', () => {
        const otherEvent = DinnerEventFactory.dinnerEventAt(102, EVENT_DAYS_AHEAD + 1)
        const guestOn = (id: number, dinnerEventId: number, dinnerMode: DinnerMode): OrderDisplay =>
            ({...order(id, true), dinnerEventId, dinnerMode})
        const regular = {...order(REGULAR_ID, false), dinnerMode: DinnerMode.DINEIN}
        const guest = guestOn(GUEST_ID, dinnerEvent.id, DinnerMode.DINEINLATE)
        const orders = [regular, guest, guestOn(GUEST_ID + 1, otherEvent.id, DinnerMode.TAKEAWAY)]

        it('targets every inhabitant and only the guest groups of the dinner', () => {
            expect(getPowerChanges([inhabitant.id], orders, dinnerEvent.id, DinnerMode.TAKEAWAY)).toEqual({
                intents: [{inhabitantId: inhabitant.id, dinnerEventId: dinnerEvent.id, dinnerMode: DinnerMode.TAKEAWAY}],
                guestIntents: [{guestOrders: [guest], dinnerMode: DinnerMode.TAKEAWAY}]
            })
        })

        it.each([
            {desc: 'saved modes, guest differs', drafts: {}, expected: {value: DinnerMode.DINEIN, consensus: false}},
            {desc: 'a guest draft matching the inhabitant', drafts: {guestGroup: () => DinnerMode.DINEIN}, expected: {value: DinnerMode.DINEIN, consensus: true}},
            {desc: 'an inhabitant draft matching the guest', drafts: {inhabitant: () => DinnerMode.DINEINLATE}, expected: {value: DinnerMode.DINEINLATE, consensus: true}}
        ])('consensus over $desc', ({drafts, expected}) => {
            expect(getPowerConsensus([inhabitant.id], orders, dinnerEvent.id, drafts)).toEqual(expected)
        })
    })
})

// =============================================================================
// generateDesiredOrdersFromPreferences - System mode generator tests
// =============================================================================

describe('generateDesiredOrdersFromPreferences', () => {
    const {DinnerModeSchema} = useBookingValidation()
    const DinnerMode = DinnerModeSchema.enum

    // Helper to create preferences
    const createPreferences = (values: DinnerMode[]): WeekDayMap<DinnerMode> =>
        WEEKDAYS.reduce((acc, day, i) => ({...acc, [day]: values[i]}), {} as WeekDayMap<DinnerMode>)

    // Helper to create inhabitant
    const createInhabitant = (id: number, prefs: DinnerMode[] | null) => ({
        ...HouseholdFactory.defaultInhabitantData(),
        id,
        dinnerPreferences: prefs ? createPreferences(prefs) : null
    })

    // Test dinner events (Mon=101, Wed=102, Fri=103)
    const dinnerEvents = [
        DinnerEventFactory.dinnerEventAt(101, 30),  // Far future Monday
        DinnerEventFactory.dinnerEventAt(102, 32),  // Far future Wednesday
        DinnerEventFactory.dinnerEventAt(103, 34)   // Far future Friday
    ]

    // Mon, Wed, Fri DINEIN preferences
    const allDineIn: DinnerMode[] = [DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.NONE]
    const allNone: DinnerMode[] = Array(7).fill(DinnerMode.NONE)

    const ticketPrices = SeasonFactory.defaultSeason().ticketPrices

    it('generates orders for all dinner events matching preferences', () => {
        const inhabitants = [createInhabitant(1, allDineIn)]
        const result = generateDesiredOrdersFromPreferences(
            inhabitants,
            dinnerEvents,
            [],
            new Set(),  // confirmedKeys
            new Set(),  // cancelledKeys
            ticketPrices
        )

        expect(result).toHaveLength(3)
        expect(result.map(o => o.dinnerEventId).sort()).toEqual([101, 102, 103])
    })

    describe('cancelledKeys handling', () => {
        const {OrderStateSchema} = useBookingValidation()
        const OrderState = OrderStateSchema.enum

        it.each([
            {desc: 'no existing → skip (dont recreate)', existingOrders: [], expectedEvents: [101, 103], expectedLength: 2},
            // RELEASED orders in cancelledKeys are NOT generated - orphan detection handles them
            {desc: 'RELEASED → skip (orphan detection handles)', existingOrders: [
                OrderFactory.defaultOrder(undefined, {id: 42, inhabitantId: 1, dinnerEventId: 102, state: OrderState.RELEASED, ticketPriceId: 1})
            ], expectedEvents: [101, 103], expectedLength: 2}
        ])('$desc', ({existingOrders, expectedEvents, expectedLength}) => {
            const inhabitants = [createInhabitant(1, allDineIn)]
            const cancelledKeys = new Set(['1-102'])

            const result = generateDesiredOrdersFromPreferences(
                inhabitants,
                dinnerEvents,
                existingOrders,
                new Set(),  // confirmedKeys
                cancelledKeys,
                ticketPrices
            )

            expect(result).toHaveLength(expectedLength)
            expect(result.map(o => o.dinnerEventId).sort()).toEqual(expectedEvents)
        })

        it('RELEASED order not in generator result (orphan detection preserves it)', () => {
            const inhabitants = [createInhabitant(1, allDineIn)]
            const cancelledKeys = new Set(['1-102'])
            const releasedOrder = OrderFactory.defaultOrder(undefined, {
                id: 42, inhabitantId: 1, dinnerEventId: 102, state: OrderState.RELEASED, ticketPriceId: 1
            })

            const result = generateDesiredOrdersFromPreferences(
                inhabitants,
                dinnerEvents,
                [releasedOrder],
                new Set(),  // confirmedKeys
                cancelledKeys,
                ticketPrices
            )

            // RELEASED order in cancelledKeys is skipped - orphan detection in resolveOrdersFromPreferencesToBuckets handles it
            const preserved = result.find(o => o.dinnerEventId === 102)
            expect(preserved).toBeUndefined()
        })
    })

    it('preserves guest orders (not managed by preferences)', () => {
        const inhabitants = [createInhabitant(1, allNone)]  // NONE preferences
        const existingGuestOrder = OrderFactory.defaultOrder(undefined, {
            id: 99,
            inhabitantId: 1,
            dinnerEventId: 101,
            isGuestTicket: true
        })

        const result = generateDesiredOrdersFromPreferences(
            inhabitants,
            dinnerEvents,
            [existingGuestOrder],
            new Set(),  // confirmedKeys
            new Set(),  // cancelledKeys
            ticketPrices
        )

        // Should preserve guest order even with NONE preferences
        const guestOrders = result.filter(o => o.isGuestTicket)
        expect(guestOrders).toHaveLength(1)
        expect(guestOrders[0]!.orderId).toBe(99)
    })

    it('preserves orphaned guest order with ticketPriceId 0 when no prices available', () => {
        const inhabitants = [createInhabitant(1, allNone)]
        const singleEvent = [dinnerEvents[0]!]  // Only event 101 (guest order's event)
        const orphanedGuestOrder = {
            ...OrderFactory.defaultOrder(undefined, {
                id: 99,
                inhabitantId: 1,
                dinnerEventId: 101,
                isGuestTicket: true,
                priceAtBooking: 9999
            }),
            ticketPriceId: null
        } as OrderDisplay

        const result = generateDesiredOrdersFromPreferences(
            inhabitants,
            singleEvent,
            [orphanedGuestOrder],
            new Set(),  // confirmedKeys
            new Set(),  // cancelledKeys
            []  // Empty ticketPrices
        )

        const guestOrders = result.filter(o => o.isGuestTicket)
        expect(guestOrders).toHaveLength(1)
        expect(guestOrders[0]!.ticketPriceId).toBe(0)  // Fallback to 0 for idempotent
        expect(guestOrders[0]!.orderId).toBe(99)
    })

    it('resolves orphaned guest order using priceAtBooking fallback', () => {
        const inhabitants = [createInhabitant(1, allDineIn)]
        const orphanedGuestOrder = {
            ...OrderFactory.defaultOrder(undefined, {
                id: 99,
                inhabitantId: 1,
                dinnerEventId: 101,
                isGuestTicket: true,
                priceAtBooking: 5000  // Matches ADULT price
            }),
            ticketPriceId: null
        } as OrderDisplay

        const result = generateDesiredOrdersFromPreferences(
            inhabitants,
            dinnerEvents,
            [orphanedGuestOrder],
            new Set(),  // confirmedKeys
            new Set(),  // cancelledKeys
            ticketPrices
        )

        const guestOrders = result.filter(o => o.isGuestTicket)
        expect(guestOrders).toHaveLength(1)
        expect(guestOrders[0]!.ticketPriceId).toBe(ticketPrices.find(tp => tp.price === 5000)!.id)
    })

    it('enriches with orderId when existing order found', () => {
        const inhabitants = [createInhabitant(1, allDineIn)]
        const existingOrder = OrderFactory.defaultOrder(undefined, {
            id: 42,
            inhabitantId: 1,
            dinnerEventId: 101
        })

        const result = generateDesiredOrdersFromPreferences(
            inhabitants,
            dinnerEvents,
            [existingOrder],
            new Set(),  // confirmedKeys
            new Set(),  // cancelledKeys
            ticketPrices
        )

        const order101 = result.find(o => o.dinnerEventId === 101)
        expect(order101?.orderId).toBe(42)
    })

    it('defaults to DINEIN when preferences are null', () => {
        const inhabitants = [createInhabitant(1, null)]

        const result = generateDesiredOrdersFromPreferences(
            inhabitants,
            dinnerEvents,
            [],
            new Set(),  // confirmedKeys
            new Set(),  // cancelledKeys
            ticketPrices
        )

        expect(result).toHaveLength(3)
        result.forEach(o => expect(o.dinnerMode).toBe(DinnerMode.DINEIN))
    })

    describe('state field assignment', () => {
        const {OrderStateSchema} = useBookingValidation()
        const OrderState = OrderStateSchema.enum

        it.each([
            {desc: 'new orders get BOOKED state', existingOrders: [], expectedState: OrderState.BOOKED},
            {desc: 'preserves RELEASED state from existing order', existingOrders: [
                OrderFactory.defaultOrder(undefined, {id: 42, inhabitantId: 1, dinnerEventId: 101, state: OrderState.RELEASED})
            ], expectedState: OrderState.RELEASED}
        ])('$desc', ({existingOrders, expectedState}) => {
            const inhabitants = [createInhabitant(1, allDineIn)]
            const result = generateDesiredOrdersFromPreferences(inhabitants, dinnerEvents, existingOrders, new Set(), new Set(), ticketPrices)

            const order101 = result.find(o => o.dinnerEventId === 101)
            expect(order101?.state).toBe(expectedState)
        })
    })
})

// =============================================================================
// resolveOrdersFromPreferencesToBuckets - Full scaffolding flow tests
// =============================================================================

describe('resolveOrdersFromPreferencesToBuckets', () => {
    const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
    const DinnerMode = DinnerModeSchema.enum
    const OrderState = OrderStateSchema.enum

    // Helper to create preferences
    const createPreferences = (values: DinnerMode[]): WeekDayMap<DinnerMode> =>
        WEEKDAYS.reduce((acc, day, i) => ({...acc, [day]: values[i]}), {} as WeekDayMap<DinnerMode>)

    // Helper to create inhabitant
    const createInhabitant = (id: number, prefs: DinnerMode[] | null) => ({
        ...HouseholdFactory.defaultInhabitantData(),
        id,
        householdId: 1,
        dinnerPreferences: prefs ? createPreferences(prefs) : null
    })

    // Helper to create household
    const createHousehold = (id: number, inhabitants: ReturnType<typeof createInhabitant>[]) => ({
        ...HouseholdFactory.defaultHouseholdData(),
        id,
        shortName: `H${id}`,
        inhabitants
    })

    // Helper to create existing order (with far future date matching season)
    const createOrder = (id: number, inhabitantId: number, dinnerEventId: number, overrides: Partial<OrderDisplay> = {}): OrderDisplay =>
        OrderFactory.defaultOrder(undefined, {
            id,
            inhabitantId,
            dinnerEventId,
            ticketPriceId: 4,  // ADULT matches default inhabitant birthDate
            dinnerMode: DinnerMode.DINEIN,
            state: OrderState.BOOKED,
            ...overrides
        })

    // Helper to create season with specific dinner events
    const seasonWith = (dinnerEvents: ReturnType<typeof DinnerEventFactory.dinnerEventAt>[]) => ({
        ...SeasonFactory.defaultSeason(),
        dinnerEvents
    })

    // Mon, Wed, Fri DINEIN preferences (WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])
    const allDineIn: DinnerMode[] = [DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.NONE]
    const allNone: DinnerMode[] = Array(7).fill(DinnerMode.NONE)

    // Test season with far future dinner events on Mon(1), Wed(3), Fri(5) - matches allDineIn preference
    const testSeason = seasonWith([
        DinnerEventFactory.dinnerEventAt(101, daysToWeekday(1)),  // Monday
        DinnerEventFactory.dinnerEventAt(102, daysToWeekday(3)),  // Wednesday
        DinnerEventFactory.dinnerEventAt(103, daysToWeekday(5))   // Friday
    ])

    it.each([
        {
            desc: 'creates all orders for household with no existing',
            inhabitants: [createInhabitant(1, allDineIn)],
            existing: [],
            confirmed: new Set<string>(),
            cancelled: new Set<string>(),
            expected: {create: 3, delete: 0, update: 0, idempotent: 0}
        },
        {
            desc: 'recognizes matching orders as idempotent',
            inhabitants: [createInhabitant(1, allDineIn)],
            existing: [createOrder(1, 1, 101), createOrder(2, 1, 102), createOrder(3, 1, 103)],
            confirmed: new Set<string>(),
            cancelled: new Set<string>(),
            expected: {create: 0, delete: 0, update: 0, idempotent: 3}
        },
        {
            desc: 'marks orders for deletion when preferences change to NONE (no user intent)',
            inhabitants: [createInhabitant(1, allNone)],
            existing: [createOrder(1, 1, 101), createOrder(2, 1, 102)],
            confirmed: new Set<string>(),
            cancelled: new Set<string>(),
            expected: {create: 0, delete: 2, update: 0, idempotent: 0}
        },
        {
            desc: 'cancelledKeys: dont recreate deleted order',
            inhabitants: [createInhabitant(1, allDineIn)],
            existing: [],
            confirmed: new Set<string>(),
            cancelled: new Set(['1-102']),
            expected: {create: 2, delete: 0, update: 0, idempotent: 0}
        },
        {
            desc: 'cancelledKeys: RELEASED order preserved (not deleted as orphan)',
            inhabitants: [createInhabitant(1, allDineIn)],
            existing: [createOrder(42, 1, 102, {state: OrderState.RELEASED})],
            confirmed: new Set<string>(),
            cancelled: new Set(['1-102']),
            expected: {create: 2, delete: 0, update: 0, idempotent: 1}
        },
        {
            desc: 'confirmedKeys: prefs=NONE + user booked → PRESERVE (not delete)',
            inhabitants: [createInhabitant(1, allNone)],
            existing: [createOrder(1, 1, 101)],
            confirmed: new Set(['1-101']),
            cancelled: new Set<string>(),
            expected: {create: 0, delete: 0, update: 0, idempotent: 1}
        },
        {
            desc: 'confirmedKeys: prefs=DINEIN + user booked TAKEAWAY → PRESERVE mode',
            inhabitants: [createInhabitant(1, allDineIn)],
            existing: [createOrder(1, 1, 101, {dinnerMode: DinnerMode.TAKEAWAY}), createOrder(2, 1, 102), createOrder(3, 1, 103)],
            confirmed: new Set(['1-101']),
            cancelled: new Set<string>(),
            expected: {create: 0, delete: 0, update: 0, idempotent: 3}
        },
        {
            desc: 'handles empty household (no inhabitants)',
            inhabitants: [],
            existing: [],
            confirmed: new Set<string>(),
            cancelled: new Set<string>(),
            expected: {create: 0, delete: 0, update: 0, idempotent: 0}
        },
        {
            desc: 'deletes orphan orders when inhabitants leave',
            inhabitants: [],
            existing: [createOrder(1, 99, 101), createOrder(2, 99, 102)],
            confirmed: new Set<string>(),
            cancelled: new Set<string>(),
            expected: {create: 0, delete: 2, update: 0, idempotent: 0}
        }
    ])('$desc', ({inhabitants, existing, confirmed, cancelled, expected}) => {
        const result = resolveOrdersFromPreferencesToBuckets(
            testSeason,
            createHousehold(1, inhabitants),
            existing,
            confirmed,
            cancelled
        )

        expect(result.create).toHaveLength(expected.create)
        expect(result.delete).toHaveLength(expected.delete)
        expect(result.update).toHaveLength(expected.update)
        expect(result.idempotent).toHaveLength(expected.idempotent)
    })

    describe('deadline behavior', () => {
        it.each([
            {
                desc: 'far future dinner (before deadline) → delete',
                daysFromToday: FAR_FUTURE_DAYS,
                expected: {delete: 1, update: 0}
            },
            {
                desc: 'tomorrow dinner (after deadline) → update (release)',
                daysFromToday: 1,
                expected: {delete: 0, update: 1}
            },
            {
                desc: 'today dinner (after deadline) → update (release)',
                daysFromToday: 0,
                expected: {delete: 0, update: 1}
            }
        ])('$desc', ({daysFromToday, expected}) => {
            const season = seasonWith([DinnerEventFactory.dinnerEventAt(201, daysFromToday)])
            const household = createHousehold(1, [createInhabitant(1, allNone)])
            const existingOrder = createOrder(42, 1, 201)

            const result = resolveOrdersFromPreferencesToBuckets(
                season,
                household,
                [existingOrder],
                new Set(),  // confirmedKeys
                new Set()   // cancelledKeys
            )

            expect(result.delete).toHaveLength(expected.delete)
            expect(result.update).toHaveLength(expected.update)

            // Verify release-intent orders have correct state
            if (expected.update > 0) {
                result.update.forEach(order => {
                    expect(order.state).toBe(OrderState.RELEASED)
                    expect(order.dinnerMode).toBe(DinnerMode.NONE)
                })
            }
        })
    })

    it('preserves guest orders (not managed by preferences)', () => {
        const household = createHousehold(1, [createInhabitant(1, allNone)])  // NONE preferences
        const guestOrder = createOrder(99, 1, 101, { isGuestTicket: true })

        const result = resolveOrdersFromPreferencesToBuckets(
            testSeason,
            household,
            [guestOrder],
            new Set(),  // confirmedKeys
            new Set()   // cancelledKeys
        )

        // Guest order should be idempotent, not deleted
        expect(result.idempotent).toHaveLength(1)
        expect(result.delete).toHaveLength(0)
    })

    describe('system mode after the deadline', () => {
        // Tomorrow = after deadline. Use DINEIN for ALL days so weekday doesn't matter
        const tomorrowDinner = DinnerEventFactory.dinnerEventAt(301, 1)
        const pastDeadlineSeason = seasonWith([tomorrowDinner])
        const allDaysPrefs: DinnerMode[] = Array(7).fill(DinnerMode.DINEIN)
        const noDaysPrefs: DinnerMode[] = Array(7).fill(DinnerMode.NONE)

        it.each([
            {
                desc: 'preference change to DINEIN after the deadline → nothing, system mode never claims',
                prefs: allDaysPrefs,
                expected: { create: 0, claim: 0 }
            },
            {
                desc: 'preference stays NONE after the deadline → nothing',
                prefs: noDaysPrefs,
                expected: { create: 0, claim: 0 }
            }
        ])('$desc', ({ prefs, expected }) => {
            const household = createHousehold(1, [createInhabitant(1, prefs)])

            const result = resolveOrdersFromPreferencesToBuckets(
                pastDeadlineSeason,
                household,
                [],  // No existing orders
                new Set(),  // confirmedKeys
                new Set()  // cancelledKeys
            )

            expect(result.create).toHaveLength(expected.create)
            expect(result.claim).toHaveLength(expected.claim)
        })
    })
})

// =============================================================================
// Lock Status Utilities - Calendar display helpers
// =============================================================================

describe('Lock Status Utilities', () => {
    const {OrderStateSchema} = useBookingValidation()
    const OrderState = OrderStateSchema.enum

    // Test helpers
    const makeEvent = (id: number, daysFromNow: number) => ({
        id,
        date: addDays(new Date(), daysFromNow)
    })

    const makeDeadlines = (lockedDaysAhead: number) => ({
        canModifyOrders: (date: Date) => {
            const daysAhead = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            return daysAhead > lockedDaysAhead
        }
    })

    describe('getLockedFutureDinnerIds', () => {
        describe.each([
            {
                name: 'all dinners locked when within deadline',
                nextDinner: makeEvent(1, 1),
                futureDinners: [makeEvent(2, 3), makeEvent(3, 5)],
                lockedDays: 7,
                expected: [1, 2, 3]
            },
            {
                name: 'stops at first non-locked dinner',
                nextDinner: makeEvent(1, 1),
                futureDinners: [makeEvent(2, 3), makeEvent(3, 10), makeEvent(4, 15)],
                lockedDays: 5,
                expected: [1, 2]
            },
            {
                name: 'no locked dinners when all beyond deadline',
                nextDinner: makeEvent(1, 10),
                futureDinners: [makeEvent(2, 12)],
                lockedDays: 5,
                expected: []
            },
            {
                name: 'handles null nextDinner',
                nextDinner: null,
                futureDinners: [makeEvent(1, 2), makeEvent(2, 4)],
                lockedDays: 3,
                expected: [1]
            },
            {
                name: 'handles empty futureDinners with locked nextDinner',
                nextDinner: makeEvent(1, 2),
                futureDinners: [],
                lockedDays: 5,
                expected: [1]
            },
            {
                name: 'handles both null/empty',
                nextDinner: null,
                futureDinners: [],
                lockedDays: 5,
                expected: []
            }
        ])('$name', ({nextDinner, futureDinners, lockedDays, expected}) => {
            it(`returns ${JSON.stringify(expected)}`, () => {
                const deadlines = makeDeadlines(lockedDays)
                const result = getLockedFutureDinnerIds(nextDinner, futureDinners, deadlines)
                expect(result).toEqual(expected)
            })
        })
    })

    describe('countReleasedOrdersByDinner', () => {
        describe.each([
            {
                name: 'counts released orders by dinner',
                orders: [
                    {dinnerEventId: 1, state: OrderState.RELEASED},
                    {dinnerEventId: 1, state: OrderState.RELEASED},
                    {dinnerEventId: 2, state: OrderState.RELEASED},
                    {dinnerEventId: 1, state: OrderState.BOOKED}
                ],
                expected: new Map([[1, 2], [2, 1]])
            },
            {
                name: 'returns empty map when no released orders',
                orders: [
                    {dinnerEventId: 1, state: OrderState.BOOKED},
                    {dinnerEventId: 2, state: OrderState.CLOSED}
                ],
                expected: new Map()
            },
            {
                name: 'handles empty array',
                orders: [],
                expected: new Map()
            }
        ])('$name', ({orders, expected}) => {
            it('returns correct counts', () => {
                const result = countReleasedOrdersByDinner(orders as OrderDisplay[])
                expect(result).toEqual(expected)
            })
        })
    })

    describe('computeLockStatus', () => {
        // The released counts the store reads, and the ReleasedTicketCounts a locked dinner carries: its tickets for sale
        // beside its waiting list
        const released = (total: number, formatted: string, byType: Partial<Record<typeof TicketTypes[keyof typeof TicketTypes], number>>) => ({ total, formatted, byType })
        const queue = (queued: number, queuedFormatted: string) => ({ queued, queuedFormatted })
        const counts = (supply = released(0, '-', {}), waitlist = queue(0, '-')) => ({ ...supply, ...waitlist })
        const emptyCount = counts()
        const adults = (count: number) => released(count, `${count}V`, {[TicketTypes.ADULT]: count})
        const oneChild = released(1, '1B', {[TicketTypes.CHILD]: 1})

        describe.each([
            {
                name: 'marks locked dinners with released count',
                dinnerEvents: [makeEvent(1, 2), makeEvent(2, 5), makeEvent(3, 10)],
                lockedDays: 7,
                releasedCounts: new Map([[1, adults(3)], [2, oneChild]]),
                queues: undefined,
                expected: new Map([[1, counts(adults(3))], [2, counts(oneChild)]])
            },
            {
                name: 'defaults to empty count when no released count provided',
                dinnerEvents: [makeEvent(1, 2), makeEvent(2, 5)],
                lockedDays: 7,
                releasedCounts: undefined,
                queues: undefined,
                expected: new Map([[1, emptyCount], [2, emptyCount]])
            },
            {
                name: 'excludes non-locked dinners',
                dinnerEvents: [makeEvent(1, 2), makeEvent(2, 10)],
                lockedDays: 5,
                releasedCounts: new Map([[1, adults(2)], [2, adults(5)]]),
                queues: undefined,
                expected: new Map([[1, counts(adults(2))]])
            },
            {
                name: 'carries the waiting list of a locked dinner, counted by ticket type',
                dinnerEvents: [makeEvent(1, 2), makeEvent(2, 5), makeEvent(3, 10)],
                lockedDays: 7,
                releasedCounts: undefined,
                queues: new Map([[1, queue(3, '2V 1B')], [3, queue(4, '4V')]]),
                expected: new Map([[1, counts(undefined, queue(3, '2V 1B'))], [2, emptyCount]])
            },
            {
                name: 'carries the tickets for sale and the waiting list of a locked dinner side by side',
                dinnerEvents: [makeEvent(1, 2)],
                lockedDays: 7,
                releasedCounts: new Map([[1, adults(4)]]),
                queues: new Map([[1, queue(1, '1B')]]),
                expected: new Map([[1, counts(adults(4), queue(1, '1B'))]])
            }
        ])('$name', ({dinnerEvents, lockedDays, releasedCounts, queues, expected}) => {
            it('returns correct lock status map', () => {
                const deadlines = makeDeadlines(lockedDays)
                const result = computeLockStatus(dinnerEvents, deadlines, releasedCounts, queues)
                expect(result).toEqual(expected)
            })
        })
    })
})

// =============================================================================
// getBookingOptions - UI counterpart to decideOrderAction
// =============================================================================

describe('getBookingOptions', () => {
    const {DinnerModeSchema, OrderStateSchema, DinnerStateSchema, BookingRowActionSchema} = useBookingValidation()
    const DM = DinnerModeSchema.enum
    const OS = OrderStateSchema.enum
    const DS = DinnerStateSchema.enum
    const RA = BookingRowActionSchema.enum

    const ALL = [DM.DINEIN, DM.DINEINLATE, DM.TAKEAWAY, DM.NONE]
    const EATING = [DM.DINEIN, DM.DINEINLATE, DM.TAKEAWAY]  // All modes except NONE (for claims)
    const DINEIN_NONE = [DM.DINEIN, DM.NONE]
    const DINEIN_ONLY = [DM.DINEIN]
    const NONE_ONLY = [DM.NONE]
    const EMPTY: typeof ALL = []

    it.each([
        // Cancelled/consumed dinner - no booking possible
        {desc: 'CANCELLED dinner', orderState: null, canModify: true, canEdit: true, dinnerState: DS.CANCELLED, inResidency: true, expectedModes: EMPTY, expectedAction: null},
        {desc: 'CONSUMED dinner', orderState: null, canModify: true, canEdit: true, dinnerState: DS.CONSUMED, inResidency: true, expectedModes: EMPTY, expectedAction: null},

        // BOOKED order
        {desc: 'BOOKED + canEdit=true', orderState: OS.BOOKED, canModify: false, canEdit: true, dinnerState: DS.ANNOUNCED, inResidency: true, expectedModes: ALL, expectedAction: RA.process},
        {desc: 'BOOKED + canEdit=false', orderState: OS.BOOKED, canModify: false, canEdit: false, dinnerState: DS.ANNOUNCED, inResidency: true, expectedModes: NONE_ONLY, expectedAction: RA.process},

        // RELEASED order (reclaim own)
        {desc: 'RELEASED + canEdit=true', orderState: OS.RELEASED, canModify: false, canEdit: true, dinnerState: DS.ANNOUNCED, inResidency: true, expectedModes: ALL, expectedAction: RA.process},
        {desc: 'RELEASED + canEdit=false', orderState: OS.RELEASED, canModify: false, canEdit: false, dinnerState: DS.ANNOUNCED, inResidency: true, expectedModes: DINEIN_NONE, expectedAction: RA.process},

        // No order - before deadline
        {desc: 'null + canModify=true', orderState: null, canModify: true, canEdit: true, dinnerState: DS.ANNOUNCED, inResidency: true, expectedModes: ALL, expectedAction: RA.process},

        // No order - after the deadline: a claim, the server buys a released ticket or queues
        {desc: 'after deadline + canEdit=true → claim, all eating modes', orderState: null, canModify: false, canEdit: true, dinnerState: DS.ANNOUNCED, inResidency: true, expectedModes: EATING, expectedAction: RA.claim},
        {desc: 'after deadline + canEdit=false → claim, DINEIN only', orderState: null, canModify: false, canEdit: false, dinnerState: DS.ANNOUNCED, inResidency: true, expectedModes: DINEIN_ONLY, expectedAction: RA.claim},

        // Outside residency - no booking regardless of other params
        {desc: 'outside residency + no order', orderState: null, canModify: true, canEdit: true, dinnerState: DS.ANNOUNCED, inResidency: false, expectedModes: EMPTY, expectedAction: null},
        {desc: 'outside residency + BOOKED order', orderState: OS.BOOKED, canModify: true, canEdit: true, dinnerState: DS.ANNOUNCED, inResidency: false, expectedModes: EMPTY, expectedAction: null},
    ])('$desc → modes=$expectedModes.length, action=$expectedAction', ({orderState, canModify, canEdit, dinnerState, inResidency, expectedModes, expectedAction}) => {
        const result = getBookingOptions(orderState, canModify, canEdit, dinnerState, inResidency)
        expect(result.enabledModes).toEqual(expectedModes)
        expect(result.action).toBe(expectedAction)
    })
})

// =============================================================================
// groupGuestOrders - Groups by booker, ticketType, event, allergies, provenance
// =============================================================================

describe('groupGuestOrders', () => {

    const order = (overrides: {id?: number, allergies?: string[] | null, provenance?: string | null} = {}) => ({
        inhabitantId: 1, ticketType: TicketTypes.ADULT, dinnerEventId: 101,
        provenanceAllergies: overrides.allergies ?? null,
        provenanceHousehold: overrides.provenance ?? null
    })

    it.each([
        {desc: 'empty input', orders: [], expected: 0},
        {desc: 'same key → 1 group', orders: [order(), order()], expected: 1},
        {desc: 'different allergies → 2 groups', orders: [order({allergies: ['A']}), order({allergies: ['B']})], expected: 2},
        {desc: 'same allergies (diff order) → 1 group', orders: [order({allergies: ['A', 'B']}), order({allergies: ['B', 'A']})], expected: 1},
        {desc: 'allergies vs none → 2 groups', orders: [order({allergies: ['A']}), order()], expected: 2},
        {desc: 'different provenance → 2 groups', orders: [order({provenance: 'AR_1'}), order({provenance: 'S31'})], expected: 2},
        {desc: 'provenance vs none → 2 groups', orders: [order({provenance: 'AR_1'}), order()], expected: 2},
        {desc: 'allergies + provenance combo → 4 groups', orders: [
            order(), order(),
            order({allergies: ['A']}),
            order({provenance: 'AR_1'}),
            order({allergies: ['A'], provenance: 'AR_1'})
        ], expected: 4},
    ])('$desc → $expected groups', ({orders, expected}) => {
        expect(Object.keys(groupGuestOrders(orders))).toHaveLength(expected)
    })
})

// =============================================================================
// getDayBillSummary - Ticket counts + total price for booking views
// =============================================================================

describe('getDayBillSummary', () => {
    const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
    const DM = DinnerModeSchema.enum
    const OS = OrderStateSchema.enum

    // Use OrderFactory.defaultOrder with overrides
    const o = (overrides: Parameters<typeof OrderFactory.defaultOrder>[1]) => OrderFactory.defaultOrder('test', overrides)

    // Note: dinnerMode is ignored - only state matters for billing (BOOKED/RELEASED = paying)
    describe.each([
        {name: 'empty array', orders: [], expectedCounts: '-', expectedPrice: 0},
        {name: 'all CLOSED', orders: [o({state: OS.CLOSED})], expectedCounts: '-', expectedPrice: 0},
        {name: 'BOOKED counted', orders: [o({state: OS.BOOKED, priceAtBooking: 37}), o({state: OS.BOOKED, priceAtBooking: 37})], expectedCounts: '2V', expectedPrice: 74},
        {name: 'RELEASED counted', orders: [o({state: OS.RELEASED, priceAtBooking: 37}), o({state: OS.RELEASED, priceAtBooking: 20, ticketType: TicketTypes.CHILD})], expectedCounts: '1V 1B', expectedPrice: 57},
        {name: 'BOOKED + RELEASED', orders: [o({state: OS.BOOKED, priceAtBooking: 37}), o({state: OS.RELEASED, priceAtBooking: 37}), o({state: OS.BOOKED, priceAtBooking: 20, ticketType: TicketTypes.CHILD})], expectedCounts: '2V 1B', expectedPrice: 94},
        {name: 'excludes CLOSED', orders: [o({state: OS.BOOKED, priceAtBooking: 37}), o({state: OS.CLOSED, priceAtBooking: 37})], expectedCounts: '1V', expectedPrice: 37},
        {name: 'excludes CANCELLED', orders: [o({state: OS.BOOKED, priceAtBooking: 37}), o({state: OS.CANCELLED, priceAtBooking: 37})], expectedCounts: '1V', expectedPrice: 37},
        {name: 'RELEASED with NONE mode counts', orders: [o({state: OS.RELEASED, dinnerMode: DM.NONE, priceAtBooking: 37})], expectedCounts: '1V', expectedPrice: 37},
    ])('$name', ({orders, expectedCounts, expectedPrice}) => {
        it(`→ counts='${expectedCounts}', price=${expectedPrice}`, () => {
            const result = getDayBillSummary(orders)
            expect(result).toEqual({ticketCounts: expectedCounts, totalPrice: expectedPrice})
        })
    })
})

// =============================================================================
// Action Preview - Show users what will happen before save
// =============================================================================

describe('Action Preview', () => {
    const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
    const DM = DinnerModeSchema.enum
    const OS = OrderStateSchema.enum

    // Action → OrderState mapping (mirrors useBookingUi.ts ACTION_TO_STATE)
    const ACTION_TO_STATE = {
        [Action.BOOK]: OS.BOOKED,
        [Action.BUY]: 'claimed' as const,
        [Action.QUEUE]: 'claimed' as const,
        [Action.LEAVE]: OS.CANCELLED,
        [Action.REQUEUE]: 'claimed' as const,
        [Action.CANCEL]: OS.CANCELLED,
        [Action.RELEASE]: OS.RELEASED,
        [Action.RECLAIM]: OS.BOOKED,
        [Action.CHANGE_MODE]: OS.CLOSED,
        [Action.CHANGE_PRICE]: OS.CLOSED
    } as const

    // Get expected color from ORDER_STATE_LABELS (DRY - same source as implementation)
    const getExpectedColor = (action: keyof typeof ACTION_TO_STATE) =>
        ORDER_STATE_LABELS[ACTION_TO_STATE[action]].color

    // Helper to create DesiredOrder
    const desired = (overrides: Partial<DesiredOrder> = {}): DesiredOrder => ({
        inhabitantId: 1,
        dinnerEventId: 101,
        dinnerMode: DM.DINEIN,
        ticketPriceId: 1,
        isGuestTicket: false,
        state: OS.BOOKED,
        ...overrides
    })

    // Helper to create existing order
    const existing = (id: number, overrides: Partial<OrderDisplay> = {}): OrderDisplay =>
        OrderFactory.defaultOrder(undefined, {
            id,
            inhabitantId: 1,
            dinnerEventId: 101,
            ticketPriceId: 1,
            dinnerMode: DM.DINEIN,
            state: OS.BOOKED,
            ...overrides
        })

    // Empty buckets helper
    const emptyBuckets = (): Parameters<typeof formatActionPreview>[0] => emptyOrderBuckets<DesiredOrder>()

    // Name lookup for tests
    const getName = (id: number) => id === 1 ? 'Anna' : id === 2 ? 'Peter' : `User${id}`

    describe('ACTION_WORDS', () => {
        it.each([
            {action: Action.BOOK, expectedText: 'Anna tilmeldes'},
            {action: Action.BUY, expectedText: 'Anna køber en ledig billet'},
            {action: Action.QUEUE, expectedText: 'Anna skrives på ventelisten'},
            {action: Action.LEAVE, expectedText: 'Anna forlader ventelisten'},
            {action: Action.REQUEUE, expectedText: `Anna ændrer ønsket tilmelding til ${MODE_WORDS[DM.DINEIN].label}`},
            {action: Action.CANCEL, expectedText: 'Anna frameldes'},
            {action: Action.RELEASE, expectedText: 'Annas billet frigives'},
            {action: Action.RECLAIM, expectedText: 'Anna tilmeldes igen'},
            {action: Action.CHANGE_MODE, expectedText: 'Anna opdaterer spisning'}
        ])('$action template produces "$expectedText"', ({action, expectedText}) => {
            const config = ACTION_WORDS[action]
            expect(config.template('Anna', {mode: MODE_WORDS[DM.DINEIN].label})).toBe(expectedText)
            expect(config.icon).toBeDefined()
        })
    })

    describe('formatActionPreview', () => {
        it('returns empty array for all idempotent buckets', () => {
            const buckets = {...emptyBuckets(), idempotent: [desired()]}
            const result = formatActionPreview(buckets, [], getName)
            expect(result).toHaveLength(0)
        })

        it.each([
            {bucket: Bucket.create, ticketsForSale: 0, action: Action.BOOK, textContains: 'tilmeldes'},
            {bucket: Bucket.delete, ticketsForSale: 0, action: Action.CANCEL, textContains: 'frameldes'},
            {bucket: Bucket.claim, ticketsForSale: 1, action: Action.BUY, textContains: 'køber en ledig billet'},
            {bucket: Bucket.claim, ticketsForSale: 0, action: Action.QUEUE, textContains: 'skrives på ventelisten'},
            {bucket: Bucket.leave, ticketsForSale: 0, action: Action.LEAVE, textContains: 'forlader ventelisten'},
            {bucket: Bucket.requeue, ticketsForSale: 0, action: Action.REQUEUE, textContains: 'ændrer ønsket tilmelding til'}
        ])('$bucket bucket with $ticketsForSale for sale → $action action', ({bucket, ticketsForSale, action, textContains}) => {
            const buckets = {...emptyBuckets(), [bucket]: [desired({inhabitantId: 1})]}
            const result = formatActionPreview(buckets, [], getName, () => ({ticketsForSale}))

            expect(result).toHaveLength(1)
            expect(result[0]).toMatchObject({
                name: 'Anna',
                action,
                color: getExpectedColor(action),
                text: expect.stringContaining(textContains)
            })
            expect(result[0]!.icon).toBeDefined()
        })

        describe('update bucket → action depends on existing state', () => {
            it.each([
                {
                    desc: 'desired RELEASED → release action',
                    desiredOrder: desired({orderId: 42, state: OS.RELEASED}),
                    existingOrder: existing(42, {state: OS.BOOKED}),
                    expectedAction: Action.RELEASE,
                    expectedText: 'frigives'
                },
                {
                    desc: 'existing RELEASED + desired BOOKED → reclaim action',
                    desiredOrder: desired({orderId: 42, state: OS.BOOKED}),
                    existingOrder: existing(42, {state: OS.RELEASED}),
                    expectedAction: Action.RECLAIM,
                    expectedText: 'tilmeldes igen'
                },
                {
                    desc: 'both BOOKED with different mode → updateMode action',
                    desiredOrder: desired({orderId: 42, dinnerMode: DM.TAKEAWAY, state: OS.BOOKED}),
                    existingOrder: existing(42, {dinnerMode: DM.DINEIN, state: OS.BOOKED}),
                    expectedAction: Action.CHANGE_MODE,
                    expectedText: 'opdaterer spisning'
                }
            ])('$desc', ({desiredOrder, existingOrder, expectedAction, expectedText}) => {
                const buckets = {...emptyBuckets(), update: [desiredOrder]}
                const result = formatActionPreview(buckets, [existingOrder], getName)

                expect(result).toHaveLength(1)
                expect(result[0]).toMatchObject({
                    action: expectedAction,
                    color: getExpectedColor(expectedAction),
                    text: expect.stringContaining(expectedText)
                })
            })
        })

        describe('guest ticket handling', () => {
            it('uses "Gæst af {bookerName}" for guest tickets', () => {
                const guestOrder = desired({inhabitantId: 1, isGuestTicket: true})
                const buckets = {...emptyBuckets(), create: [guestOrder]}
                const result = formatActionPreview(buckets, [], getName)

                expect(result).toHaveLength(1)
                expect(result[0]!.name).toBe('Gæst af Anna')
                expect(result[0]!.text).toBe('Gæst af Anna tilmeldes')
            })

            it('uses inhabitant name for non-guest tickets', () => {
                const regularOrder = desired({inhabitantId: 1, isGuestTicket: false})
                const buckets = {...emptyBuckets(), create: [regularOrder]}
                const result = formatActionPreview(buckets, [], getName)

                expect(result).toHaveLength(1)
                expect(result[0]!.name).toBe('Anna')
                expect(result[0]!.text).toBe('Anna tilmeldes')
            })
        })

        it('handles multiple orders across buckets', () => {
            const buckets = {
                ...emptyBuckets(),
                create: [desired({inhabitantId: 1})],
                delete: [desired({inhabitantId: 2, orderId: 43})],
                update: [desired({inhabitantId: 1, orderId: 42, state: OS.RELEASED})],
                claim: [desired({inhabitantId: 2})]
            }
            const existingOrders = [existing(42, {state: OS.BOOKED})]
            const result = formatActionPreview(buckets, existingOrders, getName)

            expect(result).toHaveLength(4)
            const actions = result.map(r => r.action).sort()
            expect(actions).toEqual([Action.BOOK, Action.CANCEL, Action.QUEUE, Action.RELEASE])
        })
    })

    describe('hasChanges', () => {
        it.each([
            {desc: 'all empty → false', buckets: emptyBuckets(), expected: false},
            {desc: 'only idempotent → false', buckets: {...emptyBuckets(), idempotent: [desired()]}, expected: false},
            {desc: 'create → true', buckets: {...emptyBuckets(), create: [desired()]}, expected: true},
            {desc: 'delete → true', buckets: {...emptyBuckets(), delete: [desired()]}, expected: true},
            {desc: 'update → true', buckets: {...emptyBuckets(), update: [desired()]}, expected: true},
            {desc: 'claim → true', buckets: {...emptyBuckets(), claim: [desired()]}, expected: true},
            {desc: 'leave → true', buckets: {...emptyBuckets(), leave: [desired()]}, expected: true},
            {desc: 'requeue → true', buckets: {...emptyBuckets(), requeue: [desired()]}, expected: true},
        ])('$desc', ({buckets, expected}) => {
            expect(hasChanges(buckets)).toBe(expected)
        })
    })

    describe('countChanges', () => {
        it.each([
            {desc: 'all empty → 0', buckets: emptyBuckets(), expected: 0},
            {desc: 'only idempotent → 0', buckets: {...emptyBuckets(), idempotent: [desired(), desired()]}, expected: 0},
            {desc: '1 create → 1', buckets: {...emptyBuckets(), create: [desired()]}, expected: 1},
            {desc: '2 delete → 2', buckets: {...emptyBuckets(), delete: [desired(), desired()]}, expected: 2},
            {desc: 'mixed buckets', buckets: {
                ...emptyBuckets(),
                create: [desired()],
                delete: [desired(), desired()],
                update: [desired()],
                claim: [desired()],
                leave: [desired()],
                requeue: [desired()],
                idempotent: [desired(), desired(), desired()]  // not counted
            }, expected: 7},
        ])('$desc', ({buckets, expected}) => {
            expect(countChanges(buckets)).toBe(expected)
        })
    })
})

// ---- Ticket changes (Billetændringer) and the cooking round ----

describe('replayTicketChanges', () => {
    const {OrderAuditActionSchema, OrderStateSchema, TicketTypeSchema, DinnerModeSchema, createOrderAuditData} = useBookingValidation()
    const Action = OrderAuditActionSchema.enum
    const TicketType = TicketTypeSchema.enum
    // Ticket price ids: 1 adult, 2 child, 3 baby; 9 is a price the season no longer names
    const ticketPriceOf = (ticketPriceId: number) => ({
        1: {ticketType: TicketType.ADULT, portions: 1},
        2: {ticketType: TicketType.CHILD, portions: 0.5},
        3: {ticketType: TicketType.BABY, portions: 0}
    } as Record<number, {ticketType: typeof TicketType[keyof typeof TicketType], portions: number}>)[ticketPriceId] ?? null
    const prices: Record<number, number> = {1: 5000, 2: 2500, 3: 0, 9: 4000}
    const at = (minutes: number) => new Date(2026, 3, 2, 20, minutes)

    let seq = 0
    const row = (action: typeof Action[keyof typeof Action], orderId: number, ticketPriceId: number, household: string, timestamp: Date,
                 state: typeof OrderStateSchema.enum[keyof typeof OrderStateSchema.enum] = OrderStateSchema.enum.BOOKED, system = false) =>
        OrderFactory.defaultOrderHistoryDisplay(undefined, {
            id: ++seq, orderId, action, timestamp,
            performedByUserId: system ? null : 1,
            performedByUser: system ? null : {id: 1, email: 'chef@example.com'},
            auditData: createOrderAuditData({
                id: orderId, inhabitantId: orderId, dinnerEventId: 1, ticketPriceId, priceAtBooking: prices[ticketPriceId]!,
                dinnerMode: DinnerModeSchema.enum.DINEIN, state, inhabitantNameWithInitials: 'A. B.', householdShortname: household, householdId: 1
            })
        })

    it('GIVEN bookings, a release after the deadline and a claim WHEN replaying THEN tickets and revenue stand still while kuverter follow the eaters', () => {
        const {replayTicketChanges} = useBooking()
        const history = [
            row(Action.USER_BOOKED, 1, 1, 'S_31', at(0)),
            row(Action.USER_BOOKED, 2, 2, 'S_22', at(1)),
            row(Action.USER_CANCELLED, 2, 2, 'S_22', at(2), OrderStateSchema.enum.RELEASED),
            row(Action.USER_CLAIMED, 2, 2, 'S_22', at(3))
        ]
        const changes = replayTicketChanges(history, ticketPriceOf)
        expect(changes.map(change => [change.action, change.counts.ADULT, change.counts.CHILD, change.portions, change.revenue])).toEqual([
            [Action.USER_BOOKED, 1, 0, 1, 5000],
            [Action.USER_BOOKED, 1, 1, 1.5, 7500],
            [Action.USER_CANCELLED, 1, 1, 1, 7500],
            [Action.USER_CLAIMED, 1, 1, 1.5, 7500]
        ])
        expect(changes[1]!.delta).toEqual(OrderFactory.ticketCounts(0, 1, 0))
        expect(changes[2]!.delta).toEqual(OrderFactory.ticketCounts(0, 0, 0))
        expect(changes[2]!.householdShortname).toBe('S_22')
        expect(changes[2]!.ticketType).toBe(TicketType.CHILD)
    })

    it('GIVEN a release written by the scaffold\'s batch update WHEN replaying THEN the change carries the released ticket\'s type and household', () => {
        const {replayTicketChanges} = useBooking()
        const batchRelease = OrderFactory.defaultOrderHistoryDisplay(undefined, {
            id: ++seq, orderId: 2, inhabitantId: 2, action: Action.USER_CANCELLED, timestamp: at(2),
            auditData: JSON.stringify({state: OrderStateSchema.enum.RELEASED, dinnerMode: DinnerModeSchema.enum.NONE, ticketPriceId: null, priceAtBooking: null})
        })
        const changes = replayTicketChanges([row(Action.USER_BOOKED, 2, 2, 'S_22', at(1)), batchRelease], ticketPriceOf)
        expect(changes.at(-1)).toMatchObject({action: Action.USER_CANCELLED, ticketType: TicketType.CHILD, householdShortname: 'S_22', counts: OrderFactory.ticketCounts(0, 1, 0), portions: 0, revenue: 2500})
    })

    it.each([
        {desc: 'a cancellation before the deadline', action: Action.USER_CANCELLED},
        {desc: 'a system deletion', action: Action.SYSTEM_DELETED}
    ])('GIVEN a booked ticket and $desc WHEN replaying THEN the ticket, its kuverter and its revenue leave', ({action}) => {
        const {replayTicketChanges} = useBooking()
        const changes = replayTicketChanges([row(Action.USER_BOOKED, 1, 1, 'S_31', at(0)), row(action, 1, 1, 'S_31', at(5))], ticketPriceOf)
        expect(changes.at(-1)).toMatchObject({action, delta: OrderFactory.ticketCounts(-1, 0, 0), counts: OrderFactory.ticketCounts(0, 0, 0), portions: 0, revenue: 0})
    })

    it('GIVEN rows of one household and event within one minute WHEN replaying THEN they are one change with the summed delta, and another household or minute starts a row', () => {
        const {replayTicketChanges} = useBooking()
        const history = [
            row(Action.SYSTEM_CREATED, 1, 1, 'S_31', at(0), OrderStateSchema.enum.BOOKED, true),
            row(Action.SYSTEM_CREATED, 2, 2, 'S_31', at(0), OrderStateSchema.enum.BOOKED, true),
            row(Action.SYSTEM_CREATED, 3, 1, 'S_22', at(0), OrderStateSchema.enum.BOOKED, true),
            row(Action.SYSTEM_CREATED, 4, 1, 'S_22', at(5), OrderStateSchema.enum.BOOKED, true),
            row(Action.USER_BOOKED, 5, 1, 'S_07', at(30))
        ]
        const changes = replayTicketChanges(history, ticketPriceOf)
        expect(changes.map(change => [change.action, change.householdShortname, change.delta])).toEqual([
            [Action.SYSTEM_CREATED, 'S_31', OrderFactory.ticketCounts(1, 1, 0)],
            [Action.SYSTEM_CREATED, 'S_22', OrderFactory.ticketCounts(1, 0, 0)],
            [Action.SYSTEM_CREATED, 'S_22', OrderFactory.ticketCounts(1, 0, 0)],
            [Action.USER_BOOKED, 'S_07', OrderFactory.ticketCounts(1, 0, 0)]
        ])
        expect(changes[0]).toMatchObject({ticketType: null, counts: OrderFactory.ticketCounts(1, 1, 0), portions: 1.5, revenue: 7500})
        expect(changes[3]).toMatchObject({counts: OrderFactory.ticketCounts(4, 1, 0)})
    })

    it('GIVEN rows out of order and a dining mode update WHEN replaying THEN time order rules and the update is no change', () => {
        const {replayTicketChanges} = useBooking()
        const history = [
            row(Action.SYSTEM_UPDATED, 1, 1, 'S_31', at(2)),
            row(Action.USER_BOOKED, 1, 1, 'S_31', at(0))
        ]
        const changes = replayTicketChanges(history, ticketPriceOf)
        expect(changes.map(change => change.action)).toEqual([Action.USER_BOOKED])
    })

    it('GIVEN a ticket price the season no longer names WHEN replaying THEN the change carries revenue but no type or kuverter', () => {
        const {replayTicketChanges} = useBooking()
        const changes = replayTicketChanges([row(Action.USER_BOOKED, 1, 9, 'S_31', at(0))], ticketPriceOf)
        expect(changes[0]).toMatchObject({ticketType: null, counts: OrderFactory.ticketCounts(0, 0, 0), portions: 0, revenue: 4000})
    })
})

describe('consecutiveDinnerRun', () => {
    const dinner = (id: number, day: number) => ({id, date: new Date(2026, 3, day, 18)})

    it.each([
        {desc: 'three days in a row around the middle one', dinners: [dinner(1, 12), dinner(2, 13), dinner(3, 14)], around: 2, expected: [1, 2, 3]},
        {desc: 'a gap before the run', dinners: [dinner(1, 9), dinner(2, 13), dinner(3, 14)], around: 3, expected: [2, 3]},
        {desc: 'a gap after the run', dinners: [dinner(1, 12), dinner(2, 13), dinner(3, 20)], around: 1, expected: [1, 2]},
        {desc: 'a single dinner', dinners: [dinner(1, 12), dinner(2, 20)], around: 1, expected: [1]},
        {desc: 'unsorted input', dinners: [dinner(3, 14), dinner(1, 12), dinner(2, 13)], around: 1, expected: [1, 2, 3]},
        {desc: 'a dinner the team does not have', dinners: [dinner(1, 12)], around: 99, expected: []}
    ])('GIVEN $desc WHEN taking the run THEN the consecutive days come in date order', ({dinners, around, expected}) => {
        const {consecutiveDinnerRun} = useBooking()
        expect(consecutiveDinnerRun(dinners, around).map(dinner => dinner.id)).toEqual(expected)
    })
})

describe('replayTicketChanges reads every audit shape', () => {
    const {OrderAuditActionSchema, OrderStateSchema, TicketTypeSchema, DinnerModeSchema, createOrderAuditData} = useBookingValidation()
    const Action = OrderAuditActionSchema.enum
    const ticketPriceOf = (ticketPriceId: number) => ticketPriceId === 1 ? {ticketType: TicketTypeSchema.enum.ADULT, portions: 1} : null
    const at = (minutes: number) => new Date(2026, 3, 2, 20, minutes)
    const shortNameOf = (householdId: number) => householdId === 7 ? 'S_07' : null

    // The creation writes orderData without an order id; once the order is deleted the row's orderId is set to null
    const creationRow = (id: number, orderId: number | null, inhabitantId: number) => OrderFactory.defaultOrderHistoryDisplay(undefined, {
        id, orderId, inhabitantId, dinnerEventId: 1, action: Action.USER_BOOKED, timestamp: at(id),
        auditData: JSON.stringify({source: 'test', orderData: {dinnerEventId: 1, inhabitantId, bookedByUserId: 1, ticketPriceId: 1, priceAtBooking: 5000, householdId: 7, dinnerMode: DinnerModeSchema.enum.DINEIN, state: OrderStateSchema.enum.BOOKED, isGuestTicket: false}})
    })
    const deletionRow = (id: number, orderId: number, inhabitantId: number) => OrderFactory.defaultOrderHistoryDisplay(undefined, {
        id, orderId: null, inhabitantId, dinnerEventId: 1, action: Action.USER_CANCELLED, timestamp: at(id),
        auditData: createOrderAuditData({id: orderId, inhabitantId, dinnerEventId: 1, ticketPriceId: 1, priceAtBooking: 5000, dinnerMode: DinnerModeSchema.enum.DINEIN, state: OrderStateSchema.enum.BOOKED, inhabitantNameWithInitials: 'A. B.', householdShortname: 'S_07', householdId: 7})
    })

    it('GIVEN a creation row WHEN replaying THEN the household comes from the id and the ticket counts', () => {
        const {replayTicketChanges} = useBooking()
        const changes = replayTicketChanges([creationRow(1, 10, 100)], ticketPriceOf, shortNameOf)
        expect(changes[0]).toMatchObject({householdShortname: 'S_07', ticketType: TicketTypeSchema.enum.ADULT, counts: OrderFactory.ticketCounts(1, 0, 0), revenue: 5000})
    })

    it('GIVEN an order deleted later, its creation row without an order id WHEN replaying THEN the deletion finds it by inhabitant', () => {
        const {replayTicketChanges} = useBooking()
        const changes = replayTicketChanges([creationRow(1, null, 100), deletionRow(2, 10, 100)], ticketPriceOf, shortNameOf)
        expect(changes.map(change => [change.action, change.counts.ADULT, change.revenue])).toEqual([[Action.USER_BOOKED, 1, 5000], [Action.USER_CANCELLED, 0, 0]])
    })

    it('GIVEN a bulk close row with scalars only WHEN replaying THEN it is read and changes nothing', () => {
        const {replayTicketChanges} = useBooking()
        const close = OrderFactory.defaultOrderHistoryDisplay(undefined, {
            id: 2, orderId: 10, inhabitantId: 100, action: Action.SYSTEM_UPDATED, timestamp: at(2),
            auditData: JSON.stringify({state: OrderStateSchema.enum.CLOSED, dinnerMode: DinnerModeSchema.enum.DINEIN, ticketPriceId: 1, priceAtBooking: 5000})
        })
        const changes = replayTicketChanges([creationRow(1, 10, 100), close], ticketPriceOf, shortNameOf)
        expect(changes).toHaveLength(1)
    })
})
