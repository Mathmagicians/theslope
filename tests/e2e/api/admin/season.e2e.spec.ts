import {test, expect} from '@playwright/test'
import {formatDate} from '../../../../app/utils/date'
import {SeasonFactory} from '../../testDataFactories/seasonFactory'
import testHelpers from '../../testHelpers'
import {useSeasonValidation} from '../../../../app/composables/useSeasonValidation'

const {serializeSeason, deserializeSeason} = useSeasonValidation()
const {headers, validatedBrowserContext} = testHelpers

// Variable to store ID for cleanup
let createdSeasonIds: number[] = []
const newSeason = SeasonFactory.defaultSeason()

// Test for creating and retrieving a season
test("PUT should create a new season and GET should retrieve it", async ({browser}) => {
    const context = await validatedBrowserContext(browser)
    const created = await SeasonFactory.createSeason(context, newSeason.season)
    // Save ID for cleanup
    createdSeasonIds.push(created.id as number)

    // Verify response
    expect(created).toHaveProperty('shortName')
    expect(created.shortName).toBe(newSeason.season.shortName)

    // Get season list to verify it appears there
    const listResponse = await context.request.get('/api/admin/season')
    expect(listResponse.status()).toBe(200)

    const seasons = await listResponse.json()
    const foundSeason = seasons.find(s => s.shortName === newSeason.season.shortName)

    expect(foundSeason).toBeTruthy()
    expect(foundSeason.id).toBe(created.id)
})

// Test for updating a season
test("POST should update an existing season", async ({browser}) => {
    const context = await validatedBrowserContext(browser)
    const created = await SeasonFactory.createSeason(context, newSeason.season)
    // Save ID for cleanup
    createdSeasonIds.push(created.id as number)
    const seasonId = created.id

    const initialHolidayCount = newSeason.season.holidays?.length

    // Add an extra holiday period to the existing holidays
    const holidayStart = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    const holidayEnd = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000)   // 35 days from now

    const updatedData = {
        ...newSeason.season,
        id: seasonId,
        holidays: [
            ...newSeason.season.holidays, // Keep existing holidays
            {
                start: formatDate(holidayStart),
                end: formatDate(holidayEnd)
            }
        ]
    }

    const serializedUpdate = serializeSeason(updatedData)
    const updateResponse = await context.request.post(`/api/admin/season/${seasonId}`, {
        headers: headers,
        data: serializedUpdate
    })

    // Check status
    const status = updateResponse.status()
    const responseBody = await updateResponse.json()

    expect(status, `Expected 200 but got ${status}. Response: ${JSON.stringify(responseBody)}`).toBe(200)

    // Verify the update worked - should have one more holiday than before
    expect(responseBody.id).toBe(seasonId)

    // Deserialize the updated response to check holidays properly
    const deserializedUpdatedSeason = deserializeSeason(responseBody)
    expect(deserializedUpdatedSeason.holidays).toHaveLength(initialHolidayCount + 1)
})

// Test for validation
test("PUT Validation should fail for invalid season data", async ({browser}) => {
    const context = await validatedBrowserContext(browser)

    // Create invalid season (missing required fields) using factory
    const invalidSeason = {
        shortName: "Invalid-season-put",
        // Missing seasonDates - should cause validation error
        isActive: false
    }

    // Use createSeason with expected 400 status
    await SeasonFactory.createSeason(context, invalidSeason, 400)
})


// === BDD TEST CASES FOR SEASON AGGREGATE (ADR-005) ===

test.skip("PUT should create season with cooking teams", async ({browser}) => {
    // TODO: Implement BDD test - create season with cooking teams (strong relation)
    // Use SeasonFactory.createSeasonWithTeams()
    throw new Error('Test not implemented - BDD mock')
})

test.skip("PUT should create season with dinner events", async ({browser}) => {
    // TODO: Implement BDD test - create season with dinner events (strong relation)
    // Use SeasonFactory.createDinnerEventsForSeason()
    throw new Error('Test not implemented - BDD mock')
})

test.skip("PUT should create complete seasonal aggregate", async ({browser}) => {
    // TODO: Implement BDD test - create season with teams AND events
    // Use SeasonFactory.createSeasonWithTeamsAndDinners()
    throw new Error('Test not implemented - BDD mock')
})

test.skip("DELETE should cascade delete cooking teams (strong relation)", async ({browser}) => {
    // TODO: Implement BDD test - mirrors PUT season with teams
    // 1. Create season with teams using SeasonFactory.createSeasonWithTeams()
    // 2. DELETE season using SeasonFactory.deleteSeason()
    // 3. Verify teams are cascade deleted (strong relation)
    throw new Error('Test not implemented - BDD mock')
})

test.skip("DELETE should cascade delete dinner events (strong relation)", async ({browser}) => {
    // TODO: Implement BDD test - mirrors PUT season with events
    // 1. Create season with events using SeasonFactory.createDinnerEventsForSeason()
    // 2. DELETE season using SeasonFactory.deleteSeason()
    // 3. Verify events are cascade deleted (strong relation)
    throw new Error('Test not implemented - BDD mock')
})

test.skip("DELETE should cascade delete complete seasonal aggregate", async ({browser}) => {
    // TODO: Implement BDD test - mirrors PUT complete seasonal aggregate
    // 1. Create complete season aggregate
    // 2. DELETE season
    // 3. Verify ALL nested aggregates properly cleaned up (teams AND events)
    throw new Error('Test not implemented - BDD mock')
})

// Cleanup after all tests
test.afterAll(async ({browser}) => {
    // Only run cleanup if we created a season
    if (createdSeasonIds.length > 0) {
        const context = await validatedBrowserContext(browser)
        // iterate over list and delete each season
        for (const id of createdSeasonIds) {
            try {
                const deleted = await SeasonFactory.deleteSeason(context, id)
                expect(deleted.id).toBe(id)
            } catch (error) {
                console.error(`Failed to delete test season with ID ${id}:`, error)
            }
        }

    }
})
