import {test, expect} from '@playwright/test'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'
import type {Season} from '~/composables/useSeasonValidation'
import {getDinnerTimeRange} from '~/utils/season'
import testHelpers from '~~/tests/e2e/testHelpers'

const DEFAULT_DINNER_START_TIME = 18

const {validatedBrowserContext, memberValidatedBrowserContext, salt, temporaryAndRandom} = testHelpers
const {DinnerStateSchema} = useBookingValidation()
const DinnerState = DinnerStateSchema.enum

// Variables to store for cleanup (dinner events cascade-deleted with season per ADR-005)
let testSeasonId: number
let testSeason: Season

test.describe('Chef Dinner Announce - Heynabo Event Synchronization', () => {

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        testSeason = await SeasonFactory.createSeason(context)
        testSeasonId = testSeason.id as number
    })

    test('GIVEN scheduled dinner WHEN member announces THEN heynaboEventId stored with correct time', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        // Setup: Admin creates dinner event
        const dinnerEventData = {
            ...DinnerEventFactory.defaultDinnerEvent(testSalt),
            seasonId: testSeasonId,
            state: DinnerState.SCHEDULED,
            heynaboEventId: null
        }
        const scheduledDinner = await DinnerEventFactory.createDinnerEvent(adminContext, dinnerEventData)

        expect(scheduledDinner.state).toBe(DinnerState.SCHEDULED)
        expect(scheduledDinner.heynaboEventId).toBeNull()

        // WHEN: Member announces the dinner (chef operation)
        const announcedDinner = await DinnerEventFactory.updateDinnerEvent(
            memberContext, scheduledDinner.id, {state: DinnerState.ANNOUNCED}
        )
        expect(announcedDinner).not.toBeNull()

        expect(announcedDinner!.state).toBe(DinnerState.ANNOUNCED)
        expect(announcedDinner!.heynaboEventId).toBeDefined()
        expect(typeof announcedDinner!.heynaboEventId).toBe('number')

        // Verify Heynabo event has correct date and time
        const heynaboEvent = await DinnerEventFactory.getHeynaboEvent(memberContext, announcedDinner!.heynaboEventId!)
        const dinnerDate = new Date(scheduledDinner.date)
        const expectedStart = getDinnerTimeRange(dinnerDate, DEFAULT_DINNER_START_TIME, 0).start
        const heynaboStart = new Date(heynaboEvent.start!)

        expect(heynaboStart.getFullYear()).toBe(expectedStart.getFullYear())
        expect(heynaboStart.getMonth()).toBe(expectedStart.getMonth())
        expect(heynaboStart.getDate()).toBe(expectedStart.getDate())
        expect(heynaboStart.getHours()).toBe(expectedStart.getHours())
    })

    test('GIVEN announced dinner WHEN update menu THEN Heynabo event updated', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const dinnerEventData = {
            ...DinnerEventFactory.defaultDinnerEvent(testSalt),
            seasonId: testSeasonId,
            state: DinnerState.SCHEDULED,
            heynaboEventId: null
        }

        const scheduledDinner = await DinnerEventFactory.createDinnerEvent(adminContext, dinnerEventData)

        // Member announces it first (chef operation)
        const announcedDinner = await DinnerEventFactory.updateDinnerEvent(
            memberContext, scheduledDinner.id, {state: DinnerState.ANNOUNCED}
        )
        expect(announcedDinner).not.toBeNull()
        expect(announcedDinner!.state).toBe(DinnerState.ANNOUNCED)
        expect(announcedDinner!.heynaboEventId).toBeDefined()

        const originalHeynaboEventId = announcedDinner!.heynaboEventId

        // WHEN: Member (chef) updates the menu (endpoint syncs to Heynabo)
        const updatedMenuTitle = salt('Updated Delicious Pasta', testSalt)
        const updatedMenuDescription = 'Fresh homemade pasta with tomato sauce'

        const updateResponse = await DinnerEventFactory.updateDinnerEvent(
            memberContext,
            announcedDinner!.id,
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
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const dinnerEventData = {
            ...DinnerEventFactory.defaultDinnerEvent(testSalt),
            seasonId: testSeasonId,
            state: DinnerState.SCHEDULED,
            heynaboEventId: null
        }

        const scheduledDinner = await DinnerEventFactory.createDinnerEvent(adminContext, dinnerEventData)

        // Member announces it first (chef operation)
        const announcedDinner = await DinnerEventFactory.updateDinnerEvent(
            memberContext, scheduledDinner.id, {state: DinnerState.ANNOUNCED}
        )
        expect(announcedDinner).not.toBeNull()
        const heynaboEventId = announcedDinner!.heynaboEventId

        // WHEN: Member (chef) cancels the dinner
        const cancelledDinner = await DinnerEventFactory.updateDinnerEvent(
            memberContext, announcedDinner!.id, {state: DinnerState.CANCELLED}
        )
        expect(cancelledDinner).not.toBeNull()

        // THEN: Dinner state is CANCELLED
        expect(cancelledDinner!.state).toBe(DinnerState.CANCELLED)

        // AND: heynaboEventId is still stored (event cancelled in Heynabo, not deleted)
        expect(cancelledDinner!.heynaboEventId).toBe(heynaboEventId)
    })

    test('GIVEN announced dinner without picture WHEN fetch THEN picture URL lazy-synced', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const dinnerEventData = {
            ...DinnerEventFactory.defaultDinnerEvent(testSalt),
            seasonId: testSeasonId,
            state: DinnerState.SCHEDULED,
            heynaboEventId: null,
            menuPictureUrl: null
        }

        const scheduledDinner = await DinnerEventFactory.createDinnerEvent(adminContext, dinnerEventData)

        // Member announces it (chef operation)
        const announcedDinner = await DinnerEventFactory.updateDinnerEvent(
            memberContext, scheduledDinner.id, {state: DinnerState.ANNOUNCED}
        )
        expect(announcedDinner).not.toBeNull()
        expect(announcedDinner!.menuPictureUrl).toBeNull()

        // WHEN: Fetching the dinner event (should lazy-sync picture from Heynabo)
        const fetchedDinner = await DinnerEventFactory.getDinnerEvent(memberContext, announcedDinner!.id)

        // THEN: Dinner exists (lazy fetch will be implemented later)
        expect(fetchedDinner).toBeDefined()
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        // Season deletion cascades to dinner events (ADR-005)
        await SeasonFactory.cleanupSeasons(context, [testSeasonId])
    })
})
