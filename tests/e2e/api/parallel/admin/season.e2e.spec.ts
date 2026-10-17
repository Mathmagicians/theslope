import {test, expect} from '@playwright/test'
import {useWeekDayMapValidation} from '~~/app/composables/useWeekDayMapValidation'
import {useBookingValidation, type DinnerEventDisplay} from '~~/app/composables/useBookingValidation'
import type {CookingTeamDetail} from '~~/app/composables/useCookingTeamValidation'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import type {Season} from '~/composables/useSeasonValidation'

const {createDefaultWeekdayMap} = useWeekDayMapValidation()
const {DinnerStateSchema, TicketTypeSchema} = useBookingValidation()
const TicketType = TicketTypeSchema.enum
const DinnerState = DinnerStateSchema.enum
const {headers, validatedBrowserContext, temporaryAndRandom} = testHelpers

test.describe('Season API Tests', () => {

// Variables to store IDs for cleanup
    const createdSeasonIds: number[] = []
    const createdHouseholdIds: number[] = []

    // Helper: Verify ticket prices exist and are sorted by price ascending (cheapest first)
    const assertTicketPrices = (season: Season, expectedCount = 4) => {
        expect(season.ticketPrices).toBeDefined()
        expect(Array.isArray(season.ticketPrices)).toBe(true)
        expect(season.ticketPrices.length).toBe(expectedCount)

        // Verify prices are sorted ascending (cheapest first) - enables resolveTicketPrice to use .find()
        const prices = season.ticketPrices.map(tp => tp.price)
        const sortedPrices = [...prices].sort((a, b) => a - b)
        expect(prices, 'ticketPrices should be sorted by price ascending').toEqual(sortedPrices)
    }

    // Helper: Track season for cleanup
    const trackSeason = (seasonId: number) => createdSeasonIds.push(seasonId)

    test.describe('Season CRUD operations', () => {

        test("PUT should create a season and GET /api/admin/season (index) should list it with its ticketPrices", async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const newSeason = SeasonFactory.defaultSeason()
            const created = await SeasonFactory.createSeason(context, newSeason)
            trackSeason(created.id!)

            // Verify season was created with ticket prices
            expect(created.shortName).toBe(newSeason.shortName)
            expect(created.consecutiveCookingDays).toBe(newSeason.consecutiveCookingDays)
            assertTicketPrices(created)

            // WHEN: GET all seasons (index endpoint)
            const seasons = await SeasonFactory.getAllSeasons(context)
            const foundSeason = seasons.find(s => s.id === created.id)

            // THEN: the season and its ticketPrices are included in the list response
            expect(foundSeason).toBeTruthy()
            expect(foundSeason!.shortName).toBe(newSeason.shortName)
            assertTicketPrices(foundSeason!)

            // AND: ticketPrices should match the created data
            expect(foundSeason!.ticketPrices).toEqual(created.ticketPrices)
        })

        test("GIVEN a season priced at the default prices WHEN reading it THEN each price carries what a ticket at it weighs, and an update sending those prices saves", async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const ticketPrices = TicketFactory.defaultTicketPricesWithoutIds({hungryBabyPrice: 900, childPrice: 1700, adultPrice: 4000})
            const created = await SeasonFactory.createSeason(context, {...SeasonFactory.defaultSeason(), ticketPrices})
            trackSeason(created.id!)

            const read = await SeasonFactory.getSeason(context, created.id!)
            expect(read.ticketPrices.map(price => [price.ticketType, price.price, price.portions])).toEqual([
                [TicketType.BABY, 0, 0], [TicketType.BABY, 900, 0.25], [TicketType.CHILD, 1700, 0.5], [TicketType.ADULT, 4000, 1]
            ])

            const updated = await SeasonFactory.updateSeason(context, read)
            expect(updated.ticketPrices).toEqual(read.ticketPrices)
        })

        test("GET /api/admin/season/[id] (detail) should include dinnerEvents and cookingTeams", async ({browser}) => {
            // GIVEN: A season with cooking teams (dinner events are auto-generated on season creation)
            const context = await validatedBrowserContext(browser)
            const {season} = await SeasonFactory.createSeasonWithTeams(context, SeasonFactory.defaultSeason(), 2)
            trackSeason(season.id!)

            // Calculate expected event count from season data
            const expectedEventCount = SeasonFactory.calculateExpectedEventCount(season)

            // WHEN: GET detail endpoint for specific season
            const detailSeason = await SeasonFactory.getSeason(context, season.id!)

            // THEN: dinnerEvents should be auto-generated and included (orchestrated PUT + ADR-009)
            expect(detailSeason.dinnerEvents).toBeDefined()
            expect(Array.isArray(detailSeason.dinnerEvents)).toBe(true)
            expect(detailSeason.dinnerEvents!.length).toBe(expectedEventCount)

            // AND: CookingTeams should be included with assignments
            expect(detailSeason.CookingTeams).toBeDefined()
            expect(Array.isArray(detailSeason.CookingTeams)).toBe(true)
            expect(detailSeason.CookingTeams!.length).toBe(2)

            // AND: ticketPrices should be included
            assertTicketPrices(detailSeason)
        })

// Test for updating a season with schedule reconciliation
        test("POST should update season and reconcile dinner events when holidays change", async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const newSeason = SeasonFactory.defaultSeason()
            const created = await SeasonFactory.createSeason(context, newSeason)
            createdSeasonIds.push(created.id!)
            const seasonId = created.id!

            // Capture initial state
            const initialEventCount = created.dinnerEvents!.length
            const initialHolidayCount = newSeason.holidays?.length

            // One-day holiday on the season's first cooking date: removes exactly one cooking day on any weekday
            const [firstDinner] = [...created.dinnerEvents!].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            const holidayStart = new Date(firstDinner!.date)
            const holidayEnd = new Date(firstDinner!.date)

            const updatedData = {
                ...newSeason,
                id: seasonId,
                seasonDates: created.seasonDates,
                ticketPrices: created.ticketPrices,  // Use IDs from created season
                holidays: [
                    ...newSeason.holidays,
                    {
                        start: holidayStart,
                        end: holidayEnd
                    }
                ]
            }

            // WHEN: Update season with new holiday
            const result = await SeasonFactory.updateSeasonWithResult(context, updatedData)
            const updatedSeason = result.season

            // THEN: Holiday count should increase
            expect(updatedSeason.holidays).toHaveLength(initialHolidayCount! + 1)

            // AND: Dinner events should be reconciled with correct count
            const expectedEventCount = SeasonFactory.calculateExpectedEventCount(updatedSeason)
            expect(updatedSeason.dinnerEvents!.length).toBe(expectedEventCount)

            // AND: The holiday removed exactly one cooking day
            expect(updatedSeason.dinnerEvents!.length).toBe(initialEventCount - 1)

            // AND: The operation envelope reports what reconciliation did (ADR-009)
            expect(result.reconciliation.deleted).toBe(initialEventCount - expectedEventCount)
            expect(result.reconciliation.created).toBe(0)
            expect(result.reconciliation.idempotent).toBe(expectedEventCount)
        })

        test("POST should ignore isActive in the body", async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const created = await SeasonFactory.createSeason(context, SeasonFactory.defaultSeason(temporaryAndRandom()))
            createdSeasonIds.push(created.id!)
            expect(created.isActive, 'A new season starts inactive').toBe(false)

            try {
                // WHEN: The body claims the season is active (activation lives in POST /active)
                const updated = await SeasonFactory.updateSeason(context, {...created, isActive: true})

                // THEN: The season stays inactive
                expect(updated.isActive).toBe(false)
                const refetched = await SeasonFactory.getSeason(context, created.id!)
                expect(refetched.isActive).toBe(false)
            } finally {
                // Restore the single-active-season invariant if the endpoint wrote the flag
                await SeasonFactory.updateSeason(context, {...created, isActive: false})
            }
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

        test("DELETE should cascade delete complete seasonal aggregate", async ({browser}) => {
            // GIVEN: A season with teams, events, and ticket prices (PUT orchestrates dinner events)
            const context = await validatedBrowserContext(browser)

            // Create season with 2 cooking teams
            const {season, teams} = await SeasonFactory.createSeasonWithTeams(
                context,
                SeasonFactory.defaultSeason(),
                2
            )
            trackSeason(season.id!)

            // Verify ticket prices exist (ADULT + CHILD from factory)
            assertTicketPrices(season)

            // Dinner events auto-generated by PUT (factory verifies count)
            const dinnerEvents = season.dinnerEvents!
            expect(dinnerEvents.length).toBeGreaterThan(0)

            // Verify teams exist
            await SeasonFactory.getCookingTeamById(context, teams[0]!.id!)

            // Verify events exist
            await DinnerEventFactory.getDinnerEvent(context, dinnerEvents[0]!.id)

            // WHEN: Season is deleted
            await SeasonFactory.deleteSeason(context, season.id!, 200)

            // THEN: ALL cooking teams should be cascade deleted
            await SeasonFactory.getCookingTeamById(context, teams[0]!.id!, 404)
            await SeasonFactory.getCookingTeamById(context, teams[1]!.id!, 404)

            // AND: ALL dinner events should be cascade deleted
            for (const event of dinnerEvents) {
                await DinnerEventFactory.getDinnerEvent(context, event.id, 404)
            }

            // AND: Season itself should be deleted
            const seasonAfterDelete = await context.request.get(`/api/admin/season/${season.id}`)
            expect(seasonAfterDelete.status()).toBe(404)
        })

    })

    test.describe('Generate Dinner Events from Season', () => {
        test.beforeEach(async ({browser}) => {
            await validatedBrowserContext(browser)
        })

        const getExpectedEventCount = (season: Season): number => {
            // API returns domain objects directly
            return SeasonFactory.calculateExpectedEventCount(season)
        }

        test("POST /season/[id]/generate-dinner-events should generate events for all cooking days", async ({browser}) => {
            const context = await validatedBrowserContext(browser)
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

            // AND: All events are on Monday (1), Wednesday (3), or Friday (5), within the season's dates
            result.events.forEach(event => {
                const eventDate = new Date(event.date)
                const dayOfWeek = eventDate.getDay()
                expect([1, 3, 5]).toContain(dayOfWeek)
                expect(eventDate >= seasonStart, `Event ${eventDate.toISOString()} must be on or after season start ${seasonStart.toISOString()}`).toBe(true)
                expect(eventDate <= seasonEnd, `Event ${eventDate.toISOString()} must be on or before season end ${seasonEnd.toISOString()}`).toBe(true)
            })
        })

        test("POST /season/[id]/generate-dinner-events should return 404 for a removed season", async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            // GIVEN: A season that was created and deleted
            const removedSeason = await SeasonFactory.createSeason(context, SeasonFactory.defaultSeason(temporaryAndRandom()))
            await SeasonFactory.deleteSeason(context, removedSeason.id!, 200)

            // WHEN: Attempt to generate dinner events for the removed season
            // THEN: Factory method expects 404
            await SeasonFactory.generateDinnerEventsForSeason(context, removedSeason.id!, 404)
        })

        test("POST /season/[id]/generate-dinner-events should handle season with no cooking days", async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            // GIVEN: Attempting to create a season with no cooking days selected (all false)
            const seasonData = {
                ...SeasonFactory.defaultSeason(),
                cookingDays: createDefaultWeekdayMap([false, false, false, false, false, false, false]) // All days false
            }

            // WHEN: Creating the season
            // THEN: Should fail with 400 validation error (fail fast at creation time)
            await SeasonFactory.createSeason(context, seasonData, 400)
        })

    })

    test.describe('Assign Team Affinities and Cooking Teams', () => {
        test("POST /season/[id]/assign-team-affinities should assign affinities AND /assign-cooking-teams should assign teams to events", async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const expectEventsHaveTeams = (events: DinnerEventDisplay[]) => {
                events.forEach(event => {
                    expect(event.cookingTeamId).toBeDefined()
                    expect(event.cookingTeamId).not.toBeNull()
                })
            }

            // Use nextMondayToFriday() to get exactly 3 Mon/Wed/Fri cooking days within prebooking window
            const seasonData = {
                ...SeasonFactory.defaultSeason(),
                seasonDates: SeasonFactory.nextMondayToFriday(),
                cookingDays: createDefaultWeekdayMap([true, false, true, false, true, false, false]),
                consecutiveCookingDays: 1
            }
            const {season, teams} = await SeasonFactory.createSeasonWithTeams(context, seasonData, 3)
            createdSeasonIds.push(season.id!)

            const dinnerEventsResult = await SeasonFactory.generateDinnerEventsForSeason(context, season.id!)
            expect(dinnerEventsResult.eventCount).toBe(3)

            const affinityResult = await SeasonFactory.assignTeamAffinities(context, season.id!)
            expect(affinityResult.teamCount).toBe(3)
            expect(affinityResult.teams.filter(t => t.affinity?.mandag).length).toBe(1)
            expect(affinityResult.teams.filter(t => t.affinity?.onsdag).length).toBe(1)
            expect(affinityResult.teams.filter(t => t.affinity?.fredag).length).toBe(1)

            const assignmentResult = await SeasonFactory.assignCookingTeams(context, season.id!)
            expect(assignmentResult.eventCount).toBe(3)
            expectEventsHaveTeams(assignmentResult.events)
            expect([...new Set(assignmentResult.events.map(e => e.cookingTeamId))].length).toBe(3)

            const team4 = await SeasonFactory.createCookingTeamWithMembersForSeason(context, season.id!, "Team-4-added-later", 2)
            createdHouseholdIds.push(team4.householdId)
            expect(team4.assignments).toHaveLength(2)
            expect(team4.assignments[0]!.inhabitant).toBeDefined()

            const affinityResult2 = await SeasonFactory.assignTeamAffinities(context, season.id!)
            expect(affinityResult2.teamCount).toBe(4)

            const teamsAfter = teams.map(t => affinityResult2.teams.find(at => at.id === t.id))
            teamsAfter.forEach((teamAfter: CookingTeamDetail | undefined, i: number) => {
                expect(teamAfter).toBeDefined()
                const originalTeam = affinityResult.teams.find(t => t.id === teams[i]!.id)
                expect(teamAfter!.affinity).toEqual(originalTeam!.affinity)
            })

            const team4After = affinityResult2.teams.find(t => t.id === team4.id)
            expect(team4After).toBeDefined()
            expect(Object.values(team4After!.affinity!).some(v => v === true)).toBe(true)

            const assignmentResult2 = await SeasonFactory.assignCookingTeams(context, season.id!)
            expect(assignmentResult2.eventCount).toBe(3)
            expectEventsHaveTeams(assignmentResult2.events)
        })

        test("POST /season/[id]/assign-team-affinities should work when NO dinner events exist", async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // Use nextMondayToFriday() to get exactly 3 Mon/Wed/Fri cooking days within prebooking window
            const seasonData = {
                ...SeasonFactory.defaultSeason(),
                seasonDates: SeasonFactory.nextMondayToFriday(),
                cookingDays: createDefaultWeekdayMap([true, false, true, false, true, false, false]),
                consecutiveCookingDays: 1
            }
            const {season} = await SeasonFactory.createSeasonWithTeams(context, seasonData, 3)
            createdSeasonIds.push(season.id!)

            // Assign affinities WITHOUT generating dinner events first
            // This tests the code path where dinnerEvents.length === 0
            const affinityResult = await SeasonFactory.assignTeamAffinities(context, season.id!)
            expect(affinityResult.teamCount).toBe(3)
            expect(affinityResult.teams.filter(t => t.affinity?.mandag).length).toBe(1)
            expect(affinityResult.teams.filter(t => t.affinity?.onsdag).length).toBe(1)
            expect(affinityResult.teams.filter(t => t.affinity?.fredag).length).toBe(1)
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
            const fullSeason = await SeasonFactory.getSeason(context, activeSeasonId!)
            expect(fullSeason.isActive).toBe(true)
        })

        test('POST /api/admin/season/active should return 404 for a removed season', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const removedSeason = await SeasonFactory.createSeason(context, SeasonFactory.defaultSeason(temporaryAndRandom()))
            await SeasonFactory.deleteSeason(context, removedSeason.id!, 200)

            // Try to activate the removed season
            const response = await context.request.post('/api/admin/season/active', {
                headers,
                data: { seasonId: removedSeason.id }
            })
            expect(response.status()).toBe(404)
        })
    })

    test("Regenerating dinner events should remove events on holiday dates", async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const {seasonDates, holiday} = SeasonFactory.generateUniqueSeasonDates()

        // All days cooking — guarantees holiday always covers cooking days regardless of day-of-week
        const allDaysCooking = createDefaultWeekdayMap([true, true, true, true, true, true, true])

        // GIVEN: Season with holidays, then holidays removed to create extra events
        const created = await SeasonFactory.createSeason(context, {...SeasonFactory.defaultSeason(temporaryAndRandom()), seasonDates, cookingDays: allDaysCooking, holidays: [holiday]})
        createdSeasonIds.push(created.id!)
        const expectedCount = SeasonFactory.calculateExpectedEventCount(created)

        const expanded = await SeasonFactory.updateSeason(context, {...created, holidays: []})
        expect(expanded.dinnerEvents!.length).toBeGreaterThan(expectedCount)

        // GIVEN: Restore holidays in config
        await SeasonFactory.updateSeason(context, {...expanded, holidays: [holiday]})

        // WHEN: Regenerate dinner events
        const result = await SeasonFactory.generateDinnerEventsForSeason(context, created.id!)

        // THEN: No dinner events on holiday dates
        expect(result.eventCount).toBe(expectedCount)
        const onHoliday = result.events.filter(de => new Date(de.date) >= holiday.start && new Date(de.date) <= holiday.end)
        expect(onHoliday).toHaveLength(0)
    })

    // NOTE: Scaffold Pre-bookings tests moved to tests/e2e/api/serial/admin/scaffold-prebookings.e2e.spec.ts
    // because the admin scaffold endpoint processes ALL households, causing timeouts in parallel

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        // Cleanup households first (before seasons, in case of any references)
        await HouseholdFactory.deleteHousehold(context, createdHouseholdIds)
        // Factory cleanup automatically includes active season singleton
        await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
    })

})
