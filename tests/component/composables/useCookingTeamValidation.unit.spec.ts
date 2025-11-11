import { describe, it, expect } from 'vitest'
import { useCookingTeamValidation, type CookingTeam, type CookingTeamWithMembers, type CookingTeamAssignment } from '~/composables/useCookingTeamValidation'
import { useWeekDayMapValidation } from '~/composables/useWeekDayMapValidation'

// Test data factory
const { createDefaultWeekdayMap } = useWeekDayMapValidation()

const TeamTestFactory = {
  validTeam: (overrides = {}) => ({
    seasonId: 1,
    name: "Team Alpha",
    ...overrides
  }),

  validTeamWithId: (overrides = {}) => ({
    id: 42,
    seasonId: 1,
    name: "Team Beta",
    ...overrides
  }),

  validTeamWithMembers: (overrides = {}) => ({
    seasonId: 1,
    name: "Team Full",
    assignments: [
      { cookingTeamId: 1, inhabitantId: 1, role: 'CHEF' as const },
      { cookingTeamId: 1, inhabitantId: 2, role: 'COOK' as const },
      { cookingTeamId: 1, inhabitantId: 3, role: 'COOK' as const },
      { cookingTeamId: 1, inhabitantId: 4, role: 'JUNIORHELPER' as const }
    ],
    ...overrides
  }),

  validAssignment: (overrides = {}) => ({
    cookingTeamId: 1,
    inhabitantId: 42,
    role: 'CHEF' as const,
    allocationPercentage: 100,
    ...overrides
  })
}

describe('useCookingTeamValidation', () => {
  // Get validation utilities
  const {
    CookingTeamSchema,
    CookingTeamWithMembersSchema,
    TeamRoleSchema,
    validateCookingTeam,
    validateCookingTeamWithMembers,
    getTeamMemberCounts
  } = useCookingTeamValidation()

  describe('CookingTeamSchema', () => {
    it.each([
      {
        name: 'valid team data',
        team: TeamTestFactory.validTeam(),
        expected: { success: true, seasonId: 1, name: "Team Alpha" }
      },
      {
        name: 'team with optional id',
        team: TeamTestFactory.validTeamWithId(),
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
        team: TeamTestFactory.validTeam({ name: "" })
      },
      {
        name: 'name too long (101 chars)',
        team: TeamTestFactory.validTeam({ name: "a".repeat(101) })
      },
      {
        name: 'invalid seasonId (negative)',
        team: TeamTestFactory.validTeam({ seasonId: -1 })
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

  describe('CookingTeamWithMembersSchema', () => {
    it.each([
      {
        name: 'team with empty assignments (defaults)',
        team: TeamTestFactory.validTeam(),
        expectedAssignments: []
      },
      {
        name: 'team with 4 valid members',
        team: TeamTestFactory.validTeamWithMembers(),
        expectedAssignments: 4
      }
    ])('should accept $name', ({ team, expectedAssignments }) => {
      const result = CookingTeamWithMembersSchema.safeParse(team)
      expect(result.success).toBe(true)
      if (result.success) {
        const expectedLength = typeof expectedAssignments === 'number' ? expectedAssignments : expectedAssignments.length
        expect(result.data.assignments).toHaveLength(expectedLength)
      }
    })

    it('should reject team with invalid member role', () => {
      const teamWithInvalidRole = TeamTestFactory.validTeamWithMembers({
        assignments: [TeamTestFactory.validAssignment({ role: 'INVALID_ROLE' as any })]
      })

      const result = CookingTeamWithMembersSchema.safeParse(teamWithInvalidRole)
      expect(result.success).toBe(false)
    })
  })

  describe('validation functions', () => {
    it.each([
      {
        name: 'validateCookingTeam with valid data',
        fn: () => validateCookingTeam(TeamTestFactory.validTeam({ name: "Test Team" })),
        shouldThrow: false,
        expected: { seasonId: 1, name: "Test Team" }
      },
      {
        name: 'validateCookingTeam with invalid data',
        fn: () => validateCookingTeam({ seasonId: "not a number", name: "Test Team" }),
        shouldThrow: true
      },
      {
        name: 'validateCookingTeamWithMembers with valid data',
        fn: () => validateCookingTeamWithMembers(TeamTestFactory.validTeam({ assignments: [] })),
        shouldThrow: false,
        expected: { assignments: [] }
      }
    ])('$name', ({ fn, shouldThrow, expected }) => {
      if (shouldThrow) {
        expect(fn).toThrow()
      } else {
        expect(fn).not.toThrow()
        const result = fn()
        if (expected) {
          Object.entries(expected).forEach(([key, value]) => {
            expect((result as any)[key]).toEqual(value)
          })
        }
      }
    })
  })

  describe('utility functions', () => {
    it.each([
      {
        name: '4 team members',
        team: TeamTestFactory.validTeamWithMembers(),
        expected: 4
      },
      {
        name: 'empty team',
        team: TeamTestFactory.validTeam({ name: "Empty Team", assignments: [] }),
        expected: 0
      }
    ])('getTeamMemberCounts should count $name correctly', ({ team, expected }) => {
      const counts = getTeamMemberCounts(team as CookingTeamWithMembers)
      expect(counts).toBe(expected)
    })
  })

  describe('edge cases', () => {
    it.each([
      {
        name: 'team names with whitespace',
        team: TeamTestFactory.validTeam({ name: "  Team with spaces  " }),
        expected: { success: true, name: "  Team with spaces  " }
      },
      {
        name: 'maximum valid name length (100 chars)',
        team: TeamTestFactory.validTeam({ name: "a".repeat(100) }),
        expected: { success: true }
      },
      {
        name: 'team members with optional IDs',
        team: TeamTestFactory.validTeamWithMembers({
          name: "Team with Member IDs",
          assignments: [
            { id: 1, cookingTeamId: 1, inhabitantId: 10, role: 'CHEF' as const },
            { id: 2, cookingTeamId: 1, inhabitantId: 20, role: 'COOK' as const }
          ]
        }),
        expected: { success: true, assignment0Id: 1, assignment1Id: 2 },
        useWithMembersSchema: true
      }
    ])('should handle $name', ({ team, expected, useWithMembersSchema }) => {
      const schema = useWithMembersSchema ? CookingTeamWithMembersSchema : CookingTeamSchema
      const result = schema.safeParse(team)
      expect(result.success).toBe(expected.success)
      if (result.success && expected.name) {
        expect(result.data.name).toBe(expected.name)
      }
      if (result.success && expected.assignment0Id) {
        const teamResult = result.data as CookingTeamWithMembers
        expect(teamResult.assignments[0]?.id).toBe(expected.assignment0Id)
        expect(teamResult.assignments[1]?.id).toBe(expected.assignment1Id)
      }
    })
  })

  describe('serialization and deserialization', () => {
    const { serializeCookingTeam, deserializeCookingTeam, deserializeCookingTeamAssignment } = useCookingTeamValidation()
    const { createDefaultWeekdayMap } = useWeekDayMapValidation()

    describe('CookingTeamAssignment deserialization', () => {
      it.each([
        {
          name: 'assignment with affinity',
          serialized: {
            id: 10,
            cookingTeamId: 1,
            inhabitantId: 42,
            role: 'CHEF',
            allocationPercentage: 75,
            affinity: '{"mandag":true,"tirsdag":false,"onsdag":true,"torsdag":false,"fredag":false,"lørdag":false,"søndag":false}'
          },
          expectedAffinity: createDefaultWeekdayMap([true, false, true, false, false, false, false])
        },
        {
          name: 'assignment without affinity',
          serialized: {
            id: 11,
            cookingTeamId: 2,
            inhabitantId: 99,
            role: 'COOK',
            allocationPercentage: 100
          },
          expectedAffinity: undefined
        },
        {
          name: 'assignment with null affinity',
          serialized: {
            id: 12,
            cookingTeamId: 3,
            inhabitantId: 55,
            role: 'JUNIORHELPER',
            allocationPercentage: 50,
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
    })

    describe('CookingTeamWithMembers aggregate root roundtrip', () => {
      it.each([
        {
          name: 'team with affinity + assignment with affinity',
          team: {
            id: 1,
            seasonId: 5,
            name: "Team Alpha",
            affinity: createDefaultWeekdayMap([true, false, true, false, true, false, false]), // Mon, Wed, Fri
            assignments: [
              {
                id: 10,
                cookingTeamId: 1,
                inhabitantId: 42,
                role: 'CHEF' as const,
                allocationPercentage: 75,
                affinity: createDefaultWeekdayMap([false, true, false, true, false, false, false]) // Tue, Thu
              }
            ]
          } as CookingTeamWithMembers,
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
              {
                id: 11,
                cookingTeamId: 2,
                inhabitantId: 99,
                role: 'COOK' as const,
                allocationPercentage: 100
              }
            ]
          } as CookingTeamWithMembers,
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
              {
                id: 12,
                cookingTeamId: 3,
                inhabitantId: 55,
                role: 'JUNIORHELPER' as const,
                allocationPercentage: 50,
                affinity: createDefaultWeekdayMap([false, false, false, false, true, true, false]) // Fri, Sat
              }
            ]
          } as CookingTeamWithMembers,
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
              {
                id: 13,
                cookingTeamId: 4,
                inhabitantId: 77,
                role: 'COOK' as const,
                allocationPercentage: 100
              }
            ]
          } as CookingTeamWithMembers,
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
              {
                id: 14,
                cookingTeamId: 5,
                inhabitantId: 20,
                role: 'CHEF' as const,
                allocationPercentage: 100,
                affinity: createDefaultWeekdayMap([true, false, true, false, true, false, false]) // Mon, Wed, Fri
              },
              {
                id: 15,
                cookingTeamId: 5,
                inhabitantId: 21,
                role: 'COOK' as const,
                allocationPercentage: 50
                // No affinity
              }
            ]
          } as CookingTeamWithMembers,
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
          serialized.assignments.forEach((assignment: any, index: number) => {
            if (team.assignments[index]?.affinity) {
              expect(typeof assignment.affinity).toBe('string')
            } else {
              expect(assignment.affinity).toBeNull()
            }
          })
        }

        // Deserialize aggregate root
        const deserialized = deserializeCookingTeam(serialized)

        // Verify team base fields
        expect(deserialized.id).toBe(team.id)
        expect(deserialized.seasonId).toBe(team.seasonId)
        expect(deserialized.name).toBe(team.name)

        // Verify team affinity deserialization
        expect(deserialized.affinity).toEqual(expectedTeamAffinity)

        // Verify assignments deserialization
        expect(deserialized.assignments).toHaveLength(team.assignments.length)

        deserialized.assignments.forEach((assignment, index) => {
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
})