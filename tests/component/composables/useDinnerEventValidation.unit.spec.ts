import {describe, it, expect} from 'vitest'
import {useDinnerEventValidation} from '~/composables/useDinnerEventValidation'
import {DinnerModeSchema} from '~~/prisma/generated/zod'
import {OrderFactory} from '../../e2e/testDataFactories/orderFactory'
import {HouseholdFactory} from '../../e2e/testDataFactories/householdFactory'

describe('useDinnerEventValidation', () => {
    const {
        DinnerModeSchema: ExportedDinnerModeSchema,
        BaseDinnerEventSchema,
        DinnerEventCreateSchema,
        DinnerEventUpdateSchema,
        DinnerEventResponseSchema,
        DinnerEventDetailSchema
    } = useDinnerEventValidation()

    describe('DinnerModeSchema', () => {
        it('GIVEN composable WHEN exporting DinnerModeSchema THEN exports generated schema', () => {
            expect(ExportedDinnerModeSchema).toBe(DinnerModeSchema)
        })

        it.each([
            ['TAKEAWAY'],
            ['DINEIN'],
            ['DINEINLATE'],
            ['NONE']
        ])('GIVEN %s WHEN parsing THEN accepts valid DinnerMode value', (dinnerMode) => {
            expect(() => DinnerModeSchema.parse(dinnerMode)).not.toThrow()
        })

        it('GIVEN invalid value WHEN parsing THEN rejects invalid DinnerMode', () => {
            expect(() => DinnerModeSchema.parse('INVALID')).toThrow()
        })
    })

    describe('BaseDinnerEventSchema', () => {
        const validDinnerEvent = {
            date: new Date('2025-01-15'),
            menuTitle: 'Pasta Night',
            menuDescription: 'Delicious homemade pasta',
            menuPictureUrl: 'https://example.com/pasta.jpg',
            dinnerMode: 'DINEIN',
            chefId: 1,
            cookingTeamId: 1,
            seasonId: 1
        }

        it('GIVEN valid dinner event WHEN parsing THEN succeeds', () => {
            const result = BaseDinnerEventSchema.parse(validDinnerEvent)
            expect(result).toMatchObject(validDinnerEvent)
        })

        it.each([
            ['TAKEAWAY', 'TAKEAWAY'],
            ['DINEIN', 'DINEIN'],
            ['DINEINLATE', 'DINEINLATE'],
            ['NONE', 'NONE']
        ])('GIVEN dinnerMode %s WHEN parsing THEN accepts value', (mode, expected) => {
            const event = {...validDinnerEvent, dinnerMode: mode}
            const result = BaseDinnerEventSchema.parse(event)
            expect(result.dinnerMode).toBe(expected)
        })

        it.each([
            ['empty menuTitle', {...validDinnerEvent, menuTitle: ''}],
            ['missing date', {...validDinnerEvent, date: undefined}],
            ['invalid dinnerMode', {...validDinnerEvent, dinnerMode: 'INVALID'}],
            ['menuTitle too long', {...validDinnerEvent, menuTitle: 'a'.repeat(201)}],
            ['menuDescription too long', {...validDinnerEvent, menuDescription: 'a'.repeat(501)}]
        ])('GIVEN %s WHEN parsing THEN throws validation error', (_, invalidEvent) => {
            expect(() => BaseDinnerEventSchema.parse(invalidEvent)).toThrow()
        })

        it('GIVEN optional fields missing WHEN parsing THEN succeeds with defaults', () => {
            const minimalEvent = {
                date: new Date('2025-01-15'),
                menuTitle: 'Quick Dinner',
                dinnerMode: 'DINEIN'
            }
            const result = BaseDinnerEventSchema.parse(minimalEvent)
            expect(result.menuDescription).toBeUndefined()
            expect(result.menuPictureUrl).toBeUndefined()
            expect(result.chefId).toBeUndefined()
            expect(result.cookingTeamId).toBeUndefined()
        })
    })

    describe('DinnerEventCreateSchema', () => {
        it('GIVEN create schema WHEN parsing THEN omits id, createdAt, updatedAt', () => {
            const createData = {
                date: new Date('2025-01-15'),
                menuTitle: 'Test Dinner',
                dinnerMode: 'DINEIN'
            }
            const result = DinnerEventCreateSchema.parse(createData)
            expect(result).not.toHaveProperty('id')
            expect(result).not.toHaveProperty('createdAt')
            expect(result).not.toHaveProperty('updatedAt')
        })

        it('GIVEN id in create data WHEN parsing THEN removes id', () => {
            const createData = {
                id: 999,
                date: new Date('2025-01-15'),
                menuTitle: 'Test Dinner',
                dinnerMode: 'DINEIN'
            }
            const result = DinnerEventCreateSchema.parse(createData)
            expect(result).not.toHaveProperty('id')
        })
    })

    describe('DinnerEventUpdateSchema', () => {
        it('GIVEN update with id WHEN parsing THEN requires id', () => {
            const updateData = {
                id: 1,
                menuTitle: 'Updated Title'
            }
            const result = DinnerEventUpdateSchema.parse(updateData)
            expect(result.id).toBe(1)
        })

        it('GIVEN update without id WHEN parsing THEN throws error', () => {
            const updateData = {
                menuTitle: 'Updated Title'
            }
            expect(() => DinnerEventUpdateSchema.parse(updateData)).toThrow()
        })

        it('GIVEN partial update WHEN parsing THEN accepts partial fields', () => {
            const updateData = {
                id: 1,
                dinnerMode: 'TAKEAWAY'
            }
            const result = DinnerEventUpdateSchema.parse(updateData)
            expect(result.dinnerMode).toBe('TAKEAWAY')
            expect(result).not.toHaveProperty('menuTitle')
        })
    })

    describe('DinnerEventResponseSchema', () => {
        it('GIVEN response schema WHEN parsing THEN requires essential fields', () => {
            const responseData = {
                id: 1,
                date: new Date('2025-01-15'),
                menuTitle: 'Test Dinner',
                dinnerMode: 'DINEIN'
            }
            const result = DinnerEventResponseSchema.parse(responseData)
            expect(result.id).toBe(1)
            expect(result.menuTitle).toBe('Test Dinner')
            expect(result.dinnerMode).toBe('DINEIN')
        })
    })

    describe('DinnerEventDetailSchema', () => {
        // Factory-based test data (DRY principle)
        const baseDinnerEvent = {
            id: 1,
            date: new Date('2025-01-15'),
            menuTitle: 'Pasta Night',
            dinnerMode: 'DINEIN' as const
        }

        const createChef = () => {
            const inhabitant = HouseholdFactory.defaultInhabitantData('test-chef')
            return {id: 5, ...inhabitant}
        }

        const createCookingTeam = () => ({
            id: 10,
            seasonId: 1,
            name: 'Team Awesome',
            assignments: [
                {
                    id: 1,
                    cookingTeamId: 10,
                    inhabitantId: 5,
                    role: 'CHEF' as const,
                    allocationPercentage: 100,
                    inhabitant: createChef()
                }
            ]
        })

        const createTickets = () => [
            {
                ...OrderFactory.defaultOrder('test-1', {id: 1}),
                inhabitant: createChef(),
                bookedByUser: {id: 1, email: 'test@example.com'},
                ticketPrice: {id: 1, ticketType: 'ADULT' as const, price: 5000, description: null}
            },
            {
                ...OrderFactory.defaultOrder('test-2', {id: 2}),
                inhabitant: createChef(),
                bookedByUser: {id: 1, email: 'test@example.com'},
                ticketPrice: {id: 2, ticketType: 'CHILD' as const, price: 2500, description: null}
            }
        ]

        it('GIVEN dinner event with all relations WHEN parsing THEN validates all relations', () => {
            const result = DinnerEventDetailSchema.parse({
                ...baseDinnerEvent,
                chef: createChef(),
                cookingTeam: createCookingTeam(),
                tickets: createTickets()
            })

            expect(result.chef).toBeDefined()
            expect(result.cookingTeam?.assignments).toHaveLength(1)
            expect(result.tickets).toHaveLength(2)
        })

        it.each([
            {desc: 'only chef', data: {chef: createChef()}, hasChef: true, hasTeam: false, hasTickets: false},
            {desc: 'only cookingTeam', data: {cookingTeam: createCookingTeam()}, hasChef: false, hasTeam: true, hasTickets: false},
            {desc: 'only tickets', data: {tickets: createTickets()}, hasChef: false, hasTeam: false, hasTickets: true},
            {desc: 'chef and tickets', data: {chef: createChef(), tickets: createTickets()}, hasChef: true, hasTeam: false, hasTickets: true},
            {desc: 'no relations', data: {}, hasChef: false, hasTeam: false, hasTickets: false}
        ])('GIVEN $desc WHEN parsing THEN validates correctly', ({data, hasChef, hasTeam, hasTickets}) => {
            const result = DinnerEventDetailSchema.parse({...baseDinnerEvent, ...data})

            expect(result.chef !== undefined).toBe(hasChef)
            expect(result.cookingTeam !== undefined).toBe(hasTeam)
            expect(result.tickets !== undefined).toBe(hasTickets)
        })

        it.each([
            {desc: 'chef is null', data: {chef: null}},
            {desc: 'cookingTeam is null', data: {cookingTeam: null}},
            {desc: 'tickets is empty array', data: {tickets: []}}
        ])('GIVEN $desc WHEN parsing THEN validates successfully', ({data}) => {
            expect(() => DinnerEventDetailSchema.parse({...baseDinnerEvent, ...data})).not.toThrow()
        })

        it.each([
            {desc: 'chef missing required fields', data: {chef: {id: 5}}},
            {desc: 'cookingTeam missing required fields', data: {cookingTeam: {id: 10}}},
            {desc: 'tickets with invalid order', data: {tickets: [{id: 1}]}},
            {desc: 'team with invalid role', data: {cookingTeam: {id: 10, seasonId: 1, name: 'Team', assignments: [{role: 'INVALID'}]}}}
        ])('GIVEN $desc WHEN parsing THEN throws validation error', ({data}) => {
            expect(() => DinnerEventDetailSchema.parse({...baseDinnerEvent, ...data})).toThrow()
        })

        it('GIVEN detail without required id WHEN parsing THEN throws error', () => {
            expect(() => DinnerEventDetailSchema.parse({
                date: new Date('2025-01-15'),
                menuTitle: 'Test',
                dinnerMode: 'DINEIN' as const
            })).toThrow()
        })
    })
})
