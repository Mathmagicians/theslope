/**
 * Unit tests for useCoreValidation composable
 * Tests User, Inhabitant, and Household validation schemas
 * Verifies fragment pattern works correctly and eliminates circular dependencies
 */

import {describe, it, expect} from 'vitest'
import {useCoreValidation, getHouseholdShortName} from '~/composables/useCoreValidation'
import {DinnerModeSchema} from '~~/prisma/generated/zod'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'

const DinnerMode = DinnerModeSchema.enum

// ============================================================================
// USER VALIDATION TESTS
// ============================================================================

describe('useCoreValidation - User Schemas', () => {
    const {
        BaseUserSchema,
        UserCreateSchema,
        serializeUserInput,
        deserializeUser,
        mergeUserRoles
    } = useCoreValidation()

    describe.each([
        {schema: 'BaseUserSchema', schemaObj: BaseUserSchema, withId: true},
        {schema: 'UserCreateSchema', schemaObj: UserCreateSchema, withId: false}
    ])('$schema', ({schemaObj, withId}) => {
        it('should parse user from factory', () => {
            const user = withId ? {...UserFactory.defaultUser(), id: 1} : UserFactory.defaultUser()
            const result = schemaObj.parse(user)

            expect(result.email).toBe(user.email)
            expect(result.systemRoles).toEqual(user.systemRoles)
            if (withId) {
                expect(result.id).toBe(1)
            } else {
                expect(result).not.toHaveProperty('id')
            }
        })
    })

    it('should normalize RFC 5322 email format', () => {
        const user = {
            ...UserFactory.defaultUser(),
            id: 1,
            email: 'Display Name <test@example.com>'
        }
        const result = BaseUserSchema.parse(user)

        expect(result.email).toBe('test@example.com')
    })

    it('should serialize and deserialize user systemRoles', () => {
        const user = {...UserFactory.defaultUser(), id: 1, createdAt: new Date(), updatedAt: new Date()}
        const serialized = serializeUserInput(user)

        expect(typeof serialized.systemRoles).toBe('string')
        expect(serialized.systemRoles).toBe(JSON.stringify(user.systemRoles))

        const serializedUser = {...serialized, id: 1, createdAt: new Date(), updatedAt: new Date()}
        const deserialized = deserializeUser(serializedUser)

        expect(Array.isArray(deserialized.systemRoles)).toBe(true)
        expect(deserialized.systemRoles).toEqual(user.systemRoles)
    })

    it('should merge user roles without duplicates', () => {
        const existing = {...UserFactory.defaultUser(), systemRoles: ['ADMIN'] as const}
        const incoming = {...UserFactory.defaultUser(), systemRoles: ['ALLERGYMANAGER'] as const}
        const merged = mergeUserRoles(existing, incoming)

        expect(merged.systemRoles).toHaveLength(2)
        expect(merged.systemRoles).toContain('ADMIN')
        expect(merged.systemRoles).toContain('ALLERGYMANAGER')
    })
})

// ============================================================================
// INHABITANT VALIDATION TESTS
// ============================================================================

describe('useCoreValidation - Inhabitant Schemas', () => {
    const {
        BaseInhabitantSchema,
        InhabitantCreateSchema,
        InhabitantDisplaySchema,
        deserializeInhabitantDisplay,
        createDefaultWeekdayMap,
        serializeWeekDayMap
    } = useCoreValidation()

    describe.each([
        {schema: 'BaseInhabitantSchema', schemaObj: BaseInhabitantSchema, withId: true},
        {schema: 'InhabitantCreateSchema', schemaObj: InhabitantCreateSchema, withId: false},
        {schema: 'InhabitantDisplaySchema', schemaObj: InhabitantDisplaySchema, withId: true}
    ])('$schema', ({schemaObj, withId}) => {
        it('should parse inhabitant from factory', () => {
            const inhabitantData = HouseholdFactory.defaultInhabitantData()
            const inhabitant = {
                ...inhabitantData,
                ...(withId && {id: 1})
            }
            const result = schemaObj.parse(inhabitant)

            expect(result.name).toBe(inhabitantData.name)
            expect(result.lastName).toBe(inhabitantData.lastName)
            if (withId) {
                expect(result.id).toBe(1)
            } else {
                expect(result).not.toHaveProperty('id')
            }
        })
    })

    describe('deserializeInhabitantDisplay', () => {
        it.each([
            {
                testCase: 'with birthDate',
                birthDate: '1990-01-01',
                dinnerPreferences: null,
                expectBirthDate: true,
                expectDinnerPrefs: false
            },
            {
                testCase: 'with dinnerPreferences',
                birthDate: null,
                dinnerPreferences: serializeWeekDayMap(createDefaultWeekdayMap(DinnerMode.DINEIN)),
                expectBirthDate: false,
                expectDinnerPrefs: true
            },
            {
                testCase: 'with both',
                birthDate: '1990-01-01',
                dinnerPreferences: serializeWeekDayMap(createDefaultWeekdayMap(DinnerMode.TAKEAWAY)),
                expectBirthDate: true,
                expectDinnerPrefs: true
            }
        ])('should deserialize inhabitant $testCase', ({birthDate, dinnerPreferences, expectBirthDate, expectDinnerPrefs}) => {
            const serialized = {
                ...HouseholdFactory.defaultInhabitantData(),
                id: 1,
                householdId: 1,
                birthDate,
                dinnerPreferences
            }
            const deserialized = deserializeInhabitantDisplay(serialized)

            if (expectBirthDate) {
                expect(deserialized.birthDate).toBeInstanceOf(Date)
                expect(deserialized.birthDate?.getFullYear()).toBe(1990)
            } else {
                expect(deserialized.birthDate).toBeNull()
            }

            if (expectDinnerPrefs) {
                expect(deserialized.dinnerPreferences).toBeDefined()
                expect(deserialized.dinnerPreferences?.mandag).toBeDefined()
            } else {
                expect(deserialized.dinnerPreferences).toBeNull()
            }
        })
    })
})

// ============================================================================
// HOUSEHOLD VALIDATION TESTS
// ============================================================================

describe('useCoreValidation - Household Schemas', () => {
    const {
        BaseHouseholdSchema,
        HouseholdCreateSchema,
        deserializeHouseholdDisplay,
        deserializeHouseholdDetail
    } = useCoreValidation()

    describe.each([
        {schema: 'BaseHouseholdSchema', schemaObj: BaseHouseholdSchema, withId: true},
        {schema: 'HouseholdCreateSchema', schemaObj: HouseholdCreateSchema, withId: false}
    ])('$schema', ({schemaObj, withId}) => {
        it('should parse household from factory', () => {
            const householdData = HouseholdFactory.defaultHouseholdData()
            const household = withId ? {...householdData, id: 1} : householdData
            const result = schemaObj.parse(household)

            expect(result.name).toBe(householdData.name)
            expect(result.address).toBe(householdData.address)
            expect(result.movedInDate).toBeInstanceOf(Date)
            if (withId) {
                expect(result.id).toBe(1)
            } else {
                expect(result).not.toHaveProperty('id')
            }
        })
    })

    describe('validation rules', () => {
        it.each([
            {field: 'name', value: '', shouldFail: true},
            {field: 'name', value: 'Valid Name', shouldFail: false},
            {field: 'address', value: '', shouldFail: true},
            {field: 'address', value: 'Valid Address 123', shouldFail: false}
        ])('should validate $field with value "$value"', ({field, value, shouldFail}) => {
            const household = {...HouseholdFactory.defaultHouseholdData(), [field]: value}

            if (shouldFail) {
                expect(() => HouseholdCreateSchema.parse(household)).toThrow()
            } else {
                expect(() => HouseholdCreateSchema.parse(household)).not.toThrow()
            }
        })
    })

    describe('deserializeHouseholdDisplay', () => {
        it('should deserialize with computed shortName and inhabitants', () => {
            const serialized = {
                ...HouseholdFactory.defaultHouseholdData(),
                id: 1,
                movedInDate: '2020-01-01',
                moveOutDate: null,
                inhabitants: []
            }
            const deserialized = deserializeHouseholdDisplay(serialized)

            expect(deserialized.movedInDate).toBeInstanceOf(Date)
            expect(deserialized.shortName).toBeDefined()
            expect(typeof deserialized.shortName).toBe('string')
            expect(deserialized.inhabitants).toEqual([])
        })
    })

    describe('deserializeHouseholdDetail', () => {
        it('should deserialize with nested inhabitants', () => {
            const serialized = {
                ...HouseholdFactory.defaultHouseholdData(),
                id: 1,
                movedInDate: '2020-01-01',
                moveOutDate: null,
                shortName: 'A_123',
                inhabitants: [
                    {
                        ...HouseholdFactory.defaultInhabitantData(),
                        id: 1,
                        householdId: 1,
                        birthDate: '1990-01-01',
                        dinnerPreferences: null
                    }
                ]
            }
            const deserialized = deserializeHouseholdDetail(serialized)

            expect(deserialized.inhabitants).toHaveLength(1)
            expect(deserialized.inhabitants[0].birthDate).toBeInstanceOf(Date)
            expect(deserialized.inhabitants[0].name).toBe(serialized.inhabitants[0].name)
        })
    })
})

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe('getHouseholdShortName', () => {
    it.each([
        {address: 'Skråningen 31', expected: 'S_31'},
        {address: 'Tvethøjvej 43, 1', expected: 'T_43_1'},
        {address: 'Abbey Road 1 th.', expected: 'AR_1_th'},
        {address: 'Penny Lane 4, 1 4', expected: 'PL_4_1_4'},
        {address: 'Østerbrogade 123, 2.', expected: 'Ø_123_2'},
        {address: 'Broadway 42', expected: 'B_42'}
    ])('should generate "$expected" from "$address"', ({address, expected}) => {
        expect(getHouseholdShortName(address)).toBe(expected)
    })
})

// ============================================================================
// CROSS-SCHEMA VALIDATION (No Circular Dependencies)
// ============================================================================

describe('useCoreValidation - Cross-Schema Integration', () => {
    const {
        UserDisplaySchema,
        UserWithInhabitantSchema,
        HouseholdDisplaySchema,
        deserializeUserWithInhabitant,
        createDefaultWeekdayMap,
        serializeWeekDayMap
    } = useCoreValidation()

    it('should parse UserDisplay with nested Inhabitant (no circular dependency)', () => {
        const user = {
            ...UserFactory.defaultUser(),
            id: 1,
            Inhabitant: {
                ...HouseholdFactory.defaultInhabitantData(),
                id: 1,
                userId: 1,
                dinnerPreferences: null
            }
        }
        const result = UserDisplaySchema.parse(user)

        expect(result.Inhabitant).toBeDefined()
        expect(result.Inhabitant?.name).toBe(user.Inhabitant.name)
        expect(result.Inhabitant).not.toHaveProperty('householdId') // Omitted in user context
    })

    it('should parse UserWithInhabitant with nested household', () => {
        const user = {
            ...UserFactory.defaultUser(),
            id: 1,
            Inhabitant: {
                ...HouseholdFactory.defaultInhabitantData(),
                id: 1,
                userId: 1,
                householdId: 1,
                dinnerPreferences: null,
                household: {
                    ...HouseholdFactory.defaultHouseholdData(),
                    id: 1,
                    shortName: 'S_31'
                }
            }
        }
        const result = UserWithInhabitantSchema.parse(user)

        expect(result.Inhabitant).toBeDefined()
        expect(result.Inhabitant?.household).toBeDefined()
        expect(result.Inhabitant?.household.shortName).toBe('S_31')
    })

    it('should deserialize UserWithInhabitant from database output', () => {
        const defaultPrefs = createDefaultWeekdayMap(DinnerMode.DINEIN)
        const serialized = {
            ...UserFactory.defaultUser(),
            id: 1,
            systemRoles: '["ADMIN"]',
            createdAt: new Date(),
            updatedAt: new Date(),
            Inhabitant: {
                ...HouseholdFactory.defaultInhabitantData(),
                id: 1,
                userId: 1,
                householdId: 1,
                birthDate: '1990-01-01',
                dinnerPreferences: serializeWeekDayMap(defaultPrefs),
                household: {
                    ...HouseholdFactory.defaultHouseholdData(),
                    id: 1,
                    movedInDate: new Date('2020-01-01'),
                    moveOutDate: null
                }
            }
        }
        const deserialized = deserializeUserWithInhabitant(serialized)

        expect(Array.isArray(deserialized.systemRoles)).toBe(true)
        expect(deserialized.Inhabitant?.birthDate).toBeInstanceOf(Date)
        expect(deserialized.Inhabitant?.dinnerPreferences).toBeDefined()
        expect(deserialized.Inhabitant?.dinnerPreferences?.mandag).toBe(DinnerMode.DINEIN)
        expect(deserialized.Inhabitant?.household.shortName).toBeDefined()
    })

    it('should handle deserializeUserWithInhabitant with null Inhabitant', () => {
        // GIVEN: A user without inhabitant
        const factoryUser = UserFactory.createAdmin()
        const userData = {...factoryUser, systemRoles: [...factoryUser.systemRoles]}
        const serializedUser = {
            ...userData,
            systemRoles: JSON.stringify(userData.systemRoles),
            id: 1,
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-02'),
            Inhabitant: null
        }

        // WHEN: Deserializing
        const user = deserializeUserWithInhabitant(serializedUser)

        // THEN: Inhabitant should be null, systemRoles deserialized
        expect(user.Inhabitant).toBeNull()
        expect(Array.isArray(user.systemRoles)).toBe(true)
        expect(user.systemRoles).toContain('ADMIN')
    })

    it('should deserialize UserWithInhabitant with dinnerPreferences', () => {
        // GIVEN: Factory data with dinnerPreferences
        const householdData = HouseholdFactory.defaultHouseholdData()
        const inhabitantData = HouseholdFactory.defaultInhabitantData()
        const factoryUser = UserFactory.defaultUser()
        const userData = {...factoryUser, systemRoles: [...factoryUser.systemRoles]}

        // Create dinnerPreferences using factory method with proper DinnerMode values
        const dinnerPreferences = createDefaultWeekdayMap(DinnerMode.DINEIN)
        dinnerPreferences.onsdag = DinnerMode.NONE
        dinnerPreferences.lørdag = DinnerMode.NONE
        dinnerPreferences.søndag = DinnerMode.NONE

        const serializedUser = {
            ...userData,
            systemRoles: JSON.stringify(userData.systemRoles),
            id: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            Inhabitant: {
                id: 10,
                heynaboId: inhabitantData.heynaboId,
                name: inhabitantData.name,
                lastName: inhabitantData.lastName,
                pictureUrl: inhabitantData.pictureUrl,
                birthDate: inhabitantData.birthDate,
                userId: 1,
                householdId: 5,
                dinnerPreferences: serializeWeekDayMap(dinnerPreferences),
                household: {
                    id: 5,
                    heynaboId: householdData.heynaboId,
                    pbsId: householdData.pbsId,
                    movedInDate: householdData.movedInDate,
                    moveOutDate: null,
                    name: householdData.name,
                    address: householdData.address
                }
            }
        }

        // WHEN: Deserializing
        const user = deserializeUserWithInhabitant(serializedUser)

        // THEN: dinnerPreferences should be deserialized to WeekDayMap object with proper DinnerMode values
        expect(user.Inhabitant?.dinnerPreferences).toBeDefined()
        expect(typeof user.Inhabitant?.dinnerPreferences).toBe('object')
        expect(user.Inhabitant?.dinnerPreferences?.mandag).toBe(DinnerMode.DINEIN)
        expect(user.Inhabitant?.dinnerPreferences?.tirsdag).toBe(DinnerMode.DINEIN)
        expect(user.Inhabitant?.dinnerPreferences?.onsdag).toBe(DinnerMode.NONE)
        expect(user.Inhabitant?.dinnerPreferences?.torsdag).toBe(DinnerMode.DINEIN)
        expect(user.Inhabitant?.dinnerPreferences?.fredag).toBe(DinnerMode.DINEIN)
        expect(user.Inhabitant?.dinnerPreferences?.lørdag).toBe(DinnerMode.NONE)
        expect(user.Inhabitant?.dinnerPreferences?.søndag).toBe(DinnerMode.NONE)
    })

    it('should parse HouseholdSummary with nested inhabitants array', () => {
        const household = {
            ...HouseholdFactory.defaultHouseholdData(),
            id: 1,
            shortName: 'S_31',
            inhabitants: [
                {
                    ...HouseholdFactory.defaultInhabitantData(),
                    id: 1,
                    dinnerPreferences: null
                },
                {
                    ...HouseholdFactory.defaultInhabitantData(),
                    id: 2,
                    name: 'Jane',
                    dinnerPreferences: null
                }
            ]
        }
        const result = HouseholdDisplaySchema.parse(household)

        expect(result.inhabitants).toHaveLength(2)
        expect(result.inhabitants[0].name).toBe(household.inhabitants[0].name)
        expect(result.inhabitants[1].name).toBe('Jane')
    })
})

// ============================================================================
// FRAGMENT PATTERN VALIDATION
// ============================================================================

describe('useCoreValidation - Fragment Pattern Compliance', () => {
    describe.each([
        {
            entity: 'User',
            getSchema: () => useCoreValidation().BaseUserSchema,
            getFactoryData: () => ({...UserFactory.defaultUser(), id: 1}),
            checkField: 'email'
        },
        {
            entity: 'Inhabitant',
            getSchema: () => useCoreValidation().BaseInhabitantSchema,
            getFactoryData: () => ({...HouseholdFactory.defaultInhabitantData(), id: 1, householdId: 1}),
            checkField: 'name'
        },
        {
            entity: 'Household',
            getSchema: () => useCoreValidation().BaseHouseholdSchema,
            getFactoryData: () => ({...HouseholdFactory.defaultHouseholdData(), id: 1}),
            checkField: 'name'
        }
    ])('$entity Fragment', ({getSchema, getFactoryData, checkField}) => {
        it('should extend fragment without circular dependencies', () => {
            const schema = getSchema()
            const data = getFactoryData()
            const result = schema.parse(data)

            expect(result.id).toBe(data.id)
            expect(result[checkField]).toBe(data[checkField])
        })
    })
})

// ============================================================================
// SCHEMA VALIDATION EDGE CASES
// ============================================================================

describe('useCoreValidation - User Schema Validation Edge Cases', () => {
    const {UserCreateSchema} = useCoreValidation()

    describe('email validation', () => {
        it.each([
            {email: 'not-an-email', description: 'missing @ symbol'},
            {email: '@example.com', description: 'missing local part'},
            {email: 'user@', description: 'missing domain'},
        ])('should reject invalid email: $description', ({email}) => {
            const invalidUser = {email, systemRoles: []}
            const result = UserCreateSchema.safeParse(invalidUser)
            expect(result.success).toBe(false)
        })

        it.each([
            {email: 'simple@example.com', expected: 'simple@example.com', description: 'simple format'},
            {email: 'John Doe <john@example.com>', expected: 'john@example.com', description: 'RFC 5322 with display name'}
        ])('should accept valid email: $description', ({email, expected}) => {
            const user = {email, systemRoles: []}
            const result = UserCreateSchema.safeParse(user)

            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.email).toBe(expected)
            }
        })
    })

    describe('phone validation', () => {
        it.each([
            {phone: 'abc-def-ghij', shouldPass: false, description: 'letters'},
            {phone: '+45 12345678', shouldPass: true, description: 'country code with spaces'},
            {phone: '12345678', shouldPass: true, description: 'no country code'},
            {phone: '+4512345678', shouldPass: true, description: 'country code without spaces'},
            {phone: '+45 12 34 56 78', shouldPass: true, description: 'extra spaces'}
        ])('should $description', ({phone, shouldPass}) => {
            const user = {email: 'test@example.com', phone, systemRoles: []}
            const result = UserCreateSchema.safeParse(user)
            expect(result.success).toBe(shouldPass)
        })

        it('should convert empty string phone to null', () => {
            const user = {email: 'test@example.com', phone: '', systemRoles: []}
            const result = UserCreateSchema.safeParse(user)

            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.phone).toBeNull()
            }
        })
    })
})

describe('useCoreValidation - Inhabitant Schema Validation Edge Cases', () => {
    const {InhabitantCreateSchema} = useCoreValidation()

    it.each([
        {field: 'name', value: '', shouldFail: true},
        {field: 'name', value: 'a'.repeat(101), shouldFail: true},
        {field: 'lastName', value: '', shouldFail: true},
        {field: 'lastName', value: 'a'.repeat(101), shouldFail: true},
    ])('should validate $field with value length', ({field, value, shouldFail}) => {
        const inhabitant = {
            ...HouseholdFactory.defaultInhabitantData(),
            householdId: 1,
            [field]: value
        }

        if (shouldFail) {
            expect(() => InhabitantCreateSchema.parse(inhabitant)).toThrow()
        } else {
            expect(() => InhabitantCreateSchema.parse(inhabitant)).not.toThrow()
        }
    })

    it('should reject invalid pictureUrl', () => {
        const invalidInhabitant = {
            ...HouseholdFactory.defaultInhabitantData(),
            householdId: 1,
            pictureUrl: 'not-a-url'
        }
        const result = InhabitantCreateSchema.safeParse(invalidInhabitant)
        expect(result.success).toBe(false)
    })

    it('should accept valid pictureUrl', () => {
        const inhabitant = {
            ...HouseholdFactory.defaultInhabitantData(),
            householdId: 1,
            pictureUrl: 'https://example.com/photo.jpg'
        }
        const result = InhabitantCreateSchema.safeParse(inhabitant)
        expect(result.success).toBe(true)
    })
})

describe('useCoreValidation - Household Schema Validation Edge Cases', () => {
    const {HouseholdCreateSchema} = useCoreValidation()

    it('should handle maximum valid lengths', () => {
        const household = {
            ...HouseholdFactory.defaultHouseholdData(),
            name: 'a'.repeat(100),
            address: 'a'.repeat(200)
        }
        const result = HouseholdCreateSchema.safeParse(household)
        expect(result.success).toBe(true)
    })

    it('should reject negative IDs', () => {
        const invalidHousehold = {
            ...HouseholdFactory.defaultHouseholdData(),
            heynaboId: -1
        }
        const result = HouseholdCreateSchema.safeParse(invalidHousehold)
        expect(result.success).toBe(false)
    })

    it('should coerce date strings to Date objects', () => {
        // Input typed as Record to test schema coercion of string dates
        const household: Record<string, unknown> = {
            ...HouseholdFactory.defaultHouseholdData(),
            movedInDate: '2024-01-01'
        }
        const result = HouseholdCreateSchema.safeParse(household)

        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.movedInDate).toBeInstanceOf(Date)
        }
    })
})

// ============================================================================
// WEEKDAYMAP VALIDATION
// ============================================================================

describe('useCoreValidation - WeekDayMap Validation', () => {
    const {createDefaultWeekdayMap, serializeWeekDayMap, deserializeWeekDayMap, createWeekDayMapFromSelection} = useCoreValidation()

    it('should create default weekday map with all days', () => {
        const weekdayMap = createDefaultWeekdayMap(DinnerMode.DINEIN)

        expect(weekdayMap.mandag).toBe(DinnerMode.DINEIN)
        expect(weekdayMap.tirsdag).toBe(DinnerMode.DINEIN)
        expect(weekdayMap.onsdag).toBe(DinnerMode.DINEIN)
        expect(weekdayMap.torsdag).toBe(DinnerMode.DINEIN)
        expect(weekdayMap.fredag).toBe(DinnerMode.DINEIN)
        expect(weekdayMap.lørdag).toBe(DinnerMode.DINEIN)
        expect(weekdayMap.søndag).toBe(DinnerMode.DINEIN)
    })

    it('should create weekday map from selection', () => {
        const selection = ['mandag', 'onsdag', 'fredag', 'søndag'] // Selected weekdays
        const weekdayMap = createWeekDayMapFromSelection(selection, DinnerMode.DINEIN, DinnerMode.NONE)

        expect(weekdayMap.mandag).toBe(DinnerMode.DINEIN)
        expect(weekdayMap.tirsdag).toBe(DinnerMode.NONE)
        expect(weekdayMap.onsdag).toBe(DinnerMode.DINEIN)
        expect(weekdayMap.torsdag).toBe(DinnerMode.NONE)
        expect(weekdayMap.fredag).toBe(DinnerMode.DINEIN)
        expect(weekdayMap.lørdag).toBe(DinnerMode.NONE)
        expect(weekdayMap.søndag).toBe(DinnerMode.DINEIN)
    })

    it('should roundtrip serialize/deserialize all DinnerMode values', () => {
        const weekdayMap = {
            mandag: DinnerMode.DINEIN,
            tirsdag: DinnerMode.TAKEAWAY,
            onsdag: DinnerMode.DINEINLATE,
            torsdag: DinnerMode.NONE,
            fredag: DinnerMode.DINEIN,
            lørdag: DinnerMode.TAKEAWAY,
            søndag: DinnerMode.NONE
        }

        const serialized = serializeWeekDayMap(weekdayMap)
        expect(typeof serialized).toBe('string')

        const deserialized = deserializeWeekDayMap(serialized)
        expect(deserialized).toEqual(weekdayMap)
    })
})

// ============================================================================
// HOUSEHOLD CREATE SCHEMA TESTS (with optional inhabitants per ADR-009)
// ============================================================================

describe('useCoreValidation - HouseholdCreateSchema with inhabitants', () => {
    const {HouseholdCreateSchema} = useCoreValidation()

    // Helper to create inhabitant without householdId (as expected by nested schema)
    const createInhabitantWithoutHouseholdId = (salt: string) => {
        const {householdId, ...inhabitant} = HouseholdFactory.defaultInhabitantData(salt)
        return inhabitant
    }

    describe.each([
        {name: 'no inhabitants', inhabitants: undefined, expectedLength: undefined},
        {name: 'empty array', inhabitants: [], expectedLength: 0},
        {name: 'one inhabitant', inhabitants: [createInhabitantWithoutHouseholdId('i1')], expectedLength: 1},
        {name: 'multiple inhabitants', inhabitants: [
            createInhabitantWithoutHouseholdId('i1'),
            createInhabitantWithoutHouseholdId('i2'),
            createInhabitantWithoutHouseholdId('i3')
        ], expectedLength: 3},
    ])('valid household with $name', ({inhabitants, expectedLength}) => {
        it('should parse successfully', () => {
            const household = {...HouseholdFactory.defaultHouseholdData(), inhabitants}
            const result = HouseholdCreateSchema.safeParse(household)

            expect(result.success).toBe(true)
            if (result.success) {
                if (expectedLength === undefined) {
                    expect(result.data.inhabitants).toBeUndefined()
                } else {
                    expect(result.data.inhabitants).toHaveLength(expectedLength)
                }
            }
        })
    })

    it('should accept inhabitant with user profile in nested creation', () => {
        const household = {
            ...HouseholdFactory.defaultHouseholdData(),
            inhabitants: [{
                ...createInhabitantWithoutHouseholdId('withUser'),
                user: {email: 'john@example.com', passwordHash: 'hash123', systemRole: 'USER' as const}
            }]
        }

        const result = HouseholdCreateSchema.safeParse(household)
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.inhabitants![0]?.user?.email).toBe('john@example.com')
        }
    })

    it('should reject household with invalid inhabitant (empty name)', () => {
        const household = {
            ...HouseholdFactory.defaultHouseholdData(),
            inhabitants: [{...createInhabitantWithoutHouseholdId('invalid'), name: ''}]
        }

        const result = HouseholdCreateSchema.safeParse(household)
        expect(result.success).toBe(false)
    })
})

// ============================================================================
// INHABITANT SCHEMA VALIDATION (from old useHouseholdValidation tests)
// ============================================================================

describe('useCoreValidation - InhabitantCreateSchema Additional Tests', () => {
    const {InhabitantCreateSchema, createDefaultWeekdayMap} = useCoreValidation()

    it('should accept inhabitant with optional user', () => {
        const inhabitantWithUser = {
            ...HouseholdFactory.defaultInhabitantData(),
            householdId: 1,
            user: {
                email: 'john@example.com',
                passwordHash: 'hashedpassword123',
                systemRole: 'USER' as const
            }
        }

        const result = InhabitantCreateSchema.safeParse(inhabitantWithUser)
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.user).toBeDefined()
            expect(result.data.user?.email).toBe('john@example.com')
        }
    })

    it('should accept inhabitant with valid dinnerPreferences WeekDayMap', () => {
        const inhabitant = {
            ...HouseholdFactory.defaultInhabitantData(),
            householdId: 1,
            dinnerPreferences: createDefaultWeekdayMap(DinnerMode.DINEIN)
        }

        const result = InhabitantCreateSchema.safeParse(inhabitant)
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.dinnerPreferences?.mandag).toBe(DinnerMode.DINEIN)
            expect(result.data.dinnerPreferences?.tirsdag).toBe(DinnerMode.DINEIN)
        }
    })

    it.each([
        {value: undefined, description: 'without dinnerPreferences (optional)'},
        {value: null, description: 'with null dinnerPreferences'}
    ])('should accept inhabitant $description', ({value}) => {
        const inhabitant = {
            ...HouseholdFactory.defaultInhabitantData(),
            householdId: 1,
            dinnerPreferences: value
        }

        const result = InhabitantCreateSchema.safeParse(inhabitant)
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.dinnerPreferences).toBe(value)
        }
    })

    it.each([
        {
            getData: () => {
                const map = createDefaultWeekdayMap(DinnerMode.DINEIN)
                // Cast to test invalid enum value at runtime
                map.mandag = 'INVALID_MODE' as 'DINEIN'
                return map
            },
            description: 'invalid DinnerMode value'
        },
        {
            getData: () => {
                const map = createDefaultWeekdayMap(DinnerMode.DINEIN) as Record<string, unknown>
                Reflect.deleteProperty(map, 'onsdag')
                Reflect.deleteProperty(map, 'torsdag')
                return map
            },
            description: 'incomplete WeekDayMap (missing days)'
        }
    ])('should reject inhabitant with $description in dinnerPreferences', ({getData}) => {
        const invalidInhabitant = {
            ...HouseholdFactory.defaultInhabitantData(),
            householdId: 1,
            dinnerPreferences: getData()
        }

        const result = InhabitantCreateSchema.safeParse(invalidInhabitant)
        expect(result.success).toBe(false)
    })

    it('should handle null pictureUrl for inhabitant', () => {
        const inhabitant = {
            ...HouseholdFactory.defaultInhabitantData(),
            householdId: 1,
            pictureUrl: null
        }

        const result = InhabitantCreateSchema.safeParse(inhabitant)
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.pictureUrl).toBeNull()
        }
    })

    it('should handle null birthDate for inhabitant', () => {
        const inhabitant = {
            ...HouseholdFactory.defaultInhabitantData(),
            householdId: 1,
            birthDate: null
        }

        const result = InhabitantCreateSchema.safeParse(inhabitant)
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.birthDate).toBeNull()
        }
    })
})

// ============================================================================
// HOUSEHOLD SCHEMA VALIDATION (from old useHouseholdValidation tests)
// ============================================================================

describe('useCoreValidation - HouseholdCreateSchema Additional Tests', () => {
    const {HouseholdCreateSchema} = useCoreValidation()

    it('should accept household with optional moveOutDate', () => {
        const household = {
            ...HouseholdFactory.defaultHouseholdData(),
            moveOutDate: new Date('2024-12-31')
        }

        const result = HouseholdCreateSchema.safeParse(household)
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.moveOutDate).toBeDefined()
        }
    })

    it('should reject household with missing heynaboId', () => {
        const invalidHousehold = {
            ...HouseholdFactory.defaultHouseholdData(),
            heynaboId: undefined
        }

        const result = HouseholdCreateSchema.safeParse(invalidHousehold)
        expect(result.success).toBe(false)
    })

    it('should reject household with name too long (101 chars)', () => {
        const invalidHousehold = {
            ...HouseholdFactory.defaultHouseholdData(),
            name: 'a'.repeat(101)
        }

        const result = HouseholdCreateSchema.safeParse(invalidHousehold)
        expect(result.success).toBe(false)
    })
})

// ============================================================================
// GETHOUSHOLDSHORTNAME ADDITIONAL TESTS
// ============================================================================

describe('getHouseholdShortName - Additional Test Cases', () => {
    it.each([
        {address: ' Andeby Vej 2 ', expected: 'AV_2', description: 'with leading/trailing spaces'},
        {address: ' Heynabo! ', expected: 'H', description: 'non-alphanumeric characters'},
        {address: ' 123 ', expected: '123', description: 'only numbers with spaces'}
    ])('should generate "$expected" from "$address" ($description)', ({address, expected}) => {
        expect(getHouseholdShortName(address)).toBe(expected)
    })

    it('should produce URL-safe shortNames that survive encode/decode round-trip', () => {
        const testAddresses = [
            'Skråningen 31',
            'Tvethøjvej 43, 1',
            'Abbey Road 1 th.',
            'Heynabo!'
        ]

        testAddresses.forEach(address => {
            const shortName = getHouseholdShortName(address)
            const encoded = encodeURIComponent(shortName)
            const decoded = decodeURIComponent(encoded)
            expect(decoded).toBe(shortName)
        })
    })
})

// ============================================================================
// HOUSEHOLD DESERIALIZATION ROUNDTRIP TESTS
// ============================================================================

describe('useCoreValidation - Household Deserialization Roundtrip Tests', () => {
    const {
        deserializeInhabitantDisplay,
        deserializeHouseholdDisplay,
        deserializeHouseholdDetail,
        serializeWeekDayMap,
        createDefaultWeekdayMap
    } = useCoreValidation()

    describe('deserializeInhabitantDisplay additional tests', () => {
        it('should deserialize inhabitant from factory data', () => {
            const inhabitantData = HouseholdFactory.defaultInhabitantData()
            const dinnerPrefs = createDefaultWeekdayMap(DinnerMode.DINEIN)

            // Simulate database serialized format
            const serialized = {
                ...inhabitantData,
                id: 1,
                householdId: 1,
                birthDate: '1990-01-15',
                dinnerPreferences: serializeWeekDayMap(dinnerPrefs)
            }

            const result = deserializeInhabitantDisplay(serialized)

            expect(result.birthDate).toBeInstanceOf(Date)
            expect(result.dinnerPreferences?.mandag).toBe(DinnerMode.DINEIN)
            expect(result.dinnerPreferences?.tirsdag).toBe(DinnerMode.DINEIN)
        })
    })

    describe('deserializeHouseholdDisplay additional tests', () => {
        it('should deserialize household summary from factory data with dinnerPreferences', () => {
            const householdData = HouseholdFactory.defaultHouseholdData()
            const inhabitantData = HouseholdFactory.defaultInhabitantData()

            const serialized = {
                ...householdData,
                id: 1,
                movedInDate: '2020-01-01',
                moveOutDate: null,
                inhabitants: [
                    {
                        ...inhabitantData,
                        id: 10,
                        birthDate: inhabitantData.birthDate?.toISOString(),
                        dinnerPreferences: serializeWeekDayMap(inhabitantData.dinnerPreferences!)
                    }
                ]
            }

            const result = deserializeHouseholdDisplay(serialized)

            expect(result.id).toBe(1)
            expect(result.shortName).toBe(getHouseholdShortName(householdData.address))
            expect(result.movedInDate).toBeInstanceOf(Date)
            expect(result.inhabitants[0].birthDate).toBeInstanceOf(Date)
            expect(result.inhabitants[0].dinnerPreferences).toBeDefined()
            expect(result.inhabitants[0].dinnerPreferences?.mandag).toBe(DinnerMode.DINEIN)
        })

        it.each([
            {moveOutDate: null, description: 'null moveOutDate'},
            {moveOutDate: '2024-12-31', description: 'with moveOutDate'}
        ])('should handle $description', ({moveOutDate}) => {
            const householdData = HouseholdFactory.defaultHouseholdData()

            const serialized = {
                ...householdData,
                id: 1,
                movedInDate: '2020-01-01',
                moveOutDate,
                inhabitants: []
            }

            const result = deserializeHouseholdDisplay(serialized)

            if (moveOutDate) {
                expect(result.moveOutDate).toBeInstanceOf(Date)
            } else {
                expect(result.moveOutDate).toBeNull()
            }
        })
    })

    describe('deserializeHouseholdDetail additional tests', () => {
        it('should deserialize household with inhabitants from factory data', () => {
            const householdData = HouseholdFactory.defaultHouseholdData()
            const inhabitantData = HouseholdFactory.defaultInhabitantData()
            const dinnerPrefs = createDefaultWeekdayMap(DinnerMode.DINEIN)

            const serialized = {
                ...householdData,
                id: 1,
                movedInDate: '2020-01-01',
                moveOutDate: null,
                inhabitants: [
                    {
                        ...inhabitantData,
                        id: 10,
                        householdId: 1,
                        birthDate: '1990-01-15',
                        dinnerPreferences: serializeWeekDayMap(dinnerPrefs)
                    }
                ]
            }

            const result = deserializeHouseholdDetail(serialized)

            expect(result.shortName).toBe(getHouseholdShortName(householdData.address))
            expect(result.movedInDate).toBeInstanceOf(Date)
            expect(result.inhabitants[0].birthDate).toBeInstanceOf(Date)
            expect(result.inhabitants[0].dinnerPreferences?.mandag).toBe(DinnerMode.DINEIN)
        })
    })

    describe('Roundtrip Tests', () => {
        // Type aliases for roundtrip test data
        type SerializeFn = (data: Record<string, unknown>) => Record<string, unknown>
        type CheckFieldsFn = (original: Record<string, unknown>, deserialized: Record<string, unknown>) => void

        interface RoundtripTestCase {
            type: string
            getData: () => Record<string, unknown>
            serialize: SerializeFn
            deserialize: (data: Record<string, unknown>) => Record<string, unknown>
            checkFields: CheckFieldsFn
        }

        const testCases: RoundtripTestCase[] = [
            {
                type: 'inhabitant',
                getData: () => ({
                    ...HouseholdFactory.defaultInhabitantData(),
                    id: 1,
                    householdId: 1,
                    birthDate: new Date('1990-01-15'),
                    dinnerPreferences: createDefaultWeekdayMap(DinnerMode.DINEIN)
                }),
                serialize: (data) => ({
                    ...data,
                    birthDate: (data.birthDate as Date).toISOString(),
                    dinnerPreferences: serializeWeekDayMap(data.dinnerPreferences as Record<string, unknown>)
                }),
                deserialize: deserializeInhabitantDisplay,
                checkFields: (original, deserialized) => {
                    expect(deserialized.birthDate).toBeInstanceOf(Date)
                    expect((deserialized.birthDate as Date).getTime()).toBe((original.birthDate as Date).getTime())
                    expect(deserialized.dinnerPreferences).toEqual(original.dinnerPreferences)
                }
            },
            {
                type: 'household summary',
                getData: () => ({
                    ...HouseholdFactory.defaultHouseholdData(),
                    id: 1,
                    movedInDate: new Date('2020-01-01'),
                    moveOutDate: new Date('2024-12-31'),
                    inhabitants: [
                        {
                            ...HouseholdFactory.defaultInhabitantData(),
                            id: 10,
                            birthDate: new Date('1990-01-15')
                        }
                    ]
                }),
                serialize: (data) => ({
                    ...data,
                    movedInDate: (data.movedInDate as Date).toISOString(),
                    moveOutDate: (data.moveOutDate as Date | null)?.toISOString(),
                    inhabitants: (data.inhabitants as Record<string, unknown>[]).map((i) => ({
                        ...i,
                        birthDate: (i.birthDate as Date | null)?.toISOString(),
                        dinnerPreferences: i.dinnerPreferences ? serializeWeekDayMap(i.dinnerPreferences as Record<string, unknown>) : null
                    }))
                }),
                deserialize: deserializeHouseholdDisplay,
                checkFields: (original, deserialized) => {
                    expect(deserialized.movedInDate).toBeInstanceOf(Date)
                    expect((deserialized.movedInDate as Date).getTime()).toBe((original.movedInDate as Date).getTime())
                    expect(deserialized.shortName).toBe(getHouseholdShortName(original.address as string))
                    expect((deserialized.inhabitants as Record<string, unknown>[])[0].birthDate).toBeInstanceOf(Date)
                    expect((deserialized.inhabitants as Record<string, unknown>[])[0].dinnerPreferences).toEqual((original.inhabitants as Record<string, unknown>[])[0].dinnerPreferences)
                }
            },
            {
                type: 'household with inhabitants',
                getData: () => ({
                    ...HouseholdFactory.defaultHouseholdData(),
                    id: 1,
                    movedInDate: new Date('2020-01-01'),
                    moveOutDate: null,
                    inhabitants: [
                        {
                            ...HouseholdFactory.defaultInhabitantData(),
                            id: 10,
                            householdId: 1,
                            birthDate: new Date('1990-01-15'),
                            dinnerPreferences: createDefaultWeekdayMap(DinnerMode.DINEIN)
                        }
                    ]
                }),
                serialize: (data) => ({
                    ...data,
                    movedInDate: (data.movedInDate as Date).toISOString(),
                    inhabitants: (data.inhabitants as Record<string, unknown>[]).map((i) => ({
                        ...i,
                        birthDate: (i.birthDate as Date | null)?.toISOString(),
                        dinnerPreferences: i.dinnerPreferences ? serializeWeekDayMap(i.dinnerPreferences as Record<string, unknown>) : null
                    }))
                }),
                deserialize: deserializeHouseholdDetail,
                checkFields: (original, deserialized) => {
                    expect((deserialized.inhabitants as Record<string, unknown>[])[0].birthDate).toBeInstanceOf(Date)
                    expect(((deserialized.inhabitants as Record<string, unknown>[])[0].birthDate as Date).getTime()).toBe(((original.inhabitants as Record<string, unknown>[])[0].birthDate as Date).getTime())
                    expect((deserialized.inhabitants as Record<string, unknown>[])[0].dinnerPreferences).toEqual((original.inhabitants as Record<string, unknown>[])[0].dinnerPreferences)
                }
            }
        ]

        it.each(testCases)('should roundtrip $type', ({getData, serialize, deserialize, checkFields}) => {
            const original = getData()
            const serialized = serialize(original)
            const deserialized = deserialize(serialized)

            checkFields(original, deserialized)
        })
    })
})