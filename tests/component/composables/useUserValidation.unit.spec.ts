import {describe, expect, it} from 'vitest'
import {useUserValidation} from '~/composables/useUserValidation'
import {getHouseholdShortName} from '~/composables/useHouseholdValidation'

describe('useUserValidation', () => {
    const {
        BaseUserSchema,
        UserCreateSchema,
        UserWithInhabitantSchema
    } = useUserValidation()

    describe('BaseUserSchema', () => {
        it('should parse valid user data', () => {
            const validUser = {
                id: 1,
                email: 'test@example.com',
                phone: '+4512345678',
                passwordHash: 'hashed',
                systemRole: 'USER',
                createdAt: new Date(),
                updatedAt: new Date()
            }

            const result = BaseUserSchema.parse(validUser)
            expect(result.id).toBe(1)
            expect(result.email).toBe('test@example.com')
        })

        it('should reject invalid email', () => {
            const invalidUser = {
                email: 'not-an-email',
                passwordHash: 'hashed'
            }

            expect(() => BaseUserSchema.parse(invalidUser)).toThrow()
        })
    })

    describe('UserCreateSchema', () => {
        it('should parse user creation data without id', () => {
            const createData = {
                email: 'new@example.com',
                passwordHash: 'hashed',
                systemRole: 'USER'
            }

            const result = UserCreateSchema.parse(createData)
            expect(result.email).toBe('new@example.com')
            expect(result.id).toBeUndefined()
        })
    })

    describe('UserWithInhabitantSchema', () => {
        it('should parse user with nested inhabitant and household', () => {
            const address = '123 Main St'
            const userWithInhabitant = {
                id: 1,
                email: 'test@example.com',
                passwordHash: 'hashed',
                systemRole: 'USER',
                Inhabitant: {
                    id: 10,
                    heynaboId: 100,
                    userId: 1,
                    householdId: 50,
                    pictureUrl: 'https://example.com/pic.jpg',
                    name: 'John',
                    lastName: 'Doe',
                    birthDate: new Date('1990-01-01'),
                    household: {
                        id: 50,
                        heynaboId: 500,
                        pbsId: 5000,
                        movedInDate: new Date('2020-01-01'),
                        moveOutDate: null,
                        name: 'Household A',
                        address: address,
                        shortName: getHouseholdShortName(address)
                    }
                }
            }

            const result = UserWithInhabitantSchema.parse(userWithInhabitant)
            expect(result.id).toBe(1)
            expect(result.Inhabitant).toBeDefined()
            expect(result.Inhabitant?.id).toBe(10)
            expect(result.Inhabitant?.household.id).toBe(50)
            expect(result.Inhabitant?.household.address).toBe('123 Main St')
        })

        it('should parse user without inhabitant (nullable)', () => {
            const userWithoutInhabitant = {
                id: 2,
                email: 'user@example.com',
                passwordHash: 'hashed',
                systemRole: 'ADMIN',
                Inhabitant: null
            }

            const result = UserWithInhabitantSchema.parse(userWithoutInhabitant)
            expect(result.id).toBe(2)
            expect(result.Inhabitant).toBeNull()
        })

        it('should reject when inhabitant missing required household', () => {
            const invalidUser = {
                id: 1,
                email: 'test@example.com',
                passwordHash: 'hashed',
                systemRole: 'USER',
                Inhabitant: {
                    id: 10,
                    heynaboId: 100,
                    userId: 1,
                    householdId: 50,
                    pictureUrl: null,
                    name: 'John',
                    lastName: 'Doe',
                    birthDate: null
                    // Missing household object
                }
            }

            expect(() => UserWithInhabitantSchema.parse(invalidUser)).toThrow()
        })
    })
})