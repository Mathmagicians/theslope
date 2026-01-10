import {describe, it, expect} from 'vitest'
import {useBooking, DINNER_STEP_MAP, DinnerStepState, CONSUMABLE_DINNER_STATES, CLOSABLE_ORDER_STATES} from '~/composables/useBooking'
import {useBillingValidation} from '~/composables/useBillingValidation'
import {useBookingValidation, type OrderDisplay, type OrderCreateWithPrice, type DinnerMode} from '~/composables/useBookingValidation'
import {useTicketPriceValidation, type TicketPrice} from '~/composables/useTicketPriceValidation'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import type {PruneAndCreateResult} from '~/utils/batchUtils'

const {saltedId} = testHelpers

describe('useBooking', () => {
    const {
        buildDinnerUrl,
        createHeynaboEventPayload,
        HEYNABO_EVENT_TEMPLATE,
        canCancelDinner,
        getStepConfig,
        getDinnerStepState,
        reconcileSingleDinnerUserBooking,
        buildBookingFeedback
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

    describe('reconcileSingleDinnerUserBooking', () => {
        const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
        const {TicketTypeSchema} = useTicketPriceValidation()

        // Shared test data generators
        const dinnerDate = new Date(2025, 5, 15) // June 15, 2025
        const dinnerId = 42
        const householdId = 1
        const userId = 99

        const defaultTicketPrices: TicketPrice[] = [
            {id: 1, seasonId: 1, ticketType: TicketTypeSchema.enum.ADULT, price: 4500, description: null, maximumAgeLimit: null},
            {id: 2, seasonId: 1, ticketType: TicketTypeSchema.enum.CHILD, price: 2500, description: null, maximumAgeLimit: 12},
            {id: 3, seasonId: 1, ticketType: TicketTypeSchema.enum.BABY, price: 0, description: null, maximumAgeLimit: 2}
        ]

        const adultInhabitant = {id: 10, birthDate: new Date(1985, 0, 1)} // 40 years old
        const childInhabitant = {id: 11, birthDate: new Date(2015, 0, 1)} // 10 years old

        // ticketPriceId must match age-based lookup: adult=1, child=2
        const ticketPriceForInhabitant = (inhabitantId: number) =>
            inhabitantId === adultInhabitant.id ? 1 : 2

        const existingOrder = (inhabitantId: number, overrides?: Partial<OrderDisplay>): OrderDisplay =>
            OrderFactory.defaultOrder('test', {
                id: saltedId(inhabitantId),
                dinnerEventId: dinnerId,
                inhabitantId,
                ticketPriceId: ticketPriceForInhabitant(inhabitantId),
                dinnerMode: DinnerModeSchema.enum.DINEIN,
                state: OrderStateSchema.enum.BOOKED,
                ...overrides
            })

        describe.each([
            {mode: 'NONE', expectedCreate: 0, expectedDelete: 0}, // nothing to delete when no orders exist
            {mode: 'DINEIN', expectedCreate: 2, expectedDelete: 0},
            {mode: 'TAKEAWAY', expectedCreate: 2, expectedDelete: 0},
            {mode: 'DINEINLATE', expectedCreate: 2, expectedDelete: 0}
        ])('$mode mode without existing orders', ({mode, expectedCreate, expectedDelete}) => {
            it(`creates ${expectedCreate} orders and deletes ${expectedDelete}`, () => {
                const result = reconcileSingleDinnerUserBooking(
                    [adultInhabitant, childInhabitant],
                    [], // no existing orders
                    mode as DinnerMode,
                    dinnerId,
                    dinnerDate,
                    defaultTicketPrices,
                    householdId,
                    userId
                )

                expect(result.create).toHaveLength(expectedCreate)
                expect(result.delete).toHaveLength(expectedDelete)
                expect(result.update).toHaveLength(0)
                expect(result.idempotent).toHaveLength(0)
            })
        })

        describe.each([
            {mode: 'NONE', expectedCreate: 0, expectedDelete: 2, expectedIdempotent: 0},
            {mode: 'DINEIN', expectedCreate: 0, expectedDelete: 0, expectedIdempotent: 2},
            {mode: 'TAKEAWAY', expectedCreate: 0, expectedDelete: 0, expectedIdempotent: 0, expectedUpdate: 2}
        ])('$mode mode with existing DINEIN orders', ({mode, expectedCreate, expectedDelete, expectedIdempotent, expectedUpdate = 0}) => {
            it(`creates ${expectedCreate}, deletes ${expectedDelete}, idempotent ${expectedIdempotent}, update ${expectedUpdate}`, () => {
                const existingOrders = [
                    existingOrder(adultInhabitant.id),
                    existingOrder(childInhabitant.id)
                ]

                const result = reconcileSingleDinnerUserBooking(
                    [adultInhabitant, childInhabitant],
                    existingOrders,
                    mode as DinnerMode,
                    dinnerId,
                    dinnerDate,
                    defaultTicketPrices,
                    householdId,
                    userId
                )

                expect(result.create).toHaveLength(expectedCreate)
                expect(result.delete).toHaveLength(expectedDelete)
                expect(result.idempotent).toHaveLength(expectedIdempotent)
                expect(result.update).toHaveLength(expectedUpdate)
            })
        })

        it('filters by dinnerId - ignores orders for other dinners', () => {
            const ordersForOtherDinner = [
                existingOrder(adultInhabitant.id, {dinnerEventId: 999})
            ]

            const result = reconcileSingleDinnerUserBooking(
                [adultInhabitant],
                ordersForOtherDinner,
                DinnerModeSchema.enum.DINEIN,
                dinnerId,
                dinnerDate,
                defaultTicketPrices,
                householdId,
                userId
            )

            // Should create since existing order is for different dinner
            expect(result.create).toHaveLength(1)
            expect(result.delete).toHaveLength(0)
        })

        it('uses correct ticket price based on inhabitant age', () => {
            const result = reconcileSingleDinnerUserBooking(
                [adultInhabitant, childInhabitant],
                [],
                DinnerModeSchema.enum.DINEIN,
                dinnerId,
                dinnerDate,
                defaultTicketPrices,
                householdId,
                userId
            )

            const adultOrder = result.create.find(o => o.inhabitantId === adultInhabitant.id)
            const childOrder = result.create.find(o => o.inhabitantId === childInhabitant.id)

            expect(adultOrder?.priceAtBooking).toBe(4500)
            expect(childOrder?.priceAtBooking).toBe(2500)
        })

        it('throws when no matching ticket price for inhabitant', () => {
            const emptyTicketPrices: TicketPrice[] = []

            expect(() => reconcileSingleDinnerUserBooking(
                [adultInhabitant],
                [],
                DinnerModeSchema.enum.DINEIN,
                dinnerId,
                dinnerDate,
                emptyTicketPrices,
                householdId,
                userId
            )).toThrow('No ticket price for inhabitant')
        })
    })

    describe('buildBookingFeedback', () => {
        const {DinnerModeSchema} = useBookingValidation()
        const testSalt = testHelpers.temporaryAndRandom()

        const inhabitantNames = new Map<number, string>([
            [10, 'Anna Hansen'],
            [11, 'Peter Hansen'],
            [12, 'Mette Hansen']
        ])

        // Helper to create reconcile result using factories
        const createResult = (
            create: number[] = [],
            update: number[] = [],
            del: number[] = [],
            idempotent: number[] = []
        ): PruneAndCreateResult<OrderDisplay, OrderCreateWithPrice> => ({
            create: create.map(id => OrderFactory.defaultOrderCreateWithPrice(1, {inhabitantId: id})),
            update: update.map(id => OrderFactory.defaultOrderCreateWithPrice(1, {inhabitantId: id})),
            delete: del.map(id => OrderFactory.defaultOrder(testSalt, {inhabitantId: id})),
            idempotent: idempotent.map(id => OrderFactory.defaultOrderCreateWithPrice(1, {inhabitantId: id}))
        })

        it.each([
            {bucket: 'create', ids: [10, 11], expectedAction: 'created'},
            {bucket: 'update', ids: [10], expectedAction: 'updated'},
            {bucket: 'delete', ids: [10, 11, 12], expectedAction: 'deleted'},
            {bucket: 'idempotent', ids: [10], expectedAction: 'skipped'}
        ])('maps $bucket bucket to $expectedAction action', ({bucket, ids, expectedAction}) => {
            const result = createResult(
                bucket === 'create' ? ids : [],
                bucket === 'update' ? ids : [],
                bucket === 'delete' ? ids : [],
                bucket === 'idempotent' ? ids : []
            )

            const feedback = buildBookingFeedback(result, inhabitantNames, DinnerModeSchema.enum.DINEIN)

            expect(feedback.feedback).toHaveLength(ids.length)
            feedback.feedback.forEach(f => expect(f.action).toBe(expectedAction))
        })

        it('includes inhabitant names from map', () => {
            const result = createResult([10, 11])

            const feedback = buildBookingFeedback(result, inhabitantNames, DinnerModeSchema.enum.TAKEAWAY)

            expect(feedback.feedback[0]!.inhabitantName).toBe('Anna Hansen')
            expect(feedback.feedback[1]!.inhabitantName).toBe('Peter Hansen')
        })

        it('falls back to Ukendt for unknown inhabitant IDs', () => {
            const result = createResult([999])

            const feedback = buildBookingFeedback(result, inhabitantNames, DinnerModeSchema.enum.DINEIN)

            expect(feedback.feedback[0]!.inhabitantName).toBe('Ukendt')
        })

        it('includes dinnerMode in all feedback items', () => {
            const result = createResult([10], [11], [12])

            const feedback = buildBookingFeedback(result, inhabitantNames, DinnerModeSchema.enum.DINEINLATE)

            feedback.feedback.forEach(f => expect(f.dinnerMode).toBe(DinnerModeSchema.enum.DINEINLATE))
        })

        it('summary counts match bucket lengths', () => {
            const result = createResult([10, 11], [12], [10], [11, 12])

            const feedback = buildBookingFeedback(result, inhabitantNames, DinnerModeSchema.enum.DINEIN)

            expect(feedback.summary).toEqual({
                created: 2,
                updated: 1,
                released: 0,
                deleted: 1,
                skipped: 2
            })
        })

        it('handles empty result', () => {
            const result = createResult()

            const feedback = buildBookingFeedback(result, inhabitantNames, DinnerModeSchema.enum.NONE)

            expect(feedback.feedback).toHaveLength(0)
            expect(feedback.summary).toEqual({
                created: 0,
                updated: 0,
                released: 0,
                deleted: 0,
                skipped: 0
            })
        })
    })
})
