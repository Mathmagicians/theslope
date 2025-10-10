import {test, expect} from '@playwright/test'
import {DinnerEventFactory} from '../../testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '../../testDataFactories/seasonFactory'
import testHelpers from '../../testHelpers'

const {validatedBrowserContext} = testHelpers

// Variables to store IDs for cleanup
let testSeasonId: number
let testDinnerEventIds: number[] = []

test.describe('Dinner Event /api/admin/dinner-event CRUD operations', () => {

    // Setup test season before all tests
    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const season = await SeasonFactory.createSeason(context)
        testSeasonId = season.id as number
        console.info(`Created test season ${season.shortName} with ID ${testSeasonId}`)
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
        testDinnerEventIds.push(createdDinnerEvent.id)

        // THEN: Dinner event is created successfully
        expect(createdDinnerEvent.id).toBeDefined()
        expect(createdDinnerEvent.menuTitle).toBe(dinnerEventData.menuTitle)
        expect(createdDinnerEvent.dinnerMode).toBe(dinnerEventData.dinnerMode)
        expect(createdDinnerEvent.seasonId).toBe(testSeasonId)

        // AND: Dinner event can be retrieved
        const retrievedDinnerEvent = await DinnerEventFactory.getDinnerEvent(context, createdDinnerEvent.id)
        expect(retrievedDinnerEvent?.id).toBe(createdDinnerEvent.id)
        expect(retrievedDinnerEvent?.menuTitle).toBe(dinnerEventData.menuTitle)
    })

    test.skip('POST can update existing dinner event with status 200', async ({browser}) => {
        // TODO: Implement POST endpoint and test
    })

    test('GET /api/admin/dinner-event should return all dinner events', async ({browser}) => {
        // GIVEN: Existing dinner events with seasonId
        const context = await validatedBrowserContext(browser)

        const dinnerEvent1 = await DinnerEventFactory.createDinnerEvent(context, {
            ...DinnerEventFactory.defaultDinnerEvent(),
            seasonId: testSeasonId
        })
        testDinnerEventIds.push(dinnerEvent1.id)

        const dinnerEvent2 = await DinnerEventFactory.createDinnerEvent(context, {
            ...DinnerEventFactory.defaultDinnerEvent(),
            seasonId: testSeasonId
        })
        testDinnerEventIds.push(dinnerEvent2.id)

        // WHEN: GET /api/admin/dinner-event
        const response = await context.request.get('/api/admin/dinner-event')

        // THEN: Should return 200 with array of dinner events
        expect(response.status()).toBe(200)
        const events = await response.json()
        expect(Array.isArray(events)).toBe(true)

        // AND: Should include our created events
        const createdEventIds = [dinnerEvent1.id, dinnerEvent2.id]
        const foundEvents = events.filter((e: any) => createdEventIds.includes(e.id))
        expect(foundEvents.length).toBe(2)
    })

    test('GET /api/admin/dinner-event?seasonId should filter by season', async ({browser}) => {
        // GIVEN: Dinner events for testSeasonId
        const context = await validatedBrowserContext(browser)

        const dinnerEvent = await DinnerEventFactory.createDinnerEvent(context, {
            ...DinnerEventFactory.defaultDinnerEvent(),
            seasonId: testSeasonId
        })
        testDinnerEventIds.push(dinnerEvent.id)

        // WHEN: GET /api/admin/dinner-event?seasonId=testSeasonId
        const response = await context.request.get(`/api/admin/dinner-event?seasonId=${testSeasonId}`)

        // THEN: Should return 200 with filtered events
        expect(response.status()).toBe(200)
        const events = await response.json()
        expect(Array.isArray(events)).toBe(true)

        // AND: All events should belong to testSeasonId
        events.forEach((event: any) => {
            expect(event.seasonId).toBe(testSeasonId)
        })

        // AND: Should include our created event
        const foundEvent = events.find((e: any) => e.id === dinnerEvent.id)
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
        const deletedDinnerEvent = await DinnerEventFactory.deleteDinnerEvent(context, createdDinnerEvent.id)

        // THEN: Delete succeeds and returns the deleted event
        expect(deletedDinnerEvent?.id).toBe(createdDinnerEvent.id)

        // AND: Dinner event no longer exists
        await DinnerEventFactory.getDinnerEvent(context, createdDinnerEvent.id, 404)
    })

    // Cleanup after all tests
    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Clean up the test season (CASCADE deletes all dinner events automatically per ADR-005)
        if (testSeasonId) {
            try {
                await SeasonFactory.deleteSeason(context, testSeasonId)
                console.info(`Cleaned up test season ${testSeasonId} (cascade deleted ${testDinnerEventIds.length} dinner events)`)
            } catch (error) {
                console.warn(`Failed to cleanup test season ${testSeasonId}:`, error)
            }
        }
    })
})
