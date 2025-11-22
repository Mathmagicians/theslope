import {test, expect} from '@playwright/test'
import {formatDate, getEachDayOfIntervalWithSelectedWeekdays, excludeDatesFromInterval} from '~~/app/utils/date'
import {useWeekDayMapValidation} from '~~/app/composables/useWeekDayMapValidation'
import {useBookingValidation} from '~~/app/composables/useBookingValidation'
import {SeasonFactory} from '../../testDataFactories/seasonFactory'
import testHelpers from '../../testHelpers'
import type {Season} from '~/composables/useSeasonValidation'

const {createDefaultWeekdayMap} = useWeekDayMapValidation()
const {DinnerStateSchema} = useBookingValidation()
const DinnerState = DinnerStateSchema.enum
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

    // Helper: Verify ticket prices exist 
    const assertTicketPrices = (season: any, expectedCount = 4) => {
        expect(season.ticketPrices).toBeDefined()
        expect(Array.isArray(season.ticketPrices)).toBe(true)
        expect(season.ticketPrices.length).toBe(expectedCount)
    }

    // Helper: Track season for cleanup
    const trackSeason = (seasonId: number) => createdSeasonIds.push(seasonId)

    test.describe('Season CRUD operations', () => {

// Test for creating and retrieving a season
        test("PUT should create a new season and GET should retrieve it", async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const newSeason = SeasonFactory.defaultSeason()
            const created = await SeasonFactory.createSeason(context, newSeason)
            expect(created.id).toBeDefined()
            trackSeason(created.id!)

            // Verify basic season properties
            expect(created).toHaveProperty('shortName')
            expect(created.shortName).toBe(newSeason.shortName)
            expect(created.consecutiveCookingDays).toBe(newSeason.consecutiveCookingDays)
            assertTicketPrices(created)
           
            const listResponse = await context.request.get('/api/admin/season')
            expect(listResponse.status()).toBe(200)

            const seasons = await listResponse.json()
            const foundSeason = seasons.find(s => s.shortName === newSeason.shortName)

            expect(foundSeason).toBeTruthy()
            expect(foundSeason.id).toBe(created.id)
        })

        test("GET /api/admin/season (index) should include ticketPrices", async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const newSeason = SeasonFactory.defaultSeason()
            const created = await SeasonFactory.createSeason(context, newSeason)
            expect(created.id).toBeDefined()
            trackSeason(created.id!)

            // Verify season was created with ticket prices
            assertTicketPrices(created)

            // WHEN: GET all seasons (index endpoint)
            const listResponse = await context.request.get('/api/admin/season')
            expect(listResponse.status()).toBe(200)

            const seasons = await listResponse.json()
            const foundSeason = seasons.find(s => s.id === created.id)

            // THEN: ticketPrices should be included in the list response
            expect(foundSeason).toBeTruthy()
            assertTicketPrices(foundSeason)

            // AND: ticketPrices should match the created data
            expect(foundSeason.ticketPrices).toEqual(created.ticketPrices)
        })

        test("GET /api/admin/season/[id] (detail) should include dinnerEvents and cookingTeams", async ({browser}) => {
            // GIVEN: A season with dinner events and cooking teams
            const context = await validatedBrowserContext(browser)
            const {season, teams} = await SeasonFactory.createSeasonWithTeams(context, SeasonFactory.defaultSeason(), 2)
            trackSeason(season.id!)

            // Generate dinner events for the season
            const dinnerResult = await SeasonFactory.generateDinnerEventsForSeason(context, season.id!)
            expect(dinnerResult.eventCount).toBeGreaterThan(0)

            // WHEN: GET detail endpoint for specific season
            const detailResponse = await context.request.get(`/api/admin/season/${season.id}`)
            expect(detailResponse.status()).toBe(200)

            const detailSeason = await detailResponse.json()

            // THEN: dinnerEvents should be included (detail endpoint per ADR-009)
            expect(detailSeason.dinnerEvents).toBeDefined()
            expect(Array.isArray(detailSeason.dinnerEvents)).toBe(true)
            expect(detailSeason.dinnerEvents.length).toBe(dinnerResult.eventCount)

            // AND: CookingTeams should be included with assignments
            expect(detailSeason.CookingTeams).toBeDefined()
            expect(Array.isArray(detailSeason.CookingTeams)).toBe(true)
            expect(detailSeason.CookingTeams.length).toBe(2)

            // AND: ticketPrices should be included
            assertTicketPrices(detailSeason)
        })

// Test for updating a season
        test("POST should update an existing season", async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const newSeason = SeasonFactory.defaultSeason()
            const created = await SeasonFactory.createSeason(context, newSeason)
            expect(created.id).toBeDefined()
            createdSeasonIds.push(created.id!)
            const seasonId = created.id!

            const initialHolidayCount = newSeason.holidays?.length

            const holidayStart = new Date(2025, 0, 3)
            const holidayEnd = new Date(2025, 0, 4)

            const updatedData = {
                ...newSeason,
                id: seasonId,
                holidays: [
                    ...newSeason.holidays,
                    {
                        start: holidayStart,
                        end: holidayEnd
                    }
                ]
            }

            // API now accepts domain objects directly (repository handles serialization)
            const updateResponse = await context.request.post(`/api/admin/season/${seasonId}`, {
                headers: headers,
                data: updatedData
            })

            // Check status
            const status = updateResponse.status()
            const responseBody = await updateResponse.json()

            expect(status, `Expected 200 but got ${status}. Response: ${JSON.stringify(responseBody)}`).toBe(200)

            // Verify the update worked - should have one more holiday than before
            expect(responseBody.id).toBe(seasonId)

            // API returns domain objects directly
            expect(responseBody.holidays).toHaveLength(initialHolidayCount + 1)
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
                SeasonFactory.defaultSeason(),
                2
            )
            expect(season.id).toBeDefined()
            createdSeasonIds.push(season.id!)

            // THEN: Season should be created
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
            const {season, teams} = await SeasonFactory.createSeasonWithTeams(context, SeasonFactory.defaultSeason(), 2)
            expect(season.id).toBeDefined()
            createdSeasonIds.push(season.id!)

            // Verify teams were created
            expect(teams).toHaveLength(2)
            expect(teams[0].id).toBeDefined()
            expect(teams[1].id).toBeDefined()

            // Verify teams exist via GET
            const team1Response = await context.request.get(`/api/admin/team/${teams[0].id}`)
            expect(team1Response.status()).toBe(200)

            // WHEN: Season is deleted
            await SeasonFactory.deleteSeason(context, season.id!)

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
                ...SeasonFactory.defaultSeason(),
                cookingDays: createDefaultWeekdayMap([true, true, false, false, false, false, false]) // Mon, Tue only
            }
            const season = await SeasonFactory.createSeason(context, seasonData)
            expect(season.id).toBeDefined()
            createdSeasonIds.push(season.id!)

            // Generate dinner events for the season
            const result = await SeasonFactory.generateDinnerEventsForSeason(context, season.id!)
            expect(result.eventCount).toBeGreaterThan(0)
            expect(result.events.length).toBeGreaterThan(0)

            // Verify events exist via GET
            const firstEventId = result.events[0].id
            const eventResponse = await context.request.get(`/api/admin/dinner-event/${firstEventId}`)
            expect(eventResponse.status()).toBe(200)

            // WHEN: Season is deleted
            await SeasonFactory.deleteSeason(context, season.id!)

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
            // GIVEN: A season with teams, events, and ticket prices
            const context = await validatedBrowserContext(browser)

            // Create season with 2 cooking teams
            const {season, teams} = await SeasonFactory.createSeasonWithTeams(
                context,
                SeasonFactory.defaultSeason(),
                2
            )
            expect(season.id).toBeDefined()
            trackSeason(season.id!)

            // Verify ticket prices exist (ADULT + CHILD from factory)
            assertTicketPrices(season)

            // Generate dinner events for the season
            const result = await SeasonFactory.generateDinnerEventsForSeason(context, season.id!)
            expect(result.eventCount).toBeGreaterThan(0)

            // Verify teams exist
            const team1Response = await context.request.get(`/api/admin/team/${teams[0].id}`)
            expect(team1Response.status()).toBe(200)

            // Verify events exist
            const firstEventResponse = await context.request.get(`/api/admin/dinner-event/${result.events[0].id}`)
            expect(firstEventResponse.status()).toBe(200)

            // WHEN: Season is deleted
            await SeasonFactory.deleteSeason(context, season.id!)

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

            // AND: Ticket prices should be cascade deleted (verified via GET season)
            const seasonAfterDelete = await context.request.get(`/api/admin/season/${season.id}`)
            expect(seasonAfterDelete.status()).toBe(404)

            // Remove from cleanup list (already deleted)
            createdSeasonIds = createdSeasonIds.filter(id => id !== season.id)
        })

    })

    test.describe('Generate Dinner Events from Season', () => {
        let context: any

        test.beforeEach(async ({browser}) => {
            context = await validatedBrowserContext(browser)
        })

        const getExpectedEventCount = (season: Season): number => {
            // API returns domain objects directly
            return calculateExpectedEventCount(season)
        }

        test("POST /season/[id]/generate-dinner-events should generate events for all cooking days", async () => {
            // GIVEN: A season with Mon, Wed, Fri as cooking days (generates exactly 3 events)
            const seasonStart = new Date(2025, 0, 1) // Jan 1, 2025 (Wed)
            const seasonEnd = new Date(2025, 0, 7)   // Jan 7, 2025 (Tue)
            // This creates events on: Wed Jan 1, Fri Jan 3, Mon Jan 6 = 3 events

            const seasonData = {
                ...SeasonFactory.defaultSeason(),
                seasonDates: {
                    start: seasonStart,
                    end: seasonEnd
                },
                cookingDays: createDefaultWeekdayMap([true, false, true, false, true, false, false]), // Mon, Wed, Fri
                holidays: []
            }
            const season = await SeasonFactory.createSeason(context, seasonData)
            expect(season.id).toBeDefined()
            createdSeasonIds.push(season.id!)

            // WHEN: POST /api/admin/season/[id]/generate-dinner-events
            const result = await SeasonFactory.generateDinnerEventsForSeason(context, season.id!)

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

            // AND: All events have state SCHEDULED (default)
            result.events.forEach(event => {
                expect(event.state).toBe(DinnerState.SCHEDULED)
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
                ...SeasonFactory.defaultSeason(),
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
            expect(season.id).toBeDefined()
            createdSeasonIds.push(season.id!)

            // WHEN: Generating dinner events
            const result = await SeasonFactory.generateDinnerEventsForSeason(context, season.id!)

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

            // WHEN: Attempt to generate dinner events for non-existent season
            // THEN: Factory method expects 404
            await SeasonFactory.generateDinnerEventsForSeason(context, nonExistentSeasonId, 404)
        })

        test("POST /season/[id]/generate-dinner-events should handle season with no cooking days", async () => {
            // GIVEN: Attempting to create a season with no cooking days selected (all false)
            const seasonData = {
                ...SeasonFactory.defaultSeason(),
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
                ...SeasonFactory.defaultSeason(),
                seasonDates: {
                    start: seasonStart,
                    end: seasonEnd
                },
                cookingDays: createDefaultWeekdayMap([true, false, true, false, true, false, false]), // Mon, Wed, Fri
                holidays: []
            }

            const season = await SeasonFactory.createSeason(context, seasonData)
            expect(season.id).toBeDefined()
            createdSeasonIds.push(season.id!)

            // WHEN: Generating dinner events
            const result = await SeasonFactory.generateDinnerEventsForSeason(context, season.id!)

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

    test.describe('Assign Team Affinities and Cooking Teams', () => {
        test("POST /season/[id]/assign-team-affinities should assign affinities AND /assign-cooking-teams should assign teams to events", async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const expectEventsHaveTeams = (events: any[]) => {
                events.forEach(event => {
                    expect(event.cookingTeamId).toBeDefined()
                    expect(event.cookingTeamId).not.toBeNull()
                })
            }

            const seasonData = {
                ...SeasonFactory.defaultSeason(),
                seasonDates: {start: new Date(2025, 0, 6), end: new Date(2025, 0, 10)},
                cookingDays: createDefaultWeekdayMap([true, false, true, false, true, false, false]),
                consecutiveCookingDays: 1
            }
            const {season, teams} = await SeasonFactory.createSeasonWithTeams(context, seasonData, 3)
            expect(season.id).toBeDefined()
            createdSeasonIds.push(season.id!)

            const dinnerEventsResult = await SeasonFactory.generateDinnerEventsForSeason(context, season.id!)
            expect(dinnerEventsResult.eventCount).toBe(3)

            const affinityResult = await SeasonFactory.assignTeamAffinities(context, season.id)
            expect(affinityResult.teamCount).toBe(3)
            expect(affinityResult.teams.filter(t => t.affinity.mandag).length).toBe(1)
            expect(affinityResult.teams.filter(t => t.affinity.onsdag).length).toBe(1)
            expect(affinityResult.teams.filter(t => t.affinity.fredag).length).toBe(1)

            const assignmentResult = await SeasonFactory.assignCookingTeams(context, season.id)
            expect(assignmentResult.eventCount).toBe(3)
            expectEventsHaveTeams(assignmentResult.events)
            expect([...new Set(assignmentResult.events.map(e => e.cookingTeamId))].length).toBe(3)

            const team4 = await SeasonFactory.createCookingTeamWithMembersForSeason(context, season.id!, "Team-4-added-later", 2)
            expect(team4.assignments).toHaveLength(2)
            expect(team4.assignments[0].inhabitant).toBeDefined()

            const affinityResult2 = await SeasonFactory.assignTeamAffinities(context, season.id)
            expect(affinityResult2.teamCount).toBe(4)

            const teamsAfter = teams.map(t => affinityResult2.teams.find(at => at.id === t.id))
            teamsAfter.forEach((teamAfter, i) => {
                expect(teamAfter).toBeDefined()
                expect(teamAfter.affinity).toEqual(affinityResult.teams.find(t => t.id === teams[i].id).affinity)
            })

            const team4After = affinityResult2.teams.find(t => t.id === team4.id)
            expect(team4After).toBeDefined()
            expect(Object.values(team4After.affinity).some(v => v === true)).toBe(true)

            const assignmentResult2 = await SeasonFactory.assignCookingTeams(context, season.id)
            expect(assignmentResult2.eventCount).toBe(3)
            expectEventsHaveTeams(assignmentResult2.events)
        })

        test("POST /season/[id]/assign-team-affinities should work when NO dinner events exist", async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            const seasonData = {
                ...SeasonFactory.defaultSeason(),
                seasonDates: {start: new Date(2025, 0, 13), end: new Date(2025, 0, 17)},
                cookingDays: createDefaultWeekdayMap([true, false, true, false, true, false, false]),
                consecutiveCookingDays: 1
            }
            const {season} = await SeasonFactory.createSeasonWithTeams(context, seasonData, 3)
            expect(season.id).toBeDefined()
            createdSeasonIds.push(season.id!)

            // Assign affinities WITHOUT generating dinner events first
            // This tests the code path where dinnerEvents.length === 0
            const affinityResult = await SeasonFactory.assignTeamAffinities(context, season.id)
            expect(affinityResult.teamCount).toBe(3)
            expect(affinityResult.teams.filter(t => t.affinity.mandag).length).toBe(1)
            expect(affinityResult.teams.filter(t => t.affinity.onsdag).length).toBe(1)
            expect(affinityResult.teams.filter(t => t.affinity.fredag).length).toBe(1)
        })
    })

    test.describe('Active Season endpoints', () => {

        test('GET /api/admin/season/active should return active season ID', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // GIVEN: Activate a season
            const activeSeason = await SeasonFactory.createActiveSeason(context)
            expect(activeSeason.id).toBeDefined()
            expect(activeSeason.isActive).toBe(true)

            // WHEN: Fetching active season ID
            const activeSeasonId = await SeasonFactory.getActiveSeasonId(context)

            // THEN: An active season exists
            expect(activeSeasonId).toBeDefined()
            expect(activeSeasonId).toBeGreaterThan(0)

            // AND: The returned ID corresponds to an active season
            const fullSeason = await SeasonFactory.getSeason(context, activeSeasonId)
            expect(fullSeason.isActive).toBe(true)
        })

        test('POST /api/admin/season/active should return 404 for non-existent season', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // Try to activate non-existent season
            const response = await context.request.post('/api/admin/season/active', {
                headers,
                data: { seasonId: 9999999 }
            })
            expect(response.status()).toBe(404)
        })
    })


    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        // Factory cleanup automatically includes active season singleton
        await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
    })

})
