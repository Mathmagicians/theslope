import {describe, it, expect} from 'vitest'
import {useHouseholdValidation, getHouseholdShortName} from '~/composables/useHouseholdValidation'
import {HouseholdFactory} from '../../e2e/testDataFactories/householdFactory'

describe('useHouseholdValidation', () => {
    const {
        HouseholdCreateSchema,
        HouseholdCreateWithInhabitantsSchema,
        InhabitantCreateSchema,
        createDefaultWeekdayMap
    } = useHouseholdValidation()

    describe('HouseholdCreateSchema', () => {
        it('should accept valid household data from factory', () => {
            const validHousehold = HouseholdFactory.defaultHouseholdData()

            const result = HouseholdCreateSchema.safeParse(validHousehold)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.heynaboId).toBeDefined()
                expect(result.data.pbsId).toBeDefined()
                expect(result.data.name).toBeDefined()
                expect(result.data.address).toBeDefined()
                expect(result.data.movedInDate).toBeInstanceOf(Date)
            }
        })

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

        it('should reject household with empty name', () => {
            const invalidHousehold = {
                ...HouseholdFactory.defaultHouseholdData(),
                name: ""
            }

            const result = HouseholdCreateSchema.safeParse(invalidHousehold)
            expect(result.success).toBe(false)
        })

        it('should reject household with name too long', () => {
            const invalidHousehold = {
                ...HouseholdFactory.defaultHouseholdData(),
                name: "a".repeat(101)
            }

            const result = HouseholdCreateSchema.safeParse(invalidHousehold)
            expect(result.success).toBe(false)
        })

        it('should reject household with empty address', () => {
            const invalidHousehold = {
                ...HouseholdFactory.defaultHouseholdData(),
                address: ""
            }

            const result = HouseholdCreateSchema.safeParse(invalidHousehold)
            expect(result.success).toBe(false)
        })

        it('should reject household with negative heynaboId', () => {
            const invalidHousehold = {
                ...HouseholdFactory.defaultHouseholdData(),
                heynaboId: -1
            }

            const result = HouseholdCreateSchema.safeParse(invalidHousehold)
            expect(result.success).toBe(false)
        })
    })

    describe('InhabitantCreateSchema', () => {
        it('should accept valid inhabitant data from factory', () => {
            const validInhabitant = {
                ...HouseholdFactory.defaultInhabitantData(),
                householdId: 1
            }

            const result = InhabitantCreateSchema.safeParse(validInhabitant)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.heynaboId).toBeDefined()
                expect(result.data.householdId).toBe(1)
                expect(result.data.name).toBeDefined()
                expect(result.data.lastName).toBeDefined()
            }
        })

        it('should accept inhabitant with optional user', () => {
            const inhabitantWithUser = {
                ...HouseholdFactory.defaultInhabitantData(),
                householdId: 1,
                user: {
                    email: "john@example.com",
                    passwordHash: "hashedpassword123",
                    systemRole: "USER" as const
                }
            }

            const result = InhabitantCreateSchema.safeParse(inhabitantWithUser)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.user).toBeDefined()
                expect(result.data.user?.email).toBe("john@example.com")
            }
        })

        it('should reject inhabitant with empty name', () => {
            const invalidInhabitant = {
                ...HouseholdFactory.defaultInhabitantData(),
                householdId: 1,
                name: ""
            }

            const result = InhabitantCreateSchema.safeParse(invalidInhabitant)
            expect(result.success).toBe(false)
        })

        it('should reject inhabitant with empty lastName', () => {
            const invalidInhabitant = {
                ...HouseholdFactory.defaultInhabitantData(),
                householdId: 1,
                lastName: ""
            }

            const result = InhabitantCreateSchema.safeParse(invalidInhabitant)
            expect(result.success).toBe(false)
        })

        it('should accept inhabitant with optional pictureUrl', () => {
            const inhabitant = {
                ...HouseholdFactory.defaultInhabitantData(),
                householdId: 1,
                pictureUrl: "https://example.com/photo.jpg"
            }

            const result = InhabitantCreateSchema.safeParse(inhabitant)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.pictureUrl).toBe("https://example.com/photo.jpg")
            }
        })

        it('should reject inhabitant with invalid pictureUrl', () => {
            const invalidInhabitant = {
                ...HouseholdFactory.defaultInhabitantData(),
                householdId: 1,
                pictureUrl: "not-a-url"
            }

            const result = InhabitantCreateSchema.safeParse(invalidInhabitant)
            expect(result.success).toBe(false)
        })

        it('should accept inhabitant with valid dinnerPreferences WeekDayMap', () => {
            const inhabitant = {
                ...HouseholdFactory.defaultInhabitantData(),
                householdId: 1,
                dinnerPreferences: createDefaultWeekdayMap(['DINEIN', 'TAKEAWAY', 'NONE', 'DINEIN', 'TAKEAWAY', 'NONE', 'DINEIN'])
            }

            const result = InhabitantCreateSchema.safeParse(inhabitant)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.dinnerPreferences?.mandag).toBe('DINEIN')
                expect(result.data.dinnerPreferences?.tirsdag).toBe('TAKEAWAY')
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
                    const map = createDefaultWeekdayMap(['DINEIN', 'DINEIN', 'DINEIN', 'DINEIN', 'DINEIN', 'DINEIN', 'DINEIN'])
                    map.mandag = 'INVALID_MODE' as any
                    return map
                },
                description: 'invalid DinnerMode value'
            },
            {
                getData: () => {
                    const map = createDefaultWeekdayMap(['DINEIN', 'TAKEAWAY', 'NONE', 'DINEIN', 'DINEIN', 'DINEIN', 'DINEIN']) as any
                    delete map.onsdag
                    delete map.torsdag
                    return map
                },
                description: 'incomplete WeekDayMap (missing days)'
            }
        ])('should reject inhabitant with $description in dinnerPreferences', ({getData, description}) => {
            const invalidInhabitant = {
                ...HouseholdFactory.defaultInhabitantData(),
                householdId: 1,
                dinnerPreferences: getData()
            }

            const result = InhabitantCreateSchema.safeParse(invalidInhabitant)
            expect(result.success).toBe(false)
        })
    })

    describe('WeekDayMap Serialization', () => {
        const {serializeWeekDayMap, deserializeWeekDayMap, createDefaultWeekdayMap} = useHouseholdValidation()

        it('should serialize and deserialize WeekDayMap correctly', () => {
            const weekDayMap = createDefaultWeekdayMap(['DINEIN', 'TAKEAWAY', 'NONE', 'DINEIN', 'TAKEAWAY', 'NONE', 'DINEIN'])

            const serialized = serializeWeekDayMap(weekDayMap)
            expect(typeof serialized).toBe('string')

            const deserialized = deserializeWeekDayMap(serialized)
            expect(deserialized).toEqual(weekDayMap)
        })
    })

    describe('HouseholdCreateWithInhabitantsSchema', () => {
        it('should accept household without inhabitants', () => {
            const householdOnly = HouseholdFactory.defaultHouseholdData()

            const result = HouseholdCreateWithInhabitantsSchema.safeParse(householdOnly)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.inhabitants).toBeUndefined()
            }
        })

        it('should accept household with empty inhabitants array', () => {
            const household = {
                ...HouseholdFactory.defaultHouseholdData(),
                inhabitants: []
            }

            const result = HouseholdCreateWithInhabitantsSchema.safeParse(household)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.inhabitants).toEqual([])
            }
        })

        it('should accept household with one inhabitant', () => {
            const household = {
                ...HouseholdFactory.defaultHouseholdData(),
                inhabitants: [
                    HouseholdFactory.defaultInhabitantData('inhabitant1')
                ]
            }

            const result = HouseholdCreateWithInhabitantsSchema.safeParse(household)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.inhabitants).toHaveLength(1)
                expect(result.data.inhabitants![0]?.name).toBeDefined()
                expect(result.data.inhabitants![0]?.lastName).toBeDefined()
            }
        })

        it('should accept household with multiple inhabitants', () => {
            const household = {
                ...HouseholdFactory.defaultHouseholdData(),
                inhabitants: [
                    HouseholdFactory.defaultInhabitantData('inhabitant1'),
                    HouseholdFactory.defaultInhabitantData('inhabitant2'),
                    HouseholdFactory.defaultInhabitantData('inhabitant3')
                ]
            }

            const result = HouseholdCreateWithInhabitantsSchema.safeParse(household)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.inhabitants).toHaveLength(3)
            }
        })

        it('should accept inhabitants without householdId (omitted in nested schema)', () => {
            const inhabitantData = HouseholdFactory.defaultInhabitantData()
            // Remove householdId to test omit behavior
            const {householdId, ...inhabitantWithoutHouseholdId} = inhabitantData as any

            const household = {
                ...HouseholdFactory.defaultHouseholdData(),
                inhabitants: [inhabitantWithoutHouseholdId]
            }

            const result = HouseholdCreateWithInhabitantsSchema.safeParse(household)
            expect(result.success).toBe(true)
        })

        it('should reject household with invalid inhabitant data', () => {
            const household = {
                ...HouseholdFactory.defaultHouseholdData(),
                inhabitants: [
                    {
                        ...HouseholdFactory.defaultInhabitantData(),
                        name: "" // Invalid - empty name
                    }
                ]
            }

            const result = HouseholdCreateWithInhabitantsSchema.safeParse(household)
            expect(result.success).toBe(false)
        })

        it('should accept inhabitant with user profile in nested creation', () => {
            const household = {
                ...HouseholdFactory.defaultHouseholdData(),
                inhabitants: [
                    {
                        ...HouseholdFactory.defaultInhabitantData(),
                        user: {
                            email: "john@example.com",
                            passwordHash: "hashedpassword123",
                            systemRole: "USER" as const
                        }
                    }
                ]
            }

            const result = HouseholdCreateWithInhabitantsSchema.safeParse(household)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.inhabitants![0]?.user).toBeDefined()
                expect(result.data.inhabitants![0]?.user?.email).toBe("john@example.com")
            }
        })
    })

    describe('edge cases', () => {
        it('should handle maximum valid name lengths', () => {
            const household = {
                ...HouseholdFactory.defaultHouseholdData(),
                name: "a".repeat(100), // exactly 100 characters
                address: "a".repeat(200) // exactly 200 characters
            }

            const result = HouseholdCreateSchema.safeParse(household)
            expect(result.success).toBe(true)
        })

        it('should coerce date strings to Date objects', () => {
            const household = {
                ...HouseholdFactory.defaultHouseholdData(),
                movedInDate: "2024-01-01" as any // String instead of Date
            }

            const result = HouseholdCreateSchema.safeParse(household)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.movedInDate).toBeInstanceOf(Date)
            }
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
})

describe('getHouseholdShortName', () => {
    it.each([
        {
            address: 'Skråningen 31',
            expected: 'S_31',
            description: 'single word + number'
        },
        {
            address: 'Tvethøjvej 43, 1',
            expected: 'T_43_1',
            description: 'single word + multiple numbers with comma'
        },
        {
            address: 'Abbey Road 1 th.',
            expected: 'AR_1_th',
            description: 'multiple words + number + text suffix'
        },
        {
            address: 'Penny Lane 4, 1 4',
            expected: 'PL_4_1_4',
            description: 'multiple words + multiple numbers'
        },
        {
            address: ' Andeby Vej 2 ',
            expected: 'AV_2',
            description: 'number with space + word (should replace spaces with underscores)'
        },
        {
            address: ' Heynabo! ',
            expected: 'H',
            description: 'non alphanumeric characters in words'
        },
        {
            address: ' 123 ',
            expected: '123',
            description: 'number with space + word (should replace spaces with underscores)'
        }

    ])('returns $expected for $description ($address)', ({address, expected}) => {
        expect(getHouseholdShortName(address)).toBe(expected)
    })

    it('produces URL-safe shortNames that survive encode/decode round-trip', () => {
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

describe('Household Deserialization (ADR-010)', () => {
    const {
        deserializeInhabitant,
        deserializeHouseholdSummary,
        deserializeHouseholdWithInhabitants,
        serializeWeekDayMap,
        createDefaultWeekdayMap
    } = useHouseholdValidation()

    describe('deserializeInhabitant', () => {
        it('should deserialize inhabitant from factory data', () => {
            const inhabitantData = HouseholdFactory.defaultInhabitantData()
            const dinnerPrefs = createDefaultWeekdayMap(['DINEIN', 'TAKEAWAY', 'NONE', 'DINEIN', 'TAKEAWAY', 'NONE', 'DINEIN'])

            // Simulate database serialized format
            const serialized = {
                ...inhabitantData,
                householdId: 1,
                birthDate: '1990-01-15',
                dinnerPreferences: serializeWeekDayMap(dinnerPrefs)
            }

            const result = deserializeInhabitant(serialized)

            expect(result.birthDate).toBeInstanceOf(Date)
            expect(result.dinnerPreferences?.mandag).toBe('DINEIN')
            expect(result.dinnerPreferences?.tirsdag).toBe('TAKEAWAY')
        })

        it.each([
            {birthDate: null, dinnerPreferences: null, description: 'null values'}
        ])('should handle $description', ({birthDate, dinnerPreferences}) => {
            const inhabitantData = HouseholdFactory.defaultInhabitantData()

            const serialized = {
                ...inhabitantData,
                householdId: 1,
                birthDate,
                dinnerPreferences
            }

            const result = deserializeInhabitant(serialized)
            expect(result.birthDate).toBe(birthDate)
            expect(result.dinnerPreferences).toBe(dinnerPreferences)
        })
    })

    describe('deserializeHouseholdSummary', () => {
        it('should deserialize household summary from factory data', () => {
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
                        birthDate: '1990-01-15'
                    }
                ]
            }

            const result = deserializeHouseholdSummary(serialized)

            expect(result.id).toBe(1)
            expect(result.shortName).toBe(getHouseholdShortName(householdData.address))
            expect(result.movedInDate).toBeInstanceOf(Date)
            expect(result.inhabitants[0].birthDate).toBeInstanceOf(Date)
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

            const result = deserializeHouseholdSummary(serialized)

            if (moveOutDate) {
                expect(result.moveOutDate).toBeInstanceOf(Date)
            } else {
                expect(result.moveOutDate).toBeNull()
            }
        })
    })

    describe('deserializeHouseholdWithInhabitants', () => {
        it('should deserialize household with inhabitants from factory data', () => {
            const householdData = HouseholdFactory.defaultHouseholdData()
            const inhabitantData = HouseholdFactory.defaultInhabitantData()
            const dinnerPrefs = createDefaultWeekdayMap(['DINEIN', 'TAKEAWAY', 'NONE', 'DINEIN', 'TAKEAWAY', 'NONE', 'DINEIN'])

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

            const result = deserializeHouseholdWithInhabitants(serialized)

            expect(result.shortName).toBe(getHouseholdShortName(householdData.address))
            expect(result.movedInDate).toBeInstanceOf(Date)
            expect(result.inhabitants[0].birthDate).toBeInstanceOf(Date)
            expect(result.inhabitants[0].dinnerPreferences?.mandag).toBe('DINEIN')
        })
    })

    describe('Roundtrip Tests', () => {
        it.each([
            {
                type: 'inhabitant',
                getData: () => ({
                    ...HouseholdFactory.defaultInhabitantData(),
                    householdId: 1,
                    birthDate: new Date('1990-01-15'),
                    dinnerPreferences: createDefaultWeekdayMap(['DINEIN', 'TAKEAWAY', 'NONE', 'DINEIN', 'TAKEAWAY', 'NONE', 'DINEIN'])
                }),
                serialize: (data: any) => ({
                    ...data,
                    birthDate: data.birthDate.toISOString(),
                    dinnerPreferences: serializeWeekDayMap(data.dinnerPreferences)
                }),
                deserialize: deserializeInhabitant,
                checkFields: (original: any, deserialized: any) => {
                    expect(deserialized.birthDate).toBeInstanceOf(Date)
                    expect(deserialized.birthDate.getTime()).toBe(original.birthDate.getTime())
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
                serialize: (data: any) => ({
                    ...data,
                    movedInDate: data.movedInDate.toISOString(),
                    moveOutDate: data.moveOutDate?.toISOString(),
                    inhabitants: data.inhabitants.map((i: any) => ({
                        ...i,
                        birthDate: i.birthDate?.toISOString()
                    }))
                }),
                deserialize: deserializeHouseholdSummary,
                checkFields: (original: any, deserialized: any) => {
                    expect(deserialized.movedInDate).toBeInstanceOf(Date)
                    expect(deserialized.movedInDate.getTime()).toBe(original.movedInDate.getTime())
                    expect(deserialized.shortName).toBe(getHouseholdShortName(original.address))
                    expect(deserialized.inhabitants[0].birthDate).toBeInstanceOf(Date)
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
                            dinnerPreferences: createDefaultWeekdayMap(['DINEIN', 'TAKEAWAY', 'NONE', 'DINEIN', 'TAKEAWAY', 'NONE', 'DINEIN'])
                        }
                    ]
                }),
                serialize: (data: any) => ({
                    ...data,
                    movedInDate: data.movedInDate.toISOString(),
                    inhabitants: data.inhabitants.map((i: any) => ({
                        ...i,
                        birthDate: i.birthDate?.toISOString(),
                        dinnerPreferences: i.dinnerPreferences ? serializeWeekDayMap(i.dinnerPreferences) : null
                    }))
                }),
                deserialize: deserializeHouseholdWithInhabitants,
                checkFields: (original: any, deserialized: any) => {
                    expect(deserialized.inhabitants[0].birthDate).toBeInstanceOf(Date)
                    expect(deserialized.inhabitants[0].birthDate.getTime()).toBe(original.inhabitants[0].birthDate.getTime())
                    expect(deserialized.inhabitants[0].dinnerPreferences).toEqual(original.inhabitants[0].dinnerPreferences)
                }
            }
        ])('should roundtrip $type', ({getData, serialize, deserialize, checkFields}) => {
            const original = getData()
            const serialized = serialize(original)
            const deserialized = deserialize(serialized)

            checkFields(original, deserialized)
        })
    })
})
