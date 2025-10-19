import {test, expect} from '@playwright/test'
import {useCookingTeamValidation} from '../../../../app/composables/useCookingTeamValidation'
import {useWeekDayMapValidation} from '../../../../app/composables/useWeekDayMapValidation'
import {SeasonFactory} from "../../testDataFactories/seasonFactory"
import {HouseholdFactory} from "../../testDataFactories/householdFactory"
import testHelpers from '../../testHelpers'

const {validateCookingTeam, getTeamMemberCounts} = useCookingTeamValidation()
const {createWeekDayMapFromSelection} = useWeekDayMapValidation()
const {headers, validatedBrowserContext} = testHelpers

const ADMIN_TEAM_ENDPOINT = '/api/admin/team'

// Variables to store IDs for cleanup
let testSeasonId: number
let testHouseholdIds: number[] = []
let testDinnerIds: number[] = []
let testTeamIds: number[] = []

test.describe('Admin Teams API', () => {

    // Setup test season before all tests
    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const created = await SeasonFactory.createSeason(context)
        // Save ID for cleanup
        testSeasonId = created.id as number


        console.info(`Created test season ${created.shortName} with ID ${testSeasonId}`)
    })

    test.describe('Admin Team Endpoints CRUD Operations', () => {

        test('PUT /api/admin/team should create a new team and GET should retrieve it', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const testTeam = await SeasonFactory.createCookingTeamForSeason(context, testSeasonId)
            expect(testTeam.id).toBeDefined()
            // save for cleanup
            testTeamIds.push(testTeam.id)

            // Verify response structure
            expect(testTeam.id).toBeGreaterThanOrEqual(0)
            expect(testTeam.seasonId).toEqual(testSeasonId)

            // Validate the response matches our schema
            expect(() => validateCookingTeam(testTeam)).not.toThrow()
            const retrievedTeam = await SeasonFactory.getCookingTeamById(context, testTeam.id)
            expect(retrievedTeam.id).toBe(testTeam.id)
            expect(retrievedTeam.name).toBe(testTeam.name)
            expect(retrievedTeam.seasonId).toBe(testTeam.seasonId)
        })

        test('PUT /api/admin/team creates a team with team assignments and delete removes team and team assignments', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            // DONT push it to cleanup, we will delete it in this test
            const testTeam = await SeasonFactory.createCookingTeamWithMembersForSeason(context, testSeasonId, "Team-with-team-assignments", 2)
            expect(testTeam.id).toBeDefined()
            expect(testTeam.seasonId).toBe(testSeasonId)
            expect(getTeamMemberCounts(testTeam)).toEqual(2)
            expect(testTeam.assignments.length).toBe(2)
            const memberAssignmentIds = testTeam.assignments.map((a: any) => a.id)
            const assignments = await Promise.all(
                memberAssignmentIds.map(id => SeasonFactory.getCookingTeamAssignment(context, id))
            )
            expect(assignments.map(a => a.id)).toEqual(memberAssignmentIds)

            // Now delete the team
            await SeasonFactory.deleteCookingTeam(context, testTeam.id)

            const assignmentsAfterDelete = await Promise.all(
                memberAssignmentIds.map(id => SeasonFactory.getCookingTeamAssignment(context, id, 404)
                ))
            expect(assignmentsAfterDelete.filter(a => a !== null).length).toBe(0)

            // Cleanup household
            await HouseholdFactory.deleteHousehold(context, testTeam.householdId)
        })

        test('GET /api/admin/team should list all teams', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const testTeam = await SeasonFactory.createCookingTeamForSeason(context, testSeasonId, "List-All-Teams")
            expect(testTeam.id).toBeDefined()
            testTeamIds.push(testTeam.id)

            const teams = await SeasonFactory.getAllCookingTeams(context)
            expect(Array.isArray(teams)).toBe(true)

            // Find our created team
            const foundTeam = teams.find(t => t.name.includes(testTeam.name) && t.id === testTeam.id)
            expect(foundTeam).toBeTruthy()
        })

        test('GET /api/admin/team?seasonId=X should filter teams by season', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // Create a team for current season
            const testTeamName = "Filter-By-Season-Team"
            const team1 = await SeasonFactory.createCookingTeamForSeason(context, testSeasonId, testTeamName)
            // Create teams for different seasons
            const otherSeason = await SeasonFactory.createSeason(context)
            const team2 = await SeasonFactory.createCookingTeamForSeason(context, otherSeason.id as number, "Other-Season-Team")

            testTeamIds.push(team1.id, team2.id)

            // Filter teams by first season
            const filteredTeams = await SeasonFactory.getCookingTeamsForSeason(context, testSeasonId)
            const team1Found = filteredTeams.find(t => t.id === team1.id)
            const team2Found = filteredTeams.find(t => t.id === team2.id)

            expect(team1Found).toBeTruthy()
            expect(team2Found).toBeFalsy() // Should not appear in filtered results

            // Cleanup other season
            await SeasonFactory.deleteSeason(context, otherSeason.id as number)
        })

        test('GET /api/admin/team/[id] should get specific team details', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const createdTeam = await SeasonFactory.createCookingTeamForSeason(context, testSeasonId, "team-details")
            expect(createdTeam.id).toBeDefined()
            testTeamIds.push(createdTeam.id!)

            // Get team details
            const teamDetails = await SeasonFactory.getCookingTeamById(context, createdTeam.id)
            expect(teamDetails.id).toBe(createdTeam.id)
            expect(teamDetails.name).toBe(createdTeam.name)
            expect(teamDetails.seasonId).toBe(testSeasonId)

            // Should include assignments array
            expect(teamDetails).toHaveProperty('assignments')
            expect(Array.isArray(teamDetails.assignments)).toBe(true)
        })

        test('POST /api/admin/team/[id] should update team', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const createdTeam = await SeasonFactory.createCookingTeamForSeason(context, testSeasonId, "team-details")
            expect(createdTeam.id).toBeDefined()
            testTeamIds.push(createdTeam.id)

            // Update the team - send full object with name changed
            const updatedData = {...createdTeam, name: `${createdTeam.name}-Updated`}
            const updateResponse = await context.request.post(`${ADMIN_TEAM_ENDPOINT}/${createdTeam.id}`, {
                headers: headers,
                data: updatedData
            })

            expect(updateResponse.status()).toBe(200)
            const updatedTeam = await updateResponse.json()
            expect(updatedTeam.name).toBe(updatedData.name)
            expect(updatedTeam.id).toBe(createdTeam.id)
        })

        test('PUT should create team with affinity field', async ({ browser }) => {
            // GIVEN a team with affinity for Monday and Wednesday
            const context = await validatedBrowserContext(browser)
            const affinity = createWeekDayMapFromSelection(['mandag', 'onsdag'])
            const team = await SeasonFactory.createCookingTeamForSeason(context, testSeasonId, 'Team-with-affinity', 201, {
                affinity
            })
            testTeamIds.push(team.id)

            // THEN team is created with correct affinity
            expect(team.affinity).toEqual(affinity)
        })

        test('PUT should allow nullish affinity', async ({ browser }) => {
            // GIVEN a team with affinity = null
            const context = await validatedBrowserContext(browser)
            const team = await SeasonFactory.createCookingTeamForSeason(context, testSeasonId, 'Team-with-null-affinity', 201, {
                affinity: null
            })
            testTeamIds.push(team.id)

            // THEN team is created with nullish affinity (null or undefined)
            expect(team.affinity).toBeFalsy()
        })

        test('POST should update team affinity', async ({ browser }) => {
            // GIVEN an existing team with affinity for Monday
            const context = await validatedBrowserContext(browser)
            const initialAffinity = createWeekDayMapFromSelection(['mandag'])
            const team = await SeasonFactory.createCookingTeamForSeason(context, testSeasonId, 'Team-for-affinity-update', 201, {
                affinity: initialAffinity
            })
            testTeamIds.push(team.id)

            // WHEN updating affinity to Wednesday and Friday
            const updatedAffinity = createWeekDayMapFromSelection(['onsdag', 'fredag'])
            const response = await context.request.post(`${ADMIN_TEAM_ENDPOINT}/${team.id}`, {
                headers: headers,
                data: { ...team, affinity: updatedAffinity }
            })

            // THEN update succeeds
            expect(response.status()).toBe(200)
            const updated = await response.json()
            expect(updated.affinity).toEqual(updatedAffinity)
        })

        test('DELETE /api/admin/team/[id] should delete the cooking team, together with team assignments', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const createdTeam = await SeasonFactory.createCookingTeamWithMembersForSeason(context, testSeasonId, "team-to-delete", 3)
            expect(createdTeam.id).toBeDefined()
            // Do not add to cleanup, we are deleting it here

            // Verify team and assignments exist
            expect(getTeamMemberCounts(createdTeam)).toBe(3)
            expect(createdTeam.assignments.length).toBe(3)
            // Delete the team
            await SeasonFactory.deleteCookingTeam(context, createdTeam.id)

            // Verify team is deleted
            await SeasonFactory.getCookingTeamById(context, createdTeam.id, 404)

            // Cleanup household
            await HouseholdFactory.deleteHousehold(context, createdTeam.householdId)
        })
    })

    test.describe('Team Member Management', () => {

        test('PUT /api/admin/team/[id]/members should add team member assignments', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // Create team with members using factory
            const createdTeam = await SeasonFactory.createCookingTeamWithMembersForSeason(context, testSeasonId, "team-with-assignments", 3)
            testTeamIds.push(createdTeam.id)
            testHouseholdIds.push(createdTeam.householdId)

            // Verify the team has the expected member structure
            const teamDetails = await SeasonFactory.getCookingTeamById(context, createdTeam.id)
            expect(getTeamMemberCounts(teamDetails)).toBe(3)

            // Verify allocationPercentage is set (defaults to 100)
            expect(teamDetails.assignments[0].allocationPercentage).toBe(100)
        })

        test('DELETE /api/admin/team/[id]/members/[memberId] should remove team assignments', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // Create team with members using factory
            const createdTeam = await SeasonFactory.createCookingTeamWithMembersForSeason(context, testSeasonId, "team-for-removal", 3)
            testTeamIds.push(createdTeam.id)
            testHouseholdIds.push(createdTeam.householdId)

            // Verify assignments exist
            expect(createdTeam.assignments.length).toBe(3)

            // Remove one assignment to test member removal
            const firstAssignmentId = createdTeam.assignments[0].id
            await SeasonFactory.removeMemberFromTeam(context, createdTeam.id, firstAssignmentId)

            // Verify the assignment was removed
            await SeasonFactory.getCookingTeamAssignment(context, firstAssignmentId, 404)
        })
    })

    test.describe('Validation and Error Handling', () => {

        test('PUT /api/admin/team should reject invalid team data', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // Try to create team without seasonId - should fail
            await SeasonFactory.createCookingTeamForSeason(context, 0, "Invalid Team", 400)
        })

        test('PUT /api/admin/team should reject empty team name', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // Try to create team with empty name - should fail
            await SeasonFactory.createCookingTeamForSeason(context, testSeasonId, "", 400)
        })

        test('GET /api/admin/team/[id] should return 404 for non-existent team', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // Try to get non-existent team - should return 404
            await SeasonFactory.getCookingTeamById(context, 99999, 404)
        })

        test('POST /api/admin/team/[id] should return 404 for non-existent team', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // Create a valid team structure (with all required fields) to pass validation
            // This ensures we get 404 (team not found) instead of 400 (validation error)
            const response = await context.request.post(`${ADMIN_TEAM_ENDPOINT}/99999`,
                {
                    headers: headers,
                    data: {
                        name: "Updated Name",
                        seasonId: testSeasonId,
                        assignments: []
                    }
                })

            expect(response.status()).toBe(404)
        })

        test('DELETE /api/admin/team/[id] should return 404 for non-existent team', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // Try to delete non-existent team - should return 404
            await SeasonFactory.deleteCookingTeam(context, 99999, 404)
        })

    })

    // Cleanup after all tests
    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Clean up all created teams
        await Promise.all(testTeamIds.map(id => SeasonFactory.deleteCookingTeam(context, id).catch(error => {
            // Ignore cleanup errors
            console.warn(`Failed to cleanup team ${id}: `, error.statusMessage || '')
        })))

        // Clean up all created households
        await Promise.all(testHouseholdIds.map(id => HouseholdFactory.deleteHousehold(context, id).catch(error => {
            // Ignore cleanup errors
            console.warn(`Failed to cleanup household ${id}:`, error)
        })))

        // Clean up the test season
        if (testSeasonId) {
            try {
                await SeasonFactory.deleteSeason(context, testSeasonId)
            } catch (error) {
                console.warn(`Failed to cleanup test season ${testSeasonId}:`, error)
            }
        }
    })
})
