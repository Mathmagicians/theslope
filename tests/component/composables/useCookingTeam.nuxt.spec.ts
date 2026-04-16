import { describe, it, expect } from 'vitest'
import { useCookingTeam } from '~/composables/useCookingTeam'
import { useCookingTeamValidation, type CookingTeamAssignment, type TeamRole } from '~/composables/useCookingTeamValidation'
import type { InhabitantDisplay } from '~/composables/useCoreValidation'
import { HouseholdFactory } from '~~/tests/e2e/testDataFactories/householdFactory'

describe('useCookingTeam', () => {

  describe('createDefaultTeamName', () => {
    it('creates correct team name format', () => {
      const { createDefaultTeamName } = useCookingTeam()
      const name = createDefaultTeamName('Winter 2025', 3)
      expect(name).toBe('Madhold 3 - Winter 2025')
    })
  })

  describe('extractTeamNumber', () => {
    const { extractTeamNumber } = useCookingTeam()

    describe('valid team names', () => {
      it.each([
        { teamName: 'Madhold 1', expected: 1, description: 'CSV format' },
        { teamName: 'Madhold 1 - 08/25-06/26', expected: 1, description: 'full format extracts first number' },
        { teamName: 'Madhold 10 - Winter 2025', expected: 10, description: 'double digit' },
        { teamName: '0', expected: 0, description: 'zero boundary' },
        { teamName: '99Team', expected: 99, description: 'number at start' },
        { teamName: 'Team99End', expected: 99, description: 'number in middle' }
      ])('extracts $expected from "$teamName" ($description)', ({ teamName, expected }) => {
        expect(extractTeamNumber(teamName)).toBe(expected)
      })
    })

    describe('invalid team names', () => {
      it.each([
        { teamName: 'Madhold', description: 'no digits' },
        { teamName: '', description: 'empty string' }
      ])('returns null for "$teamName" ($description)', ({ teamName }) => {
        expect(extractTeamNumber(teamName)).toBeNull()
      })
    })
  })

  describe('getTeamShortName', () => {
    const { getTeamShortName } = useCookingTeam()

    describe('with dash separator', () => {
      it.each([
        { teamName: 'Madhold 1 - 08/25-06/26', expected: 'Madhold 1', description: 'typical full format' },
        { teamName: 'Madhold 2 - Winter 2025', expected: 'Madhold 2', description: 'season name format' },
        { teamName: 'Team A - Season', expected: 'Team A', description: 'letter-based team' },
        { teamName: 'Madhold 10 - Long Season Name Here', expected: 'Madhold 10', description: 'double digit with long season' }
      ])('returns "$expected" from "$teamName" ($description)', ({ teamName, expected }) => {
        expect(getTeamShortName(teamName)).toBe(expected)
      })
    })

    describe('without dash separator (fallback to full name)', () => {
      it.each([
        { teamName: 'Madhold 1', expected: 'Madhold 1', description: 'already short' },
        { teamName: 'Team A', expected: 'Team A', description: 'no season suffix' },
        { teamName: '', expected: '', description: 'empty string' }
      ])('returns "$expected" from "$teamName" ($description)', ({ teamName, expected }) => {
        expect(getTeamShortName(teamName)).toBe(expected)
      })
    })
  })

  describe('getDefaultCookingTeam', () => {
    it('creates default team with generated name', () => {
      const { getDefaultCookingTeam } = useCookingTeam()
      const team = getDefaultCookingTeam(1, 'Winter 2025', 2)

      expect(team).toEqual({
        seasonId: 1,
        name: 'Madhold 2 - Winter 2025',
        assignments: [],
        cookingDaysCount: 0
      })
    })

    it('allows overriding default values', () => {
      const { getDefaultCookingTeam } = useCookingTeam()
      const team = getDefaultCookingTeam(1, 'Winter 2025', 1, { name: 'Custom Team' })

      expect(team.name).toBe('Custom Team')
      expect(team.seasonId).toBe(1)
    })
  })

  describe('mergeInhabitantsWithAssignments', () => {
    const anna = {...HouseholdFactory.defaultInhabitantData('test-anna'), id: 1, name: 'Anna', lastName: 'Hansen'}
    const bob = {...HouseholdFactory.defaultInhabitantData('test-bob'), id: 2, name: 'Bob', lastName: 'Jensen'}
    const charlie = {...HouseholdFactory.defaultInhabitantData('test-charlie'), id: 3, name: 'Charlie', lastName: 'Nielsen'}

    const {TeamRoleSchema} = useCookingTeamValidation()
    const Role = TeamRoleSchema.enum

    const makeAssignment = (id: number, role: TeamRole, inhabitant: InhabitantDisplay, overrides?: Partial<CookingTeamAssignment>): CookingTeamAssignment => ({
      id, role, inhabitantId: inhabitant.id, cookingTeamId: 0, allocationPercentage: 100, inhabitant, ...overrides
    })

    const makeTeam = (id: number, name: string, assignments: CookingTeamAssignment[]) => ({
      id, name, seasonId: 1, affinity: null, cookingDaysCount: 0,
      assignments: assignments.map(a => ({...a, cookingTeamId: id}))
    })

    it('merges inhabitants with their assignments from multiple teams', () => {
      const {mergeInhabitantsWithAssignments} = useCookingTeam()
      const teams = [
        makeTeam(1, 'Madhold 1', [makeAssignment(101, Role.CHEF, anna)]),
        makeTeam(2, 'Madhold 2', [makeAssignment(102, Role.COOK, bob)])
      ]

      const result = mergeInhabitantsWithAssignments([anna, bob, charlie], teams)

      expect(result).toHaveLength(3)
      const annaResult = result.find(i => i.id === 1)!
      expect(annaResult.CookingTeamAssignment).toHaveLength(1)
      expect(annaResult.CookingTeamAssignment![0]!.cookingTeamId).toBe(1)
      expect(result.find(i => i.id === 2)!.CookingTeamAssignment).toHaveLength(1)
      expect(result.find(i => i.id === 3)!.CookingTeamAssignment).toBeUndefined()
    })

    it('returns all assignments when inhabitant is in multiple teams', () => {
      const {mergeInhabitantsWithAssignments} = useCookingTeam()
      const teams = [
        makeTeam(1, 'Madhold 1', [makeAssignment(101, Role.CHEF, anna, {allocationPercentage: 50})]),
        makeTeam(2, 'Madhold 2', [makeAssignment(102, Role.COOK, anna, {allocationPercentage: 50})])
      ]

      const result = mergeInhabitantsWithAssignments([anna], teams)

      expect(result[0]!.CookingTeamAssignment).toHaveLength(2)
      expect(result[0]!.CookingTeamAssignment!.map(a => a.cookingTeamId)).toEqual([1, 2])
      expect(result[0]!.CookingTeamAssignment!.map(a => a.allocationPercentage)).toEqual([50, 50])
    })

    it('preserves allocationPercentage and affinity on assignments', () => {
      const {mergeInhabitantsWithAssignments} = useCookingTeam()
      const teams = [makeTeam(1, 'Madhold 1', [makeAssignment(101, Role.CHEF, anna, {allocationPercentage: 25})])]

      const result = mergeInhabitantsWithAssignments([anna], teams)

      const assignment = result[0]!.CookingTeamAssignment![0]!
      expect(assignment.allocationPercentage).toBe(25)
      expect(assignment.affinity).toBeUndefined()
    })

    it('returns empty assignments for empty teams', () => {
      const {mergeInhabitantsWithAssignments} = useCookingTeam()
      const result = mergeInhabitantsWithAssignments([anna, bob], [])

      result.forEach(i => expect(i.CookingTeamAssignment).toBeUndefined())
    })

    it('returns empty array for empty inhabitants', () => {
      const {mergeInhabitantsWithAssignments} = useCookingTeam()
      expect(mergeInhabitantsWithAssignments([], [])).toEqual([])
    })
  })
})