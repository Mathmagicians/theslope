import {describe, it, expect} from 'vitest'
import {useAllergyValidation} from '~/composables/useAllergyValidation'
import {AllergyFactory} from '../../e2e/testDataFactories/allergyFactory'

describe('useAllergyValidation', () => {
    const {
        AllergyTypeCreateSchema,
        AllergyTypeUpdateSchema,
        AllergyTypeDisplaySchema,
        AllergyCreateSchema,
        AllergyUpdateSchema,
        AllergyDisplaySchema,
        AllergyDetailSchema,
        AllergyTypeDetailSchema,
        InhabitantWithAllergiesSchema
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

        it('should accept allergy type without icon (optional)', () => {
            const allergyType = createValidAllergyTypeData({icon: undefined})

            const result = AllergyTypeCreateSchema.safeParse(allergyType)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.icon).toBeUndefined()
            }
        })

        it('should accept allergy type with null icon', () => {
            const allergyType = createValidAllergyTypeData({icon: null})

            const result = AllergyTypeCreateSchema.safeParse(allergyType)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.icon).toBeNull()
            }
        })

        it('should accept allergy type with icon class name', () => {
            const allergyType = createValidAllergyTypeData({icon: 'i-heroicons-exclamation-triangle'})

            const result = AllergyTypeCreateSchema.safeParse(allergyType)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.icon).toBe('i-heroicons-exclamation-triangle')
            }
        })

        it('should reject allergy type with empty name', () => {
            const invalidAllergyType = createValidAllergyTypeData({name: ''})

            const result = AllergyTypeCreateSchema.safeParse(invalidAllergyType)
            expect(result.success).toBe(false)
        })

        it('should reject allergy type with empty description', () => {
            const invalidAllergyType = createValidAllergyTypeData({description: ''})

            const result = AllergyTypeCreateSchema.safeParse(invalidAllergyType)
            expect(result.success).toBe(false)
        })

        it('should reject allergy type with name too long (>100 chars)', () => {
            const invalidAllergyType = createValidAllergyTypeData({name: 'a'.repeat(101)})

            const result = AllergyTypeCreateSchema.safeParse(invalidAllergyType)
            expect(result.success).toBe(false)
        })

        it('should reject allergy type with description too long (>500 chars)', () => {
            const invalidAllergyType = createValidAllergyTypeData({description: 'a'.repeat(501)})

            const result = AllergyTypeCreateSchema.safeParse(invalidAllergyType)
            expect(result.success).toBe(false)
        })

        it('should reject allergy type with icon too long (>50 chars)', () => {
            const invalidAllergyType = createValidAllergyTypeData({icon: 'a'.repeat(51)})

            const result = AllergyTypeCreateSchema.safeParse(invalidAllergyType)
            expect(result.success).toBe(false)
        })

        it('should reject allergy type with missing name', () => {
            const invalidAllergyType = {
                description: 'Test description',
                icon: '🥜'
            }

            const result = AllergyTypeCreateSchema.safeParse(invalidAllergyType)
            expect(result.success).toBe(false)
        })

        it('should reject allergy type with missing description', () => {
            const invalidAllergyType = {
                name: 'Peanuts',
                icon: '🥜'
            }

            const result = AllergyTypeCreateSchema.safeParse(invalidAllergyType)
            expect(result.success).toBe(false)
        })
    })

    describe('AllergyTypeUpdateSchema', () => {
        it('should accept valid allergy type update with id', () => {
            const validUpdate = {
                id: 1,
                name: 'Updated Peanuts',
                description: 'Updated description',
                icon: '🥜'
            }

            const result = AllergyTypeUpdateSchema.safeParse(validUpdate)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.id).toBe(1)
                expect(result.data.name).toBe('Updated Peanuts')
            }
        })

        it('should accept partial update (only name)', () => {
            const partialUpdate = {
                id: 1,
                name: 'Updated Name Only'
            }

            const result = AllergyTypeUpdateSchema.safeParse(partialUpdate)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.id).toBe(1)
                expect(result.data.name).toBe('Updated Name Only')
                expect(result.data.description).toBeUndefined()
            }
        })

        it('should reject update without id', () => {
            const invalidUpdate = {
                name: 'Updated Peanuts'
            }

            const result = AllergyTypeUpdateSchema.safeParse(invalidUpdate)
            expect(result.success).toBe(false)
        })

        it('should reject update with negative id', () => {
            const invalidUpdate = {
                id: -1,
                name: 'Updated Peanuts'
            }

            const result = AllergyTypeUpdateSchema.safeParse(invalidUpdate)
            expect(result.success).toBe(false)
        })
    })

    describe('AllergyTypeDisplaySchema', () => {
        it('should accept complete allergy type response', () => {
            const response = {
                id: 1,
                name: 'Peanuts',
                description: 'Alvorlig allergi mod jordnødder',
                icon: '🥜'
            }

            const result = AllergyTypeDisplaySchema.safeParse(response)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.id).toBe(1)
                expect(result.data.name).toBe('Peanuts')
                expect(result.data.description).toBeDefined()
            }
        })

        it('should reject response without id', () => {
            const invalidResponse = {
                name: 'Peanuts',
                description: 'Test'
            }

            const result = AllergyTypeDisplaySchema.safeParse(invalidResponse)
            expect(result.success).toBe(false)
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

        it('should accept allergy without comment (optional)', () => {
            const allergy = createValidAllergyData({inhabitantComment: undefined})

            const result = AllergyCreateSchema.safeParse(allergy)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.inhabitantComment).toBeUndefined()
            }
        })

        it('should accept allergy with null comment', () => {
            const allergy = createValidAllergyData({inhabitantComment: null})

            const result = AllergyCreateSchema.safeParse(allergy)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.inhabitantComment).toBeNull()
            }
        })

        it('should reject allergy with missing inhabitantId', () => {
            const invalidAllergy = {
                allergyTypeId: 1,
                inhabitantComment: 'Test'
            }

            const result = AllergyCreateSchema.safeParse(invalidAllergy)
            expect(result.success).toBe(false)
        })

        it('should reject allergy with missing allergyTypeId', () => {
            const invalidAllergy = {
                inhabitantId: 1,
                inhabitantComment: 'Test'
            }

            const result = AllergyCreateSchema.safeParse(invalidAllergy)
            expect(result.success).toBe(false)
        })

        it('should reject allergy with negative inhabitantId', () => {
            const invalidAllergy = createValidAllergyData({inhabitantId: -1})

            const result = AllergyCreateSchema.safeParse(invalidAllergy)
            expect(result.success).toBe(false)
        })

        it('should reject allergy with negative allergyTypeId', () => {
            const invalidAllergy = createValidAllergyData({allergyTypeId: -1})

            const result = AllergyCreateSchema.safeParse(invalidAllergy)
            expect(result.success).toBe(false)
        })

        it('should reject allergy with comment too long (>500 chars)', () => {
            const invalidAllergy = createValidAllergyData({inhabitantComment: 'a'.repeat(501)})

            const result = AllergyCreateSchema.safeParse(invalidAllergy)
            expect(result.success).toBe(false)
        })

        it('should not accept createdAt or updatedAt in create schema', () => {
            const allergyWithTimestamps = {
                ...createValidAllergyData(),
                createdAt: new Date(),
                updatedAt: new Date()
            }

            const result = AllergyCreateSchema.safeParse(allergyWithTimestamps)
            expect(result.success).toBe(true)
            if (result.success) {
                // createdAt and updatedAt should be omitted from create schema
                expect(result.data).not.toHaveProperty('createdAt')
                expect(result.data).not.toHaveProperty('updatedAt')
            }
        })
    })

    describe('AllergyUpdateSchema', () => {
        it('should accept valid allergy update with id', () => {
            const validUpdate = {
                id: 1,
                inhabitantId: 1,
                allergyTypeId: 2,
                inhabitantComment: 'Updated comment'
            }

            const result = AllergyUpdateSchema.safeParse(validUpdate)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.id).toBe(1)
                expect(result.data.allergyTypeId).toBe(2)
            }
        })

        it('should accept partial update (only comment)', () => {
            const partialUpdate = {
                id: 1,
                inhabitantComment: 'Updated comment only'
            }

            const result = AllergyUpdateSchema.safeParse(partialUpdate)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.id).toBe(1)
                expect(result.data.inhabitantComment).toBe('Updated comment only')
                expect(result.data.inhabitantId).toBeUndefined()
            }
        })

        it('should reject update without id', () => {
            const invalidUpdate = {
                inhabitantComment: 'Updated comment'
            }

            const result = AllergyUpdateSchema.safeParse(invalidUpdate)
            expect(result.success).toBe(false)
        })
    })

    describe('AllergyDisplaySchema', () => {
        it('should accept complete allergy response', () => {
            const response = {
                id: 1,
                inhabitantId: 1,
                allergyTypeId: 1,
                inhabitantComment: 'Test comment',
                createdAt: new Date(),
                updatedAt: new Date(),
                allergyType: {
                    id: 1,
                    name: 'Peanuts',
                    description: 'Test allergy',
                    icon: '🥜'
                }
            }

            const result = AllergyDisplaySchema.safeParse(response)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.id).toBe(1)
                expect(result.data.inhabitantId).toBe(1)
                expect(result.data.allergyTypeId).toBe(1)
            }
        })

        it('should reject response without required fields', () => {
            const invalidResponse = {
                id: 1,
                inhabitantComment: 'Test'
            }

            const result = AllergyDisplaySchema.safeParse(invalidResponse)
            expect(result.success).toBe(false)
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

        it('should reject allergy without nested allergyType', () => {
            const allergyWithoutType = {
                id: 1,
                inhabitantId: 1,
                allergyTypeId: 1,
                inhabitantComment: 'Test comment'
            }

            const result = AllergyDetailSchema.safeParse(allergyWithoutType)
            expect(result.success).toBe(false)
        })
    })

    describe('AllergyTypeDetailSchema', () => {
        it('should accept allergy type with nested inhabitants array', () => {
            const allergyTypeWithInhabitants = {
                id: 1,
                name: 'Peanuts',
                description: 'Alvorlig allergi',
                icon: '🥜',
                inhabitants: [
                    {
                        id: 1,
                        heynaboId: 101,
                        name: 'Anna',
                        lastName: 'Hansen',
                        pictureUrl: 'https://example.com/anna.jpg',
                        birthDate: new Date('1990-01-01'),
                        householdName: 'Skråningen 31',
                        inhabitantComment: 'Meget alvorlig'
                    },
                    {
                        id: 2,
                        heynaboId: 102,
                        name: 'Bob',
                        lastName: 'Jensen',
                        pictureUrl: null,
                        birthDate: null,
                        householdName: 'Abbey Road 1',
                        inhabitantComment: null
                    }
                ]
            }

            const result = AllergyTypeDetailSchema.safeParse(allergyTypeWithInhabitants)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.inhabitants).toHaveLength(2)
                expect(result.data.inhabitants[0].householdName).toBe('Skråningen 31')
                expect(result.data.inhabitants[0].inhabitantComment).toBe('Meget alvorlig')
                expect(result.data.inhabitants[1].inhabitantComment).toBeNull()
            }
        })

        it('should accept allergy type with empty inhabitants array', () => {
            const allergyTypeWithoutInhabitants = {
                id: 1,
                name: 'Peanuts',
                description: 'Alvorlig allergi',
                icon: '🥜',
                inhabitants: []
            }

            const result = AllergyTypeDetailSchema.safeParse(allergyTypeWithoutInhabitants)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.inhabitants).toHaveLength(0)
            }
        })
    })

    describe('InhabitantWithAllergiesSchema', () => {
        it('should accept inhabitant with nested allergies array', () => {
            const inhabitantWithAllergies = {
                id: 1,
                heynaboId: 101,
                name: 'Anna',
                lastName: 'Hansen',
                pictureUrl: 'https://example.com/anna.jpg',
                birthDate: new Date('1990-01-01'),
                allergies: [
                    {
                        id: 1,
                        inhabitantId: 1,
                        allergyTypeId: 1,
                        inhabitantComment: 'Meget alvorlig',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        allergyType: {
                            id: 1,
                            name: 'Peanuts',
                            description: 'Alvorlig allergi',
                            icon: '🥜'
                        }
                    },
                    {
                        id: 2,
                        inhabitantId: 1,
                        allergyTypeId: 2,
                        inhabitantComment: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        allergyType: {
                            id: 2,
                            name: 'Gluten',
                            description: 'Cøliaki',
                            icon: '🌾'
                        }
                    }
                ]
            }

            const result = InhabitantWithAllergiesSchema.safeParse(inhabitantWithAllergies)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.allergies).toHaveLength(2)
                expect(result.data.allergies[0].allergyType.name).toBe('Peanuts')
                expect(result.data.allergies[1].allergyType.name).toBe('Gluten')
            }
        })

        it('should accept inhabitant with empty allergies array', () => {
            const inhabitantWithoutAllergies = {
                id: 1,
                heynaboId: 101,
                name: 'Anna',
                lastName: 'Hansen',
                pictureUrl: null,
                birthDate: null,
                allergies: []
            }

            const result = InhabitantWithAllergiesSchema.safeParse(inhabitantWithoutAllergies)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.allergies).toHaveLength(0)
            }
        })
    })

    describe('edge cases', () => {
        it('should handle maximum valid string lengths', () => {
            const allergyType = {
                name: 'a'.repeat(100), // exactly 100 characters
                description: 'a'.repeat(500), // exactly 500 characters
                icon: 'a'.repeat(50) // exactly 50 characters
            }

            const result = AllergyTypeCreateSchema.safeParse(allergyType)
            expect(result.success).toBe(true)
        })

        it('should handle maximum valid comment length', () => {
            const allergy = {
                inhabitantId: 1,
                allergyTypeId: 1,
                inhabitantComment: 'a'.repeat(500) // exactly 500 characters
            }

            const result = AllergyCreateSchema.safeParse(allergy)
            expect(result.success).toBe(true)
        })

        it('should coerce date strings to Date objects', () => {
            const allergy = {
                id: 1,
                inhabitantId: 1,
                allergyTypeId: 1,
                inhabitantComment: 'Test',
                createdAt: '2024-01-01' as any,
                updatedAt: '2024-01-02' as any,
                allergyType: {
                    id: 1,
                    name: 'Peanuts',
                    description: 'Test allergy',
                    icon: '🥜'
                }
            }

            const result = AllergyDisplaySchema.safeParse(allergy)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.createdAt).toBeInstanceOf(Date)
                expect(result.data.updatedAt).toBeInstanceOf(Date)
            }
        })
    })
})
