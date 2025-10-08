import { describe, it, expect } from 'vitest'
import { useHouseholdValidation } from '~/composables/useHouseholdValidation'
import { HouseholdFactory } from '../../e2e/testDataFactories/householdFactory'

describe('useHouseholdValidation', () => {
  const {
    HouseholdCreateSchema,
    HouseholdCreateWithInhabitantsSchema,
    InhabitantCreateSchema
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
        expect(result.data.inhabitants![0].name).toBeDefined()
        expect(result.data.inhabitants![0].lastName).toBeDefined()
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
      const { householdId, ...inhabitantWithoutHouseholdId } = inhabitantData as any

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
        expect(result.data.inhabitants![0].user).toBeDefined()
        expect(result.data.inhabitants![0].user?.email).toBe("john@example.com")
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