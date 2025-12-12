import {describe, it, expect} from 'vitest'
import {useBooking, DINNER_STEP_MAP, DinnerStepState} from '~/composables/useBooking'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'

describe('useBooking', () => {
    const {
        buildDinnerUrl,
        createHeynaboEventPayload,
        HEYNABO_EVENT_TEMPLATE,
        canCancelDinner,
        getStepConfig,
        getDinnerStepState
    } = useBooking()

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
        it('contains required template parts', () => {
            expect(HEYNABO_EVENT_TEMPLATE.WARNING_ROBOT).toContain('synkroniseres fra skraaningen.dk')
            expect(HEYNABO_EVENT_TEMPLATE.WARNING_EDIT).toContain('ændringer overskrives')
            expect(HEYNABO_EVENT_TEMPLATE.BOOKING_EMOJI).toBe('📅')
            expect(HEYNABO_EVENT_TEMPLATE.SIGNATURE_PREFIX).toContain('hilsner')
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
            it('includes warning header', () => {
                const payload = createHeynaboEventPayload(futureDinnerEvent(), baseUrl)
                expect(payload.description).toContain('synkroniseres fra skraaningen.dk')
                expect(payload.description).toContain('ændringer overskrives')
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
                {name: 'includes cooking team when provided', cookingTeam: SeasonFactory.defaultCookingTeamDisplay({name: 'Team Alpha'}), shouldContain: '// Team Alpha'},
                {name: 'uses default when null', cookingTeam: null, shouldContain: '// Køkkenholdet'},
                {name: 'uses default when undefined', cookingTeam: undefined, shouldContain: '// Køkkenholdet'}
            ])('$name', ({cookingTeam, shouldContain}) => {
                const payload = createHeynaboEventPayload(futureDinnerEvent({cookingTeam}), baseUrl)

                expect(payload.description).toContain(shouldContain)
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
            expect(getDinnerStepState(dinnerEvent)).toBe(expected)
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
            expect(getStepConfig(dinnerEvent).step).toBe(0)
        })
    })
})
