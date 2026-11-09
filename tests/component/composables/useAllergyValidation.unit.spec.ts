import {describe, it, expect} from 'vitest'
import {useAllergyValidation} from '~/composables/useAllergyValidation'
import {AllergyFactory} from '../../e2e/testDataFactories/allergyFactory'
import {DinnerEventFactory} from '../../e2e/testDataFactories/dinnerEventFactory'
import {useCoreValidation} from '~/composables/useCoreValidation'

// The schemas are plain zod (lengths, required fields, optional and nullable columns): the cases cover what the
// domain composes - the factory data each layer parses, the nested relations and the deserializer
describe('useAllergyValidation', () => {
    const {
        AllergyTypeCreateSchema,
        AllergyCreateSchema,
        AllergyUpdateSchema,
        AllergyDetailSchema,
        AllergyTypeDetailSchema,
        InhabitantWithAllergiesSchema,
        deserializeInhabitantWithAllergies
    } = useAllergyValidation()

    // Use factory helper functions
    const {createValidAllergyTypeData, createValidAllergyData} = AllergyFactory

    describe('AllergyTypeCreateSchema', () => {
        it('should accept valid allergy type data', () => {
            const validAllergyType = createValidAllergyTypeData()

            const result = AllergyTypeCreateSchema.safeParse(validAllergyType)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.name).toBe('Peanuts')
                expect(result.data.description).toBeDefined()
                expect(result.data.icon).toBe('🥜')
            }
        })
    })

    describe('AllergyCreateSchema', () => {
        it('should accept valid allergy data', () => {
            const validAllergy = createValidAllergyData()

            const result = AllergyCreateSchema.safeParse(validAllergy)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.inhabitantId).toBe(1)
                expect(result.data.allergyTypeId).toBe(1)
                expect(result.data.inhabitantComment).toBe('Meget alvorlig - har EpiPen')
            }
        })
    })

    // An allergy stays with its person: an update never moves it to an inhabitant of another household
    describe('AllergyUpdateSchema', () => {
        it('GIVEN an update body that names an inhabitant WHEN parsing THEN the result carries no inhabitantId', () => {
            const result = AllergyUpdateSchema.parse({...createValidAllergyData({inhabitantId: 2}), id: 1})

            expect(result).not.toHaveProperty('inhabitantId')
        })
    })

    describe('AllergyDetailSchema', () => {
        it('should accept allergy with nested allergyType', () => {
            const allergyWithType = {
                id: 1,
                inhabitantId: 1,
                allergyTypeId: 1,
                inhabitantComment: 'Test comment',
                createdAt: new Date(),
                updatedAt: new Date(),
                allergyType: {
                    id: 1,
                    name: 'Peanuts',
                    description: 'Alvorlig allergi',
                    icon: '🥜'
                },
                inhabitant: {
                    id: 1,
                    heynaboId: 101,
                    householdId: 1,
                    name: 'Test',
                    lastName: 'User',
                    pictureUrl: null,
                    birthDate: null
                }
            }

            const result = AllergyDetailSchema.safeParse(allergyWithType)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.allergyType).toBeDefined()
                expect(result.data.allergyType.name).toBe('Peanuts')
                expect(result.data.allergyType.icon).toBe('🥜')
            }
        })
    })

    describe('AllergyTypeDetailSchema', () => {
        it('should accept allergy type with nested inhabitants array including allergyUpdatedAt', () => {
            const mockAllergyTypes = AllergyFactory.createMockAllergyTypesWithInhabitants()

            const result = AllergyTypeDetailSchema.safeParse(mockAllergyTypes[0])
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.inhabitants).toHaveLength(2)
                expect(result.data.inhabitants[0]!.householdId).toBe(1)
                expect(result.data.inhabitants[0]!.allergyUpdatedAt).toBeInstanceOf(Date)
                expect(result.data.inhabitants[1]!.inhabitantComment).toBe('Mild')
            }
        })
    })

    describe('InhabitantWithAllergiesSchema', () => {
        it('should accept inhabitant with nested allergies array', () => {
            const allergies = AllergyFactory.serializedAllergies(2, 1)
            const inhabitantWithAllergies = {
                id: 1,
                heynaboId: 101,
                householdId: 1,
                name: 'Anna',
                lastName: 'Hansen',
                pictureUrl: 'https://example.com/anna.jpg',
                birthDate: new Date('1990-01-01'),
                allergies
            }

            const result = InhabitantWithAllergiesSchema.safeParse(inhabitantWithAllergies)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.allergies).toHaveLength(2)
                expect(result.data.allergies[0]!.allergyType.name).toBe(allergies[0]!.allergyType.name)
                expect(result.data.allergies[1]!.allergyType.name).toBe(allergies[1]!.allergyType.name)
            }
        })
    })

    describe('deserializeInhabitantWithAllergies', () => {
        const {serializeWeekDayMap, createDefaultWeekdayMap} = useCoreValidation()
        const serializedInhabitant = DinnerEventFactory.serializedInhabitant(serializeWeekDayMap(createDefaultWeekdayMap()))

        it('GIVEN an inhabitant row with two allergies WHEN deserializing THEN keeps each allergy with its allergy type and converts the dinner preferences JSON to a weekday map', () => {
            const allergies = AllergyFactory.serializedAllergies(2, serializedInhabitant.id)
            const result = deserializeInhabitantWithAllergies({...serializedInhabitant, allergies})

            expect(result.allergies.map(a => a.allergyType)).toEqual(allergies.map(a => a.allergyType))
            expect(result.dinnerPreferences).toHaveProperty('mandag')
        })
    })
})
