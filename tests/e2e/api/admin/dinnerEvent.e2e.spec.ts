import {test, expect} from '@playwright/test'
import {DinnerEventFactory} from '../../testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '../../testDataFactories/seasonFactory'
import {OrderFactory} from '../../testDataFactories/orderFactory'
import {HouseholdFactory} from '../../testDataFactories/householdFactory'
import {useTicketPriceValidation} from '~/composables/useTicketPriceValidation'
import {useBookingValidation} from '~/composables/useBookingValidation'
import type {Season} from '~/composables/useSeasonValidation'
import testHelpers from '../../testHelpers'

const {validatedBrowserContext} = testHelpers
const {DinnerStateSchema} = useBookingValidation()
const DinnerState = DinnerStateSchema.enum

// Variables to store for cleanup and test data
let testSeasonId: number
let testSeason: Season

test.describe('Dinner Event /api/admin/dinner-event CRUD operations', () => {

    // Setup test season before all tests
    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        testSeason = await SeasonFactory.createSeason(context)
        testSeasonId = testSeason.id as number
        console.info(`Created test season ${testSeason.shortName} with ID ${testSeasonId}`)
    })

    test('PUT can create and GET can retrieve with status 200', async ({browser}) => {
        // GIVEN: Valid dinner event data with seasonId
        const context = await validatedBrowserContext(browser)
        const dinnerEventData = {
            ...DinnerEventFactory.defaultDinnerEvent(),
            seasonId: testSeasonId
        }

        // WHEN: Creating a new dinner event
        const createdDinnerEvent = await DinnerEventFactory.createDinnerEvent(context, dinnerEventData)
        expect(createdDinnerEvent.id).toBeDefined()

        // THEN: Dinner event is created successfully
        expect(createdDinnerEvent.menuTitle).toBe(dinnerEventData.menuTitle)
        expect(createdDinnerEvent.state).toBe(dinnerEventData.state)
        expect(createdDinnerEvent.seasonId).toBe(testSeasonId)

        // AND: Dinner event can be retrieved with full relations (ADR-009: detail endpoint includes comprehensive data)
        const retrievedDinnerEvent = await DinnerEventFactory.getDinnerEvent(context, createdDinnerEvent.id!)
        expect(retrievedDinnerEvent?.id).toBe(createdDinnerEvent.id)
        expect(retrievedDinnerEvent?.menuTitle).toBe(dinnerEventData.menuTitle)

        // AND: Use ticket prices from test season created in beforeAll
        const {TicketTypeSchema} = useTicketPriceValidation()
        const TicketType = TicketTypeSchema.enum

        expect(testSeason.ticketPrices.length).toBe(4) // BABY (free), BABY (hungry), CHILD, ADULT

        const adultPrice = testSeason.ticketPrices.find(tp => tp.ticketType === TicketType.ADULT)
        expect(adultPrice).toBeDefined()
        expect(adultPrice!.price).toBe(5000)
        expect(adultPrice!.id).toBeDefined()

        // AND: Create tickets for the dinner event using database ticket price
        const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(context, {}, 1)
        const inhabitant = inhabitants[0]

        // Verify ticket price ID is from database
        expect(adultPrice!.id).toBeGreaterThan(0)
        expect(adultPrice!.id).not.toBe(1) // Should not be factory default

        const [result1, result2] = await Promise.all([
            OrderFactory.createOrder(context, {
                householdId: household.id,
                dinnerEventId: createdDinnerEvent.id!,
                orders: [{
                    inhabitantId: inhabitant.id,
                    ticketPriceId: adultPrice!.id!
                }]
            }),
            OrderFactory.createOrder(context, {
                householdId: household.id,
                dinnerEventId: createdDinnerEvent.id!,
                orders: [{
                    inhabitantId: inhabitant.id,
                    ticketPriceId: adultPrice!.id!
                }]
            })
        ])

        expect(result1.createdIds).toHaveLength(1)
        expect(result2.createdIds).toHaveLength(1)

        // AND: Retrieve dinner event detail again with tickets
        const detailWithTickets = await DinnerEventFactory.getDinnerEvent(context, createdDinnerEvent.id!)

        // THEN: Detail includes cookingTeam with assignments (if assigned)
        if (detailWithTickets?.cookingTeam) {
            expect(detailWithTickets.cookingTeam.assignments.length).toBeGreaterThanOrEqual(0)
            if (detailWithTickets.cookingTeam.assignments.length > 0) {
                expect(detailWithTickets.cookingTeam.assignments[0].inhabitant.id).toBeDefined()
            }
        }

        // AND: Detail includes tickets with full relations (ADR-009: detail endpoint comprehensive)
        expect(detailWithTickets?.tickets).toBeDefined()
        expect(detailWithTickets!.tickets.length).toBe(2)
        const ticket = detailWithTickets!.tickets[0]
        expect(ticket.inhabitant.id).toBe(inhabitant.id)
        expect(ticket.inhabitant.name).toBeDefined()
        expect(ticket.ticketPrice.id).toBe(adultPrice!.id)
        expect(ticket.ticketPrice.ticketType).toBe(TicketType.ADULT)
        expect(ticket.ticketPrice.price).toBe(5000)

        // Cleanup orders before season deletion (ticketPrice has onDelete: Restrict)
        await Promise.all([
            OrderFactory.deleteOrder(context, result1.createdIds[0]!),
            OrderFactory.deleteOrder(context, result2.createdIds[0]!)
        ])
    })

    test('POST can update existing dinner event with status 200', async ({browser}) => {
        // GIVEN: An existing dinner event
        const context = await validatedBrowserContext(browser)
        const dinnerEventData = {
            ...DinnerEventFactory.defaultDinnerEvent(),
            seasonId: testSeasonId
        }
        const createdDinnerEvent = await DinnerEventFactory.createDinnerEvent(context, dinnerEventData)
        expect(createdDinnerEvent.id).toBeDefined()

        // WHEN: Updating the dinner event
        const updatedData = {
            id: createdDinnerEvent.id!,
            menuTitle: 'Updated Menu Title',
            menuDescription: 'Updated description',
            state: DinnerState.ANNOUNCED
        }
        const updatedDinnerEvent = await DinnerEventFactory.updateDinnerEvent(
            context,
            createdDinnerEvent.id!,
            updatedData
        )

        // THEN: Dinner event is updated successfully
        expect(updatedDinnerEvent?.id).toBe(createdDinnerEvent.id)
        expect(updatedDinnerEvent?.menuTitle).toBe(updatedData.menuTitle)
        expect(updatedDinnerEvent?.menuDescription).toBe(updatedData.menuDescription)
        expect(updatedDinnerEvent?.state).toBe(updatedData.state)

        // AND: Changes are persisted
        const retrievedDinnerEvent = await DinnerEventFactory.getDinnerEvent(context, createdDinnerEvent.id!)
        expect(retrievedDinnerEvent?.menuTitle).toBe(updatedData.menuTitle)
        expect(retrievedDinnerEvent?.menuDescription).toBe(updatedData.menuDescription)
        expect(retrievedDinnerEvent?.state).toBe(updatedData.state)
    })

    test('GET /api/admin/dinner-event should return all dinner events', async ({browser}) => {
        // GIVEN: Existing dinner events with seasonId
        const context = await validatedBrowserContext(browser)

        const dinnerEvent1 = await DinnerEventFactory.createDinnerEvent(context, {
            ...DinnerEventFactory.defaultDinnerEvent(),
            seasonId: testSeasonId
        })
        expect(dinnerEvent1.id).toBeDefined()

        const dinnerEvent2 = await DinnerEventFactory.createDinnerEvent(context, {
            ...DinnerEventFactory.defaultDinnerEvent(),
            seasonId: testSeasonId
        })
        expect(dinnerEvent2.id).toBeDefined()

        // WHEN: GET /api/admin/dinner-event
        const response = await context.request.get('/api/admin/dinner-event')

        // THEN: Should return 200 with array of dinner events
        const errorBody = response.status() !== 200 ? await response.text() : ''
        expect(response.status(), `Expected 200. Response: ${errorBody}`).toBe(200)
        const events = await response.json()
        expect(Array.isArray(events)).toBe(true)

        // AND: Should include our created events
        const createdEventIds = [dinnerEvent1.id, dinnerEvent2.id]
        const foundEvents = events.filter((e: unknown) => createdEventIds.includes(e.id))
        expect(foundEvents.length).toBe(2)
    })

    test('GET /api/admin/dinner-event?seasonId should filter by season', async ({browser}) => {
        // GIVEN: Dinner events for testSeasonId
        const context = await validatedBrowserContext(browser)

        const dinnerEvent = await DinnerEventFactory.createDinnerEvent(context, {
            ...DinnerEventFactory.defaultDinnerEvent(),
            seasonId: testSeasonId
        })
        expect(dinnerEvent.id).toBeDefined()

        // WHEN: GET /api/admin/dinner-event?seasonId=testSeasonId
        const response = await context.request.get(`/api/admin/dinner-event?seasonId=${testSeasonId}`)

        // THEN: Should return 200 with filtered events
        expect(response.status()).toBe(200)
        const events = await response.json()
        expect(Array.isArray(events)).toBe(true)

        // AND: All events should belong to testSeasonId
        events.forEach((event: unknown) => {
            expect(event.seasonId).toBe(testSeasonId)
        })

        // AND: Should include our created event
        const foundEvent = events.find((e: unknown) => e.id === dinnerEvent.id)
        expect(foundEvent).toBeDefined()
    })

    test('GET /api/admin/dinner-event with invalid seasonId should return 400', async ({browser}) => {
        // GIVEN: Invalid seasonId (non-numeric)
        const context = await validatedBrowserContext(browser)

        // WHEN: GET /api/admin/dinner-event?seasonId=invalid
        const response = await context.request.get('/api/admin/dinner-event?seasonId=invalid')

        // THEN: Should return 400 (validation error)
        expect(response.status()).toBe(400)
    })

    test('DELETE can remove existing dinner event with status 200', async ({browser}) => {
        // GIVEN: An existing dinner event
        const context = await validatedBrowserContext(browser)
        const dinnerEventData = {
            ...DinnerEventFactory.defaultDinnerEvent(),
            seasonId: testSeasonId
        }
        const createdDinnerEvent = await DinnerEventFactory.createDinnerEvent(context, dinnerEventData)
        expect(createdDinnerEvent.id).toBeDefined()

        // WHEN: Deleting the dinner event
        const deletedDinnerEvent = await DinnerEventFactory.deleteDinnerEvent(context, createdDinnerEvent.id!)

        // THEN: Delete succeeds and returns the deleted event
        expect(deletedDinnerEvent?.id).toBe(createdDinnerEvent.id)

        // AND: Dinner event no longer exists
        await DinnerEventFactory.getDinnerEvent(context, createdDinnerEvent.id!, 404)
    })

    // Cleanup after all tests
    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Clean up the test season (CASCADE deletes all dinner events automatically per ADR-005)
        if (testSeasonId) {
            try {
                await SeasonFactory.deleteSeason(context, testSeasonId)
                console.info(`Cleaned up test season ${testSeasonId} (cascade deleted all dinner events)`)
            } catch (error) {
                console.warn(`Failed to cleanup test season ${testSeasonId}:`, error)
            }
        }
    })
})
