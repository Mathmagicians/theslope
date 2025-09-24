import {test, expect} from '@playwright/test'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import {getTestSeason, cookingTeams} from '~~/tests/mocks/testObjects'
import {authFiles} from '../../config'

const {adminFile} = authFiles

const headers = {'Content-Type': 'application/json'}
const ADMIN_TEAM_ENDPOINT = '/api/admin/team'
const ADMIN_SEASON_ENDPOINT = '/api/admin/season'

// Generate unique test data
const testSalt = Date.now().toString()
const testTeamName = `TestTeam-${testSalt}`
// TODO - refactor, should use testObjects

// Variables to store IDs for cleanup
let testSeasonId: number // Will be set after creating the season
let testUserIds:number[] = []
let testDinnerIds:number[] = []
let testTeamIds: number[] = []

//TODO Test team data, use base from testObjects, and associate with correct season id, and test users ids, and dinner ids
const newTeam = {
    get seasonId() {
        return testSeasonId
    },
    name: testTeamName
}


const {validateCookingTeam} = useCookingTeamValidation()

test.describe('Admin Teams API', () => {

    // Setup test season before all tests
    test.beforeAll(async ({browser}) => {
        const context = await browser.newContext({
            storageState: adminFile
        })

        // Create test season using testObjects helper
        const {rawSeason, serializedSeason} = getTestSeason()
        const seasonResponse = await context.request.put(ADMIN_SEASON_ENDPOINT, {
            headers: headers,
            data: serializedSeason
        })

        expect(seasonResponse.status()).toBe(201)
        const createdSeason = await seasonResponse.json()
        testSeasonId = createdSeason.id

        console.log(`Created test season ${createdSeason.shortName} with ID ${testSeasonId}`)

        //TODO Create test users for team assignements using testObjects helper


        //TODO Crete dinner events in season using testObjects helper

        //TODO associate test data ids for dinners and users
    })

    test.describe('Admin Team Endpoints CRUD Operations', () => {

        test.each(cookingTeams)(`PUT ${ADMIN_TEAM_ENDPOINT} should create a new team %s`, async ({browser}) => {
            const context = await browser.newContext({
                storageState: adminFile
            })

            const response = await context.request.put(ADMIN_TEAM_ENDPOINT, {
                headers: headers,
                data: newTeam
            })

            const status = response.status()
            const responseBody = await response.json()

            expect(status, `Expected 201 but got ${status}. Response: ${JSON.stringify(responseBody)}`).toBe(201)
            expect(responseBody.id).toBeDefined()
            // save for cleanup
            testTeamIds.push(responseBody.id)

            // Verify response structure
            expect(responseBody).toHaveProperty('id')
            expect(responseBody).toHaveProperty('seasonId')
            expect(responseBody).toHaveProperty('name')
            expect(responseBody.seasonId).toBe(testSeasonId)
            expect(responseBody.name).toBe(testTeamName)

            // Validate the response matches our schema
            expect(() => validateCookingTeam(responseBody)).not.toThrow()
        })

        test(`GET ${ADMIN_TEAM_ENDPOINT} should list all teams`, async ({browser}) => {
            const context = await browser.newContext({
                storageState: adminFile
            })

            // First create a team to ensure there's at least one
            const createResponse = await context.request.put(ADMIN_TEAM_ENDPOINT, {
                headers: headers,
                data: newTeam
            })
            expect(createResponse.status()).toBe(201)
            const createdTeam = await createResponse.json()
            testTeamIds.push(createdTeam.id)

            // Get team list
            const listResponse = await context.request.get(ADMIN_TEAM_ENDPOINT)
            expect(listResponse.status()).toBe(200)

            const teams = await listResponse.json()
            expect(Array.isArray(teams)).toBe(true)

            // Find our created team
            const foundTeam = teams.find(t => t.name === testTeamName)
            expect(foundTeam).toBeTruthy()
            expect(foundTeam.id).toBe(createdTeam.id)
        })

        test(`GET ${ADMIN_TEAM_ENDPOINT}?seasonId=X should filter teams by season`, async ({browser}) => {
            const context = await browser.newContext({
                storageState: adminFile
            })

            // Create teams for different seasons
            const team1 = {seasonId: testSeasonId, name: `${testTeamName}-Season1`}
            const team2 = {seasonId: testSeasonId + 1, name: `${testTeamName}-Season2`}

            const response1 = await context.request.put(ADMIN_TEAM_ENDPOINT, {
                headers: headers,
                data: team1
            })
            const response2 = await context.request.put(ADMIN_TEAM_ENDPOINT, {
                headers: headers,
                data: team2
            })

            expect(response1.status()).toBe(201)
            expect(response2.status()).toBe(201)

            const createdTeam1 = await response1.json()
            const createdTeam2 = await response2.json()
            testTeamIds.push(createdTeam1.id, createdTeam2.id)

            // Filter teams by first season
            const filteredResponse = await context.request.get(`${ADMIN_TEAM_ENDPOINT}?seasonId=${testSeasonId}`)
            expect(filteredResponse.status()).toBe(200)

            const filteredTeams = await filteredResponse.json()
            const team1Found = filteredTeams.find(t => t.id === createdTeam1.id)
            const team2Found = filteredTeams.find(t => t.id === createdTeam2.id)

            expect(team1Found).toBeTruthy()
            expect(team2Found).toBeFalsy() // Should not appear in filtered results
        })

        test(`GET ${ADMIN_TEAM_ENDPOINT}/[id] should get specific team details`, async ({browser}) => {
            const context = await browser.newContext({
                storageState: adminFile
            })

            // First create a team
            const createResponse = await context.request.put(ADMIN_TEAM_ENDPOINT, {
                headers: headers,
                data: newTeam
            })
            expect(createResponse.status()).toBe(201)
            const createdTeam = await createResponse.json()
            testTeamIds.push(createdTeam.id)

            // Get team details
            const detailResponse = await context.request.get(`${ADMIN_TEAM_ENDPOINT}/${createdTeam.id}`)
            expect(detailResponse.status()).toBe(200)

            const teamDetails = await detailResponse.json()
            expect(teamDetails.id).toBe(createdTeam.id)
            expect(teamDetails.name).toBe(testTeamName)
            expect(teamDetails.seasonId).toBe(testSeasonId)

            // Should include member arrays
            expect(teamDetails).toHaveProperty('chefs')
            expect(teamDetails).toHaveProperty('cooks')
            expect(teamDetails).toHaveProperty('juniorHelpers')
        })

        test(`POST ${ADMIN_TEAM_ENDPOINT}/[id] should update team`, async ({browser}) => {
            const context = await browser.newContext({
                storageState: adminFile
            })

            // First create a team
            const createResponse = await context.request.put(ADMIN_TEAM_ENDPOINT, {
                headers: headers,
                data: newTeam
            })
            expect(createResponse.status()).toBe(201)
            const createdTeam = await createResponse.json()
            testTeamIds.push(createdTeam.id)

            // Update the team
            const updatedData = {name: `${testTeamName}-Updated`}
            const updateResponse = await context.request.post(`${ADMIN_TEAM_ENDPOINT}/${createdTeam.id}`, {
                headers: headers,
                data: updatedData
            })

            expect(updateResponse.status()).toBe(200)
            const updatedTeam = await updateResponse.json()
            expect(updatedTeam.name).toBe(`${testTeamName}-Updated`)
            expect(updatedTeam.id).toBe(createdTeam.id)
        })

        test(`DELETE
        ${ADMIN_TEAM_ENDPOINT}/[id] should delete
        team, remove all cooking team 
            assignments and unassign team from dinner events`, async ({browser}) => {
            const context = await browser.newContext({
                storageState: adminFile
            })

            // First create a team
            const createResponse = await context.request.put(ADMIN_TEAM_ENDPOINT, {
                headers: headers,
                data: newTeam
            })
            expect(createResponse.status()).toBe(201)
            const createdTeam = await createResponse.json()

            const teamMemberAssignments = newTeam.members

            // Delete the team
            const deleteResponse = await context.request.delete(`${ADMIN_TEAM_ENDPOINT}/${createdTeam.id}`)
            expect(deleteResponse.status()).toBe(200)

            // Verify team is deleted
            const getResponse = await context.request.get(`${ADMIN_TEAM_ENDPOINT}/${createdTeam.id}`)
            expect(getResponse.status()).toBe(404)
        })
    })

    test.describe('Team Member Management', () => {

        test(`PUT ${ADMIN_TEAM_ENDPOINT}/[id]/members should add team member assignments`, async ({browser}) => {
            const context = await browser.newContext({
                storageState: adminFile
            })

            // First create a team
            const createResponse = await context.request.put(ADMIN_TEAM_ENDPOINT, {
                headers: headers,
                data: newTeam
            })
            expect(createResponse.status()).toBe(201)
            const createdTeam = await createResponse.json()
            testTeamIds.push(createdTeam.id)

            // Add members to the team
            const memberAssignment = {
                teamId: createdTeam.id,
                members: testTeamMembers
            }

            const assignResponse = await context.request.put(`${ADMIN_TEAM_ENDPOINT}/${createdTeam.id}/members`, {
                headers: headers,
                data: memberAssignment
            })

            expect(assignResponse.status()).toBe(200)

            // Verify members were added by getting team details
            const detailResponse = await context.request.get(`${ADMIN_TEAM_ENDPOINT}/${createdTeam.id}`)
            const teamWithMembers = await detailResponse.json()

            expect(teamWithMembers.chefs).toHaveLength(1)
            expect(teamWithMembers.cooks).toHaveLength(2)
            expect(teamWithMembers.juniorHelpers).toHaveLength(0)
        })

        test(`DELETE ${ADMIN_TEAM_ENDPOINT}/[id]/members/[memberId] should remove team assignments`, async ({browser}) => {
            const context = await browser.newContext({
                storageState: adminFile
            })

            // Create team and add members first
            const createResponse = await context.request.put(ADMIN_TEAM_ENDPOINT, {
                headers: headers,
                data: newTeam
            })
            const createdTeam = await createResponse.json()
            testTeamIds.push(createdTeam.id)

            const memberAssignment = {
                teamId: createdTeam.id,
                members: testTeamMembers
            }

            await context.request.put(`${ADMIN_TEAM_ENDPOINT}/${createdTeam.id}/members`, {
                headers: headers,
                data: memberAssignment
            })

            // Get team to find a member ID to remove
            const detailResponse = await context.request.get(`${ADMIN_TEAM_ENDPOINT}/${createdTeam.id}`)
            const teamWithMembers = await detailResponse.json()
            const memberToRemove = teamWithMembers.cooks[0] // Remove first cook

            // Remove the member
            const removeResponse = await context.request.delete(`${ADMIN_TEAM_ENDPOINT}/${createdTeam.id}/members/${memberToRemove.id}`)
            expect(removeResponse.status()).toBe(200)

            // Verify member was removed
            const updatedDetailResponse = await context.request.get(`${ADMIN_TEAM_ENDPOINT}/${createdTeam.id}`)
            const updatedTeam = await updatedDetailResponse.json()
            expect(updatedTeam.cooks).toHaveLength(1) // Should have one less cook
        })
    })

    test.describe('Validation and Error Handling', () => {

        test(`PUT ${ADMIN_TEAM_ENDPOINT} should reject invalid team data`, async ({browser}) => {
            const context = await browser.newContext({
                storageState: adminFile
            })

            const invalidTeam = {
                // Missing seasonId
                name: "Invalid Team"
            }

            const response = await context.request.put(ADMIN_TEAM_ENDPOINT, {
                headers: headers,
                data: invalidTeam
            })

            expect(response.status()).toBe(400)
        })

        test(`PUT ${ADMIN_TEAM_ENDPOINT} should reject empty team name`, async ({browser}) => {
            const context = await browser.newContext({
                storageState: adminFile
            })

            const invalidTeam = {
                seasonId: testSeasonId,
                name: ""
            }

            const response = await context.request.put(ADMIN_TEAM_ENDPOINT, {
                headers: headers,
                data: invalidTeam
            })

            expect(response.status()).toBe(400)
        })

        test(`GET ${ADMIN_TEAM_ENDPOINT}/[id] should return 404 for non-existent team`, async ({browser}) => {
            const context = await browser.newContext({
                storageState: adminFile
            })

            const response = await context.request.get(`${ADMIN_TEAM_ENDPOINT}/99999`)
            expect(response.status()).toBe(404)
        })

        test(`POST ${ADMIN_TEAM_ENDPOINT}/[id] should return 404 for non-existent team`, async ({browser}) => {
            const context = await browser.newContext({
                storageState: adminFile
            })

            const response = await context.request.post(`${ADMIN_TEAM_ENDPOINT}/99999`,
                {
                    headers: headers,
                    data: {name: "Updated Name"}
                })

            expect(response.status()).toBe(404)
        })

        test(`DELETE ${ADMIN_TEAM_ENDPOINT}/[id] should return 404 for non-existent team`, async ({browser}) => {
            const context = await browser.newContext({
                storageState: adminFile
            })

            const response = await context.request.delete(`${ADMIN_TEAM_ENDPOINT}/99999`)
            expect(response.status()).toBe(404)
        })

        test(`PUT ${ADMIN_TEAM_ENDPOINT}/[id]/members should reject invalid member data`, async ({browser}) => {
            const context = await browser.newContext({
                storageState: adminFile
            })

            // First create a team
            const createResponse = await context.request.put(ADMIN_TEAM_ENDPOINT, {
                headers: headers,
                data: newTeam
            })
            const createdTeam = await createResponse.json()
            testTeamIds.push(createdTeam.id)

            const invalidMemberAssignment = {
                teamId: createdTeam.id,
                members: [
                    {inhabitantId: 1, role: 'INVALID_ROLE'} // Invalid role
                ]
            }

            const response = await context.request.put(`${ADMIN_TEAM_ENDPOINT}/${createdTeam.id}/members`, {
                headers: headers,
                data: invalidMemberAssignment
            })

            expect(response.status()).toBe(400)
        })
    })

    test.describe('Authentication Requirements', () => {

        test('Team endpoints should require admin authentication', async ({browser}) => {
            const context = await browser.newContext() // No admin auth

            // Test each endpoint requires authentication
            const endpoints = [
                {method: 'put', url: ADMIN_TEAM_ENDPOINT, data: newTeam},
                {method: 'get', url: ADMIN_TEAM_ENDPOINT},
                {method: 'get', url: `${ADMIN_TEAM_ENDPOINT}/1`},
                {method: 'post', url: `${ADMIN_TEAM_ENDPOINT}/1`, data: {name: 'Updated'}},
                {method: 'delete', url: `${ADMIN_TEAM_ENDPOINT}/1`},
                {method: 'put', url: `${ADMIN_TEAM_ENDPOINT}/1/members`, data: {teamId: 1, members: []}},
                {method: 'delete', url: `${ADMIN_TEAM_ENDPOINT}/1/members/1`}
            ]

            for (const endpoint of endpoints) {
                let response
                if (endpoint.data) {
                    response = await context.request[endpoint.method](endpoint.url, {
                        headers: headers,
                        data: endpoint.data
                    })
                } else {
                    response = await context.request[endpoint.method](endpoint.url)
                }

                expect(response.status(), `${endpoint.method.toUpperCase()} ${endpoint.url} should require auth`).toBe(401)
            }
        })
    })

    // Cleanup after all tests
    test.afterAll(async ({browser}) => {
        const context = await browser.newContext({
            storageState: adminFile
        })

        // Clean up all created teams
        if (testTeamIds.length > 0) {
            for (const teamId of testTeamIds) {
                try {
                    await context.request.delete(`${ADMIN_TEAM_ENDPOINT}/${teamId}`)
                } catch (error) {
                    // Ignore cleanup errors
                    console.log(`Failed to cleanup team ${teamId}:`, error)
                }
            }
        }

        // Clean up the test season
        if (testSeasonId) {
            try {
                await context.request.delete(`${ADMIN_SEASON_ENDPOINT}/${testSeasonId}`)
                console.log(`Cleaned up test season with ID ${testSeasonId}`)
            } catch (error) {
                console.log(`Failed to cleanup test season ${testSeasonId}:`, error)
            }
        }
    })
})
