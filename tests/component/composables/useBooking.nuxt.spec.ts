import {describe, it, expect} from 'vitest'
import {addDays, differenceInDays, nextDay, type Day} from 'date-fns'
import {useBooking, DINNER_STEP_MAP, DinnerStepState, CONSUMABLE_DINNER_STATES, CLOSABLE_ORDER_STATES, decideOrderAction, resolveDesiredOrdersToBuckets, generateDesiredOrdersFromPreferences, resolveOrdersFromPreferencesToBuckets, getNewOrderAction, type OrderDecisionInput} from '~/composables/useBooking'
import {useBillingValidation} from '~/composables/useBillingValidation'
import {useBookingValidation, type OrderDisplay, type DinnerMode, type DesiredOrder} from '~/composables/useBookingValidation'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {WEEKDAYS, type WeekDayMap} from '~/types/dateTypes'

// Shared test constant: days offset for dinners before cancellation deadline
const FAR_FUTURE_DAYS = useAppConfig().theslope.defaultSeason.ticketIsCancellableDaysBefore + 20

// Helper: days from today to next occurrence of weekday (0=Sun..6=Sat), at least minDaysAhead from now
const today = new Date()
const daysToWeekday = (dayOfWeek: Day, minDaysAhead: number = FAR_FUTURE_DAYS): number =>
    differenceInDays(nextDay(addDays(today, minDaysAhead), dayOfWeek), today)

describe('useBooking', () => {
    const {
        buildDinnerUrl,
        createHeynaboEventPayload,
        HEYNABO_EVENT_TEMPLATE,
        canCancelDinner,
        getStepConfig,
        getDinnerStepState
    } = useBooking()

    const {deadlinesForSeason} = useSeason()
    const defaultDeadlines = deadlinesForSeason(SeasonFactory.defaultSeason())

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

            it.each([
                {field: 'status', expected: 'PUBLISHED'},
                {field: 'public', expected: false},
                {field: 'locationText', expected: 'Fælleshuset'},
                {field: 'guestsAllowed', expected: true},
                {field: 'takeAwayAllowed', expected: true},
                {field: 'commentsAllowed', expected: true},
                {field: 'visibleToEveryone', expected: true},
                {field: 'vegetarian', expected: false}
            ])('sets $field to $expected', ({field, expected}) => {
                const payload = createHeynaboEventPayload(futureDinnerEvent(), baseUrl)
                expect(payload[field as keyof typeof payload]).toBe(expected)
            })

            it.each([
                'type', 'groupId', 'locationId', 'minParticipants', 'maxParticipants'
            ])('sets %s to null', (field) => {
                const payload = createHeynaboEventPayload(futureDinnerEvent(), baseUrl)
                expect(payload[field as keyof typeof payload]).toBeNull()
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
            {state: 'SCHEDULED', expected: true, description: 'can cancel SCHEDULED dinners'},
            {state: 'ANNOUNCED', expected: true, description: 'can cancel ANNOUNCED dinners'},
            {state: 'CANCELLED', expected: false, description: 'cannot cancel already CANCELLED dinners'},
            {state: 'CONSUMED', expected: false, description: 'cannot cancel CONSUMED dinners'}
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
                state: 'SCHEDULED',
                date: futureDate(),
                totalCost: 0,
                expected: DinnerStepState.SCHEDULED
            },
            {
                description: 'returns ANNOUNCED for ANNOUNCED with open booking',
                state: 'ANNOUNCED',
                date: futureDate(),
                totalCost: 0,
                expected: DinnerStepState.ANNOUNCED
            },
            {
                description: 'returns BOOKING_CLOSED for ANNOUNCED with closed booking',
                state: 'ANNOUNCED',
                date: pastDate(),
                totalCost: 0,
                expected: DinnerStepState.BOOKING_CLOSED
            },
            {
                description: 'returns GROCERIES_DONE for ANNOUNCED with closed booking and groceries done',
                state: 'ANNOUNCED',
                date: pastDate(),
                totalCost: 10000,
                expected: DinnerStepState.GROCERIES_DONE
            },
            {
                description: 'returns CONSUMED for CONSUMED state',
                state: 'CONSUMED',
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

            const dinnerEvent = {state: 'SCHEDULED' as const, date: futureDate, totalCost: 0}
            expect(getStepConfig(dinnerEvent, defaultDeadlines).step).toBe(0)
        })
    })

    describe('State Constants', () => {
        it.each([
            {constant: CONSUMABLE_DINNER_STATES, included: ['SCHEDULED', 'ANNOUNCED'], excluded: ['CANCELLED', 'CONSUMED']},
            {constant: CLOSABLE_ORDER_STATES, included: ['BOOKED', 'RELEASED'], excluded: ['CANCELLED', 'CLOSED']}
        ])('$constant includes correct states and excludes others', ({constant, included, excluded}) => {
            expect(constant).toHaveLength(2)
            included.forEach(s => expect(constant).toContain(s))
            excluded.forEach(s => expect(constant).not.toContain(s))
        })
    })

    describe('getPastDinnerIds', () => {
        const {getPastDinnerIds} = useBooking()
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
        const {prepareTransactionData} = useBooking()
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
    })

    describe('buildOrderSnapshot', () => {
        const {buildOrderSnapshot} = useBooking()

        // Base order data reused across tests
        const baseOrder = () => ({
            id: 42,
            inhabitantId: 10,
            dinnerEventId: 5,
            ticketPriceId: 1,
            priceAtBooking: 5500,
            dinnerMode: 'DINEIN' as const,
            state: 'BOOKED' as const,
            inhabitant: {
                id: 10,
                heynaboId: 1001,
                householdId: 7,
                name: 'Anna',
                lastName: 'Berg Larsen',
                pictureUrl: null,
                allergies: [
                    {id: 1, inhabitantId: 10, allergyTypeId: 1, inhabitantComment: null, allergyType: {id: 1, name: 'Peanuts', description: 'Nut allergy', icon: '🥜'}, createdAt: new Date(), updatedAt: new Date()},
                    {id: 2, inhabitantId: 10, allergyTypeId: 2, inhabitantComment: null, allergyType: {id: 2, name: 'Gluten', description: 'Wheat allergy', icon: '🌾'}, createdAt: new Date(), updatedAt: new Date()}
                ]
            }
        })

        it('builds snapshot with all fields from order', () => {
            const snapshot = buildOrderSnapshot(baseOrder(), 'AR_7')

            expect(snapshot.id).toBe(42)
            expect(snapshot.inhabitantId).toBe(10)
            expect(snapshot.dinnerEventId).toBe(5)
            expect(snapshot.ticketPriceId).toBe(1)
            expect(snapshot.priceAtBooking).toBe(5500)
            expect(snapshot.dinnerMode).toBe('DINEIN')
            expect(snapshot.state).toBe('BOOKED')
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
            expect(snapshot.allergies).toEqual(['Peanuts', 'Gluten'])
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
            {state: 'BOOKED' as const},
            {state: 'RELEASED' as const},
            {state: 'CLOSED' as const}
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
    it.each([
        { canModify: true, hasReleased: false, expected: 'process' },
        { canModify: true, hasReleased: true, expected: 'process' },  // before deadline always wins
        { canModify: false, hasReleased: true, expected: 'claim' },
        { canModify: false, hasReleased: false, expected: null }
    ])('canModify=$canModify, hasReleased=$hasReleased → $expected', ({ canModify, hasReleased, expected }) => {
        expect(getNewOrderAction(canModify, hasReleased)).toBe(expected)
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
        hasReleasedTickets = false
    ): OrderDecisionInput => ({ desired, existing, beforeCancellationDeadline, canEditMode, hasReleasedTickets })

    describe('decision matrix (9 cases)', () => {
        it.each([
            // Case 1: No orderId + eating mode + before deadline → create (state: BOOKED)
            {
                desc: 'no orderId + DINEIN + before deadline → create BOOKED',
                desired: createDesired({ dinnerMode: DinnerMode.DINEIN }),
                existing: null,
                beforeDeadline: true,
                canEditMode: true,
                hasReleased: false,
                expectedBucket: 'create',
                expectedState: OrderState.BOOKED
            },
            // Case 2: No orderId + NONE → null (skip)
            {
                desc: 'no orderId + NONE → skip (null)',
                desired: createDesired({ dinnerMode: DinnerMode.NONE }),
                existing: null,
                beforeDeadline: true,
                canEditMode: true,
                hasReleased: false,
                expectedBucket: null,
                expectedState: null
            },
            // Case 3: No orderId + eating mode + after deadline + released available → claim
            {
                desc: 'no orderId + DINEIN + after deadline + hasReleased → claim BOOKED',
                desired: createDesired({ dinnerMode: DinnerMode.DINEIN }),
                existing: null,
                beforeDeadline: false,
                canEditMode: false,
                hasReleased: true,
                expectedBucket: 'claim',
                expectedState: OrderState.BOOKED
            },
            // Case 4: No orderId + eating mode + after deadline + no released → null (no capacity)
            {
                desc: 'no orderId + DINEIN + after deadline + !hasReleased → skip (null)',
                desired: createDesired({ dinnerMode: DinnerMode.DINEIN }),
                existing: null,
                beforeDeadline: false,
                canEditMode: false,
                hasReleased: false,
                expectedBucket: null,
                expectedState: null
            },
            // Case 5: orderId + NONE + before deadline → delete
            {
                desc: 'orderId + NONE + before deadline → delete',
                desired: createDesired({ orderId: 42, dinnerMode: DinnerMode.NONE }),
                existing: createExisting(),
                beforeDeadline: true,
                canEditMode: true,
                hasReleased: false,
                expectedBucket: 'delete',
                expectedState: undefined  // delete doesn't set state
            },
            // Case 6: orderId + NONE + after deadline → update (RELEASED)
            {
                desc: 'orderId + NONE + after deadline → update RELEASED',
                desired: createDesired({ orderId: 42, dinnerMode: DinnerMode.NONE }),
                existing: createExisting(),
                beforeDeadline: false,
                canEditMode: false,
                hasReleased: false,
                expectedBucket: 'update',
                expectedState: OrderState.RELEASED
            },
            // Case 7: orderId + RELEASED + eating mode → update (BOOKED, reclaim own)
            {
                desc: 'orderId + existing RELEASED + DINEIN → update BOOKED (reclaim)',
                desired: createDesired({ orderId: 42, dinnerMode: DinnerMode.DINEIN }),
                existing: createExisting({ state: OrderState.RELEASED }),
                beforeDeadline: false,
                canEditMode: false,
                hasReleased: false,
                expectedBucket: 'update',
                expectedState: OrderState.BOOKED
            },
            // Case 8a: orderId + eating mode + unchanged BOOKED → idempotent (preserves state)
            {
                desc: 'orderId + same mode + same price + BOOKED → idempotent preserves BOOKED',
                desired: createDesired({ orderId: 42, dinnerMode: DinnerMode.DINEIN, ticketPriceId: 1 }),
                existing: createExisting({ dinnerMode: DinnerMode.DINEIN, ticketPriceId: 1, state: OrderState.BOOKED }),
                beforeDeadline: true,
                canEditMode: true,
                hasReleased: false,
                expectedBucket: 'idempotent',
                expectedState: OrderState.BOOKED  // preserved from existing
            },
            // Case 8b: orderId + NONE unchanged on RELEASED → idempotent (preserves RELEASED state)
            {
                desc: 'orderId + NONE + RELEASED → idempotent preserves RELEASED',
                desired: createDesired({ orderId: 42, dinnerMode: DinnerMode.NONE, ticketPriceId: 1 }),
                existing: createExisting({ dinnerMode: DinnerMode.NONE, ticketPriceId: 1, state: OrderState.RELEASED }),
                beforeDeadline: false,  // after deadline
                canEditMode: false,
                hasReleased: false,
                expectedBucket: 'idempotent',
                expectedState: OrderState.RELEASED  // preserved from existing
            },
            // Case 9a: orderId + mode changed → update
            {
                desc: 'orderId + mode changed (DINEIN→TAKEAWAY) → update BOOKED',
                desired: createDesired({ orderId: 42, dinnerMode: DinnerMode.TAKEAWAY }),
                existing: createExisting({ dinnerMode: DinnerMode.DINEIN }),
                beforeDeadline: true,
                canEditMode: true,
                hasReleased: false,
                expectedBucket: 'update',
                expectedState: OrderState.BOOKED
            },
            // Case 9b: orderId + price changed → update
            {
                desc: 'orderId + price changed → update BOOKED',
                desired: createDesired({ orderId: 42, ticketPriceId: 2 }),
                existing: createExisting({ ticketPriceId: 1 }),
                beforeDeadline: true,
                canEditMode: true,
                hasReleased: false,
                expectedBucket: 'update',
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
                hasReleased: false,
                expectedBucket: 'update',
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
                hasReleased: false,
                expectedBucket: 'update',
                expectedState: OrderState.RELEASED
            }
        ])('$desc', ({ desired, existing, beforeDeadline, canEditMode, hasReleased, expectedBucket, expectedState }) => {
            const input = createInput(desired, existing, beforeDeadline, canEditMode, hasReleased)
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
            releasedKeys: new Set<string>(),
            expected: { create: 1, update: 0, delete: 0, idempotent: 0, claim: 0 }
        },
        {
            desc: 'existing matches incoming (idempotent)',
            desired: [createDesired(1, 101, { orderId: 42 })],
            existing: [createExisting(42, 1, 101)],
            releasedKeys: new Set<string>(),
            expected: { create: 0, update: 0, delete: 0, idempotent: 1, claim: 0 }
        },
        {
            desc: 'mode change → update',
            desired: [createDesired(1, 101, { orderId: 42, dinnerMode: DinnerMode.TAKEAWAY })],
            existing: [createExisting(42, 1, 101, { dinnerMode: DinnerMode.DINEIN })],
            releasedKeys: new Set<string>(),
            expected: { create: 0, update: 1, delete: 0, idempotent: 0, claim: 0 }
        },
        {
            desc: 'price change → update',
            desired: [createDesired(1, 101, { orderId: 42, ticketPriceId: 2 })],
            existing: [createExisting(42, 1, 101, { ticketPriceId: 1 })],
            releasedKeys: new Set<string>(),
            expected: { create: 0, update: 1, delete: 0, idempotent: 0, claim: 0 }
        },
        {
            desc: 'NONE before deadline → delete',
            desired: [createDesired(1, 101, { orderId: 42, dinnerMode: DinnerMode.NONE })],
            existing: [createExisting(42, 1, 101)],
            releasedKeys: new Set<string>(),
            expected: { create: 0, update: 0, delete: 1, idempotent: 0, claim: 0 }
        },
        {
            desc: 'mixed: create + idempotent',
            desired: [
                createDesired(1, 101, { orderId: 42 }),
                createDesired(2, 101)  // no orderId = new
            ],
            existing: [createExisting(42, 1, 101)],
            releasedKeys: new Set<string>(),
            expected: { create: 1, update: 0, delete: 0, idempotent: 1, claim: 0 }
        }
    ])('$desc', ({ desired, existing, releasedKeys, expected }) => {
        const result = resolveDesiredOrdersToBuckets(
            desired,
            existing,
            dinnerEventById,
            canModifyOrders,
            canEditDiningMode,
            DinnerMode,
            OrderState,
            releasedKeys
        )

        expect(result.create).toHaveLength(expected.create)
        expect(result.update).toHaveLength(expected.update)
        expect(result.delete).toHaveLength(expected.delete)
        expect(result.idempotent).toHaveLength(expected.idempotent)
        expect(result.claim).toHaveLength(expected.claim)
    })

    describe('claim bucket (after deadline with released tickets)', () => {
        // Past date - after all deadlines
        const pastDate = new Date()
        pastDate.setDate(pastDate.getDate() + 1)  // Tomorrow = after deadline

        const pastEventById = new Map([[201, { date: pastDate }]])
        const cannotModify = () => false
        const cannotEdit = () => false

        it.each([
            {
                desc: 'new order after deadline + released → claim',
                desired: [createDesired(1, 201)],
                existing: [],
                releasedKeys: new Set(['201-1']),  // eventId-priceId
                expected: { create: 0, claim: 1 }
            },
            {
                desc: 'new order after deadline + no released → skip',
                desired: [createDesired(1, 201)],
                existing: [],
                releasedKeys: new Set<string>(),
                expected: { create: 0, claim: 0 }
            },
            {
                desc: 'multiple new orders + released for one price → claim only matching',
                desired: [
                    createDesired(1, 201, { ticketPriceId: 1 }),
                    createDesired(2, 201, { ticketPriceId: 2 })
                ],
                existing: [],
                releasedKeys: new Set(['201-1']),  // Only price 1 has released
                expected: { create: 0, claim: 1 }
            }
        ])('$desc', ({ desired, existing, releasedKeys, expected }) => {
            const result = resolveDesiredOrdersToBuckets(
                desired,
                existing,
                pastEventById,
                cannotModify,
                cannotEdit,
                DinnerMode,
                OrderState,
                releasedKeys
            )

            expect(result.create).toHaveLength(expected.create)
            expect(result.claim).toHaveLength(expected.claim)
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
            new Set(),
            ticketPrices
        )

        expect(result).toHaveLength(3)
        expect(result.map(o => o.dinnerEventId).sort()).toEqual([101, 102, 103])
    })

    describe('excludedKeys handling', () => {
        const {OrderStateSchema} = useBookingValidation()
        const OrderState = OrderStateSchema.enum

        it.each([
            {desc: 'no existing → skip (dont recreate)', existingOrders: [], expectedEvents: [101, 103], expectedLength: 2},
            {desc: 'RELEASED → preserve (no reclaim, no delete)', existingOrders: [
                OrderFactory.defaultOrder(undefined, {id: 42, inhabitantId: 1, dinnerEventId: 102, state: OrderState.RELEASED, ticketPriceId: 1})
            ], expectedEvents: [101, 102, 103], expectedLength: 3}
        ])('$desc', ({existingOrders, expectedEvents, expectedLength}) => {
            const inhabitants = [createInhabitant(1, allDineIn)]
            const excludedKeys = new Set(['1-102'])

            const result = generateDesiredOrdersFromPreferences(
                inhabitants,
                dinnerEvents,
                existingOrders,
                excludedKeys,
                ticketPrices
            )

            expect(result).toHaveLength(expectedLength)
            expect(result.map(o => o.dinnerEventId).sort()).toEqual(expectedEvents)
        })

        it('preserves RELEASED order with correct state and orderId', () => {
            const inhabitants = [createInhabitant(1, allDineIn)]
            const excludedKeys = new Set(['1-102'])
            const releasedOrder = OrderFactory.defaultOrder(undefined, {
                id: 42, inhabitantId: 1, dinnerEventId: 102, state: OrderState.RELEASED, ticketPriceId: 1
            })

            const result = generateDesiredOrdersFromPreferences(
                inhabitants,
                dinnerEvents,
                [releasedOrder],
                excludedKeys,
                ticketPrices
            )

            const preserved = result.find(o => o.dinnerEventId === 102)
            expect(preserved?.orderId).toBe(42)
            expect(preserved?.state).toBe(OrderState.RELEASED)
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
            new Set(),
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
            new Set(),
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
            new Set(),
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
            new Set(),
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
            new Set(),
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
            const result = generateDesiredOrdersFromPreferences(inhabitants, dinnerEvents, existingOrders, new Set(), ticketPrices)

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
            cancelled: new Set<string>(),
            expected: {create: 3, delete: 0, update: 0, idempotent: 0}
        },
        {
            desc: 'recognizes matching orders as idempotent',
            inhabitants: [createInhabitant(1, allDineIn)],
            existing: [createOrder(1, 1, 101), createOrder(2, 1, 102), createOrder(3, 1, 103)],
            cancelled: new Set<string>(),
            expected: {create: 0, delete: 0, update: 0, idempotent: 3}
        },
        {
            desc: 'marks orders for deletion when preferences change to NONE',
            inhabitants: [createInhabitant(1, allNone)],
            existing: [createOrder(1, 1, 101), createOrder(2, 1, 102)],
            cancelled: new Set<string>(),
            expected: {create: 0, delete: 2, update: 0, idempotent: 0}
        },
        {
            desc: 'excludes user-cancelled bookings',
            inhabitants: [createInhabitant(1, allDineIn)],
            existing: [],
            cancelled: new Set(['1-102']),  // User cancelled dinner 102
            expected: {create: 2, delete: 0, update: 0, idempotent: 0}
        },
        {
            desc: 'handles empty household (no inhabitants)',
            inhabitants: [],
            existing: [],
            cancelled: new Set<string>(),
            expected: {create: 0, delete: 0, update: 0, idempotent: 0}
        },
        {
            desc: 'deletes orphan orders when inhabitants leave',
            inhabitants: [],
            existing: [createOrder(1, 99, 101), createOrder(2, 99, 102)],  // Orders for non-existent inhabitant
            cancelled: new Set<string>(),
            expected: {create: 0, delete: 2, update: 0, idempotent: 0}
        }
    ])('$desc', ({inhabitants, existing, cancelled, expected}) => {
        const result = resolveOrdersFromPreferencesToBuckets(
            testSeason,
            createHousehold(1, inhabitants),
            existing,
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
                new Set()
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
            new Set()
        )

        // Guest order should be idempotent, not deleted
        expect(result.idempotent).toHaveLength(1)
        expect(result.delete).toHaveLength(0)
    })

    describe('claim bucket (preference change after deadline with released tickets)', () => {
        // Tomorrow = after deadline. Use DINEIN for ALL days so weekday doesn't matter
        const tomorrowDinner = DinnerEventFactory.dinnerEventAt(301, 1)
        const pastDeadlineSeason = seasonWith([tomorrowDinner])
        const allDaysPrefs: DinnerMode[] = Array(7).fill(DinnerMode.DINEIN)
        const noDaysPrefs: DinnerMode[] = Array(7).fill(DinnerMode.NONE)

        it.each([
            {
                desc: 'preference change to DINEIN + released tickets → claim',
                prefs: allDaysPrefs,
                releasedKeys: new Set(['301-4']),  // eventId-priceId (4 = ADULT)
                expected: { create: 0, claim: 1 }
            },
            {
                desc: 'preference change to DINEIN + no released tickets → skip (no capacity)',
                prefs: allDaysPrefs,
                releasedKeys: new Set<string>(),
                expected: { create: 0, claim: 0 }
            },
            {
                desc: 'preference stays NONE + released tickets → no action',
                prefs: noDaysPrefs,
                releasedKeys: new Set(['301-4']),
                expected: { create: 0, claim: 0 }
            }
        ])('$desc', ({ prefs, releasedKeys, expected }) => {
            const household = createHousehold(1, [createInhabitant(1, prefs)])

            const result = resolveOrdersFromPreferencesToBuckets(
                pastDeadlineSeason,
                household,
                [],  // No existing orders
                new Set(),  // No cancelled keys
                releasedKeys
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
    const {getLockedFutureDinnerIds, computeLockStatus, countReleasedOrdersByDinner} = useBooking()
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
        describe.each([
            {
                name: 'marks locked dinners with released count',
                dinnerEvents: [makeEvent(1, 2), makeEvent(2, 5), makeEvent(3, 10)],
                lockedDays: 7,
                releasedCounts: new Map([[1, 3], [2, 1]]),
                expected: new Map([[1, 3], [2, 1]])
            },
            {
                name: 'defaults to 0 when no released count provided',
                dinnerEvents: [makeEvent(1, 2), makeEvent(2, 5)],
                lockedDays: 7,
                releasedCounts: undefined,
                expected: new Map([[1, 0], [2, 0]])
            },
            {
                name: 'excludes non-locked dinners',
                dinnerEvents: [makeEvent(1, 2), makeEvent(2, 10)],
                lockedDays: 5,
                releasedCounts: new Map([[1, 2], [2, 5]]),
                expected: new Map([[1, 2]])
            }
        ])('$name', ({dinnerEvents, lockedDays, releasedCounts, expected}) => {
            it('returns correct lock status map', () => {
                const deadlines = makeDeadlines(lockedDays)
                const result = computeLockStatus(dinnerEvents, deadlines, releasedCounts)
                expect(result).toEqual(expected)
            })
        })
    })
})

// =============================================================================
// getBookingOptions - UI counterpart to decideOrderAction
// =============================================================================

describe('getBookingOptions', () => {
    const {getBookingOptions} = useBooking()
    const {DinnerModeSchema, OrderStateSchema, DinnerStateSchema} = useBookingValidation()
    const DM = DinnerModeSchema.enum
    const OS = OrderStateSchema.enum
    const DS = DinnerStateSchema.enum

    const ALL = [DM.DINEIN, DM.DINEINLATE, DM.TAKEAWAY, DM.NONE]
    const EATING = [DM.DINEIN, DM.DINEINLATE, DM.TAKEAWAY]  // All modes except NONE (for claims)
    const DINEIN_NONE = [DM.DINEIN, DM.NONE]
    const DINEIN_ONLY = [DM.DINEIN]
    const NONE_ONLY = [DM.NONE]
    const EMPTY: typeof ALL = []

    it.each([
        // Cancelled/consumed dinner - no booking possible
        {desc: 'CANCELLED dinner', orderState: null, canModify: true, canEdit: true, dinnerState: DS.CANCELLED, hasReleased: false, expectedModes: EMPTY, expectedAction: null},
        {desc: 'CONSUMED dinner', orderState: null, canModify: true, canEdit: true, dinnerState: DS.CONSUMED, hasReleased: false, expectedModes: EMPTY, expectedAction: null},

        // BOOKED order
        {desc: 'BOOKED + canEdit=true', orderState: OS.BOOKED, canModify: false, canEdit: true, dinnerState: DS.ANNOUNCED, hasReleased: false, expectedModes: ALL, expectedAction: 'process'},
        {desc: 'BOOKED + canEdit=false', orderState: OS.BOOKED, canModify: false, canEdit: false, dinnerState: DS.ANNOUNCED, hasReleased: false, expectedModes: NONE_ONLY, expectedAction: 'process'},

        // RELEASED order (reclaim own)
        {desc: 'RELEASED + canEdit=true', orderState: OS.RELEASED, canModify: false, canEdit: true, dinnerState: DS.ANNOUNCED, hasReleased: false, expectedModes: ALL, expectedAction: 'process'},
        {desc: 'RELEASED + canEdit=false', orderState: OS.RELEASED, canModify: false, canEdit: false, dinnerState: DS.ANNOUNCED, hasReleased: false, expectedModes: DINEIN_NONE, expectedAction: 'process'},

        // No order - before deadline
        {desc: 'null + canModify=true', orderState: null, canModify: true, canEdit: true, dinnerState: DS.ANNOUNCED, hasReleased: false, expectedModes: ALL, expectedAction: 'process'},
        {desc: 'null + canModify=false + !hasReleased', orderState: null, canModify: false, canEdit: false, dinnerState: DS.ANNOUNCED, hasReleased: false, expectedModes: EMPTY, expectedAction: null},

        // No order - claim (after booking deadline, released available)
        {desc: 'claim + canEdit=true → all eating modes', orderState: null, canModify: false, canEdit: true, dinnerState: DS.ANNOUNCED, hasReleased: true, expectedModes: EATING, expectedAction: 'claim'},
        {desc: 'claim + canEdit=false → DINEIN only', orderState: null, canModify: false, canEdit: false, dinnerState: DS.ANNOUNCED, hasReleased: true, expectedModes: DINEIN_ONLY, expectedAction: 'claim'},

        // Edge: existing order ignores hasReleased (uses process, not claim)
        {desc: 'BOOKED ignores hasReleased', orderState: OS.BOOKED, canModify: false, canEdit: true, dinnerState: DS.ANNOUNCED, hasReleased: true, expectedModes: ALL, expectedAction: 'process'},
        {desc: 'RELEASED ignores hasReleased', orderState: OS.RELEASED, canModify: false, canEdit: false, dinnerState: DS.ANNOUNCED, hasReleased: true, expectedModes: DINEIN_NONE, expectedAction: 'process'},
    ])('$desc → modes=$expectedModes.length, action=$expectedAction', ({orderState, canModify, canEdit, dinnerState, hasReleased, expectedModes, expectedAction}) => {
        const result = getBookingOptions(orderState, canModify, canEdit, dinnerState, hasReleased)
        expect(result.enabledModes).toEqual(expectedModes)
        expect(result.action).toBe(expectedAction)
    })
})

// =============================================================================
// groupGuestOrders - Groups by booker, ticketType, event, allergies, provenance
// =============================================================================

describe('groupGuestOrders', () => {
    const {groupGuestOrders} = useBooking()

    const order = (overrides: {id?: number, allergies?: string[] | null, provenance?: string | null} = {}) => ({
        inhabitantId: 1, ticketType: 'ADULT', dinnerEventId: 101,
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
