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

        // Clean up all created dinner events
        await Promise.all(testDinnerEventIds.map(id =>
            DinnerEventFactory.deleteDinnerEvent(context, id).catch(error => {
                console.warn(`Failed to cleanup dinner event ${id}:`, error)
            })
        ))

        // Clean up the test season (will cascade delete any remaining dinner events)
        if (testSeasonId) {
            try {
                await SeasonFactory.deleteSeason(context, testSeasonId)
                console.info(`Cleaned up test season ${testSeasonId}`)
            } catch (error) {
                console.warn(`Failed to cleanup test season ${testSeasonId}:`, error)
            }
        }
    })
})
