import { describe, it, expect } from 'vitest'
import { useCookingTeamValidation, type CookingTeamDisplay, type CookingTeamAssignment } from '~/composables/useCookingTeamValidation'
import { useWeekDayMapValidation } from '~/composables/useWeekDayMapValidation'
import { useCoreValidation } from '~/composables/useCoreValidation'
import { SeasonFactory } from '~~/tests/e2e/testDataFactories/seasonFactory'
import { HouseholdFactory } from '~~/tests/e2e/testDataFactories/householdFactory'

const { createDefaultWeekdayMap } = useWeekDayMapValidation()
const { serializeWeekDayMap: serializeDinnerPreferences } = useCoreValidation()

describe('useCookingTeamValidation', () => {
  // Get validation utilities
  const {
    TeamRoleSchema,
    getTeamMemberCounts
  } = useCookingTeamValidation()
  const { CHEF, COOK, JUNIORHELPER } = TeamRoleSchema.enum

  describe('CookingTeamDetailSchema', () => {
    const { CookingTeamDetailSchema } = useCookingTeamValidation()

    it('should accept the factory team (Detail pattern with 1 event) with its Display and base fields', () => {
      const result = CookingTeamDetailSchema.safeParse(SeasonFactory.defaultCookingTeamDetail())
      expect(result.success).toBe(true)
      if (result.success) {
        // Verify Detail pattern includes dinnerEvents
        expect(result.data.dinnerEvents).toHaveLength(1)

        // Verify it also has Display fields
        expect(result.data).toHaveProperty('assignments')
        expect(result.data).toHaveProperty('cookingDaysCount')
        expect(result.data.cookingDaysCount).toBe(0)

        // Verify base fields
        expect(result.data).toHaveProperty('id')
        expect(result.data).toHaveProperty('seasonId')
        expect(result.data).toHaveProperty('name')
      }
    })
  })

  describe('utility functions', () => {
    it('getTeamMemberCounts should count the team members', () => {
      const team = SeasonFactory.defaultCookingTeamDisplay({
        assignments: [
          SeasonFactory.defaultCookingTeamAssignment({ role: CHEF, inhabitantId: 1 }),
          SeasonFactory.defaultCookingTeamAssignment({ role: COOK, inhabitantId: 2 }),
          SeasonFactory.defaultCookingTeamAssignment({ role: COOK, inhabitantId: 3 }),
          SeasonFactory.defaultCookingTeamAssignment({ role: JUNIORHELPER, inhabitantId: 4 })
        ]
      })
      expect(getTeamMemberCounts(team as CookingTeamDisplay)).toBe(4)
    })
  })

  describe('serialization and deserialization', () => {
    const { serializeCookingTeam, deserializeCookingTeamDisplay, deserializeCookingTeamAssignment } = useCookingTeamValidation()
    const { createDefaultWeekdayMap } = useWeekDayMapValidation()

    describe('CookingTeamAssignment deserialization', () => {
      it.each([
        {
          name: 'assignment with affinity',
          serialized: {
            ...SeasonFactory.defaultCookingTeamAssignment({ id: 10, inhabitantId: 42, allocationPercentage: 75 }),
            affinity: '{"mandag":true,"tirsdag":false,"onsdag":true,"torsdag":false,"fredag":false,"lørdag":false,"søndag":false}'
          },
          expectedAffinity: createDefaultWeekdayMap([true, false, true, false, false, false, false])
        },
        {
          name: 'assignment with null affinity',
          serialized: {
            ...SeasonFactory.defaultCookingTeamAssignment({ id: 12, cookingTeamId: 3, inhabitantId: 55, role: JUNIORHELPER, allocationPercentage: 50 }),
            affinity: null
          },
          expectedAffinity: undefined
        }
      ])('should deserialize $name', ({ serialized, expectedAffinity }) => {
        const deserialized = deserializeCookingTeamAssignment(serialized)

        expect(deserialized.id).toBe(serialized.id)
        expect(deserialized.cookingTeamId).toBe(serialized.cookingTeamId)
        expect(deserialized.inhabitantId).toBe(serialized.inhabitantId)
        expect(deserialized.role).toBe(serialized.role)
        expect(deserialized.allocationPercentage).toBe(serialized.allocationPercentage)
        expect(deserialized.affinity).toEqual(expectedAffinity)
      })

      it('should deserialize assignment with nested inhabitant (dinnerPreferences as JSON string)', () => {
        // Use factory for inhabitant data (has dinnerPreferences as object)
        const inhabitant = { ...HouseholdFactory.defaultInhabitantData(), id: 42 }

        // Simulate database response: assignment with serialized inhabitant
        const serialized = {
          ...SeasonFactory.defaultCookingTeamAssignment({ role: CHEF }),
          inhabitant: {
            ...inhabitant,
            dinnerPreferences: serializeDinnerPreferences(inhabitant.dinnerPreferences!)
          }
        }

        const deserialized = deserializeCookingTeamAssignment(serialized)

        expect(deserialized.inhabitant).toBeDefined()
        expect(deserialized.inhabitant?.dinnerPreferences).toBeDefined()
        expect(typeof deserialized.inhabitant?.dinnerPreferences).toBe('object')
        expect(deserialized.inhabitant?.dinnerPreferences).toEqual(inhabitant.dinnerPreferences)
      })
    })

    describe('CookingTeamDisplay aggregate root roundtrip', () => {
      it.each([
        {
          name: 'team without affinity + assignment with affinity',
          team: {
            id: 3,
            seasonId: 5,
            name: "Team Gamma",
            assignments: [
              SeasonFactory.defaultCookingTeamAssignment({
                id: 12,
                cookingTeamId: 3,
                inhabitantId: 55,
                role: JUNIORHELPER,
                allocationPercentage: 50,
                affinity: createDefaultWeekdayMap([false, false, false, false, true, true, false]) // Fri, Sat
              })
            ]
          } as CookingTeamDisplay,
          expectedTeamAffinity: undefined,
          expectedAssignmentAffinity: createDefaultWeekdayMap([false, false, false, false, true, true, false])
        },
        {
          name: 'team with affinity + multiple assignments (mixed affinities)',
          team: {
            id: 5,
            seasonId: 5,
            name: "Team Echo",
            affinity: createDefaultWeekdayMap([true, true, true, true, true, false, false]), // Mon-Fri
            assignments: [
              SeasonFactory.defaultCookingTeamAssignment({
                id: 14,
                cookingTeamId: 5,
                inhabitantId: 20,
                affinity: createDefaultWeekdayMap([true, false, true, false, true, false, false]) // Mon, Wed, Fri
              }),
              SeasonFactory.defaultCookingTeamAssignment({
                id: 15,
                cookingTeamId: 5,
                inhabitantId: 21,
                role: COOK,
                allocationPercentage: 50
                // No affinity
              })
            ]
          } as CookingTeamDisplay,
          expectedTeamAffinity: createDefaultWeekdayMap([true, true, true, true, true, false, false]),
          expectedAssignmentAffinity: createDefaultWeekdayMap([true, false, true, false, true, false, false])
        }
      ])('should serialize and deserialize $name', ({ team, expectedTeamAffinity, expectedAssignmentAffinity }) => {
        // Serialize aggregate root (team + nested assignments)
        const serialized = serializeCookingTeam(team)

        // Verify team affinity serialization
        if (expectedTeamAffinity) {
          expect(typeof serialized.affinity).toBe('string')
        } else {
          expect(serialized.affinity).toBeNull()
        }

        // Verify assignments affinity serialization
        if (serialized.assignments && serialized.assignments.length > 0) {
          serialized.assignments.forEach((assignment, index) => {
            if (team.assignments[index]?.affinity) {
              expect(typeof assignment.affinity).toBe('string')
            } else {
              expect(assignment.affinity).toBeNull()
            }
          })
        }

        // Deserialize aggregate root
        const deserialized = deserializeCookingTeamDisplay(serialized)

        // Verify team base fields
        expect(deserialized.id).toBe(team.id)
        expect(deserialized.seasonId).toBe(team.seasonId)
        expect(deserialized.name).toBe(team.name)

        // Verify team affinity deserialization
        expect(deserialized.affinity).toEqual(expectedTeamAffinity)

        // Verify assignments deserialization
        expect(deserialized.assignments).toHaveLength(team.assignments.length)

        deserialized.assignments.forEach((assignment: CookingTeamAssignment, index: number) => {
          const originalAssignment = team.assignments[index]!
          expect(assignment.id).toBe(originalAssignment.id)
          expect(assignment.cookingTeamId).toBe(originalAssignment.cookingTeamId)
          expect(assignment.inhabitantId).toBe(originalAssignment.inhabitantId)
          expect(assignment.role).toBe(originalAssignment.role)
          expect(assignment.allocationPercentage).toBe(originalAssignment.allocationPercentage)

          // Verify assignment affinity
          if (index === 0) {
            expect(assignment.affinity).toEqual(expectedAssignmentAffinity)
          } else {
            // For additional assignments (index > 0), check against original
            expect(assignment.affinity).toEqual(originalAssignment.affinity)
          }
        })
      })
    })

    describe('CookingTeamDisplay aggregates from Prisma _count', () => {
      it.each([
        { name: 'counted dinners and joker slots', _count: { dinners: 4, jokerSlots: 2 }, expected: { cookingDaysCount: 4, jokerSlotCount: 2 } },
        { name: 'no _count', _count: undefined, expected: { cookingDaysCount: 0, jokerSlotCount: 0 } }
      ])('should map $name onto the aggregates', ({ _count, expected }) => {
        const deserialized = deserializeCookingTeamDisplay({ ...serializeCookingTeam(SeasonFactory.defaultCookingTeamDisplay()), _count })

        expect(deserialized).toMatchObject(expected)
      })
    })
  })

  describe('Prisma transformation functions', () => {
    const { toPrismaCreateData, toPrismaUpdateData } = useCookingTeamValidation()

    describe.each([
      { fnName: 'toPrismaCreateData', fn: toPrismaCreateData },
      { fnName: 'toPrismaUpdateData', fn: toPrismaUpdateData }
    ])('$fnName', ({ fn }) => {
      it.each([
        {
          name: 'excludes computed field: id',
          team: SeasonFactory.defaultCookingTeamDetail({ id: 42 }),
          excludedField: 'id'
        },
        {
          name: 'excludes computed field: cookingDaysCount',
          team: SeasonFactory.defaultCookingTeamDetail({ cookingDaysCount: 5 }),
          excludedField: 'cookingDaysCount'
        },
        {
          name: 'excludes computed field: jokerSlotCount',
          team: SeasonFactory.defaultCookingTeamDetail({ jokerSlotCount: 3 }),
          excludedField: 'jokerSlotCount'
        },
        {
          name: 'excludes read-only relation: dinnerEvents',
          team: SeasonFactory.defaultCookingTeamDetail({ dinnerEvents: [] }),
          excludedField: 'dinnerEvents'
        }
      ])('should exclude $name', ({ team, excludedField }) => {
        const result = fn(team)
        expect(result).not.toHaveProperty(excludedField)
      })

      it('should preserve the team fields (name)', () => {
        const result = fn(SeasonFactory.defaultCookingTeamDetail({ name: 'Test Team' }))
        expect(result.name).toBe('Test Team')
      })

      it('should serialize affinity WeekDayMap to JSON string', () => {
        const team = SeasonFactory.defaultCookingTeamDetail({
          affinity: createDefaultWeekdayMap([true, false, true, false, false, false, false])
        })
        const result = fn(team)

        expect(typeof result.affinity).toBe('string')
        expect(() => JSON.parse(result.affinity as string)).not.toThrow()
      })

      it('should preserve assignments', () => {
        const assignments = Array.from({ length: 3 }, (_, i) =>
          SeasonFactory.defaultCookingTeamAssignment({ inhabitantId: i + 1 })
        )
        const result = fn(SeasonFactory.defaultCookingTeamDetail({ assignments }))

        expect(result.assignments).toHaveLength(3)
      })
    })

    describe('toPrismaCreateData with CookingTeamCreate input', () => {
      it.each([
        {
          name: 'team without assignments',
          team: SeasonFactory.defaultCookingTeamCreate(),
          expectedAssignmentCount: undefined
        },
        {
          name: 'team with multiple assignments (import pattern)',
          team: SeasonFactory.defaultCookingTeamCreate({
            assignments: [
              SeasonFactory.defaultCookingTeamCreateAssignment({ inhabitantId: 1, role: CHEF }),
              SeasonFactory.defaultCookingTeamCreateAssignment({ inhabitantId: 2, role: COOK, allocationPercentage: 50 }),
              SeasonFactory.defaultCookingTeamCreateAssignment({ inhabitantId: 3, role: JUNIORHELPER })
            ]
          }),
          expectedAssignmentCount: 3
        }
      ])('should serialize $name', ({ team, expectedAssignmentCount }) => {
        const result = toPrismaCreateData(team)

        expect(result).toHaveProperty('name', team.name)
        expect(result).toHaveProperty('seasonId', team.seasonId)
        expect(result).not.toHaveProperty('id')
        expect(result).not.toHaveProperty('cookingDaysCount')
        expect(result).not.toHaveProperty('dinnerEvents')

        if (expectedAssignmentCount === undefined) {
          expect(result.assignments).toBeUndefined()
        } else {
          expect(result.assignments).toHaveLength(expectedAssignmentCount)
        }
      })

      it.each([
        {
          name: 'assignment with affinity',
          assignment: SeasonFactory.defaultCookingTeamCreateAssignment({
            affinity: createDefaultWeekdayMap([true, false, true, false, false, false, false])
          }),
          expectAffinityString: true
        },
        {
          name: 'assignment without affinity',
          assignment: SeasonFactory.defaultCookingTeamCreateAssignment({ affinity: null }),
          expectAffinityString: false
        }
      ])('should serialize $name correctly', ({ assignment, expectAffinityString }) => {
        const team = SeasonFactory.defaultCookingTeamCreate({ assignments: [assignment] })
        const result = toPrismaCreateData(team)

        const serializedAssignment = result.assignments![0]!
        expect(serializedAssignment).toHaveProperty('inhabitantId', assignment.inhabitantId)
        expect(serializedAssignment).toHaveProperty('role', assignment.role)
        expect(serializedAssignment).toHaveProperty('allocationPercentage', assignment.allocationPercentage)
        expect(serializedAssignment).not.toHaveProperty('inhabitant')
        expect(serializedAssignment).not.toHaveProperty('cookingTeamId')

        if (expectAffinityString) {
          expect(typeof serializedAssignment.affinity).toBe('string')
        } else {
          expect(serializedAssignment.affinity).toBeNull()
        }
      })
    })

    describe('toPrismaUpdateData with CookingTeamUpdate input', () => {
      it('should handle partial update with only affinity', () => {
        const affinity = createDefaultWeekdayMap([true, true, false, false, false, false, false])
        const updateInput = {
          id: 42,
          affinity
        }
        const result = toPrismaUpdateData(updateInput)

        expect(result).toHaveProperty('affinity')
        expect(typeof result.affinity).toBe('string')  // Should be serialized
        expect(result).not.toHaveProperty('id')  // id excluded from Prisma data
        expect(result).not.toHaveProperty('cookingDaysCount')
        expect(result).not.toHaveProperty('dinnerEvents')
      })

      it('should handle affinity: null (set to NULL)', () => {
        const updateInput = {
          id: 42,
          affinity: null
        }
        const result = toPrismaUpdateData(updateInput)

        expect(result).toHaveProperty('affinity', null)  // null should be passed through
      })

      it('should handle affinity: undefined (omit from update)', () => {
        const updateInput = {
          id: 42,
          affinity: undefined
        }
        const result = toPrismaUpdateData(updateInput)

        expect(result).toHaveProperty('affinity', undefined)  // undefined should be passed through
      })
    })
  })
})
