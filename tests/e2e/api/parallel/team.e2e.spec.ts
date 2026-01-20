import {test, expect} from '@playwright/test'
import {SeasonFactory} from "~~/tests/e2e/testDataFactories/seasonFactory"
import testHelpers from '~~/tests/e2e/testHelpers'
import type {Season} from '~/composables/useSeasonValidation'

const {validatedBrowserContext} = testHelpers

const MY_TEAM_ENDPOINT = '/api/team/my'

let activeSeason: Season

test.describe('Team API - My Teams', () => {

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        // Create singleton active season (shared across workers, cleaned up by global teardown)
        activeSeason = await SeasonFactory.createActiveSeason(context)
    })

    // NOTE: Cleanup handled by global teardown (runs once after all workers finish)

    test.describe('GET /api/team/my', () => {

        test('GIVEN user with team assignments WHEN fetching my teams THEN returns teams with dinnerEvents', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // Get the logged-in user's inhabitant ID
            const userResponse = await context.request.get('/api/admin/users', { headers: testHelpers.headers })
            expect(userResponse.status(), 'GET /api/admin/users should return 200').toBe(200)
            const users = await userResponse.json()
            const testUser = users.find((u: { email: string }) => u.email === process.env.HEY_NABO_USERNAME)
            expect(testUser, `Test user with email ${process.env.HEY_NABO_USERNAME} should exist`).toBeDefined()
            expect(testUser.Inhabitant, `Test user should have an Inhabitant. User: ${JSON.stringify(testUser, null, 2)}`).toBeDefined()
            const testInhabitantId = testUser.Inhabitant.id
            expect(testInhabitantId, 'Test inhabitant ID should be defined').toBeGreaterThan(0)

            // Create teams and assign logged-in user to them
            const team1 = await SeasonFactory.createCookingTeamForSeason(context, activeSeason.id!, "My-Team-1")
            const assignment1 = await SeasonFactory.assignMemberToTeam(context, team1.id!, testInhabitantId, 'CHEF')
            expect(assignment1, 'Team 1 assignment should be created').not.toBeNull()
            expect(assignment1!.inhabitantId, 'Assignment 1 should reference test inhabitant').toBe(testInhabitantId)

            const team2 = await SeasonFactory.createCookingTeamForSeason(context, activeSeason.id!, "My-Team-2")
            const assignment2 = await SeasonFactory.assignMemberToTeam(context, team2.id!, testInhabitantId, 'COOK')
            expect(assignment2, 'Team 2 assignment should be created').not.toBeNull()
            expect(assignment2!.inhabitantId, 'Assignment 2 should reference test inhabitant').toBe(testInhabitantId)

            // Verify teams have the assignments
            const team1Verify = await SeasonFactory.getCookingTeamById(context, team1.id!)
            expect(team1Verify, 'Team 1 should exist').not.toBeNull()
            expect(team1Verify!.assignments, 'Team 1 should have assignments').toBeDefined()
            expect(team1Verify!.assignments.length, `Team 1 should have at least 1 assignment. Assignments: ${JSON.stringify(team1Verify!.assignments)}`).toBeGreaterThan(0)
            expect(team1Verify!.assignments.some((a) => a.inhabitantId === testInhabitantId), `Team 1 should have assignment for inhabitant ${testInhabitantId}`).toBe(true)

            // Fetch my teams
            const response = await context.request.get(MY_TEAM_ENDPOINT)
            expect(response.status(), 'GET /api/team/my should return 200').toBe(200)

            const myTeams = await response.json()
            expect(Array.isArray(myTeams), 'Response should be an array').toBe(true)
            expect(myTeams.length, `Should return 2+ teams. Received ${myTeams.length} teams. Test inhabitant ID: ${testInhabitantId}. Response: ${JSON.stringify(myTeams)}`).toBeGreaterThanOrEqual(2)

            // Verify returned teams include created teams
            const teamIds = myTeams.map((t: { id: number }) => t.id)
            expect(teamIds).toContain(team1.id)
            expect(teamIds).toContain(team2.id)

            // Verify structure includes dinnerEvents and assignments
            const myTeam = myTeams.find((t: { id: number }) => t.id === team1.id)
            expect(myTeam).toBeDefined()
            expect(myTeam.seasonId).toBe(activeSeason.id!)
            expect(Array.isArray(myTeam.dinnerEvents)).toBe(true)
            expect(Array.isArray(myTeam.assignments)).toBe(true)
            expect(myTeam.assignments.length).toBe(1)
            expect(myTeam.assignments[0].inhabitantId).toBe(testInhabitantId)
        })

        test('GIVEN teams exist but user not assigned WHEN fetching my teams THEN returns only assigned teams', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // Create team without assignments for logged-in user
            const otherTeam = await SeasonFactory.createCookingTeamForSeason(context, activeSeason.id!)

            // Fetch my teams
            const response = await context.request.get(MY_TEAM_ENDPOINT)
            expect(response.status()).toBe(200)

            const myTeams = await response.json()
            expect(Array.isArray(myTeams)).toBe(true)

            // Should not include the team without user assignment
            const teamIds = myTeams.map((t: { id: number }) => t.id)
            expect(teamIds).not.toContain(otherTeam.id)
        })
    })
})
