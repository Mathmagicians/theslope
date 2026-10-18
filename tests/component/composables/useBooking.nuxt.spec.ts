import {describe, it, expect, beforeAll} from 'vitest'
import {addDays, addYears} from 'date-fns'
import {useBooking, formatPlace, formatDinnerName, emptyOrderBuckets, actionOfUpdate, plannedActions, countTotals, DINNER_STEP_MAP, DinnerStepState, CONSUMABLE_DINNER_STATES, CLOSABLE_ORDER_STATES, decideOrderAction, resolveDesiredOrdersToBuckets, generateDesiredOrdersFromPreferences, resolveOrdersFromPreferencesToBuckets, getNewOrderAction, bookingOutcomes, supplyOfType, EMPTY_RELEASED_TICKET_COUNTS, buildDesiredOrder, buildGuestDesiredOrder, findRegularOrder, ticketStateOf, supplyStateOf, isPendingOrder, type OrderDecisionInput, type OrderBucketResult, type BookingIntent, type TicketPriceResolver} from '~/composables/useBooking'
import {useBillingValidation} from '~/composables/useBillingValidation'
import {dateToWeekDay} from '~/utils/season'
import {useCoreValidation} from '~/composables/useCoreValidation'
import {sumBy} from '~/utils/ledger'
import {useBookingValidation, TicketState, SupplyState, type OrderDisplay, type DinnerMode, type DesiredOrder, type OrderAuditAction, type OrderAuditChange, type OrderAuditSource, type OrderSnapshot, type OrderState, type TicketType, type TicketChange} from '~/composables/useBookingValidation'
import {BOOKING_WORDS} from '~/config/bookingWords'
import type {TicketWaitlistDisplay} from '~/composables/useWaitlistValidation'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import type {WeekDayMap} from '~/types/dateTypes'
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
const today = new Date()

// The default season cooks three days a week: one dinner on each, ids 101, 102 and 103, far enough ahead that no deadline applies
const farFutureDinners = DinnerEventFactory.dinnerEventsOnCookingDays(SeasonFactory.defaultSeason(), FAR_FUTURE_DAYS, 101)
const farFutureDinnerIds = farFutureDinners.map(de => de.id)
const {createWeekDayMapFromSelection: dinnerModeMapFromSelection, createDefaultWeekdayMap: dinnerModeMap} = useCoreValidation()
// DINEIN on the weekdays of those dinners, NONE on the rest
const dineInOnDinnerDays = dinnerModeMapFromSelection(farFutureDinners.map(de => dateToWeekDay(de.date)), DinnerModes.DINEIN, DinnerModes.NONE)

// @nuxt/test-utils 4 starts Nuxt in beforeAll: composables run there, not in the describe body
type UseBookingT = ReturnType<typeof useBooking>
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

        // The close keeps each order's mode: a released ticket nobody bought is billed with Ingen
        it.each([DinnerModes.NONE, DinnerModes.TAKEAWAY])('an order closed with %s keeps its eating mode in the snapshot', (dinnerMode) => {
            const order = {...OrderFactory.defaultOrderForTransaction('mode-test'), dinnerMode}
            const snapshot = OrderSnapshotSchema.parse(JSON.parse(prepareTransactionData([order])[0]!.orderSnapshot))
            expect(snapshot.dinnerMode).toBe(dinnerMode)
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
// bookingOutcomes - what a bucket's orders do to the supply, in the order they execute
// =============================================================================

// The season's default prices: an order at a ticket type holds that type's price
const SEASON_PRICES = TicketFactory.defaultTicketPrices()
const priceIdOf = (ticketType: typeof TicketTypes[keyof typeof TicketTypes]) => SEASON_PRICES.find(price => price.ticketType === ticketType)!.id!

// A claim buys from the dinner's tickets for sale of the ticket type its price names
describe('supplyOfType', () => {
    const TicketType = TicketTypes
    const counts = {...EMPTY_RELEASED_TICKET_COUNTS, total: 3, byType: {[TicketType.ADULT]: 2, [TicketType.CHILD]: 1}}

    it.each([
        {ticketType: TicketType.ADULT, forSale: 2},
        {ticketType: TicketType.CHILD, forSale: 1},
        {ticketType: TicketType.BABY, forSale: 0}
    ])('a claim at a $ticketType price finds the $forSale tickets for sale of its type', ({ticketType, forSale}) => {
        expect(supplyOfType(counts, SEASON_PRICES, priceIdOf(ticketType))).toEqual({ticketType, ticketsForSale: forSale})
    })

    it('a claim at a price outside the season finds nothing for sale', () => {
        expect(supplyOfType(counts, SEASON_PRICES, 99).ticketsForSale).toBe(0)
    })
})

describe('bookingOutcomes', () => {
    const order = OrderFactory.defaultDesiredOrder()

    it.each([
        {bucket: Bucket.create, ticketsForSale: 0, expected: Action.BOOK},
        {bucket: Bucket.claim, ticketsForSale: 2, expected: Action.BUY},
        {bucket: Bucket.claim, ticketsForSale: 0, expected: Action.QUEUE},
        {bucket: Bucket.leave, ticketsForSale: 0, expected: Action.LEAVE},
        {bucket: Bucket.requeue, ticketsForSale: 1, expected: Action.REQUEUE},
        {bucket: Bucket.idempotent, ticketsForSale: 1, expected: Action.CHANGE_MODE},
        {bucket: null, ticketsForSale: 1, expected: Action.CHANGE_MODE}
    ])('one order: $bucket with $ticketsForSale for sale → $expected', ({bucket, ticketsForSale, expected}) => {
        expect(bookingOutcomes(bucket, order, () => ({ticketsForSale}))).toEqual([{order, outcome: expected}])
    })

    // 3V 1B for sale on the dinner: each claim takes from what the claims before it left of its ticket type
    const TicketType = TicketTypes
    const counts = {...EMPTY_RELEASED_TICKET_COUNTS, total: 4, byType: {[TicketType.ADULT]: 3, [TicketType.CHILD]: 1}}
    const claimAt = (ticketType: typeof TicketType[keyof typeof TicketType]) =>
        OrderFactory.defaultDesiredOrder({ticketPriceId: priceIdOf(ticketType), isGuestTicket: true})

    it.each([
        {desc: 'ten adult guests: three buy the adult tickets, seven queue', claims: Array.from({length: 10}, () => TicketType.ADULT),
            expected: [...Array.from({length: 3}, () => Action.BUY), ...Array.from({length: 7}, () => Action.QUEUE)]},
        {desc: 'two adults and a child all buy', claims: [TicketType.ADULT, TicketType.CHILD, TicketType.ADULT], expected: [Action.BUY, Action.BUY, Action.BUY]},
        {desc: 'two children share the one child ticket: the first buys, the second queues', claims: [TicketType.CHILD, TicketType.CHILD], expected: [Action.BUY, Action.QUEUE]}
    ])('a list of claims, in order: $desc', ({claims, expected}) => {
        const outcomes = bookingOutcomes(Bucket.claim, claims.map(claimAt), order => supplyOfType(counts, SEASON_PRICES, order.ticketPriceId))
        expect(outcomes.map(({outcome}) => outcome)).toEqual(expected)
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
            // Case 2: No orderId + NONE → delete: the cancellation is recorded with no order to delete
            {
                desc: 'no orderId + NONE → delete (records the cancellation)',
                desired: createDesired({ dinnerMode: DinnerMode.NONE }),
                existing: null,
                beforeDeadline: true,
                canEditMode: true,
                expectedBucket: Bucket.delete,
                expectedState: undefined  // delete doesn't set state
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

    // ADR-016: an orderId among no existing orders is stale (bought by another household, or deleted)
    describe('stale orders', () => {
        it.each([
            {desc: 'an eating mode before the deadline', dinnerMode: DinnerMode.DINEIN, beforeDeadline: true},
            {desc: 'Ingen after the deadline', dinnerMode: DinnerMode.NONE, beforeDeadline: false}
        ])('skips $desc on an order no longer among the existing orders', ({dinnerMode, beforeDeadline}) => {
            const result = decideOrderAction(createInput(createDesired({orderId: 999, dinnerMode}), null, beforeDeadline, true), DinnerMode, OrderState)

            expect(result).toBeNull()
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

    // Helper to create inhabitant
    const createInhabitant = (id: number, dinnerPreferences: WeekDayMap<DinnerMode> | null) => ({
        ...HouseholdFactory.defaultInhabitantData(),
        id,
        dinnerPreferences
    })

    const ticketPrices = SeasonFactory.defaultSeason().ticketPrices

    it('generates orders for all dinner events matching preferences', () => {
        const inhabitants = [createInhabitant(1, dineInOnDinnerDays)]
        const result = generateDesiredOrdersFromPreferences(
            inhabitants,
            farFutureDinners,
            [],
            [],  // queue entries
            new Set(),  // cancelledKeys
            ticketPrices
        )

        expect(result).toHaveLength(farFutureDinners.length)
        expect(result.map(o => o.dinnerEventId).sort()).toEqual(farFutureDinnerIds)
    })

    it('a key with a user intent gets no booking', () => {
        const inhabitants = [createInhabitant(1, dineInOnDinnerDays)]

        const result = generateDesiredOrdersFromPreferences(inhabitants, farFutureDinners, [], [], new Set(['1-102']), ticketPrices)

        expect(result.map(o => o.dinnerEventId).sort()).toEqual(farFutureDinnerIds.filter(id => id !== 102))
    })

    // Ingen with no order is a wish only where the inhabitant holds a place of their own on the dinner's waiting list
    it.each([
        {desc: 'a place on the dinner\'s waiting list: a wish for Ingen', entries: [WaitlistFactory.defaultEntry({id: 21, inhabitantId: 1, dinnerEventId: 101})], wishes: [101]},
        {desc: 'a guest\'s place: no wish', entries: [WaitlistFactory.defaultEntry({id: 21, inhabitantId: 1, dinnerEventId: 101, isGuestTicket: true})], wishes: []},
        {desc: 'no place: no wish', entries: [], wishes: []}
    ])('Ingen with no order, $desc', ({entries, wishes}) => {
        const inhabitants = [createInhabitant(1, dinnerModeMap(DinnerMode.NONE))]

        const result = generateDesiredOrdersFromPreferences(inhabitants, farFutureDinners, [], entries, new Set(), ticketPrices)

        expect(result.map(o => [o.dinnerEventId, o.dinnerMode])).toEqual(wishes.map(dinnerEventId => [dinnerEventId, DinnerMode.NONE]))
    })

    it('enriches with orderId when existing order found', () => {
        const inhabitants = [createInhabitant(1, dineInOnDinnerDays)]
        const existingOrder = OrderFactory.defaultOrder(undefined, {
            id: 42,
            inhabitantId: 1,
            dinnerEventId: 101
        })

        const result = generateDesiredOrdersFromPreferences(
            inhabitants,
            farFutureDinners,
            [existingOrder],
            [],  // queue entries
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
            farFutureDinners,
            [],
            [],  // queue entries
            new Set(),  // cancelledKeys
            ticketPrices
        )

        expect(result).toHaveLength(farFutureDinners.length)
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
            const inhabitants = [createInhabitant(1, dineInOnDinnerDays)]
            const result = generateDesiredOrdersFromPreferences(inhabitants, farFutureDinners, existingOrders, [], new Set(), ticketPrices)

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

    // Helper to create inhabitant
    const createInhabitant = (id: number, dinnerPreferences: WeekDayMap<DinnerMode> | null) => ({
        ...HouseholdFactory.defaultInhabitantData(),
        id,
        householdId: 1,
        dinnerPreferences
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

    const allNone = dinnerModeMap(DinnerMode.NONE)

    const testSeason = seasonWith(farFutureDinners)

    it.each([
        {
            desc: 'creates all orders for household with no existing',
            inhabitants: [createInhabitant(1, dineInOnDinnerDays)],
            existing: [],
            confirmed: new Set<string>(),
            cancelled: new Set<string>(),
            expected: {create: 3, delete: 0, update: 0, idempotent: 0}
        },
        {
            desc: 'recognizes matching orders as idempotent',
            inhabitants: [createInhabitant(1, dineInOnDinnerDays)],
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
            inhabitants: [createInhabitant(1, dineInOnDinnerDays)],
            existing: [],
            confirmed: new Set<string>(),
            cancelled: new Set(['1-102']),
            expected: {create: 2, delete: 0, update: 0, idempotent: 0}
        },
        {
            desc: 'cancelledKeys: RELEASED order preserved (not deleted as orphan)',
            inhabitants: [createInhabitant(1, dineInOnDinnerDays)],
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
            inhabitants: [createInhabitant(1, dineInOnDinnerDays)],
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

    it('keeps a guest ticket whose price row is gone as it is, never an update', () => {
        const household = createHousehold(1, [createInhabitant(1, allNone)])
        const guest = {...createOrder(99, 1, 101, {isGuestTicket: true, priceAtBooking: 5000}), ticketPriceId: null}

        const result = resolveOrdersFromPreferencesToBuckets(testSeason, household, [guest], new Set(), new Set())

        expect(result.idempotent.map(order => order.orderId)).toEqual([99])
        expect(result.update).toEqual([])
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
        const allDaysPrefs = dinnerModeMap(DinnerMode.DINEIN)
        const noDaysPrefs = dinnerModeMap(DinnerMode.NONE)
        // The inhabitant's place on the dinner's waiting list, held for a dine-in at the adult price
        const queued = WaitlistFactory.defaultEntry({id: 21, inhabitantId: 1, dinnerEventId: tomorrowDinner.id, ticketPriceId: 4})

        // A preference decides like a member's change: with no order it buys or queues, on a place it leaves or requeues
        it.each([
            {
                desc: 'a preference to eat with no order claims',
                prefs: allDaysPrefs,
                entries: [],
                expected: {claim: [expect.objectContaining({inhabitantId: 1, dinnerEventId: tomorrowDinner.id, dinnerMode: DinnerMode.DINEIN, state: OrderState.BOOKED})], leave: [], requeue: []}
            },
            {
                desc: 'Ingen on a dinner the inhabitant queues for leaves the waiting list',
                prefs: noDaysPrefs,
                entries: [queued],
                expected: {claim: [], leave: [expect.objectContaining({inhabitantId: 1, waitlistEntryId: queued.id})], requeue: []}
            },
            {
                desc: 'another eating mode on a dinner the inhabitant queues for requeues the place',
                prefs: dinnerModeMap(DinnerMode.TAKEAWAY),
                entries: [queued],
                expected: {claim: [], leave: [], requeue: [expect.objectContaining({waitlistEntryId: queued.id, dinnerMode: DinnerMode.TAKEAWAY})]}
            },
            {
                desc: 'Ingen with no order and no place → nothing',
                prefs: noDaysPrefs,
                entries: [],
                expected: {claim: [], leave: [], requeue: []}
            }
        ])('$desc', ({prefs, entries, expected}) => {
            const household = createHousehold(1, [createInhabitant(1, prefs)])

            const result = resolveOrdersFromPreferencesToBuckets(pastDeadlineSeason, household, [], new Set(), new Set(), entries)

            expect({claim: result.claim, leave: result.leave, requeue: result.requeue}).toEqual(expected)
            expect(result.create).toEqual([])
        })

        // A guest ticket booked on a person is not the person's own ticket, in either order of the list
        it.each([
            {desc: 'the guest ticket listed last', guestLast: true},
            {desc: 'the guest ticket listed first', guestLast: false}
        ])('GIVEN a person\'s own ticket and a guest ticket on them, $desc, WHEN the preference turns Ingen THEN the own ticket releases and the guest ticket stays', ({guestLast}) => {
            const household = createHousehold(1, [createInhabitant(1, noDaysPrefs)])
            const own = createOrder(10, 1, tomorrowDinner.id)
            const guest = createOrder(11, 1, tomorrowDinner.id, {isGuestTicket: true})

            const result = resolveOrdersFromPreferencesToBuckets(pastDeadlineSeason, household, guestLast ? [own, guest] : [guest, own], new Set(), new Set())

            expect(result.update).toEqual([expect.objectContaining({orderId: own.id, state: OrderState.RELEASED})])
            expect(result.idempotent).toEqual([expect.objectContaining({orderId: guest.id, isGuestTicket: true})])
            expect(result.delete).toEqual([])
        })

        it('GIVEN two guest tickets on one person on a dinner THEN both stay as they are', () => {
            const household = createHousehold(1, [createInhabitant(1, noDaysPrefs)])
            const guests = [11, 12].map(id => createOrder(id, 1, tomorrowDinner.id, {isGuestTicket: true}))

            const result = resolveOrdersFromPreferencesToBuckets(pastDeadlineSeason, household, guests, new Set(), new Set())

            expect(result.idempotent.map(order => order.orderId)).toEqual([11, 12])
            expect(result.delete).toEqual([])
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
        const queue = (queued: number, queuedFormatted: string, queuedByType: Partial<Record<typeof TicketTypes[keyof typeof TicketTypes], number>> = {}) => ({ queued, queuedFormatted, queuedByType })
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
                queues: new Map([[1, queue(3, '2V 1B', {[TicketTypes.ADULT]: 2, [TicketTypes.CHILD]: 1})], [3, queue(4, '4V', {[TicketTypes.ADULT]: 4})]]),
                expected: new Map([[1, counts(undefined, queue(3, '2V 1B', {[TicketTypes.ADULT]: 2, [TicketTypes.CHILD]: 1}))], [2, emptyCount]])
            },
            {
                name: 'carries the tickets for sale and the waiting list of a locked dinner side by side',
                dinnerEvents: [makeEvent(1, 2)],
                lockedDays: 7,
                releasedCounts: new Map([[1, adults(4)]]),
                queues: new Map([[1, queue(1, '1B', {[TicketTypes.CHILD]: 1})]]),
                expected: new Map([[1, counts(adults(4), queue(1, '1B', {[TicketTypes.CHILD]: 1}))]])
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
        const order = orderState === null ? null : OrderFactory.defaultOrder(undefined, {state: orderState})
        const result = getBookingOptions(order, canModify, canEdit, dinnerState, inResidency)
        expect(result.enabledModes).toEqual(expectedModes)
        expect(result.action).toBe(expectedAction)
    })
})

// =============================================================================
// groupGuestOrders - Groups by booker, ticketType, event, allergies, provenance
// =============================================================================

describe('groupGuestOrders', () => {

    const order = (overrides: {id?: number, allergies?: string[] | null, provenance?: string | null} = {}) => ({
        inhabitantId: 1, ticketType: TicketTypes.ADULT, dinnerEventId: 101, isGuestTicket: true,
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

    it('leaves the booker\'s own order out of the guest groups', () => {
        const groups = groupGuestOrders([order(), {...order(), isGuestTicket: false}])

        expect(Object.values(groups).map(group => group.length)).toEqual([1])
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

describe('order predicates', () => {
    // Released wins over bought; a person on the waiting list holds no order
    it.each([
        {desc: 'a released ticket for sale', order: {state: OrderStates.RELEASED, dinnerMode: DinnerModes.NONE}, queued: false, ticketState: TicketState.released},
        {desc: 'a ticket the close kept with Ingen', order: {state: OrderStates.CLOSED, dinnerMode: DinnerModes.NONE}, queued: false, ticketState: TicketState.released},
        {desc: 'a ticket the close kept with Spisesal', order: {state: OrderStates.CLOSED, dinnerMode: DinnerModes.DINEIN}, queued: false, ticketState: TicketState.normal},
        {desc: 'a bought ticket the close kept', order: {state: OrderStates.CLOSED, dinnerMode: DinnerModes.DINEIN, provenanceHousehold: 'S_22'}, queued: false, ticketState: TicketState.claimed},
        {desc: 'a booked ticket bought from another household', order: {state: OrderStates.BOOKED, dinnerMode: DinnerModes.DINEIN, provenanceHousehold: 'S_22'}, queued: false, ticketState: TicketState.claimed},
        {desc: 'a bought ticket released again', order: {state: OrderStates.RELEASED, dinnerMode: DinnerModes.NONE, provenanceHousehold: 'S_22'}, queued: false, ticketState: TicketState.released},
        {desc: 'a place on the waiting list', order: null, queued: true, ticketState: TicketState.queued},
        {desc: 'a bought ticket of a person also on the waiting list', order: {state: OrderStates.BOOKED, dinnerMode: DinnerModes.DINEIN, provenanceHousehold: 'S_22'}, queued: true, ticketState: TicketState.claimed},
        {desc: 'a booked ticket of its own household', order: {state: OrderStates.BOOKED, dinnerMode: DinnerModes.DINEIN}, queued: false, ticketState: TicketState.normal}
    ])('GIVEN $desc THEN the ticket is $ticketState', ({order, queued, ticketState}) => {
        expect(ticketStateOf(order && OrderFactory.defaultOrder(undefined, order), queued)).toBe(ticketState)
    })

    it.each([
        {state: OrderStates.BOOKED, pending: true},
        {state: OrderStates.RELEASED, pending: true},
        {state: OrderStates.CLOSED, pending: false},
        {state: OrderStates.CANCELLED, pending: false}
    ])('GIVEN an order $state THEN it waits for the close: $pending', ({state, pending}) => {
        expect(isPendingOrder(OrderFactory.defaultOrder(undefined, {state}))).toBe(pending)
    })
})

describe('supplyStateOf', () => {
    it.each([
        {desc: 'tickets for sale and a waiting list', counts: {...EMPTY_RELEASED_TICKET_COUNTS, total: 1, queued: 8}, supply: SupplyState.FOR_SALE_AND_WAITLIST},
        {desc: 'tickets for sale', counts: {...EMPTY_RELEASED_TICKET_COUNTS, total: 1}, supply: SupplyState.FOR_SALE},
        {desc: 'a waiting list', counts: {...EMPTY_RELEASED_TICKET_COUNTS, queued: 8}, supply: SupplyState.WAITLIST},
        {desc: 'neither', counts: EMPTY_RELEASED_TICKET_COUNTS, supply: SupplyState.NONE}
    ])('GIVEN a locked dinner with $desc THEN its supply is $supply', ({counts, supply}) => {
        expect(supplyStateOf(counts)).toBe(supply)
    })
})

// A place on the waiting list in the line of its ticket type; an entry whose ticket price is gone has its number alone
describe('formatPlace', () => {
    it.each([
        {position: 2, ticketType: TicketTypes.ADULT, place: 'Voksen #2'},
        {position: 3, ticketType: TicketTypes.CHILD, place: 'Barn #3'},
        {position: 1, ticketType: TicketTypes.BABY, place: 'Baby #1'},
        {position: 4, ticketType: null, place: '#4'}
    ])('place $position in the line of $ticketType reads "$place"', ({position, ticketType, place}) => {
        expect(formatPlace(position, ticketType)).toBe(place)
    })
})

// A dinner's name: its menu title, else the dinner itself while the chef has written no menu
describe('formatDinnerName', () => {
    it.each([
        {desc: 'a menu title', menuTitle: 'Lasagne', name: 'Lasagne'},
        {desc: 'a menu title with spaces around it', menuTitle: '  Lasagne ', name: 'Lasagne'},
        {desc: 'an empty menu title', menuTitle: '', name: 'Fællesspisning'},
        {desc: 'a menu title of spaces', menuTitle: '   ', name: 'Fællesspisning'}
    ])('GIVEN $desc THEN the dinner reads "$name"', ({menuTitle, name}) => {
        expect(formatDinnerName({menuTitle})).toBe(name)
    })
})

// =============================================================================
// Action Preview - Show users what will happen before save
// =============================================================================

describe('Action Preview', () => {
    const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
    const DM = DinnerModeSchema.enum
    const OS = OrderStateSchema.enum

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

    // Empty buckets helper
    const emptyBuckets = (): OrderBucketResult<DesiredOrder> => emptyOrderBuckets<DesiredOrder>()

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
    const {OrderAuditActionSchema, OrderAuditSourceSchema, OrderAuditChangeSchema, OrderStateSchema, TicketTypeSchema, DinnerModeSchema, TicketChangeKindSchema, createOrderAuditData} = useBookingValidation()
    const Audit = OrderAuditActionSchema.enum
    const Change = OrderAuditChangeSchema.enum
    const Source = OrderAuditSourceSchema.enum
    const State = OrderStateSchema.enum
    const Mode = DinnerModeSchema.enum
    const Kind = TicketChangeKindSchema.enum
    const TicketType = TicketTypeSchema.enum
    const counts = OrderFactory.ticketCounts
    // Ticket price ids: 1 adult, 2 child, 3 baby; 9 is a price the season no longer names
    const PRICES: Record<number, {ticketType: TicketType, portions: number, price: number}> = {
        1: {ticketType: TicketType.ADULT, portions: 1, price: 5000},
        2: {ticketType: TicketType.CHILD, portions: 0.5, price: 2500},
        3: {ticketType: TicketType.BABY, portions: 0, price: 0}
    }
    const UNNAMED_PRICE = {id: 9, price: 4000}
    const ticketPriceOf = (ticketPriceId: number) => PRICES[ticketPriceId] ?? null
    const priceOf = (ticketPriceId: number) => PRICES[ticketPriceId]?.price ?? UNNAMED_PRICE.price
    const SYSTEM = 99
    // Household n is S_n and its user is user n
    const shortNameOf = (householdId: number) => `S_${householdId}`
    // The buyer of household n eats as inhabitant 200 + n
    const buyerInhabitant = (householdId: number) => 200 + householdId
    const householdOfInhabitant = (inhabitantId: number) => ({id: inhabitantId - 200, shortName: shortNameOf(inhabitantId - 200)})
    const at =(minutes: number, seconds = 0) => new Date(2026, 3, 2, 20, minutes, seconds)

    type Ticket = {id: number, inhabitantId: number, ticketPriceId: number, householdId: number, isGuestTicket?: boolean}
    const ticket = (id: number, ticketPriceId: number, householdId: number): Ticket => ({id, inhabitantId: 100 + id, ticketPriceId, householdId})
    const {legacyAuditData} = OrderFactory

    let rowId = 0
    const historyRow = (action: OrderAuditAction, actor: number | null, timestamp: Date, orderId: number | null, inhabitantId: number, auditData: string) =>
        OrderFactory.defaultOrderHistoryDisplay(undefined, {
            id: ++rowId, orderId, inhabitantId, dinnerEventId: 1, action, timestamp, auditData,
            performedByUserId: actor, performedByUser: actor === null ? null : {id: actor, email: `user${actor}@example.com`}
        })
    const orderDataOf = (order: Ticket, actor: number | null) => OrderFactory.defaultOrderCreateWithPrice(order.householdId, {
        dinnerEventId: 1, inhabitantId: order.inhabitantId, bookedByUserId: actor, ticketPriceId: order.ticketPriceId, priceAtBooking: priceOf(order.ticketPriceId),
        dinnerMode: Mode.DINEIN, state: State.BOOKED, isGuestTicket: order.isGuestTicket ?? false
    })
    const snapshotOf = (order: Ticket, state: OrderState): OrderSnapshot => OrderFactory.defaultOrderSnapshot({
        id: order.id, inhabitantId: order.inhabitantId, dinnerEventId: 1, ticketPriceId: order.ticketPriceId, priceAtBooking: priceOf(order.ticketPriceId),
        dinnerMode: Mode.DINEIN, state, isGuestTicket: order.isGuestTicket ?? false, inhabitantNameWithInitials: 'A. B.',
        householdShortname: shortNameOf(order.householdId), householdId: order.householdId
    })
    // A legacy booking wrote the order's data without its id; the row's order id turns null once the order is deleted
    const booked = (order: Ticket, actor: number, timestamp: Date, {action = Audit.USER_BOOKED, deletedLater = false, source = Source['user-booking']}: {action?: OrderAuditAction, deletedLater?: boolean, source?: OrderAuditSource} = {}) =>
        historyRow(action, actor, timestamp, deletedLater ? null : order.id, order.inhabitantId, legacyAuditData.creation(source, orderDataOf(order, actor)))
    // A deletion and a claim write the order as it stood before them
    const deleted = (order: Ticket, actor: number | null, timestamp: Date, action: OrderAuditAction = Audit.USER_CANCELLED, state: OrderState = State.BOOKED) =>
        historyRow(action, actor, timestamp, null, order.inhabitantId, legacyAuditData.snapshot(snapshotOf(order, state)))
    const claimed = (order: Ticket, buyer: number, timestamp: Date) =>
        historyRow(Audit.USER_CLAIMED, buyer, timestamp, order.id, buyerInhabitant(buyer), legacyAuditData.snapshot(snapshotOf(order, State.RELEASED)))
    // A legacy batch update wrote the new scalars, the price row only when it changed
    const updated = (action: OrderAuditAction, order: Ticket, actor: number, timestamp: Date,
                     {state = State.BOOKED, dinnerMode = Mode.DINEIN, ticketPriceId = null}: {state?: OrderState, dinnerMode?: DinnerMode, ticketPriceId?: number | null} = {}) =>
        historyRow(action, actor, timestamp, order.id, order.inhabitantId, legacyAuditData.update({state, dinnerMode, ticketPriceId, priceAtBooking: ticketPriceId === null ? null : priceOf(ticketPriceId)}))

    const figures = ({counts, portions, revenue}: TicketChange) => ({counts, portions, revenue})
    // The tickets, kuverter and revenue of the tickets the dinner is paid for
    const paidForFigures = (paidFor: readonly Ticket[]) => ({
        counts: Object.fromEntries(TicketTypeSchema.options.map(type => [type, paidFor.filter(order => PRICES[order.ticketPriceId]!.ticketType === type).length])),
        portions: sumBy([...paidFor], order => PRICES[order.ticketPriceId]!.portions),
        revenue: sumBy([...paidFor], order => priceOf(order.ticketPriceId))
    })

    it('GIVEN a dinner\'s history from the system\'s bookings to the close WHEN replaying THEN a line holds one actor\'s ticket events within one minute and the last line holds the tickets and kuverter paid for', () => {
        const {replayTicketChanges} = useBooking()
        const [o1, o2, o3, o4, o5, o6, o7, o8, o9] = [
            ticket(1, 1, 31), ticket(2, 2, 31), ticket(3, 1, 22), ticket(4, 2, 22), ticket(5, 1, 14),
            ticket(6, 3, 31), ticket(7, 1, 31), ticket(8, 2, 22), ticket(9, 2, 31)
        ] as const
        const o4AsAdult = {...o4, ticketPriceId: 1}
        const paidFor = [o1, o3, o4AsAdult, o5, o6, o7, o8, o9]
        const history = [
            // One system run books across two households
            ...[o1, o2, o3, o4].map(order => booked(order, SYSTEM, at(0), {action: Audit.SYSTEM_CREATED})),
            booked(o5, 14, at(10)),
            // One power mode save: an eating mode switch, a cancellation and a booking
            updated(Audit.USER_BOOKED, o1, 31, at(20, 0), {dinnerMode: Mode.TAKEAWAY}),
            deleted(o2, 31, at(20, 10)),
            booked(o6, 31, at(20, 20)),
            // Two users within one minute, interleaved
            booked(o7, 31, at(30, 0)),
            booked(o8, 22, at(30, 20)),
            booked(o9, 31, at(30, 40)),
            updated(Audit.USER_BOOKED, o4, 22, at(40), {ticketPriceId: o4AsAdult.ticketPriceId}),
            updated(Audit.USER_BOOKED, o5, 14, at(45), {dinnerMode: Mode.TAKEAWAY}),
            updated(Audit.SYSTEM_UPDATED, o3, SYSTEM, at(50), {state: State.RELEASED, dinnerMode: Mode.NONE}),
            claimed(o3, 14, at(60)),
            ...paidFor.map(order => updated(Audit.SYSTEM_UPDATED, order, SYSTEM, at(120), {state: State.CLOSED}))
        ]

        const lines = replayTicketChanges(history, ticketPriceOf, SYSTEM, shortNameOf, householdOfInhabitant)

        expect(lines.map(({performedByUserId, bySystem, households, events}) => ({performedByUserId, bySystem, households: [...households].sort(), events}))).toEqual([
            {performedByUserId: SYSTEM, bySystem: true, households: ['S_22', 'S_31'], events: [{change: Kind.BOOK, tickets: counts(2, 2, 0)}]},
            {performedByUserId: 14, bySystem: false, households: ['S_14'], events: [{change: Kind.BOOK, tickets: counts(1, 0, 0)}]},
            {performedByUserId: 31, bySystem: false, households: ['S_31'], events: [{change: Kind.BOOK, tickets: counts(0, 0, 1)}, {change: Kind.CANCEL, tickets: counts(0, 1, 0)}]},
            {performedByUserId: 22, bySystem: false, households: ['S_22'], events: [{change: Kind.BOOK, tickets: counts(0, 1, 0)}]},
            {performedByUserId: 31, bySystem: false, households: ['S_31'], events: [{change: Kind.BOOK, tickets: counts(1, 1, 0)}]},
            {performedByUserId: 22, bySystem: false, households: ['S_22'], events: [{change: Kind.CHANGE_PRICE, tickets: counts(1, 0, 0), from: counts(0, 1, 0)}]},
            {performedByUserId: SYSTEM, bySystem: true, households: ['S_22'], events: [{change: Kind.RELEASE, tickets: counts(1, 0, 0)}]},
            {performedByUserId: 14, bySystem: false, households: ['S_14'], events: [{change: Kind.BUY, tickets: counts(1, 0, 0), seller: shortNameOf(o3.householdId)}]},
            {performedByUserId: SYSTEM, bySystem: true, households: ['S_14', 'S_22', 'S_31'], events: [{change: Kind.CLOSE, tickets: counts(5, 2, 1)}]}
        ])

        const [, , , , beforeTypeChange, typeChange, release, sale, close] = lines
        // A release and a sale leave what the dinner is paid for; a ticket type change moves the kuverter and the revenue
        expect(figures(release!)).toEqual(figures(typeChange!))
        expect(figures(sale!)).toEqual(figures(typeChange!))
        expect(typeChange!.portions - beforeTypeChange!.portions).toBe(PRICES[1]!.portions - PRICES[2]!.portions)
        expect(typeChange!.revenue - beforeTypeChange!.revenue).toBe(PRICES[1]!.price - PRICES[2]!.price)
        expect(figures(close!)).toEqual(paidForFigures(paidFor))
    })

    it('GIVEN a release and a reclaim written by the scaffold\'s batch update WHEN replaying THEN the lines name the ticket and its household, and the ticket stays paid', () => {
        const {replayTicketChanges} = useBooking()
        const child = ticket(2, 2, 22)
        const lines = replayTicketChanges([
            booked(child, 22, at(1)),
            updated(Audit.USER_CANCELLED, child, 22, at(2), {state: State.RELEASED, dinnerMode: Mode.NONE}),
            updated(Audit.USER_BOOKED, child, 22, at(3))
        ], ticketPriceOf, SYSTEM, shortNameOf)
        expect(lines.map(line => line.events)).toEqual([
            [{change: Kind.BOOK, tickets: counts(0, 1, 0)}],
            [{change: Kind.RELEASE, tickets: counts(0, 1, 0)}],
            [{change: Kind.RECLAIM, tickets: counts(0, 1, 0)}]
        ])
        expect(lines.map(line => line.households)).toEqual([['S_22'], ['S_22'], ['S_22']])
        expect(lines.map(figures)).toEqual(Array(3).fill({counts: counts(0, 1, 0), portions: PRICES[2]!.portions, revenue: PRICES[2]!.price}))
    })

    // A place on the waiting list and a cancellation of nothing booked write rows whose snapshot names no order
    it('GIVEN a booked adult whose guest joins, changes and leaves the waiting list WHEN replaying THEN the guest\'s rows are no ticket events and the adult\'s ticket stays held', () => {
        const {replayTicketChanges} = useBooking()
        const adult = ticket(1, 1, 22)
        const guestPlace = (action: OrderAuditAction, timestamp: Date) => historyRow(action, 22, timestamp, null, adult.inhabitantId,
            legacyAuditData.snapshot({...snapshotOf({...adult, isGuestTicket: true}, State.BOOKED), id: null}))

        const lines = replayTicketChanges([
            booked(adult, 22, at(1)),
            guestPlace(Audit.USER_BOOKED, at(2)),
            guestPlace(Audit.USER_BOOKED, at(3)),
            guestPlace(Audit.USER_CANCELLED, at(4))
        ], ticketPriceOf, SYSTEM, shortNameOf)

        expect(lines.map(line => [line.events, figures(line)])).toEqual([
            [[{change: Kind.BOOK, tickets: counts(1, 0, 0)}], {counts: counts(1, 0, 0), portions: PRICES[1]!.portions, revenue: PRICES[1]!.price}]
        ])
    })

    it('GIVEN a ticket released by one household and bought by another WHEN replaying THEN the sale and the close name the buyer\'s household', () => {
        const {replayTicketChanges} = useBooking()
        const child = ticket(2, 2, 22)
        const lines = replayTicketChanges([
            booked(child, 22, at(1)),
            updated(Audit.USER_CANCELLED, child, 22, at(2), {state: State.RELEASED, dinnerMode: Mode.NONE}),
            claimed(child, 14, at(3)),
            updated(Audit.SYSTEM_UPDATED, child, SYSTEM, at(4), {state: State.CLOSED})
        ], ticketPriceOf, SYSTEM, shortNameOf, householdOfInhabitant)
        expect(lines.map(line => [line.events.map(event => event.change), line.households])).toEqual([
            [[Kind.BOOK], ['S_22']],
            [[Kind.RELEASE], ['S_22']],
            [[Kind.BUY], ['S_14']],
            [[Kind.CLOSE], ['S_14']]
        ])
    })

    it('GIVEN one user buying, within one minute, tickets released by two households WHEN replaying THEN each sale names its seller, the two sellers stay two events and one seller\'s tickets add up', () => {
        const {replayTicketChanges} = useBooking()
        const [adultOf22, adultOf32, childOf22] = [ticket(1, 1, 22), ticket(2, 1, 32), ticket(3, 2, 22)]
        const forSale = [adultOf22, adultOf32, childOf22]
        const lines = replayTicketChanges([
            ...forSale.map(order => booked(order, order.householdId, at(0))),
            ...forSale.map(order => updated(Audit.USER_CANCELLED, order, order.householdId, at(10), {state: State.RELEASED, dinnerMode: Mode.NONE})),
            ...forSale.map((order, index) => claimed(order, 14, at(20, index * 10)))
        ], ticketPriceOf, SYSTEM, shortNameOf, householdOfInhabitant)

        expect(lines.at(-1)).toMatchObject({performedByUserId: 14, households: ['S_14'], events: [
            {change: Kind.BUY, tickets: counts(1, 1, 0), seller: shortNameOf(22)},
            {change: Kind.BUY, tickets: counts(1, 0, 0), seller: shortNameOf(32)}
        ]})
    })

    it.each([
        {desc: 'a cancellation before the deadline', action: Audit.USER_CANCELLED, actor: 31, bySystem: false},
        {desc: 'a system deletion before the deadline', action: Audit.SYSTEM_DELETED, actor: null, bySystem: true}
    ])('GIVEN a booked ticket and $desc WHEN replaying THEN the ticket, its kuverter and its revenue leave', ({action, actor, bySystem}) => {
        const {replayTicketChanges} = useBooking()
        const adult = ticket(1, 1, 31)
        const lines = replayTicketChanges([booked(adult, 31, at(0)), deleted(adult, actor, at(5), action)], ticketPriceOf, SYSTEM, shortNameOf, householdOfInhabitant, at(30))
        expect(lines.at(-1)).toMatchObject({
            performedByUserId: actor ?? SYSTEM, bySystem, households: ['S_31'],
            events: [{change: Kind.CANCEL, tickets: counts(1, 0, 0)}], counts: counts(0, 0, 0), portions: 0, revenue: 0
        })
    })

    // After the booking deadline only the admin's correction deletes an order; a release keeps the ticket paid
    describe('after the booking deadline', () => {
        const DEADLINE = at(30)
        const ADMIN = 1
        const adult = ticket(1, 1, 22)
        const child = ticket(2, 2, 22)
        const release = updated(Audit.USER_CANCELLED, child, 22, at(32), {state: State.RELEASED, dinnerMode: Mode.NONE})

        it.each([
            {desc: 'a release and the admin\'s deletion of the released ticket', rows: [release, deleted(child, ADMIN, at(35), Audit.USER_CANCELLED, State.RELEASED)],
                kinds: [[Kind.BOOK], [Kind.RELEASE], [Kind.ADMIN_CANCEL]], paidFor: [adult]},
            {desc: 'a cancellation before the deadline', rows: [deleted(child, 22, at(10))],
                kinds: [[Kind.BOOK], [Kind.CANCEL]], paidFor: [adult]},
            {desc: 'a release alone', rows: [release],
                kinds: [[Kind.BOOK], [Kind.RELEASE]], paidFor: [adult, child]}
        ])('GIVEN two booked tickets and $desc WHEN replaying THEN the lines read $kinds and the last holds what is paid for', ({rows, kinds, paidFor}) => {
            const {replayTicketChanges} = useBooking()
            const lines = replayTicketChanges([booked(adult, 22, at(0)), booked(child, 22, at(0)), ...rows], ticketPriceOf, SYSTEM, shortNameOf, householdOfInhabitant, DEADLINE)

            expect(lines.map(line => line.events.map(event => event.change))).toEqual(kinds)
            expect(figures(lines.at(-1)!)).toEqual(paidForFigures(paidFor))
        })

        // After the deadline a user releases instead of deleting: a user-mode deletion then is the admin's correction
        it.each([
            {desc: 'a system run\'s deletion after the deadline', action: Audit.SYSTEM_DELETED, actor: null, timestamp: at(35), kind: Kind.CANCEL},
            {desc: 'a user-mode deletion after the deadline', action: Audit.USER_CANCELLED, actor: ADMIN, timestamp: at(35), kind: Kind.ADMIN_CANCEL},
            {desc: 'a user-mode deletion before the deadline', action: Audit.USER_CANCELLED, actor: 22, timestamp: at(10), kind: Kind.CANCEL}
        ])('GIVEN a booked ticket and $desc WHEN replaying THEN the deletion reads $kind', ({action, actor, timestamp, kind}) => {
            const {replayTicketChanges} = useBooking()
            const lines = replayTicketChanges([booked(child, 22, at(0)), deleted(child, actor, timestamp, action)], ticketPriceOf, SYSTEM, shortNameOf, householdOfInhabitant, DEADLINE)

            expect(lines.at(-1)!.events).toEqual([{change: kind, tickets: counts(0, 1, 0)}])
        })

        it('GIVEN the admin\'s deletion of a released ticket WHEN replaying THEN one event takes the ticket off the counts, the kuverter and the revenue', () => {
            const {replayTicketChanges} = useBooking()
            const lines = replayTicketChanges([booked(adult, 22, at(0)), booked(child, 22, at(0)), release, deleted(child, ADMIN, at(35), Audit.USER_CANCELLED, State.RELEASED)],
                ticketPriceOf, SYSTEM, shortNameOf, householdOfInhabitant, DEADLINE)
            const [, released, adminCancel] = lines

            expect(adminCancel).toMatchObject({performedByUserId: ADMIN, households: ['S_22'], events: [{change: Kind.ADMIN_CANCEL, tickets: counts(0, 1, 0)}]})
            expect(released!.revenue - adminCancel!.revenue).toBe(PRICES[2]!.price)
            expect(released!.portions - adminCancel!.portions).toBe(PRICES[2]!.portions)
        })
    })

    it('GIVEN the chef\'s extra portions for the first in line WHEN replaying THEN one line reads them as extra portions and the tickets, kuverter and revenue rise', () => {
        const {replayTicketChanges} = useBooking()
        const CHEF = 7
        const adult = ticket(1, 1, 31)
        const firstInLine = [ticket(5, 1, 14), ticket(6, 2, 22)]
        const lines = replayTicketChanges([
            booked(adult, 31, at(0)),
            ...firstInLine.map(order => booked(order, CHEF, at(40), {action: Audit.SYSTEM_CREATED, source: Source['waitlist-assignment']}))
        ], ticketPriceOf, SYSTEM, shortNameOf, householdOfInhabitant)
        const [before, extra] = lines

        expect(lines).toHaveLength(2)
        expect(extra).toMatchObject({performedByUserId: CHEF, households: ['S_14', 'S_22'], events: [{change: Kind.EXTRA_PORTIONS, tickets: counts(1, 1, 0)}], counts: counts(2, 1, 0)})
        expect(extra!.revenue - before!.revenue).toBe(sumBy(firstInLine, order => priceOf(order.ticketPriceId)))
        expect(extra!.portions - before!.portions).toBe(sumBy(firstInLine, order => PRICES[order.ticketPriceId]!.portions))
    })

    it('GIVEN rows out of order and an eating mode switch WHEN replaying THEN time order rules and the switch is no line', () => {
        const {replayTicketChanges} = useBooking()
        const adult = ticket(1, 1, 31)
        const lines = replayTicketChanges([updated(Audit.SYSTEM_UPDATED, adult, SYSTEM, at(2), {dinnerMode: Mode.TAKEAWAY}), booked(adult, 31, at(0))], ticketPriceOf, SYSTEM, shortNameOf)
        expect(lines.map(line => line.events)).toEqual([[{change: Kind.BOOK, tickets: counts(1, 0, 0)}]])
    })

    it('GIVEN a ticket price the season no longer names WHEN replaying THEN the line carries revenue but no type or kuverter', () => {
        const {replayTicketChanges} = useBooking()
        const lines = replayTicketChanges([booked(ticket(1, UNNAMED_PRICE.id, 31), 31, at(0))], ticketPriceOf, SYSTEM, shortNameOf)
        expect(lines[0]).toMatchObject({events: [{change: Kind.BOOK, tickets: counts(0, 0, 0)}], counts: counts(0, 0, 0), portions: 0, revenue: UNNAMED_PRICE.price})
    })

    it('GIVEN a booking row WHEN replaying THEN the household comes from its id and the ticket counts', () => {
        const {replayTicketChanges} = useBooking()
        const lines = replayTicketChanges([booked(ticket(10, 1, 7), 7, at(1))], ticketPriceOf, SYSTEM, shortNameOf)
        expect(lines[0]).toMatchObject({households: ['S_7'], counts: counts(1, 0, 0), revenue: PRICES[1]!.price})
    })

    it('GIVEN an order deleted later, its booking row without an order id WHEN replaying THEN the deletion finds it by inhabitant', () => {
        const {replayTicketChanges} = useBooking()
        const adult = ticket(10, 1, 7)
        const lines = replayTicketChanges([booked(adult, 7, at(1), {deletedLater: true}), deleted(adult, 7, at(2))], ticketPriceOf, SYSTEM, shortNameOf)
        expect(lines.map(line => [line.events.map(event => event.change), line.counts.ADULT, line.revenue])).toEqual([[[Kind.BOOK], 1, PRICES[1]!.price], [[Kind.CANCEL], 0, 0]])
    })

    it('GIVEN the close\'s row with scalars only WHEN replaying THEN it is the close and keeps the tickets', () => {
        const {replayTicketChanges} = useBooking()
        const adult = ticket(10, 1, 7)
        const lines = replayTicketChanges([booked(adult, 7, at(1)), updated(Audit.SYSTEM_UPDATED, adult, SYSTEM, at(2), {state: State.CLOSED})], ticketPriceOf, SYSTEM, shortNameOf)
        expect(lines.at(-1)).toMatchObject({bySystem: true, events: [{change: Kind.CLOSE, tickets: counts(1, 0, 0)}], counts: counts(1, 0, 0), revenue: PRICES[1]!.price})
    })

    // One ticket's life as the writers leave it: in the audit format, and in the shapes written before it. A sale and a
    // deletion keep the order as it stood before them
    const WRITTEN = [
        {
            format: 'the audit format',
            creation: (order: Ticket, source: OrderAuditSource) => createOrderAuditData(Change.BOOK, snapshotOf(order, State.BOOKED), source),
            update: (change: OrderAuditChange, order: Ticket, state: OrderState) => createOrderAuditData(change, snapshotOf(order, state)),
            asItStood: (change: OrderAuditChange, order: Ticket, state: OrderState) => createOrderAuditData(change, snapshotOf(order, state))
        },
        {
            format: 'the legacy shapes',
            creation: (order: Ticket, source: OrderAuditSource) => legacyAuditData.creation(source, orderDataOf(order, null)),
            update: (change: OrderAuditChange, order: Ticket, state: OrderState) => legacyAuditData.update({
                state, dinnerMode: state === State.RELEASED ? Mode.NONE : Mode.DINEIN,
                ticketPriceId: change === Change.CHANGE_PRICE ? order.ticketPriceId : null,
                priceAtBooking: change === Change.CHANGE_PRICE ? priceOf(order.ticketPriceId) : null
            }),
            asItStood: (_change: OrderAuditChange, order: Ticket, state: OrderState) => legacyAuditData.snapshot(snapshotOf(order, state))
        }
    ]

    it.each(WRITTEN)('GIVEN a ticket released and bought, and a second ticket changed to another price row and cancelled, written in $format WHEN replaying THEN the lines read the same events and households', ({creation, update, asItStood}) => {
        const {replayTicketChanges} = useBooking()
        const [adult, child] = [ticket(1, 1, 22), ticket(2, 2, 22)]
        const childAsAdult = {...child, ticketPriceId: adult.ticketPriceId}
        const bought = {...adult, inhabitantId: buyerInhabitant(14), householdId: 14}
        const lines = replayTicketChanges([
            historyRow(Audit.USER_BOOKED, 22, at(0), adult.id, adult.inhabitantId, creation(adult, Source['user-booking'])),
            // The child's order is deleted later: its rows have lost their order id
            historyRow(Audit.USER_BOOKED, 22, at(0), null, child.inhabitantId, creation(child, Source['user-booking'])),
            historyRow(Audit.USER_BOOKED, 22, at(10), null, child.inhabitantId, update(Change.CHANGE_PRICE, childAsAdult, State.BOOKED)),
            historyRow(Audit.USER_CANCELLED, 22, at(20), adult.id, adult.inhabitantId, update(Change.RELEASE, adult, State.RELEASED)),
            historyRow(Audit.USER_CLAIMED, 14, at(30), adult.id, bought.inhabitantId, asItStood(Change.BUY, adult, State.RELEASED)),
            historyRow(Audit.USER_CANCELLED, 22, at(40), null, child.inhabitantId, asItStood(Change.CANCEL, childAsAdult, State.BOOKED)),
            historyRow(Audit.SYSTEM_UPDATED, SYSTEM, at(120), adult.id, bought.inhabitantId, update(Change.CLOSE, bought, State.CLOSED))
        ], ticketPriceOf, SYSTEM, shortNameOf, householdOfInhabitant)

        expect(lines.map(({households, events}) => ({households, events}))).toEqual([
            {households: ['S_22'], events: [{change: Kind.BOOK, tickets: counts(1, 1, 0)}]},
            {households: ['S_22'], events: [{change: Kind.CHANGE_PRICE, tickets: counts(1, 0, 0), from: counts(0, 1, 0)}]},
            {households: ['S_22'], events: [{change: Kind.RELEASE, tickets: counts(1, 0, 0)}]},
            {households: ['S_14'], events: [{change: Kind.BUY, tickets: counts(1, 0, 0), seller: shortNameOf(adult.householdId)}]},
            {households: ['S_22'], events: [{change: Kind.CANCEL, tickets: counts(1, 0, 0)}]},
            {households: ['S_14'], events: [{change: Kind.CLOSE, tickets: counts(1, 0, 0)}]}
        ])
    })

    // A guest ticket is booked on its booker, so one person holds their own ticket and their guests' tickets
    describe('a person\'s own ticket and their guests\' tickets', () => {
        const PERSON = 131
        const own: Ticket = {...ticket(1, 1, 31), inhabitantId: PERSON}
        const guestAdult: Ticket = {...ticket(2, 1, 31), inhabitantId: PERSON, isGuestTicket: true}
        const guestChild: Ticket = {...ticket(3, 2, 31), inhabitantId: PERSON, isGuestTicket: true}
        const eventsAndCounts = (lines: TicketChange[]) => lines.map(line => ({events: line.events, counts: line.counts}))

        it('GIVEN the guest orders deleted later, written in the audit format WHEN replaying THEN each deletion takes its own ticket by order id', () => {
            const {replayTicketChanges} = useBooking()
            const bookingOf = (order: Ticket, orderId: number | null) =>
                historyRow(Audit.USER_BOOKED, 31, at(0), orderId, PERSON, createOrderAuditData(Change.BOOK, snapshotOf(order, State.BOOKED), Source['user-booking']))
            const cancellationOf = (order: Ticket, timestamp: Date) =>
                historyRow(Audit.USER_CANCELLED, 31, timestamp, null, PERSON, createOrderAuditData(Change.CANCEL, snapshotOf(order, State.BOOKED)))
            const lines = replayTicketChanges([
                bookingOf(own, own.id), bookingOf(guestAdult, null), bookingOf(guestChild, null),
                cancellationOf(guestChild, at(10)), cancellationOf(guestAdult, at(20))
            ], ticketPriceOf, SYSTEM, shortNameOf)

            expect(eventsAndCounts(lines)).toEqual([
                {events: [{change: Kind.BOOK, tickets: counts(2, 1, 0)}], counts: counts(2, 1, 0)},
                {events: [{change: Kind.CANCEL, tickets: counts(0, 1, 0)}], counts: counts(2, 0, 0)},
                {events: [{change: Kind.CANCEL, tickets: counts(1, 0, 0)}], counts: counts(1, 0, 0)}
            ])
        })

        it('GIVEN the person\'s own order and a guest order booked in the legacy shape and both deleted later WHEN replaying THEN each booking holds its ticket and each deletion takes the ticket of its dinner and household with its price row', () => {
            const {replayTicketChanges} = useBooking()
            const lines = replayTicketChanges([
                ...[own, guestChild].map(order => booked(order, 31, at(0), {deletedLater: true})),
                deleted(guestChild, 31, at(10)),
                deleted(own, 31, at(20))
            ], ticketPriceOf, SYSTEM, shortNameOf)

            expect(eventsAndCounts(lines)).toEqual([
                {events: [{change: Kind.BOOK, tickets: counts(1, 1, 0)}], counts: counts(1, 1, 0)},
                {events: [{change: Kind.CANCEL, tickets: counts(0, 1, 0)}], counts: counts(1, 0, 0)},
                {events: [{change: Kind.CANCEL, tickets: counts(1, 0, 0)}], counts: counts(0, 0, 0)}
            ])
        })
    })

    it('GIVEN a legacy update of an order whose booking the history does not hold WHEN replaying THEN its line names the household as unknown', () => {
        const {replayTicketChanges} = useBooking()
        const lines = replayTicketChanges([updated(Audit.USER_BOOKED, ticket(4, 1, 22), 22, at(5), {ticketPriceId: 1})], ticketPriceOf, SYSTEM, shortNameOf)
        expect(lines.map(line => line.households)).toEqual([[BOOKING_WORDS.unknownHousehold]])
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
