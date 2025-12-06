import { describe, it, expect } from 'vitest'
import { useCookingTeamValidation, type CookingTeamDisplay, type CookingTeamAssignment } from '~/composables/useCookingTeamValidation'
import { useWeekDayMapValidation } from '~/composables/useWeekDayMapValidation'
import { SeasonFactory } from '~~/tests/e2e/testDataFactories/seasonFactory'
import { HouseholdFactory } from '~~/tests/e2e/testDataFactories/householdFactory'

const { createDefaultWeekdayMap } = useWeekDayMapValidation()

describe('useCookingTeamValidation', () => {
  // Get validation utilities
  const {
    CookingTeamSchema,
    CookingTeamDisplaySchema,
    TeamRoleSchema,
    getTeamMemberCounts
  } = useCookingTeamValidation()

  describe('CookingTeamSchema', () => {
    it.each([
      {
        name: 'valid team data',
        team: { seasonId: 1, name: "Team Alpha" },
        expected: { success: true, seasonId: 1, name: "Team Alpha" }
      },
      {
        name: 'team with optional id',
        team: { id: 42, seasonId: 1, name: "Team Beta" },
        expected: { success: true, id: 42 }
      }
    ])('should accept $name', ({ team, expected }) => {
      const result = CookingTeamSchema.safeParse(team)
      expect(result.success).toBe(expected.success)
      if (result.success && expected.seasonId) {
        expect(result.data.seasonId).toBe(expected.seasonId)
        expect(result.data.name).toBe(expected.name)
      }
      if (result.success && expected.id) {
        expect(result.data.id).toBe(expected.id)
      }
    })

    it.each([
      {
        name: 'missing seasonId',
        team: { name: "Team Gamma" }
      },
      {
        name: 'empty name',
        team: { seasonId: 1, name: "" }
      },
      {
        name: 'name too long (101 chars)',
        team: { seasonId: 1, name: "a".repeat(101) }
      },
      {
        name: 'invalid seasonId (negative)',
        team: { seasonId: -1, name: "Team" }
      }
    ])('should reject team with $name', ({ team }) => {
      const result = CookingTeamSchema.safeParse(team)
      expect(result.success).toBe(false)
    })
  })

  describe('TeamRoleSchema', () => {
    it.each([
      { role: 'CHEF', expected: true },
      { role: 'COOK', expected: true },
      { role: 'JUNIORHELPER', expected: true },
      { role: 'INVALID', expected: false },
      { role: 'chef', expected: false },
      { role: '', expected: false }
    ])('should return $expected for role "$role"', ({ role, expected }) => {
      expect(TeamRoleSchema.safeParse(role).success).toBe(expected)
    })
  })

  describe('CookingTeamDisplaySchema', () => {
    it.each([
      {
        name: 'team with empty assignments (defaults)',
        team: SeasonFactory.defaultCookingTeam(),
        expectedAssignments: []
      },
      {
        name: 'team with 4 valid members',
        team: SeasonFactory.defaultCookingTeamDisplay({
          assignments: [
            SeasonFactory.defaultCookingTeamAssignment({ role: 'CHEF', inhabitantId: 1 }),
            SeasonFactory.defaultCookingTeamAssignment({ role: 'COOK', inhabitantId: 2 }),
            SeasonFactory.defaultCookingTeamAssignment({ role: 'COOK', inhabitantId: 3 }),
            SeasonFactory.defaultCookingTeamAssignment({ role: 'JUNIORHELPER', inhabitantId: 4 })
          ]
        }),
        expectedAssignments: 4
      }
    ])('should accept $name', ({ team, expectedAssignments }) => {
      const result = CookingTeamDisplaySchema.safeParse(team)
      expect(result.success).toBe(true)
      if (result.success) {
        const expectedLength = typeof expectedAssignments === 'number' ? expectedAssignments : expectedAssignments.length
        expect(result.data.assignments).toHaveLength(expectedLength)
      }
    })

    it('should reject team with invalid member role', () => {
      // Create a team and then override the role with an invalid value for testing validation
      const assignment = SeasonFactory.defaultCookingTeamAssignment({ role: 'CHEF' })
      const teamWithInvalidRole = SeasonFactory.defaultCookingTeamDisplay({
        assignments: [{ ...assignment, role: 'INVALID_ROLE' as 'CHEF' }]
      })

      const result = CookingTeamDisplaySchema.safeParse(teamWithInvalidRole)
      expect(result.success).toBe(false)
    })
  })

  describe('CookingTeamDetailSchema', () => {
    const { CookingTeamDetailSchema } = useCookingTeamValidation()

    it.each([
      {
        name: 'team with default dinnerEvents (Detail pattern with 1 event)',
        team: SeasonFactory.defaultCookingTeamDetail(),
        expectedDinnerEvents: 1,
        expectedCookingDaysCount: 0
      },
      {
        name: 'team with empty dinnerEvents array',
        team: SeasonFactory.defaultCookingTeamDetail({
          dinnerEvents: []
        }),
        expectedDinnerEvents: 0,
        expectedCookingDaysCount: 0
      },
      {
        name: 'team with multiple dinnerEvents',
        team: SeasonFactory.defaultCookingTeamDetail({
          cookingDaysCount: 2,
          dinnerEvents: [
            {
              id: 1,
              date: new Date(),
              menuTitle: 'Test Menu 1',
              cookingTeamId: 1,
              state: 'SCHEDULED' as const,
              totalCost: 0,
              chefId: null,
              heynaboEventId: null,
              seasonId: 1,
              menuDescription: null,
              menuPictureUrl: null,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              id: 2,
              date: new Date(),
              menuTitle: 'Test Menu 2',
              cookingTeamId: 1,
              state: 'SCHEDULED' as const,
              totalCost: 0,
              chefId: null,
              heynaboEventId: null,
              seasonId: 1,
              menuDescription: null,
              menuPictureUrl: null,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ]
        }),
        expectedDinnerEvents: 2,
        expectedCookingDaysCount: 2
      }
    ])('should accept $name', ({ team, expectedDinnerEvents, expectedCookingDaysCount }) => {
      const result = CookingTeamDetailSchema.safeParse(team)
      expect(result.success).toBe(true)
      if (result.success) {
        // Verify Detail pattern includes dinnerEvents
        expect(result.data.dinnerEvents).toHaveLength(expectedDinnerEvents)

        // Verify it also has Display fields
        expect(result.data).toHaveProperty('assignments')
        expect(result.data).toHaveProperty('cookingDaysCount')
        expect(result.data.cookingDaysCount).toBe(expectedCookingDaysCount)

        // Verify base fields
        expect(result.data).toHaveProperty('id')
        expect(result.data).toHaveProperty('seasonId')
        expect(result.data).toHaveProperty('name')
      }
    })

    it('should include assignments in Detail pattern', () => {
      const teamWithAssignments = SeasonFactory.defaultCookingTeamDetail({
        assignments: [
          SeasonFactory.defaultCookingTeamAssignment({ role: 'CHEF', inhabitantId: 1 }),
          SeasonFactory.defaultCookingTeamAssignment({ role: 'COOK', inhabitantId: 2 })
        ]
      })

      const result = CookingTeamDetailSchema.safeParse(teamWithAssignments)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.assignments).toHaveLength(2)
        expect(result.data.dinnerEvents).toHaveLength(1) // Default includes 1 event
      }
    })
  })

  describe('validation functions', () => {
    it.each([
      {
        name: 'CookingTeamSchema.parse with valid data',
        fn: () => CookingTeamSchema.parse(SeasonFactory.defaultCookingTeam({ name: "Test Team" })),
        shouldThrow: false,
        expected: { seasonId: 1, name: "Test Team" }
      },
      {
        name: 'CookingTeamSchema.parse with invalid data',
        fn: () => CookingTeamSchema.parse({ seasonId: "not a number", name: "Test Team" }),
        shouldThrow: true
      },
      {
        name: 'CookingTeamDisplaySchema.parse with valid data',
        fn: () => CookingTeamDisplaySchema.parse(SeasonFactory.defaultCookingTeamDisplay()),
        shouldThrow: false,
        expected: { assignments: [] }
      }
    ])('$name', ({ fn, shouldThrow, expected }) => {
      if (shouldThrow) {
        expect(fn).toThrow()
      } else {
        expect(fn).not.toThrow()
        const result = fn() as Record<string, unknown>
        if (expected) {
          Object.entries(expected).forEach(([key, value]) => {
            expect(result[key]).toEqual(value)
          })
        }
      }
    })
  })

  describe('utility functions', () => {
    it.each([
      {
        name: '4 team members',
        team: SeasonFactory.defaultCookingTeamDisplay({
          assignments: [
            SeasonFactory.defaultCookingTeamAssignment({ role: 'CHEF', inhabitantId: 1 }),
            SeasonFactory.defaultCookingTeamAssignment({ role: 'COOK', inhabitantId: 2 }),
            SeasonFactory.defaultCookingTeamAssignment({ role: 'COOK', inhabitantId: 3 }),
            SeasonFactory.defaultCookingTeamAssignment({ role: 'JUNIORHELPER', inhabitantId: 4 })
          ]
        }),
        expected: 4
      },
      {
        name: 'empty team',
        team: SeasonFactory.defaultCookingTeamDisplay({ name: "Empty Team", assignments: [] }),
        expected: 0
      }
    ])('getTeamMemberCounts should count $name correctly', ({ team, expected }) => {
      const counts = getTeamMemberCounts(team as CookingTeamDisplay)
      expect(counts).toBe(expected)
    })
  })

  describe('edge cases', () => {
    it.each([
      {
        name: 'team names with whitespace',
        team: SeasonFactory.defaultCookingTeam({ name: "  Team with spaces  " }),
        expected: { success: true, name: "  Team with spaces  " }
      },
      {
        name: 'maximum valid name length (100 chars)',
        team: SeasonFactory.defaultCookingTeam({ name: "a".repeat(100) }),
        expected: { success: true }
      },
      {
        name: 'team members with optional IDs',
        team: SeasonFactory.defaultCookingTeamDisplay({
          name: "Team with Member IDs",
          assignments: [
            SeasonFactory.defaultCookingTeamAssignment({ id: 1, inhabitantId: 10, role: 'CHEF' }),
            SeasonFactory.defaultCookingTeamAssignment({ id: 2, inhabitantId: 20, role: 'COOK' })
          ]
        }),
        expected: { success: true, assignment0Id: 1, assignment1Id: 2 },
        useWithMembersSchema: true
      }
    ])('should handle $name', ({ team, expected, useWithMembersSchema }) => {
      const schema = useWithMembersSchema ? CookingTeamDisplaySchema : CookingTeamSchema
      const result = schema.safeParse(team)
      expect(result.success).toBe(expected.success)
      if (result.success && expected.name) {
        expect(result.data.name).toBe(expected.name)
      }
      if (result.success && expected.assignment0Id) {
        const teamResult = result.data as CookingTeamDisplay
        expect(teamResult.assignments[0]?.id).toBe(expected.assignment0Id)
        expect(teamResult.assignments[1]?.id).toBe(expected.assignment1Id)
      }
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
          name: 'assignment without affinity',
          serialized: {
            ...SeasonFactory.defaultCookingTeamAssignment({ id: 11, cookingTeamId: 2, inhabitantId: 99, role: 'COOK' }),
            affinity: undefined
          },
          expectedAffinity: undefined
        },
        {
          name: 'assignment with null affinity',
          serialized: {
            ...SeasonFactory.defaultCookingTeamAssignment({ id: 12, cookingTeamId: 3, inhabitantId: 55, role: 'JUNIORHELPER', allocationPercentage: 50 }),
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
        const { serializeWeekDayMap } = useWeekDayMapValidation()

        // Use factory for inhabitant data (has dinnerPreferences as object)
        const inhabitant = { ...HouseholdFactory.defaultInhabitantData(), id: 42 }

        // Simulate database response: assignment with serialized inhabitant
        const serialized = {
          ...SeasonFactory.defaultCookingTeamAssignment({ role: 'CHEF' }),
          inhabitant: {
            ...inhabitant,
            dinnerPreferences: serializeWeekDayMap(inhabitant.dinnerPreferences!)
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
          name: 'team with affinity + assignment with affinity',
          team: {
            id: 1,
            seasonId: 5,
            name: "Team Alpha",
            affinity: createDefaultWeekdayMap([true, false, true, false, true, false, false]), // Mon, Wed, Fri
            assignments: [
              SeasonFactory.defaultCookingTeamAssignment({
                id: 10,
                cookingTeamId: 1,
                inhabitantId: 42,
                allocationPercentage: 75,
                affinity: createDefaultWeekdayMap([false, true, false, true, false, false, false]) // Tue, Thu
              })
            ]
          } as CookingTeamDisplay,
          expectedTeamAffinity: createDefaultWeekdayMap([true, false, true, false, true, false, false]),
          expectedAssignmentAffinity: createDefaultWeekdayMap([false, true, false, true, false, false, false])
        },
        {
          name: 'team with affinity + assignment without affinity',
          team: {
            id: 2,
            seasonId: 5,
            name: "Team Beta",
            affinity: createDefaultWeekdayMap([true, true, false, false, false, false, false]), // Mon, Tue
            assignments: [
              SeasonFactory.defaultCookingTeamAssignment({
                id: 11,
                cookingTeamId: 2,
                inhabitantId: 99,
                role: 'COOK'
              })
            ]
          } as CookingTeamDisplay,
          expectedTeamAffinity: createDefaultWeekdayMap([true, true, false, false, false, false, false]),
          expectedAssignmentAffinity: undefined
        },
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
                role: 'JUNIORHELPER',
                allocationPercentage: 50,
                affinity: createDefaultWeekdayMap([false, false, false, false, true, true, false]) // Fri, Sat
              })
            ]
          } as CookingTeamDisplay,
          expectedTeamAffinity: undefined,
          expectedAssignmentAffinity: createDefaultWeekdayMap([false, false, false, false, true, true, false])
        },
        {
          name: 'team without affinity + assignment without affinity',
          team: {
            id: 4,
            seasonId: 5,
            name: "Team Delta",
            assignments: [
              SeasonFactory.defaultCookingTeamAssignment({
                id: 13,
                cookingTeamId: 4,
                inhabitantId: 77,
                role: 'COOK'
              })
            ]
          } as CookingTeamDisplay,
          expectedTeamAffinity: undefined,
          expectedAssignmentAffinity: undefined
        },
        {
          name: 'team with multiple assignments (mixed affinities)',
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
                role: 'COOK',
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
          serialized.assignments.forEach((assignment: CookingTeamAssignment, index: number) => {
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
          name: 'excludes read-only relation: dinnerEvents',
          team: SeasonFactory.defaultCookingTeamDetail({ dinnerEvents: [] }),
          excludedField: 'dinnerEvents'
        }
      ])('should exclude $name', ({ team, excludedField }) => {
        const result = fn(team)
        expect(result).not.toHaveProperty(excludedField)
      })

      it.each([
        {
          name: 'preserves required field: name',
          team: SeasonFactory.defaultCookingTeamDetail({ name: 'Test Team' }),
          field: 'name',
          expectedValue: 'Test Team'
        },
        {
          name: 'preserves required field: seasonId',
          team: SeasonFactory.defaultCookingTeamDetail({ seasonId: 99 }),
          field: 'seasonId',
          expectedValue: 99
        }
      ])('should preserve $name', ({ team, field, expectedValue }) => {
        const result = fn(team)
        expect(result[field]).toBe(expectedValue)
      })

      it('should serialize affinity WeekDayMap to JSON string', () => {
        const team = SeasonFactory.defaultCookingTeamDetail({
          affinity: createDefaultWeekdayMap([true, false, true, false, false, false, false])
        })
        const result = fn(team)

        expect(typeof result.affinity).toBe('string')
        expect(() => JSON.parse(result.affinity as string)).not.toThrow()
      })

      it.each([
        { name: 'with 0 assignments', assignmentCount: 0 },
        { name: 'with 1 assignment', assignmentCount: 1 },
        { name: 'with multiple assignments', assignmentCount: 3 }
      ])('should preserve assignments $name', ({ assignmentCount }) => {
        const assignments = Array.from({ length: assignmentCount }, (_, i) =>
          SeasonFactory.defaultCookingTeamAssignment({ inhabitantId: i + 1 })
        )
        const team = SeasonFactory.defaultCookingTeamDetail({ assignments })
        const result = fn(team)

        expect(result.assignments).toHaveLength(assignmentCount)
      })
    })

    describe('toPrismaCreateData with CookingTeamCreate input', () => {
      it('should accept CookingTeamCreate type (no id, no computed fields)', () => {
        const createInput = {
          name: 'New Team',
          seasonId: 1,
          affinity: createDefaultWeekdayMap([true, true, false, false, false, false, false])
        }
        const result = toPrismaCreateData(createInput)

        expect(result).toHaveProperty('name', 'New Team')
        expect(result).toHaveProperty('seasonId', 1)
        expect(result).toHaveProperty('affinity')
        expect(result).not.toHaveProperty('id')
        expect(result).not.toHaveProperty('cookingDaysCount')
        expect(result).not.toHaveProperty('dinnerEvents')
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

      it('should handle full update with name and seasonId', () => {
        const updateInput = {
          id: 42,
          name: 'Updated Team',
          seasonId: 1
        }
        const result = toPrismaUpdateData(updateInput)

        expect(result).toHaveProperty('name', 'Updated Team')
        expect(result).toHaveProperty('seasonId', 1)
        expect(result).not.toHaveProperty('id')
        expect(result).not.toHaveProperty('cookingDaysCount')
        expect(result).not.toHaveProperty('dinnerEvents')
      })
    })
  })
})
