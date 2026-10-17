import {test, expect} from '@playwright/test'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import testHelpers from '~~/tests/e2e/testHelpers'

const {validateCookingTeam, getTeamMemberCounts, CreateTeamsResponseSchema} = useCookingTeamValidation()
const {createWeekDayMapFromSelection} = useWeekDayMapValidation()
const {headers, validatedBrowserContext, salt} = testHelpers

const ADMIN_TEAM_ENDPOINT = '/api/admin/team'

// Variables to store IDs for cleanup
// Only track root entities - CASCADE will delete children:
// Season → CookingTeam → CookingTeamAssignment
// Household → Inhabitant
let testSeasonId: number
const createdSeasonIds: number[] = []
const createdHouseholdIds: number[] = []

test.describe('Admin Teams API', () => {

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const created = await SeasonFactory.createSeason(context)
        testSeasonId = created.id as number
        createdSeasonIds.push(testSeasonId)
    })

    test.describe('Admin Team Endpoints CRUD Operations', () => {

        test('PUT /api/admin/team should create a new team and GET should retrieve it', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const testTeam = await SeasonFactory.createCookingTeamForSeason(context, testSeasonId)

            expect(testTeam.id).toBeGreaterThanOrEqual(0)
            expect(testTeam.seasonId).toEqual(testSeasonId)
            expect(() => validateCookingTeam(testTeam)).not.toThrow()
            expect(testTeam.jokerSlots).toEqual([])

            expect(testTeam.id).toBeDefined()
            const retrievedTeam = await SeasonFactory.getCookingTeamById(context, testTeam.id!)
            expect(retrievedTeam).not.toBeNull()
            expect(retrievedTeam!.id).toBe(testTeam.id)
            expect(retrievedTeam!.name).toBe(testTeam.name)
            expect(retrievedTeam!.seasonId).toBe(testTeam.seasonId)
        })

        test('PUT /api/admin/team returns the {teams, eventsAssigned} envelope (ADR-009)', async ({browser}) => {
            // GIVEN: an own season with auto-generated dinner events (parallel-safe: no shared season)
            const context = await validatedBrowserContext(browser)
            const testSalt = Date.now().toString()
            const {season, dinnerEvents} = await SeasonFactory.createSeasonWithDinnerEvents(context, testSalt)
            createdSeasonIds.push(season.id as number)
            expect(dinnerEvents.length).toBeGreaterThan(0)

            // WHEN: two teams are created in one PUT
            const response = await context.request.put(ADMIN_TEAM_ENDPOINT, {
                headers: headers,
                data: [
                    {name: salt('Envelope-Team-A', testSalt), seasonId: season.id},
                    {name: salt('Envelope-Team-B', testSalt), seasonId: season.id}
                ]
            })
            expect(response.status()).toBe(201)

            // THEN: the body is the operation result envelope, not a bare team array
            const body = await response.json()
            expect(Array.isArray(body), 'PUT must return {teams, eventsAssigned}').toBe(false)
            const envelope = CreateTeamsResponseSchema.parse(body)
            expect(envelope.teams.length).toBe(2)
            expect(envelope.teams.every(team => team.seasonId === season.id)).toBe(true)

            // AND: eventsAssigned counts the season's dinners that now carry a cooking team
            const eventsAfter = await DinnerEventFactory.getDinnerEventsForSeason(context, season.id as number)
            const assignedEvents = eventsAfter.filter(dinnerEvent => dinnerEvent.cookingTeamId !== null)
            expect(assignedEvents.length).toBeGreaterThan(0)
            expect(envelope.eventsAssigned).toBe(assignedEvents.length)
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
            // The index carries the joker slot aggregate, not the slots
            expect(foundTeam!.jokerSlotCount).toBe(0)
        })

        test('GET /api/admin/team?seasonId=X should filter teams by season', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // Create a team for current season
            const testTeamName = "Filter-By-Season-Team"
            const team1 = await SeasonFactory.createCookingTeamForSeason(context, testSeasonId, testTeamName)
            // Create teams for different seasons
            const otherSeason = await SeasonFactory.createSeason(context)
            createdSeasonIds.push(otherSeason.id as number)
            const team2 = await SeasonFactory.createCookingTeamForSeason(context, otherSeason.id as number, "Other-Season-Team")

            // Filter teams by first season
            const filteredTeams = await SeasonFactory.getCookingTeamsForSeason(context, testSeasonId)
            const team1Found = filteredTeams.find(t => t.id === team1.id)
            const team2Found = filteredTeams.find(t => t.id === team2.id)

            expect(team1Found).toBeTruthy()
            expect(team2Found).toBeFalsy() // Should not appear in filtered results
        })

        test('GET /api/admin/team/[id] should return Detail entity with dinnerEvents, cookingDaysCount and joker slots (ADR-009)', async ({browser}) => {
            // GIVEN: A team with dinner events assigned
            const context = await validatedBrowserContext(browser)
            const createdTeam = await SeasonFactory.createCookingTeamForSeason(context, testSeasonId, "team-with-dinners")

            // Assign team to some dinner events
            const dinnerEvent1 = await SeasonFactory.createDinnerEventForSeason(context, testSeasonId, {
                cookingTeamId: createdTeam.id
            })
            const dinnerEvent2 = await SeasonFactory.createDinnerEventForSeason(context, testSeasonId, {
                cookingTeamId: createdTeam.id
            })

            // WHEN: GET team detail by ID (the factory asserts the 200)
            const teamDetail = (await SeasonFactory.getCookingTeamById(context, createdTeam.id!))!

            // AND: Contains Detail entity fields (ADR-009)
            expect(teamDetail.id).toBe(createdTeam.id)
            expect(teamDetail.name).toBe(createdTeam.name)
            expect(teamDetail.seasonId).toBe(testSeasonId)

            // AND: Contains assignments array
            expect(teamDetail).toHaveProperty('assignments')
            expect(Array.isArray(teamDetail.assignments)).toBe(true)

            // AND: Contains dinnerEvents array (Detail pattern)
            expect(teamDetail).toHaveProperty('dinnerEvents')
            expect(Array.isArray(teamDetail.dinnerEvents)).toBe(true)
            // Creating the team also auto-assigns the season's unassigned dinners (ADR-015), so the source of truth is
            // the season's dinner list, not a fixed number: the Detail carries exactly the dinners that name this team
            const seasonDinners = await DinnerEventFactory.getDinnerEventsForSeason(context, testSeasonId)
            const teamDinnerIds = seasonDinners.filter(e => e.cookingTeamId === createdTeam.id).map(e => e.id).sort()
            const detailIds = teamDetail.dinnerEvents.map((e: {id: number}) => e.id).sort()
            expect(detailIds).toEqual(teamDinnerIds)
            expect(detailIds).toEqual(expect.arrayContaining([dinnerEvent1.id, dinnerEvent2.id]))

            // AND: Contains cookingDaysCount aggregate
            expect(teamDetail).toHaveProperty('cookingDaysCount')
            expect(teamDetail.cookingDaysCount).toBe(teamDinnerIds.length)

            // AND: Carries the team's joker slots (none yet), and the aggregate it inherits from the Display counts them
            expect(teamDetail.jokerSlots).toEqual([])
            expect(teamDetail.jokerSlotCount).toBe(teamDetail.jokerSlots.length)
        })

        test('GET /api/admin/team/[id] should return 400 for invalid team ID', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            const response = await context.request.get(`${ADMIN_TEAM_ENDPOINT}/invalid`, {
                headers: headers
            })

            expect(response.status()).toBe(400)
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
            expect(updatedTeam.jokerSlots).toEqual([])
        })

        test('POST /api/admin/team/[id] should update team with assignments (inhabitant populated)', async ({browser}) => {
            // GIVEN: Create a team with members (includes inhabitant relation)
            const context = await validatedBrowserContext(browser)
            const teamWithMembers = await SeasonFactory.createCookingTeamWithMembersForSeason(
                context,
                testSeasonId,
                "team-with-members-update",
                1
            )
            expect(teamWithMembers.id).toBeDefined()
            expect(teamWithMembers.assignments).toHaveLength(1)
            createdHouseholdIds.push(teamWithMembers.householdId)

            // WHEN: GET the full team (includes assignments with inhabitant relation populated)
            const fetchedTeam = (await SeasonFactory.getCookingTeamById(context, teamWithMembers.id!))!

            expect(fetchedTeam.assignments).toBeDefined()
            expect(fetchedTeam.assignments.length).toBeGreaterThan(0)
            expect(fetchedTeam.assignments[0]!.inhabitant).toBeDefined()
            expect(fetchedTeam.assignments[0]!.inhabitant.name).toBeDefined()
            expect(fetchedTeam.assignments[0]!.inhabitantId).toBeDefined()

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

        test('DELETE /api/admin/team/[id] deletes the cooking team together with its team assignments, and a removed team answers 404', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const createdTeam = await SeasonFactory.createCookingTeamWithMembersForSeason(context, testSeasonId, "team-to-delete", 3)
            createdHouseholdIds.push(createdTeam.householdId)

            // GIVEN: The team Detail carries three assignments at full allocation, each readable on its own
            expect(getTeamMemberCounts(createdTeam)).toBe(3)
            expect(createdTeam.assignments.every(assignment => assignment.allocationPercentage === 100)).toBe(true)
            const assignmentIds = createdTeam.assignments.map(assignment => assignment.id!)
            const assignments = await Promise.all(assignmentIds.map(id => SeasonFactory.getCookingTeamAssignment(context, id)))
            expect(assignments.map(assignment => assignment?.id)).toEqual(assignmentIds)

            // WHEN: The team is deleted
            const deletedId = await SeasonFactory.deleteCookingTeam(context, createdTeam.id!, 200)
            expect(deletedId).toBe(createdTeam.id)

            // THEN: The team and its assignments are gone
            await SeasonFactory.getCookingTeamById(context, createdTeam.id!, 404)
            await Promise.all(assignmentIds.map(id => SeasonFactory.getCookingTeamAssignment(context, id, 404)))

            // AND: An update and a second delete of the removed team answer 404 (a valid body, so the 404 is the lookup)
            const updateResponse = await context.request.post(`${ADMIN_TEAM_ENDPOINT}/${createdTeam.id}`, {
                headers: headers,
                data: {name: "Updated Name", seasonId: testSeasonId, assignments: []}
            })
            expect(updateResponse.status()).toBe(404)
            await SeasonFactory.deleteCookingTeam(context, createdTeam.id!, 404)
        })
    })

    test.describe('Team Member Management', () => {

        test('POST /api/admin/team/assignment/[id] updates role and allocation, and the team Detail reflects it', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const {TeamRoleSchema} = useCookingTeamValidation()

            // GIVEN: a team with one member at full time
            const createdTeam = await SeasonFactory.createCookingTeamWithMembersForSeason(context, testSeasonId, "team-for-update", 1)
            createdHouseholdIds.push(createdTeam.householdId)
            const member = createdTeam.assignments[0]!
            const role = member.role === TeamRoleSchema.enum.COOK ? TeamRoleSchema.enum.JUNIORHELPER : TeamRoleSchema.enum.COOK

            // WHEN: the seat changes role and drops to half time
            const updated = await SeasonFactory.updateTeamMember(context, member.id!, {role, allocationPercentage: 50})

            // THEN: the response and the team Detail carry the new seat on the same assignment
            expect(updated).toMatchObject({id: member.id, inhabitantId: member.inhabitantId, role, allocationPercentage: 50})
            const teamDetail = await SeasonFactory.getCookingTeamById(context, createdTeam.id!)
            expect(teamDetail!.assignments).toEqual([expect.objectContaining({id: member.id, role, allocationPercentage: 50})])
        })

        test('POST /api/admin/team/assignment/[id] rejects an allocation outside 1-100', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const createdTeam = await SeasonFactory.createCookingTeamWithMembersForSeason(context, testSeasonId, "team-for-invalid-update", 1)
            createdHouseholdIds.push(createdTeam.householdId)
            await SeasonFactory.updateTeamMember(context, createdTeam.assignments[0]!.id!, {allocationPercentage: 0}, 400)
        })

        test('DELETE /api/admin/team/[id]/members/[memberId] should remove team assignments', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // Create team with members using factory
            const createdTeam = await SeasonFactory.createCookingTeamWithMembersForSeason(context, testSeasonId, "team-for-removal", 2)
            createdHouseholdIds.push(createdTeam.householdId)

            // Verify assignments exist
            expect(createdTeam.assignments.length).toBe(2)

            // Remove one assignment to test member removal
            const firstAssignmentId = createdTeam.assignments[0]!.id!
            expect(createdTeam.id).toBeDefined()
            await SeasonFactory.removeMemberFromTeam(context, createdTeam.id!, firstAssignmentId)

            // Verify the assignment was removed
            await SeasonFactory.getCookingTeamAssignment(context, firstAssignmentId, 404)
        })
    })

    test.describe('Validation and Error Handling', () => {

        test('PUT /api/admin/team should reject invalid team data', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // Try to create team without seasonId - should fail (the schema's field rules: useCookingTeamValidation unit spec)
            await SeasonFactory.createCookingTeamForSeason(context, 0, "Invalid Team", 400)
        })

    })

    // Cleanup after all tests
    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Only need to delete root entities - CASCADE will handle the rest
        // Deleting Season cascades to CookingTeam → CookingTeamAssignment
        // Deleting Household cascades to Inhabitants
        await HouseholdFactory.deleteHousehold(context, createdHouseholdIds)
        await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
    })
})
