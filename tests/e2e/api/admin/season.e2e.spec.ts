import {test, expect} from '@playwright/test'
import {formatDate, createDefaultWeekdayMap} from '../../../../app/utils/date'
import {SeasonFactory} from '../../testDataFactories/seasonFactory'
import testHelpers from '../../testHelpers'
import {useSeasonValidation} from '../../../../app/composables/useSeasonValidation'

const {serializeSeason, deserializeSeason} = useSeasonValidation()
const {headers, validatedBrowserContext} = testHelpers

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

    }) // End Season CRUD operations

    test.describe('Generate Dinner Events from Season', () => {

        test("POST /season/[id]/generate-dinner-events should generate events for all cooking days", async ({browser}) => {
            // GIVEN: A season with Tuesday and Thursday as cooking days
            const context = await validatedBrowserContext(browser)
            const seasonData = {
                ...SeasonFactory.defaultSeason().season,
                cookingDays: createDefaultWeekdayMap([false, true, false, true, false, false, false]) // Tue, Thu
            }
            const season = await SeasonFactory.createSeason(context, seasonData)
            createdSeasonIds.push(season.id as number)

            // WHEN: POST /api/admin/season/[id]/generate-dinner-events
            const result = await SeasonFactory.generateDinnerEventsForSeason(context, season.id as number)

            // THEN: Events created for all Tuesdays and Thursdays within season dates
            expect(result.eventCount).toBeGreaterThan(0)
            expect(result.events).toBeDefined()
            expect(Array.isArray(result.events)).toBe(true)

            // AND: All events have seasonId set
            result.events.forEach(event => {
                expect(event.seasonId).toBe(season.id)
            })

            // AND: All events have dinnerMode NONE (default)
            result.events.forEach(event => {
                expect(event.dinnerMode).toBe('NONE')
            })

            // AND: All events are on Tuesday (2) or Thursday (4)
            result.events.forEach(event => {
                const eventDate = new Date(event.date)
                const dayOfWeek = eventDate.getDay()
                expect([2, 4]).toContain(dayOfWeek)
            })
        })

        test("POST /season/[id]/generate-dinner-events should exclude holidays", async ({browser}) => {
            // GIVEN: A season with cooking days and holiday periods defined
            const context = await validatedBrowserContext(browser)

            // Create season with Monday-Thursday as cooking days, Jan 1 - Jan 31
            const seasonStart = new Date(2025, 0, 1) // Jan 1, 2025
            const seasonEnd = new Date(2025, 0, 31)   // Jan 31, 2025

            // Define holiday period: Jan 15-20 (inclusive)
            const holidayStart = new Date(2025, 0, 15)
            const holidayEnd = new Date(2025, 0, 20)

            const seasonData = {
                ...SeasonFactory.defaultSeason().season,
                seasonDates: {
                    start: seasonStart,
                    end: seasonEnd
                },
                cookingDays: createDefaultWeekdayMap([true, true, true, true, false, false, false]), // Mon-Thu
                holidays: [{
                    start: holidayStart,
                    end: holidayEnd
                }]
            }

            const season = await SeasonFactory.createSeason(context, seasonData)
            createdSeasonIds.push(season.id as number)

            // WHEN: Generating dinner events
            const result = await SeasonFactory.generateDinnerEventsForSeason(context, season.id as number)

            // THEN: No events created for dates within holiday periods
            expect(result.eventCount).toBeGreaterThan(0)
            expect(result.events).toBeDefined()

            // Verify by checking all generated event dates against holiday ranges
            result.events.forEach(event => {
                const eventDate = new Date(event.date)

                // Event should NOT fall within holiday period
                const isInHoliday = eventDate >= holidayStart && eventDate <= holidayEnd
                expect(isInHoliday, `Event on ${eventDate.toISOString()} should not be in holiday period ${holidayStart.toISOString()} - ${holidayEnd.toISOString()}`).toBe(false)
            })
        })

        test("POST /season/[id]/generate-dinner-events should return 404 for non-existent season", async ({browser}) => {
            // GIVEN: Invalid season ID
            const context = await validatedBrowserContext(browser)
            const nonExistentSeasonId = 999999

            // WHEN: POST /api/admin/season/999999/generate-dinner-events
            const response = await context.request.post(`/api/admin/season/${nonExistentSeasonId}/generate-dinner-events`)

            // THEN: Response status 404
            expect(response.status()).toBe(404)
        })

        test("POST /season/[id]/generate-dinner-events should handle season with no cooking days", async ({browser}) => {
            // GIVEN: Attempting to create a season with no cooking days selected (all false)
            const context = await validatedBrowserContext(browser)
            const seasonData = {
                ...SeasonFactory.defaultSeason().season,
                cookingDays: createDefaultWeekdayMap([false, false, false, false, false, false, false]) // All days false
            }

            // WHEN: Creating the season
            // THEN: Should fail with 400 validation error (fail fast at creation time)
            await SeasonFactory.createSeason(context, seasonData, 400)

            // Validation prevents creating seasons with no cooking days
            // This is good design - no need to test event generation for invalid data
        })

        test("Generated dinner events should respect season date boundaries", async ({browser}) => {
            // GIVEN: A season with specific start and end dates
            const context = await validatedBrowserContext(browser)

            // Create season Feb 10 - Feb 25, 2025 (short period for precise testing)
            const seasonStart = new Date(2025, 1, 10) // Feb 10, 2025
            const seasonEnd = new Date(2025, 1, 25)   // Feb 25, 2025

            const seasonData = {
                ...SeasonFactory.defaultSeason().season,
                seasonDates: {
                    start: seasonStart,
                    end: seasonEnd
                },
                cookingDays: createDefaultWeekdayMap([true, true, true, true, true, false, false]), // Mon-Fri
                holidays: []
            }

            const season = await SeasonFactory.createSeason(context, seasonData)
            createdSeasonIds.push(season.id as number)

            // WHEN: Generating dinner events
            const result = await SeasonFactory.generateDinnerEventsForSeason(context, season.id as number)

            // THEN: All generated events fall within seasonDates.start and seasonDates.end
            expect(result.eventCount).toBeGreaterThan(0)
            expect(result.events).toBeDefined()

            let firstEventDate: Date | null = null
            let lastEventDate: Date | null = null

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

    }) // End Generate Dinner Events

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

}) // End Season API Tests
