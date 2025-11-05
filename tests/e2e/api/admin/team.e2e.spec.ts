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
// Only track root entities - CASCADE will delete children:
// Season → CookingTeam → CookingTeamAssignment
// Household → Inhabitant
let testSeasonId: number
let testHouseholdIds: number[] = []

test.describe('Admin Teams API', () => {

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const created = await SeasonFactory.createSeason(context)
        testSeasonId = created.id as number
    })

    test.describe('Admin Team Endpoints CRUD Operations', () => {

        test('PUT /api/admin/team should create a new team and GET should retrieve it', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const testTeam = await SeasonFactory.createCookingTeamForSeason(context, testSeasonId)

            expect(testTeam.id).toBeGreaterThanOrEqual(0)
            expect(testTeam.seasonId).toEqual(testSeasonId)
            expect(() => validateCookingTeam(testTeam)).not.toThrow()

            const retrievedTeam = await SeasonFactory.getCookingTeamById(context, testTeam.id)
            expect(retrievedTeam.id).toBe(testTeam.id)
            expect(retrievedTeam.name).toBe(testTeam.name)
            expect(retrievedTeam.seasonId).toBe(testTeam.seasonId)
        })

        test('PUT /api/admin/team creates a team with team assignments and delete removes team and team assignments', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
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

            // Get team details
            const teamDetails = await SeasonFactory.getCookingTeamById(context, createdTeam.id)
            expect(teamDetails.id).toBe(createdTeam.id)
            expect(teamDetails.name).toBe(createdTeam.name)
            expect(teamDetails.seasonId).toBe(testSeasonId)
            expect(teamDetails).toHaveProperty('assignments')
            expect(Array.isArray(teamDetails.assignments)).toBe(true)
        })

        test('POST /api/admin/team/[id] should update team', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const createdTeam = await SeasonFactory.createCookingTeamForSeason(context, testSeasonId, "team-details")

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

        test('POST /api/admin/team/[id] should update team with assignments (inhabitant populated)', async ({browser}) => {
            // GIVEN: Create a team with members (includes inhabitant relation)
            const context = await validatedBrowserContext(browser)
            const teamWithMembers = await SeasonFactory.createCookingTeamWithMembersForSeason(
                context,
                testSeasonId,
                "team-with-members-update",
                2
            )
            expect(teamWithMembers.id).toBeDefined()
            expect(teamWithMembers.assignments).toHaveLength(2)
            testHouseholdIds.push(teamWithMembers.householdId)

            // WHEN: GET the full team (includes assignments with inhabitant relation populated)
            const getResponse = await context.request.get(`${ADMIN_TEAM_ENDPOINT}/${teamWithMembers.id}`)
            expect(getResponse.status()).toBe(200)
            const fetchedTeam = await getResponse.json()

            expect(fetchedTeam.assignments).toBeDefined()
            expect(fetchedTeam.assignments.length).toBeGreaterThan(0)
            expect(fetchedTeam.assignments[0].inhabitant).toBeDefined()
            expect(fetchedTeam.assignments[0].inhabitant.name).toBeDefined()
            expect(fetchedTeam.assignments[0].inhabitantId).toBeDefined()

            // THEN: POST the full team back with a name change (simulating UI workflow with populated inhabitant relation)
            const updatedData = {
                ...fetchedTeam,
                name: `${fetchedTeam.name}-Updated`,
                assignments: fetchedTeam.assignments // Explicitly include assignments with inhabitant
            }
            const updateResponse = await context.request.post(`${ADMIN_TEAM_ENDPOINT}/${fetchedTeam.id}`, {
                headers: headers,
                data: updatedData
            })

            // EXPECT: Update should succeed (repository should strip read-only inhabitant field)
            expect(updateResponse.status()).toBe(200)
            const updatedTeam = await updateResponse.json()
            expect(updatedTeam.name).toBe(updatedData.name)
            expect(updatedTeam.id).toBe(fetchedTeam.id)
        })

        test('PUT should create team with affinity field', async ({ browser }) => {
            // GIVEN a team with affinity for Monday and Wednesday
            const context = await validatedBrowserContext(browser)
            const affinity = createWeekDayMapFromSelection(['mandag', 'onsdag'], true, false)
            const team = await SeasonFactory.createCookingTeamForSeason(context, testSeasonId, 'Team-with-affinity', 201, {
                affinity
            })

            // THEN team is created with correct affinity
            expect(team.affinity).toEqual(affinity)
        })

        test('PUT should allow nullish affinity', async ({ browser }) => {
            // GIVEN a team with affinity = null
            const context = await validatedBrowserContext(browser)
            const team = await SeasonFactory.createCookingTeamForSeason(context, testSeasonId, 'Team-with-null-affinity', 201, {
                affinity: null
            })

            // THEN team is created with nullish affinity (null or undefined)
            expect(team.affinity).toBeFalsy()
        })

        test('POST should update team affinity', async ({ browser }) => {
            // GIVEN an existing team with affinity for Monday
            const context = await validatedBrowserContext(browser)
            const initialAffinity = createWeekDayMapFromSelection(['mandag'], true, false)
            const team = await SeasonFactory.createCookingTeamForSeason(context, testSeasonId, 'Team-for-affinity-update', 201, {
                affinity: initialAffinity
            })

            // WHEN updating affinity to Wednesday and Friday
            const updatedAffinity = createWeekDayMapFromSelection(['onsdag', 'fredag'], true, false)
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

        // Only need to delete root entities - CASCADE will handle the rest
        // Deleting Season cascades to CookingTeam → CookingTeamAssignment
        // Deleting Household cascades to Inhabitants
        if (testSeasonId) {
            try {
                await SeasonFactory.deleteSeason(context, testSeasonId)
            } catch (error) {
                console.warn(`Failed to cleanup test season ${testSeasonId}:`, error)
            }
        }

        // Clean up all created households
        await Promise.all(testHouseholdIds.map(id => HouseholdFactory.deleteHousehold(context, id).catch(error => {
            // Ignore cleanup errors
            console.warn(`Failed to cleanup household ${id}:`, error)
        })))
    })
})
