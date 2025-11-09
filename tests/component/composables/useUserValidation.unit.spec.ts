import {describe, expect, it} from 'vitest'
import {useUserValidation} from '~/composables/useUserValidation'
import {getHouseholdShortName, useHouseholdValidation} from '~/composables/useHouseholdValidation'

describe('useUserValidation', () => {
    const {
        BaseUserSchema,
        UserCreateSchema,
        UserWithInhabitantSchema,
        UserDisplaySchema,
        mergeUserRoles
    } = useUserValidation()

    const {InhabitantDisplaySchema} = useHouseholdValidation()

    describe('BaseUserSchema', () => {
        it('should parse valid user data with roles array', () => {
            const validUser = {
                id: 1,
                email: 'test@example.com',
                phone: '+4512345678',
                passwordHash: 'hashed',
                systemRoles: ['ADMIN'],
                createdAt: new Date(),
                updatedAt: new Date()
            }

            const result = BaseUserSchema.parse(validUser)
            expect(result.id).toBe(1)
            expect(result.email).toBe('test@example.com')
            expect(result.systemRoles).toEqual(['ADMIN'])
        })

        it('should parse user with empty roles array (regular user)', () => {
            const regularUser = {
                id: 2,
                email: 'user@example.com',
                phone: '+4512345678',
                passwordHash: 'hashed',
                systemRoles: [],
                createdAt: new Date(),
                updatedAt: new Date()
            }

            const result = BaseUserSchema.parse(regularUser)
            expect(result.systemRoles).toEqual([])
        })

        it('should parse user with multiple roles', () => {
            const multiRoleUser = {
                id: 3,
                email: 'admin@example.com',
                passwordHash: 'hashed',
                systemRoles: ['ADMIN', 'ALLERGYMANAGER']
            }

            const result = BaseUserSchema.parse(multiRoleUser)
            expect(result.systemRoles).toEqual(['ADMIN', 'ALLERGYMANAGER'])
        })

        it('should default to empty array if systemRoles is omitted', () => {
            const userWithoutRoles = {
                id: 4,
                email: 'test@example.com',
                passwordHash: 'hashed'
            }

            const result = BaseUserSchema.parse(userWithoutRoles)
            expect(result.systemRoles).toEqual([])
        })

        it('should reject invalid email', () => {
            const invalidUser = {
                email: 'not-an-email',
                passwordHash: 'hashed'
            }

            expect(() => BaseUserSchema.parse(invalidUser)).toThrow()
        })

        it('should reject invalid role', () => {
            const invalidRoleUser = {
                email: 'test@example.com',
                passwordHash: 'hashed',
                systemRoles: ['INVALID_ROLE']
            }

            expect(() => BaseUserSchema.parse(invalidRoleUser)).toThrow()
        })
    })

    describe('UserCreateSchema', () => {
        it('should parse user creation data without id', () => {
            const createData = {
                email: 'new@example.com',
                passwordHash: 'hashed',
                systemRoles: []
            }

            const result = UserCreateSchema.parse(createData)
            expect(result.email).toBe('new@example.com')
            expect(result.id).toBeUndefined()
            expect(result.systemRoles).toEqual([])
        })

        it('should parse creation data with multiple roles', () => {
            const createData = {
                email: 'admin@example.com',
                passwordHash: 'hashed',
                systemRoles: ['ADMIN', 'ALLERGYMANAGER']
            }

            const result = UserCreateSchema.parse(createData)
            expect(result.systemRoles).toEqual(['ADMIN', 'ALLERGYMANAGER'])
        })
    })

    describe('UserWithInhabitantSchema', () => {
        it('should parse user with nested inhabitant and household', () => {
            const address = '123 Main St'
            const userWithInhabitant = {
                id: 1,
                email: 'test@example.com',
                passwordHash: 'hashed',
                systemRoles: [],
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
            expect(result.systemRoles).toEqual([])
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
                systemRoles: ['ADMIN'],
                Inhabitant: null
            }

            const result = UserWithInhabitantSchema.parse(userWithoutInhabitant)
            expect(result.id).toBe(2)
            expect(result.systemRoles).toEqual(['ADMIN'])
            expect(result.Inhabitant).toBeNull()
        })

        it('should reject when inhabitant missing required household', () => {
            const invalidUser = {
                id: 1,
                email: 'test@example.com',
                passwordHash: 'hashed',
                systemRoles: [],
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

    describe('UserDisplaySchema', () => {
        it('should parse user with inhabitant (for allergy manager display)', () => {
            const userDisplay = {
                id: 1,
                email: 'manager@example.com',
                systemRoles: ['ALLERGYMANAGER'],
                phone: '+4512345678',
                Inhabitant: {
                    id: 10,
                    heynaboId: 100,
                    name: 'John',
                    lastName: 'Doe',
                    pictureUrl: 'https://example.com/pic.jpg',
                    birthDate: new Date('1990-01-01')
                }
            }

            const result = UserDisplaySchema.parse(userDisplay)
            expect(result.id).toBe(1)
            expect(result.systemRoles).toEqual(['ALLERGYMANAGER'])
            expect(result.Inhabitant).toBeDefined()
            expect(result.Inhabitant?.id).toBe(10)
            expect(result.Inhabitant?.heynaboId).toBe(100)
            expect(result.Inhabitant?.name).toBe('John')
            expect(result.Inhabitant?.lastName).toBe('Doe')
            expect(result.Inhabitant?.pictureUrl).toBe('https://example.com/pic.jpg')
            expect(result.Inhabitant?.birthDate).toEqual(new Date('1990-01-01'))
        })

        it('should parse user without inhabitant', () => {
            const userDisplay = {
                id: 2,
                email: 'admin@example.com',
                systemRoles: ['ADMIN', 'ALLERGYMANAGER']
            }

            const result = UserDisplaySchema.parse(userDisplay)
            expect(result.id).toBe(2)
            expect(result.systemRoles).toEqual(['ADMIN', 'ALLERGYMANAGER'])
            expect(result.Inhabitant).toBeUndefined()
        })

        it('should parse user with null inhabitant', () => {
            const userDisplay = {
                id: 3,
                email: 'user@example.com',
                systemRoles: [],
                Inhabitant: null
            }

            const result = UserDisplaySchema.parse(userDisplay)
            expect(result.id).toBe(3)
            expect(result.systemRoles).toEqual([])
            expect(result.Inhabitant).toBeNull()
        })

        it('should reject user missing required fields', () => {
            const invalidUser = {
                id: 1,
                email: 'test@example.com'
                // Missing systemRoles
            }

            expect(() => UserDisplaySchema.parse(invalidUser)).toThrow()
        })

        it('should validate inhabitant has all required InhabitantDisplay fields', () => {
            const userDisplay = {
                id: 1,
                email: 'manager@example.com',
                systemRoles: ['ALLERGYMANAGER'],
                Inhabitant: {
                    id: 20,
                    heynaboId: 200,
                    name: 'Jane',
                    lastName: 'Smith',
                    pictureUrl: 'https://example.com/avatar.jpg',
                    birthDate: new Date('1985-05-15')
                }
            }

            const result = UserDisplaySchema.parse(userDisplay)
            expect(result.Inhabitant).toBeDefined()
            // Verify all InhabitantDisplay fields are present
            expect(result.Inhabitant?.id).toBe(20)
            expect(result.Inhabitant?.heynaboId).toBe(200)
            expect(result.Inhabitant?.name).toBe('Jane')
            expect(result.Inhabitant?.lastName).toBe('Smith')
            expect(result.Inhabitant?.pictureUrl).toBe('https://example.com/avatar.jpg')
            expect(result.Inhabitant?.birthDate).toEqual(new Date('1985-05-15'))
        })

        it('should reject inhabitant missing required InhabitantDisplay fields', () => {
            const invalidUser = {
                id: 1,
                email: 'manager@example.com',
                systemRoles: ['ALLERGYMANAGER'],
                Inhabitant: {
                    name: 'Jane',
                    lastName: 'Smith',
                    pictureUrl: 'https://example.com/avatar.jpg'
                    // Missing id, heynaboId, birthDate
                }
            }

            expect(() => UserDisplaySchema.parse(invalidUser)).toThrow()
        })

        it('should have Inhabitant schema compatible with InhabitantDisplaySchema', () => {
            // This test verifies the schemas stay in sync (circular dependency workaround)
            const inhabitantData = {
                id: 15,
                heynaboId: 150,
                name: 'Test',
                lastName: 'User',
                pictureUrl: 'https://example.com/test.jpg',
                birthDate: new Date('1992-03-20')
            }

            // Should pass InhabitantDisplaySchema validation
            const validatedInhabitant = InhabitantDisplaySchema.parse(inhabitantData)
            expect(validatedInhabitant.id).toBe(15)
            expect(validatedInhabitant.heynaboId).toBe(150)

            // Should also pass UserDisplaySchema.Inhabitant validation
            const userWithInhabitant = {
                id: 5,
                email: 'test@example.com',
                systemRoles: ['ALLERGYMANAGER'],
                Inhabitant: inhabitantData
            }

            const validatedUser = UserDisplaySchema.parse(userWithInhabitant)
            expect(validatedUser.Inhabitant).toBeDefined()
            expect(validatedUser.Inhabitant?.id).toBe(15)
            expect(validatedUser.Inhabitant?.heynaboId).toBe(150)
            expect(validatedUser.Inhabitant?.name).toBe('Test')
            expect(validatedUser.Inhabitant?.lastName).toBe('User')
            expect(validatedUser.Inhabitant?.pictureUrl).toBe('https://example.com/test.jpg')
            expect(validatedUser.Inhabitant?.birthDate).toEqual(new Date('1992-03-20'))
        })
    })

    describe('mergeUserRoles', () => {
        it.each([
            {
                name: 'should merge different roles without duplicates',
                existing: ['ADMIN', 'ALLERGYMANAGER'],
                incoming: ['USER'],
                expected: ['ADMIN', 'ALLERGYMANAGER', 'USER']
            },
            {
                name: 'should not duplicate when roles overlap',
                existing: ['ADMIN'],
                incoming: ['ADMIN'],
                expected: ['ADMIN']
            },
            {
                name: 'should handle empty existing roles',
                existing: [],
                incoming: ['ADMIN'],
                expected: ['ADMIN']
            },
            {
                name: 'should preserve existing roles when incoming is empty',
                existing: ['ADMIN'],
                incoming: [],
                expected: ['ADMIN']
            }
        ])('$name', ({existing, incoming, expected}) => {
            const existingUser = {
                id: 1,
                email: 'user@example.com',
                passwordHash: 'oldhash',
                systemRoles: existing
            }

            const incomingUser = {
                email: 'user@example.com',
                passwordHash: 'newhash',
                systemRoles: incoming
            }

            const merged = mergeUserRoles(existingUser, incomingUser)

            expect(merged.systemRoles).toEqual(expected)
            expect(merged.passwordHash).toBe('newhash')
        })
    })
})