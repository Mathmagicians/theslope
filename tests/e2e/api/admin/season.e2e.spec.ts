import {test, expect} from '@playwright/test'
import {formatDate, createDefaultWeekdayMap, getEachDayOfIntervalWithSelectedWeekdays, excludeDatesFromInterval} from '../../../../app/utils/date'
import {SeasonFactory} from '../../testDataFactories/seasonFactory'
import testHelpers from '../../testHelpers'
import {useSeasonValidation, type Season} from '../../../../app/composables/useSeasonValidation'

const {serializeSeason, deserializeSeason} = useSeasonValidation()
const {headers, validatedBrowserContext} = testHelpers

/**
 * Calculate expected dinner event count for a season
 * Mirrors server logic in generateDinnerEventDataForSeason
 */
const calculateExpectedEventCount = (season: Season): number => {
    const allCookingDates = getEachDayOfIntervalWithSelectedWeekdays(
        season.seasonDates.start,
        season.seasonDates.end,
        season.cookingDays
    )
    const validDates = excludeDatesFromInterval(allCookingDates, season.holidays)
    return validDates.length
}

test.describe('Season API Tests', () => {

// Variable to store ID for cleanup
    let createdSeasonIds: number[] = []
    const newSeason = SeasonFactory.defaultSeason()

    test.describe('Season CRUD operations', () => {

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

            // Add an extra holiday period within the season date range
            // Default season is Jan 1-7, 2025, so holiday must be within that range
            const holidayStart = new Date(2025, 0, 3) // Jan 3, 2025
            const holidayEnd = new Date(2025, 0, 4)   // Jan 4, 2025

            const updatedData = {
                ...newSeason.season,
                id: seasonId,
                holidays: [
                    ...newSeason.season.holidays, // Keep existing holidays
                    {
                        start: holidayStart,
                        end: holidayEnd
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

        test("PUT should create season with cooking teams", async ({browser}) => {
            // GIVEN: Season data with request to create cooking teams
            const context = await validatedBrowserContext(browser)

            // WHEN: Create season with 2 cooking teams
            const {season, teams} = await SeasonFactory.createSeasonWithTeams(
                context,
                SeasonFactory.defaultSeason().season,
                2
            )
            createdSeasonIds.push(season.id as number)

            // THEN: Season should be created
            expect(season.id).toBeDefined()
            expect(season.shortName).toBeDefined()

            // AND: Cooking teams should be created and linked to season
            expect(teams).toHaveLength(2)
            expect(teams[0].id).toBeDefined()
            expect(teams[0].seasonId).toBe(season.id)
            expect(teams[1].id).toBeDefined()
            expect(teams[1].seasonId).toBe(season.id)

            // Verify teams can be retrieved
            const team1Response = await context.request.get(`/api/admin/team/${teams[0].id}`)
            expect(team1Response.status()).toBe(200)
            const team1Data = await team1Response.json()
            expect(team1Data.seasonId).toBe(season.id)
        })

        test("DELETE should cascade delete cooking teams (strong relation)", async ({browser}) => {
            // GIVEN: A season with cooking teams
            const context = await validatedBrowserContext(browser)
            const {season, teams} = await SeasonFactory.createSeasonWithTeams(context, SeasonFactory.defaultSeason().season, 2)
            createdSeasonIds.push(season.id as number)

            // Verify teams were created
            expect(teams).toHaveLength(2)
            expect(teams[0].id).toBeDefined()
            expect(teams[1].id).toBeDefined()

            // Verify teams exist via GET
            const team1Response = await context.request.get(`/api/admin/team/${teams[0].id}`)
            expect(team1Response.status()).toBe(200)

            // WHEN: Season is deleted
            await SeasonFactory.deleteSeason(context, season.id as number)

            // THEN: Teams should be cascade deleted 
            const team1AfterDelete = await context.request.get(`/api/admin/team/${teams[0].id}`)
            expect(team1AfterDelete.status()).toBe(404)

            const team2AfterDelete = await context.request.get(`/api/admin/team/${teams[1].id}`)
            expect(team2AfterDelete.status()).toBe(404)

            // Remove from cleanup list (already deleted)
            createdSeasonIds = createdSeasonIds.filter(id => id !== season.id)
        })

        test("DELETE should cascade delete dinner events (strong relation)", async ({browser}) => {
            // GIVEN: A season with dinner events
            const context = await validatedBrowserContext(browser)
            const seasonData = {
                ...SeasonFactory.defaultSeason().season,
                cookingDays: createDefaultWeekdayMap([true, true, false, false, false, false, false]) // Mon, Tue only
            }
            const season = await SeasonFactory.createSeason(context, seasonData)
            createdSeasonIds.push(season.id as number)

            // Generate dinner events for the season
            const result = await SeasonFactory.generateDinnerEventsForSeason(context, season.id as number)
            expect(result.eventCount).toBeGreaterThan(0)
            expect(result.events.length).toBeGreaterThan(0)

            // Verify events exist via GET
            const firstEventId = result.events[0].id
            const eventResponse = await context.request.get(`/api/admin/dinner-event/${firstEventId}`)
            expect(eventResponse.status()).toBe(200)

            // WHEN: Season is deleted
            await SeasonFactory.deleteSeason(context, season.id as number)

            // THEN: Dinner events should be cascade deleted
            const eventAfterDelete = await context.request.get(`/api/admin/dinner-event/${firstEventId}`)
            expect(eventAfterDelete.status()).toBe(404)

            // Verify ALL events are deleted
            for (const event of result.events) {
                const response = await context.request.get(`/api/admin/dinner-event/${event.id}`)
                expect(response.status()).toBe(404)
            }

            // Remove from cleanup list (already deleted)
            createdSeasonIds = createdSeasonIds.filter(id => id !== season.id)
        })

        test("DELETE should cascade delete complete seasonal aggregate", async ({browser}) => {
            // GIVEN: A season with both cooking teams AND dinner events
            const context = await validatedBrowserContext(browser)

            // Create season with 2 cooking teams
            const {season, teams} = await SeasonFactory.createSeasonWithTeams(
                context,
                SeasonFactory.defaultSeason().season,
                2
            )
            createdSeasonIds.push(season.id as number)

            // Generate dinner events for the season
            const result = await SeasonFactory.generateDinnerEventsForSeason(context, season.id as number)
            expect(result.eventCount).toBeGreaterThan(0)

            // Verify teams exist
            const team1Response = await context.request.get(`/api/admin/team/${teams[0].id}`)
            expect(team1Response.status()).toBe(200)

            // Verify events exist
            const firstEventResponse = await context.request.get(`/api/admin/dinner-event/${result.events[0].id}`)
            expect(firstEventResponse.status()).toBe(200)

            // WHEN: Season is deleted
            await SeasonFactory.deleteSeason(context, season.id as number)

            // THEN: ALL cooking teams should be cascade deleted
            const team1AfterDelete = await context.request.get(`/api/admin/team/${teams[0].id}`)
            expect(team1AfterDelete.status()).toBe(404)

            const team2AfterDelete = await context.request.get(`/api/admin/team/${teams[1].id}`)
            expect(team2AfterDelete.status()).toBe(404)

            // AND: ALL dinner events should be cascade deleted
            for (const event of result.events) {
                const response = await context.request.get(`/api/admin/dinner-event/${event.id}`)
                expect(response.status()).toBe(404)
            }

            // Remove from cleanup list (already deleted)
            createdSeasonIds = createdSeasonIds.filter(id => id !== season.id)
        })

    })

    test.describe('DB migration 003 - ConsecutiveCookingDays and Prices', () => {

        test('PUT should create season with consecutiveCookingDays field', async ({ browser }) => {
            // GIVEN a season with consecutiveCookingDays = 3
            const context = await validatedBrowserContext(browser)
            const season = { ...SeasonFactory.defaultSeason().season, consecutiveCookingDays: 3 }

            // WHEN creating the season via PUT
            const created = await SeasonFactory.createSeason(context, season)
            createdSeasonIds.push(created.id as number)

            // THEN season is created with consecutiveCookingDays = 3
            expect(created.consecutiveCookingDays).toBe(3)
        })

        test('PUT should reject consecutiveCookingDays < 1', async ({ browser }) => {
            // GIVEN a season with consecutiveCookingDays = 0
            const context = await validatedBrowserContext(browser)
            const season = { ...SeasonFactory.defaultSeason().season, consecutiveCookingDays: 0 }

            // WHEN creating the season via PUT
            // THEN request fails with 400
            await SeasonFactory.createSeason(context, season, 400)
        })

        test('POST should update consecutiveCookingDays', async ({ browser }) => {
            // GIVEN an existing season with consecutiveCookingDays = 2
            const context = await validatedBrowserContext(browser)
            const season = await SeasonFactory.createSeason(context)
            createdSeasonIds.push(season.id as number)
            expect(season.consecutiveCookingDays).toBe(2)

            // WHEN updating consecutiveCookingDays to 3
            season.consecutiveCookingDays = 3
            const response = await context.request.post(`/api/admin/season/${season.id}`, {
                headers: headers,
                data: serializeSeason(season)
            })

            // THEN update succeeds
            expect(response.status()).toBe(200)
            const updated = await response.json()
            expect(updated.consecutiveCookingDays).toBe(3)
        })

    })

    test.describe('Generate Dinner Events from Season', () => {
        let context: any

        test.beforeEach(async ({browser}) => {
            context = await validatedBrowserContext(browser)
        })

        const getExpectedEventCount = (season: any): number => {
            const deserializedSeason = deserializeSeason(season)
            return calculateExpectedEventCount(deserializedSeason)
        }

        test("POST /season/[id]/generate-dinner-events should generate events for all cooking days", async () => {
            // GIVEN: A season with Mon, Wed, Fri as cooking days (generates exactly 3 events)
            const seasonStart = new Date(2025, 0, 1) // Jan 1, 2025 (Wed)
            const seasonEnd = new Date(2025, 0, 7)   // Jan 7, 2025 (Tue)
            // This creates events on: Wed Jan 1, Fri Jan 3, Mon Jan 6 = 3 events

            const seasonData = {
                ...SeasonFactory.defaultSeason().season,
                seasonDates: {
                    start: seasonStart,
                    end: seasonEnd
                },
                cookingDays: createDefaultWeekdayMap([true, false, true, false, true, false, false]), // Mon, Wed, Fri
                holidays: []
            }
            const season = await SeasonFactory.createSeason(context, seasonData)
            createdSeasonIds.push(season.id as number)

            // WHEN: POST /api/admin/season/[id]/generate-dinner-events
            const result = await SeasonFactory.generateDinnerEventsForSeason(context, season.id as number)

            // THEN: Exactly 3 events created for Mon, Wed, Fri
            const expectedEventCount = getExpectedEventCount(season)
            expect(result.eventCount).toBe(3)
            expect(result.eventCount).toBe(expectedEventCount)
            expect(result.events.length).toBe(3)
            expect(Array.isArray(result.events)).toBe(true)

            // AND: All events have seasonId set
            result.events.forEach(event => {
                expect(event.seasonId).toBe(season.id)
            })

            // AND: All events have dinnerMode NONE (default)
            result.events.forEach(event => {
                expect(event.dinnerMode).toBe('NONE')
            })

            // AND: All events are on Monday (1), Wednesday (3), or Friday (5)
            result.events.forEach(event => {
                const eventDate = new Date(event.date)
                const dayOfWeek = eventDate.getDay()
                expect([1, 3, 5]).toContain(dayOfWeek)
            })
        })

        test("POST /season/[id]/generate-dinner-events should exclude holidays", async () => {
            // GIVEN: A season with cooking days and holiday periods defined (generates exactly 3 events)

            // Create season Jan 1-9, 2025 with Mon/Wed/Fri cooking days
            // This would create 4 events: Wed Jan 1, Fri Jan 3, Mon Jan 6, Wed Jan 8
            const seasonStart = new Date(2025, 0, 1) // Jan 1, 2025 (Wed)
            const seasonEnd = new Date(2025, 0, 9)   // Jan 9, 2025 (Thu)

            // Define holiday period: Jan 8 (excludes Wed Jan 8)
            // Results in 3 events: Wed Jan 1, Fri Jan 3, Mon Jan 6
            const holidayStart = new Date(2025, 0, 8)
            const holidayEnd = new Date(2025, 0, 8)

            const seasonData = {
                ...SeasonFactory.defaultSeason().season,
                seasonDates: {
                    start: seasonStart,
                    end: seasonEnd
                },
                cookingDays: createDefaultWeekdayMap([true, false, true, false, true, false, false]), // Mon, Wed, Fri
                holidays: [{
                    start: holidayStart,
                    end: holidayEnd
                }]
            }

            const season = await SeasonFactory.createSeason(context, seasonData)
            createdSeasonIds.push(season.id as number)

            // WHEN: Generating dinner events
            const result = await SeasonFactory.generateDinnerEventsForSeason(context, season.id as number)

            // THEN: Exact number of events (excluding holidays)
            const expectedEventCount = getExpectedEventCount(season)
            expect(result.eventCount).toBe(expectedEventCount)
            expect(result.events.length).toBe(expectedEventCount)
            expect(result.events).toBeDefined()

            // AND: Verify by checking all generated event dates against holiday ranges
            result.events.forEach(event => {
                const eventDate = new Date(event.date)
                const isInHoliday = eventDate >= holidayStart && eventDate <= holidayEnd
                expect(isInHoliday, `Event on ${eventDate.toISOString()} should not be in holiday period ${holidayStart.toISOString()} - ${holidayEnd.toISOString()}`).toBe(false)
            })
        })

        test("POST /season/[id]/generate-dinner-events should return 404 for non-existent season", async () => {
            // GIVEN: Invalid season ID
            const nonExistentSeasonId = 999999

            // WHEN: POST /api/admin/season/999999/generate-dinner-events
            const response = await context.request.post(`/api/admin/season/${nonExistentSeasonId}/generate-dinner-events`)

            // THEN: Response status 404
            expect(response.status()).toBe(404)
        })

        test("POST /season/[id]/generate-dinner-events should handle season with no cooking days", async () => {
            // GIVEN: Attempting to create a season with no cooking days selected (all false)
            const seasonData = {
                ...SeasonFactory.defaultSeason().season,
                cookingDays: createDefaultWeekdayMap([false, false, false, false, false, false, false]) // All days false
            }

            // WHEN: Creating the season
            // THEN: Should fail with 400 validation error (fail fast at creation time)
            await SeasonFactory.createSeason(context, seasonData, 400)
        })

        test("Generated dinner events should respect season date boundaries", async () => {
            // GIVEN: A season with specific start and end dates (generates exactly 3 events)

            // Create season Jan 1-7, 2025 with Mon/Wed/Fri cooking days
            // This creates events on: Wed Jan 1, Fri Jan 3, Mon Jan 6 = 3 events
            const seasonStart = new Date(2025, 0, 1) // Jan 1, 2025 (Wed)
            const seasonEnd = new Date(2025, 0, 7)   // Jan 7, 2025 (Tue)

            const seasonData = {
                ...SeasonFactory.defaultSeason().season,
                seasonDates: {
                    start: seasonStart,
                    end: seasonEnd
                },
                cookingDays: createDefaultWeekdayMap([true, false, true, false, true, false, false]), // Mon, Wed, Fri
                holidays: []
            }

            const season = await SeasonFactory.createSeason(context, seasonData)
            createdSeasonIds.push(season.id as number)

            // WHEN: Generating dinner events
            const result = await SeasonFactory.generateDinnerEventsForSeason(context, season.id as number)

            // THEN: Exact number of events for the date range
            const expectedEventCount = getExpectedEventCount(season)
            expect(result.eventCount).toBe(expectedEventCount)
            expect(result.events.length).toBe(expectedEventCount)
            expect(result.events).toBeDefined()

            let firstEventDate: Date | null = null
            let lastEventDate: Date | null = null

            // AND: All generated events fall within seasonDates.start and seasonDates.end
            result.events.forEach(event => {
                const eventDate = new Date(event.date)

                // All events must be within season boundaries
                expect(eventDate >= seasonStart, `Event ${eventDate.toISOString()} must be on or after season start ${seasonStart.toISOString()}`).toBe(true)
                expect(eventDate <= seasonEnd, `Event ${eventDate.toISOString()} must be on or before season end ${seasonEnd.toISOString()}`).toBe(true)

                // Track first and last events
                if (!firstEventDate || eventDate < firstEventDate) {
                    firstEventDate = eventDate
                }
                if (!lastEventDate || eventDate > lastEventDate) {
                    lastEventDate = eventDate
                }
            })

            // AND: First event is on or after seasonDates.start
            expect(firstEventDate).toBeDefined()
            expect(firstEventDate! >= seasonStart).toBe(true)

            // AND: Last event is on or before seasonDates.end
            expect(lastEventDate).toBeDefined()
            expect(lastEventDate! <= seasonEnd).toBe(true)
        })

    })


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

})
