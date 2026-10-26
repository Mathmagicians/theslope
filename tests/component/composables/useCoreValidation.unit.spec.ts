/**
 * Unit tests for useCoreValidation composable
 * Tests User, Inhabitant, and Household validation schemas
 * Verifies fragment pattern works correctly and eliminates circular dependencies
 */

import {describe, it, expect} from 'vitest'
import {useCoreValidation, getHouseholdShortName} from '~/composables/useCoreValidation'
import type {UserCreate} from '~/composables/useCoreValidation'
import {useBookingValidation, type DinnerMode as DinnerModeType} from '~/composables/useBookingValidation'
import {DEFAULT_APPEARANCE, DEFAULT_NOTIFICATION_CHANNELS, useUserPreferenceValidation} from '~/composables/useUserPreferenceValidation'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import type {WeekDayMap} from '~/types/dateTypes'

const DinnerMode = useBookingValidation().DinnerModeSchema.enum
const SystemRole = useCoreValidation().SystemRoleSchema.enum
const {NotificationChannelSchema, PaletteSchema, TextScaleSchema} = useUserPreferenceValidation()

/** The JSON columns a User row carries in the database: roles plus the two preference columns (ADR-010) */
const serializedUserColumns = (user: UserCreate) => ({
    systemRoles: JSON.stringify(user.systemRoles),
    notificationChannels: JSON.stringify(user.notificationChannels),
    appearance: JSON.stringify(user.appearance)
})

// ============================================================================
// USER VALIDATION TESTS
// ============================================================================

describe('useCoreValidation - User Schemas', () => {
    const {
        BaseUserSchema,
        UserCreateSchema
    } = useCoreValidation()

    it.each([
        ['BaseUserSchema', () => BaseUserSchema, {...UserFactory.defaultUser(), id: 1}],
        ['UserCreateSchema', () => UserCreateSchema, UserFactory.defaultUser()]
    ])('%s should parse factory data', (_name, getSchema, input) => {
        expect(() => getSchema().parse(input)).not.toThrow()
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
        InhabitantDetailSchema,
        deserializeInhabitantDisplay,
        deserializeInhabitantDetail,
        createDefaultWeekdayMap,
        serializeWeekDayMap
    } = useCoreValidation()

    it.each([
        ['BaseInhabitantSchema', () => BaseInhabitantSchema, {...HouseholdFactory.defaultInhabitantData(), id: 1}],
        ['InhabitantCreateSchema', () => InhabitantCreateSchema, HouseholdFactory.defaultInhabitantData()],
        ['InhabitantDisplaySchema', () => InhabitantDisplaySchema, {...HouseholdFactory.defaultInhabitantData(), id: 1}],
        ['InhabitantDetailSchema', () => InhabitantDetailSchema, {...HouseholdFactory.defaultInhabitantData(), id: 1, dinnerPreferences: createDefaultWeekdayMap(DinnerMode.DINEIN)}]
    ])('%s should parse factory data', (_name, getSchema, input) => {
        expect(() => getSchema().parse(input)).not.toThrow()
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
                expect(deserialized.dinnerPreferences).toEqual(createDefaultWeekdayMap(DinnerMode.DINEIN))
            } else {
                expect(deserialized.dinnerPreferences).toBeNull()
            }
        })
    })

    describe('deserializeInhabitantDetail', () => {
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
            }
        ])('should deserialize inhabitant detail $testCase', ({birthDate, dinnerPreferences, expectBirthDate, expectDinnerPrefs}) => {
            const serialized = {
                ...HouseholdFactory.defaultInhabitantData(),
                id: 1,
                householdId: 1,
                birthDate,
                dinnerPreferences
            }
            const deserialized = deserializeInhabitantDetail(serialized)

            // Detail schema requires dinnerPreferences: the key is present, null when the column is empty
            expect('dinnerPreferences' in deserialized).toBe(true)

            if (expectBirthDate) {
                expect(deserialized.birthDate).toBeInstanceOf(Date)
                expect(deserialized.birthDate?.getFullYear()).toBe(1990)
            } else {
                expect(deserialized.birthDate).toBeNull()
            }

            if (expectDinnerPrefs) {
                expect(deserialized.dinnerPreferences).not.toBeNull()
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
        HouseholdDetailSchema,
        deserializeHouseholdDisplay,
        deserializeHouseholdDetail
    } = useCoreValidation()

    it.each([
        ['BaseHouseholdSchema', () => BaseHouseholdSchema, {...HouseholdFactory.defaultHouseholdData(), id: 1}],
        ['HouseholdCreateSchema', () => HouseholdCreateSchema, HouseholdFactory.defaultHouseholdData()]
    ])('%s should parse factory data', (_name, getSchema, input) => {
        expect(() => getSchema().parse(input)).not.toThrow()
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
            expect(deserialized.inhabitants![0]!.birthDate).toBeInstanceOf(Date)
            expect(deserialized.inhabitants![0]!.name).toBe(serialized.inhabitants[0]!.name)
        })

        const householdRowWithAllergies = () => ({
            ...HouseholdFactory.defaultHouseholdData(),
            id: 1,
            movedInDate: '2020-01-01',
            moveOutDate: null,
            inhabitants: [
                {...HouseholdFactory.defaultInhabitantData(), id: 1, householdId: 1, birthDate: null, dinnerPreferences: null, allergies: AllergyFactory.serializedAllergies(2, 1)},
                {...HouseholdFactory.defaultInhabitantData(), id: 2, householdId: 1, birthDate: null, dinnerPreferences: null, allergies: []}
            ]
        })

        it.each([
            {through: 'the deserializer', read: () => deserializeHouseholdDetail(householdRowWithAllergies())},
            {through: 'the schema', read: () => HouseholdDetailSchema.parse(JSON.parse(JSON.stringify(deserializeHouseholdDetail(householdRowWithAllergies()))))}
        ])('keeps each inhabitant\'s allergies with their allergy type through $through', ({read}) => {
            const [withAllergies, withoutAllergies] = read().inhabitants

            expect(withAllergies!.allergies?.map(allergy => allergy.allergyType)).toEqual(AllergyFactory.createMockAllergyTypes())
            expect(withAllergies!.allergies?.every(allergy => allergy.inhabitantId === withAllergies!.id)).toBe(true)
            expect(withoutAllergies!.allergies).toEqual([])
        })
    })
})

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe('getHouseholdShortName', () => {
    it.each([
        {address: 'Skråningen 31', expected: 'S_31'},
        {address: 'Abbey Road 1 th.', expected: 'AR_1_th'},
        {address: 'Penny Lane 4, 1 4', expected: 'PL_4_1_4'},
        {address: 'Østerbrogade 123, 2.', expected: 'Ø_123_2'},
        // Dot format should produce same result as comma-space format
        {address: 'Smedekildevej 37.1', expected: 'S_37_1'},
        {address: 'Smedekildevej 37, 1', expected: 'S_37_1'},
        {address: ' Andeby Vej 2 ', expected: 'AV_2'},
        {address: ' Heynabo! ', expected: 'H'},
        {address: ' 123 ', expected: '123'}
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
        UserDetailSchema,
        HouseholdDisplaySchema,
        deserializeUserDetail,
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
        expect(result.Inhabitant?.householdId).toBe(user.Inhabitant.householdId) // Lightweight scalar, useful for admin context
    })

    it('should parse UserDetail with nested household', () => {
        const user = UserFactory.defaultUserWithInhabitant('test-userdetail')
        const result = UserDetailSchema.parse(user)

        expect(result.Inhabitant).toBeDefined()
        expect(result.Inhabitant?.household).toBeDefined()
        expect(result.Inhabitant?.household.shortName).toBeDefined()
    })

    it('should deserialize UserDetail from database output', () => {
        const defaultPrefs = createDefaultWeekdayMap(DinnerMode.DINEIN)
        const serialized = {
            ...UserFactory.defaultUser(),
            id: 1,
            ...serializedUserColumns({...UserFactory.defaultUser(), systemRoles: [SystemRole.ADMIN]}),
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
        const deserialized = deserializeUserDetail(serialized)

        expect(Array.isArray(deserialized.systemRoles)).toBe(true)
        expect(deserialized.Inhabitant?.birthDate).toBeInstanceOf(Date)
        expect(deserialized.Inhabitant?.dinnerPreferences).toBeDefined()
        expect(deserialized.Inhabitant?.dinnerPreferences?.mandag).toBe(DinnerMode.DINEIN)
        expect(deserialized.Inhabitant?.household.shortName).toBeDefined()
    })

    it('should handle deserializeUserDetail with null Inhabitant', () => {
        // GIVEN: A user without inhabitant
        const factoryUser = UserFactory.createAdmin()
        const userData = {...factoryUser, systemRoles: [...factoryUser.systemRoles]}
        const serializedUser = {
            ...userData,
            ...serializedUserColumns(userData),
            id: 1,
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-02'),
            Inhabitant: null
        }

        // WHEN: Deserializing
        const user = deserializeUserDetail(serializedUser)

        // THEN: Inhabitant should be null, systemRoles deserialized
        expect(user.Inhabitant).toBeNull()
        expect(Array.isArray(user.systemRoles)).toBe(true)
        expect(user.systemRoles).toContain(SystemRole.ADMIN)
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
        const [firstInhabitant, secondInhabitant] = result.inhabitants!
        expect(firstInhabitant!.name).toBe(household.inhabitants[0]!.name)
        expect(secondInhabitant!.name).toBe('Jane')
    })
})

// ============================================================================
// SCHEMA VALIDATION EDGE CASES
// ============================================================================

// User contact-field validation MUST be identical between UserCreateSchema and UserUpdateSchema
// (RFC 5322 display-name normalization, phone regex). The /api/admin/users/[id] endpoint
// picks {systemRoles, email, phone} from UserUpdateSchema, so its validation behaviour is
// asserted against the same data set as UserCreateSchema.
describe('useCoreValidation - User Schema Validation Edge Cases', () => {
    const {UserCreateSchema, UserUpdateSchema} = useCoreValidation()

    // Each variant defines: how to build a valid input from a partial set of fields.
    // UserCreateSchema requires email + systemRoles; UserUpdateSchema (picked) accepts any subset.
    const variants = [
        {
            name: 'UserCreateSchema',
            schema: UserCreateSchema,
            withEmail: (email: unknown) => ({email, systemRoles: []}),
            withPhone: (phone: unknown) => ({email: 'test@example.com', phone, systemRoles: []})
        },
        {
            name: 'UserUpdateSchema (picked for [id].post.ts)',
            schema: UserUpdateSchema.pick({systemRoles: true, email: true, phone: true}),
            withEmail: (email: unknown) => ({email}),
            withPhone: (phone: unknown) => ({phone})
        }
    ] as const

    const validEmails = [
        {email: 'simple@example.com', expected: 'simple@example.com', description: 'simple format'},
        {email: 'John Doe <john@example.com>', expected: 'john@example.com', description: 'RFC 5322 with display name'}
    ]
    const phoneCases = [
        {phone: 'abc-def-ghij', shouldPass: false, description: 'reject letters and dashes'},
        {phone: '+45 12345678', shouldPass: true, description: 'accept country code with spaces'},
        {phone: '12345678', shouldPass: true, description: 'accept no country code'}
    ]

    describe.each(variants)('$name', ({schema, withEmail, withPhone}) => {
        it('rejects invalid email: missing @ symbol', () => {
            expect(schema.safeParse(withEmail('not-an-email')).success).toBe(false)
        })

        it.each(validEmails)('accepts and normalizes: $description', ({email, expected}) => {
            const result = schema.safeParse(withEmail(email))
            expect(result.success).toBe(true)
            if (result.success) expect(result.data.email).toBe(expected)
        })

        it.each(phoneCases)('phone: $description', ({phone, shouldPass}) => {
            expect(schema.safeParse(withPhone(phone)).success).toBe(shouldPass)
        })

        it('converts empty string phone to null', () => {
            const result = schema.safeParse(withPhone(''))
            expect(result.success).toBe(true)
            if (result.success) expect(result.data.phone).toBeNull()
        })

        it('accepts null to clear phone', () => {
            const result = schema.safeParse(withPhone(null))
            expect(result.success).toBe(true)
            if (result.success) expect(result.data.phone).toBeNull()
        })
    })

    // Update-only behaviour: any subset of contact fields is valid (id comes from route params).
    it('UserUpdateSchema (picked) allows partial updates', () => {
        const ContactUpdate = UserUpdateSchema.pick({systemRoles: true, email: true, phone: true})
        expect(ContactUpdate.safeParse({email: 'only@example.com'}).success).toBe(true)
        expect(ContactUpdate.safeParse({phone: '+45 12345678'}).success).toBe(true)
        expect(ContactUpdate.safeParse({systemRoles: []}).success).toBe(true)
    })
})

// ============================================================================
// HOUSEHOLD CREATE FORM SCHEMA
// ============================================================================

describe('useCoreValidation - HouseholdCreateFormSchema', () => {
    const {HouseholdCreateFormSchema} = useCoreValidation()

    // Schema without sibling constraints — base case
    const baseSchema = HouseholdCreateFormSchema([])

    const validFormInput = () => ({
        pbsId: 12345,
        address: 'Skråningen 14',
        movedInDate: new Date('2026-05-15')
    })

    // ---------- Happy path + coercion ----------

    it('accepts valid form input and keeps only the form fields (pbsId, address, movedInDate)', () => {
        const result = baseSchema.safeParse(validFormInput())
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.movedInDate).toBeInstanceOf(Date)
            expect(Object.keys(result.data).sort()).toEqual(['address', 'movedInDate', 'pbsId'])
        }
    })

    it('coerces stringified pbsId from HTML number input to integer', () => {
        const result = baseSchema.safeParse({...validFormInput(), pbsId: '12345'})
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.pbsId).toBe(12345)
            expect(typeof result.data.pbsId).toBe('number')
        }
    })

    // ---------- pbsId validation (parametrized) ----------

    it.each([
        ['non-numeric string',        'abc',   'PBS skal være et tal'],
        ['decimal',                   12.5,    'PBS skal være et helt tal'],
        ['zero',                      0,       'PBS skal være positivt']
    ])('rejects pbsId when %s', (_, pbsId, expectedMessage) => {
        const result = baseSchema.safeParse({...validFormInput(), pbsId})
        expect(result.success).toBe(false)
        if (!result.success) {
            const pbsError = result.error.issues.find(i => i.path[0] === 'pbsId')
            expect(pbsError?.message).toBe(expectedMessage)
        }
    })

    // ---------- movedInDate validation (strict z.date() — no coercion) ----------

    it('rejects an ISO date string for movedInDate (no coercion)', () => {
        const result = baseSchema.safeParse({...validFormInput(), movedInDate: '2026-05-15'})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.find(i => i.path[0] === 'movedInDate')).toBeDefined()
        }
    })

    it('uses friendly message when movedInDate is missing', () => {
        const result = baseSchema.safeParse({...validFormInput(), movedInDate: null})
        expect(result.success).toBe(false)
        if (!result.success) {
            const err = result.error.issues.find(i => i.path[0] === 'movedInDate')
            expect(err?.message).toBe('Du skal sætte en indflytningsdato for den nye familie')
        }
    })

    // ---------- Sibling move-out constraints (closure) ----------

    const movedIn = new Date('2026-05-15')
    const dayBefore = new Date('2026-05-14')
    const sameDay = new Date('2026-05-15')
    const dayAfter = new Date('2026-05-16')

    it.each([
        ['no constraints',                     []                                   , true],
        ['constraint before movedInDate',      [dayBefore]                          , true],
        ['constraint equal to movedInDate',    [sameDay]                            , true],
        ['constraint after movedInDate',       [dayAfter]                           , false],
        ['any constraint > movedInDate fails', [dayBefore, dayAfter]                , false]
    ])('sibling constraints: %s → valid=%s', (_, constraints, expectedValid) => {
        const result = HouseholdCreateFormSchema(constraints).safeParse({...validFormInput(), movedInDate: movedIn})
        expect(result.success).toBe(expectedValid)
        if (!result.success) {
            const err = result.error.issues.find(i => i.path[0] === 'movedInDate')
            expect(err?.message).toBe('Ny familie kan ikke flytte ind, så længe den forrige ikke er flyttet ud')
        }
    })
})

// ============================================================================
// HOUSEHOLD CREATE SCHEMA TESTS (with optional inhabitants per ADR-009)
// ============================================================================

describe('useCoreValidation - HouseholdCreateSchema with inhabitants', () => {
    const {HouseholdCreateSchema} = useCoreValidation()

    // Helper to create inhabitant without householdId (as expected by nested schema)
    const createInhabitantWithoutHouseholdId = (salt: string) => {
        const {householdId: _householdId, ...inhabitant} = HouseholdFactory.defaultInhabitantData(salt)
        return inhabitant
    }

    it.each([
        {name: 'no inhabitants', inhabitants: undefined, expectedLength: undefined},
        {name: 'one inhabitant', inhabitants: [createInhabitantWithoutHouseholdId('i1')], expectedLength: 1}
    ])('valid household with $name should parse successfully', ({inhabitants, expectedLength}) => {
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
                passwordHash: 'hashedpassword123'
            }
        }

        const result = InhabitantCreateSchema.safeParse(inhabitantWithUser)
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.user).toBeDefined()
            expect(result.data.user?.email).toBe('john@example.com')
        }
    })

    // The season initialises a person's preferences and the preference write changes them; the create takes none
    it('should parse a create carrying a dinnerPreferences map without dinnerPreferences', () => {
        const result = InhabitantCreateSchema.safeParse({
            ...HouseholdFactory.defaultInhabitantData(),
            dinnerPreferences: createDefaultWeekdayMap(DinnerMode.DINEIN)
        })

        expect(result.success).toBe(true)
        expect(result.data).not.toHaveProperty('dinnerPreferences')
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
                dinnerPreferences: serializeWeekDayMap(data.dinnerPreferences as WeekDayMap<DinnerModeType>)
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
                        birthDate: new Date('1990-01-15'),
                        dinnerPreferences: createDefaultWeekdayMap(DinnerMode.DINEIN)
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
                    dinnerPreferences: i.dinnerPreferences ? serializeWeekDayMap(i.dinnerPreferences as WeekDayMap<DinnerModeType>) : null
                }))
            }),
            deserialize: deserializeHouseholdDisplay,
            checkFields: (original, deserialized) => {
                expect(deserialized.movedInDate).toBeInstanceOf(Date)
                expect((deserialized.movedInDate as Date).getTime()).toBe((original.movedInDate as Date).getTime())
                expect(deserialized.shortName).toBe(getHouseholdShortName(original.address as string))
                const [originalInhabitant] = original.inhabitants as Record<string, unknown>[]
                const [deserializedInhabitant] = deserialized.inhabitants as Record<string, unknown>[]
                expect(deserializedInhabitant).toBeDefined()
                expect(deserializedInhabitant!.birthDate).toBeInstanceOf(Date)
                expect(deserializedInhabitant!.dinnerPreferences).toEqual(originalInhabitant!.dinnerPreferences)
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
                    dinnerPreferences: i.dinnerPreferences ? serializeWeekDayMap(i.dinnerPreferences as WeekDayMap<DinnerModeType>) : null
                }))
            }),
            deserialize: deserializeHouseholdDetail,
            checkFields: (original, deserialized) => {
                expect(deserialized.shortName).toBe(getHouseholdShortName(original.address as string))
                expect(deserialized.movedInDate).toBeInstanceOf(Date)
                const [originalInhabitant] = original.inhabitants as Record<string, unknown>[]
                const [deserializedInhabitant] = deserialized.inhabitants as Record<string, unknown>[]
                expect(deserializedInhabitant).toBeDefined()
                expect(deserializedInhabitant!.birthDate).toBeInstanceOf(Date)
                expect((deserializedInhabitant!.birthDate as Date).getTime()).toBe((originalInhabitant!.birthDate as Date).getTime())
                expect(deserializedInhabitant!.dinnerPreferences).toEqual(originalInhabitant!.dinnerPreferences)
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

// ============================================================================
// USER PREFERENCE COLUMNS (notificationChannels + appearance, ADR-010)
// ============================================================================

describe('useCoreValidation - User preference columns', () => {
    const {
        BaseUserSchema,
        UserDetailSchema,
        UserSessionSchema,
        serializeUserInput,
        deserializeUserDisplay,
        deserializeUserDetail
    } = useCoreValidation()

    const preferences: Pick<UserCreate, 'notificationChannels' | 'appearance'> = {
        notificationChannels: [NotificationChannelSchema.enum.EMAIL, NotificationChannelSchema.enum.SMS],
        appearance: {palette: PaletteSchema.enum['high-contrast'], textScale: TextScaleSchema.enum.large}
    }

    it('GIVEN a user without the columns THEN the domain schema fills the defaults', () => {
        const {notificationChannels: _c, appearance: _a, ...withoutPreferences} = UserFactory.defaultUser()
        const parsed = BaseUserSchema.parse({...withoutPreferences, id: 1})

        expect(parsed.notificationChannels).toEqual(DEFAULT_NOTIFICATION_CHANNELS)
        expect(parsed.appearance).toEqual(DEFAULT_APPEARANCE)
    })

    // A user with roles and preferences of its own, so each JSON column differs from its default
    const user = {...UserFactory.defaultUser(), systemRoles: [SystemRole.ADMIN], ...preferences}

    it('GIVEN domain roles and preferences THEN serializeUserInput writes the three JSON columns as strings', () => {
        expect(serializeUserInput(user)).toMatchObject(serializedUserColumns(user))
    })

    // A User row as the database returns it: the JSON columns as strings, the Heynabo token in passwordHash (ADR-010)
    describe('a User row', () => {
        const row = {...serializeUserInput(user), id: 1, createdAt: new Date(), updatedAt: new Date(), Inhabitant: null}
        // The display read selects no appearance column
        const {appearance: _appearance, ...displayRow} = row
        const deserialized = [
            {as: 'a Display', deserialize: () => deserializeUserDisplay(displayRow),
                parsed: {systemRoles: user.systemRoles, notificationChannels: user.notificationChannels}},
            {as: 'a Detail', deserialize: () => deserializeUserDetail(row),
                parsed: {systemRoles: user.systemRoles, notificationChannels: user.notificationChannels, appearance: user.appearance}}
        ]

        it.each(deserialized)('GIVEN a row WHEN deserialized as $as THEN its JSON columns parse back to domain values', ({deserialize, parsed}) => {
            expect(deserialize()).toMatchObject(parsed)
        })

        it.each(deserialized)('GIVEN a row with a passwordHash WHEN deserialized as $as THEN it carries no passwordHash', ({deserialize}) => {
            expect(row.passwordHash, 'the row carries the token').toBeTruthy()

            expect(deserialize()).not.toHaveProperty('passwordHash')
        })
    })

    it('GIVEN a session user THEN the session carries both columns', () => {
        const user = UserFactory.defaultUserWithInhabitant('test-session', preferences)
        const session = UserSessionSchema.parse({...user, passwordHash: 'heynabo-token'})

        expect(session.notificationChannels).toEqual(preferences.notificationChannels)
        expect(session.appearance).toEqual(preferences.appearance)
        expect(UserDetailSchema.parse(user).appearance).toEqual(preferences.appearance)
    })
})
