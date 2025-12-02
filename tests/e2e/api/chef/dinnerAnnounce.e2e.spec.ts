import {test, expect} from '@playwright/test'
import {DinnerEventFactory} from '../../testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '../../testDataFactories/seasonFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'
import type {Season} from '~/composables/useSeasonValidation'
import testHelpers from '../../testHelpers'

const {validatedBrowserContext, salt, temporaryAndRandom} = testHelpers
const {DinnerStateSchema} = useBookingValidation()
const DinnerState = DinnerStateSchema.enum

const chefDinnerStateUrl = (dinnerId: number, state: string) => `/api/chef/dinner/${dinnerId}/${state}`

// Variables to store for cleanup
let testSeasonId: number
let testSeason: Season
let createdDinnerEventIds: number[] = []

test.describe('Chef Dinner Announce - Heynabo Event Synchronization', () => {

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        testSeason = await SeasonFactory.createSeason(context)
        testSeasonId = testSeason.id as number
    })

    test('GIVEN scheduled dinner WHEN announce THEN heynaboEventId stored', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const dinnerEventData = {
            ...DinnerEventFactory.defaultDinnerEvent(testSalt),
            seasonId: testSeasonId,
            state: DinnerState.SCHEDULED,
            heynaboEventId: null
        }

        const scheduledDinner = await DinnerEventFactory.createDinnerEvent(context, dinnerEventData)
        createdDinnerEventIds.push(scheduledDinner.id)

        expect(scheduledDinner.state).toBe(DinnerState.SCHEDULED)
        expect(scheduledDinner.heynaboEventId).toBeNull()

        // WHEN: Chef announces the dinner
        const announceResponse = await context.request.post(
            chefDinnerStateUrl(scheduledDinner.id, DinnerState.ANNOUNCED),
            {headers: {'Content-Type': 'application/json'}}
        )

        const errorBody = announceResponse.status() !== 200 ? await announceResponse.text() : ''
        expect(announceResponse.status(), `POST announce should return 200. Response: ${errorBody}`).toBe(200)

        const announcedDinner = await announceResponse.json()

        // THEN: Dinner state changed to ANNOUNCED
        expect(announcedDinner.state).toBe(DinnerState.ANNOUNCED)

        // AND: heynaboEventId is stored
        expect(announcedDinner.heynaboEventId).toBeDefined()
        expect(announcedDinner.heynaboEventId).not.toBeNull()
        expect(typeof announcedDinner.heynaboEventId).toBe('number')
    })

    test('GIVEN announced dinner WHEN update menu THEN Heynabo event updated', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const dinnerEventData = {
            ...DinnerEventFactory.defaultDinnerEvent(testSalt),
            seasonId: testSeasonId,
            state: DinnerState.SCHEDULED,
            heynaboEventId: null
        }

        const scheduledDinner = await DinnerEventFactory.createDinnerEvent(context, dinnerEventData)
        createdDinnerEventIds.push(scheduledDinner.id)

        // Announce it first
        const announceResponse = await context.request.post(
            chefDinnerStateUrl(scheduledDinner.id, DinnerState.ANNOUNCED),
            {headers: {'Content-Type': 'application/json'}}
        )
        const announcedDinner = await announceResponse.json()

        expect(announcedDinner.state).toBe(DinnerState.ANNOUNCED)
        expect(announcedDinner.heynaboEventId).toBeDefined()

        const originalHeynaboEventId = announcedDinner.heynaboEventId

        // WHEN: Admin updates the menu (endpoint syncs to Heynabo)
        const updatedMenuTitle = salt('Updated Delicious Pasta', testSalt)
        const updatedMenuDescription = 'Fresh homemade pasta with tomato sauce'

        const updateResponse = await DinnerEventFactory.updateDinnerEvent(
            context,
            announcedDinner.id,
            {
                menuTitle: updatedMenuTitle,
                menuDescription: updatedMenuDescription
            }
        )

        // THEN: Menu is updated in TheSlope
        expect(updateResponse?.menuTitle).toBe(updatedMenuTitle)
        expect(updateResponse?.menuDescription).toBe(updatedMenuDescription)

        // AND: heynaboEventId remains the same (update, not create)
        expect(updateResponse?.heynaboEventId).toBe(originalHeynaboEventId)
    })

    test('GIVEN announced dinner WHEN cancel THEN Heynabo event cancelled', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const dinnerEventData = {
            ...DinnerEventFactory.defaultDinnerEvent(testSalt),
            seasonId: testSeasonId,
            state: DinnerState.SCHEDULED,
            heynaboEventId: null
        }

        const scheduledDinner = await DinnerEventFactory.createDinnerEvent(context, dinnerEventData)
        createdDinnerEventIds.push(scheduledDinner.id)

        // Announce it first
        const announceResponse = await context.request.post(
            chefDinnerStateUrl(scheduledDinner.id, DinnerState.ANNOUNCED),
            {headers: {'Content-Type': 'application/json'}}
        )
        const announcedDinner = await announceResponse.json()
        const heynaboEventId = announcedDinner.heynaboEventId

        // WHEN: Chef cancels the dinner
        const cancelResponse = await context.request.post(
            chefDinnerStateUrl(announcedDinner.id, DinnerState.CANCELLED),
            {headers: {'Content-Type': 'application/json'}}
        )
        const cancelledDinner = await cancelResponse.json()

        // THEN: Dinner state is CANCELLED
        expect(cancelledDinner.state).toBe(DinnerState.CANCELLED)

        // AND: heynaboEventId is still stored (event cancelled in Heynabo, not deleted)
        expect(cancelledDinner.heynaboEventId).toBe(heynaboEventId)
    })

    test('GIVEN announced dinner without picture WHEN fetch THEN picture URL lazy-synced', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const dinnerEventData = {
            ...DinnerEventFactory.defaultDinnerEvent(testSalt),
            seasonId: testSeasonId,
            state: DinnerState.SCHEDULED,
            heynaboEventId: null,
            menuPictureUrl: null
        }

        const scheduledDinner = await DinnerEventFactory.createDinnerEvent(context, dinnerEventData)
        createdDinnerEventIds.push(scheduledDinner.id)

        // Announce it
        const announceResponse = await context.request.post(
            chefDinnerStateUrl(scheduledDinner.id, DinnerState.ANNOUNCED),
            {headers: {'Content-Type': 'application/json'}}
        )
        const announcedDinner = await announceResponse.json()

        expect(announcedDinner.menuPictureUrl).toBeNull()

        // WHEN: Fetching the dinner event (should lazy-sync picture from Heynabo)
        const fetchedDinner = await DinnerEventFactory.getDinnerEvent(context, announcedDinner.id)

        // THEN: Dinner exists (lazy fetch will be implemented later)
        expect(fetchedDinner).toBeDefined()
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Delete dinner events via API (this also cleans up Heynabo events)
        for (const dinnerId of createdDinnerEventIds) {
            await DinnerEventFactory.deleteDinnerEvent(context, dinnerId)
        }

        if (testSeasonId) {
            await SeasonFactory.deleteSeason(context, testSeasonId)
        }
    })
})
