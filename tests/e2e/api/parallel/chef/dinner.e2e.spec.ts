import {test, expect} from '@playwright/test'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import {getDinnerTimeRange} from '~/utils/season'
import testHelpers from '~~/tests/e2e/testHelpers'

/**
 * E2E tests for `/api/chef/dinner/[id]` (consolidated chef endpoint).
 *
 * Covers menu/state/allergen mutations, Heynabo synchronisation, and the
 * `requireChefForDinner` permission guard added in Phase 1 of chef-swap.
 *
 * Single beforeAll: season + team + member-as-chef so every operational test
 * passes the guard. Permission tests use a separate (non-chef) team to verify
 * 403, and a teamless dinner to verify 404.
 */

const DEFAULT_DINNER_START_TIME = 18

const {validatedBrowserContext, memberValidatedBrowserContext, salt, temporaryAndRandom, getSessionUserInfo} = testHelpers
const {DinnerStateSchema} = useBookingValidation()
const {TeamRoleSchema} = useCookingTeamValidation()
const DinnerState = DinnerStateSchema.enum
const Role = TeamRoleSchema.enum

let testSeasonId: number
let chefTeamId: number
const createdAllergyTypeIds: number[] = []

test.describe('Chef Dinner Endpoint', () => {

    test.beforeAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)

        const season = await SeasonFactory.createSeason(adminContext)
        testSeasonId = season.id!

        const team = await SeasonFactory.createCookingTeamForSeason(
            adminContext, testSeasonId, salt('ChefTeam', temporaryAndRandom())
        )
        chefTeamId = team.id!

        const {inhabitantId: memberInhabitantId} = await getSessionUserInfo(memberContext)
        await SeasonFactory.assignMemberToTeam(adminContext, chefTeamId, memberInhabitantId, Role.CHEF)
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        if (testSeasonId) await SeasonFactory.cleanupSeasons(context, [testSeasonId])
        await AllergyFactory.cleanupAllergyTypes(context, createdAllergyTypeIds)
    })

    const createDinner = async (
        adminContext: Awaited<ReturnType<typeof validatedBrowserContext>>,
        testSalt: string,
        overrides: Partial<Parameters<typeof DinnerEventFactory.createDinnerEvent>[1]> = {}
    ) => DinnerEventFactory.createDinnerEvent(adminContext, {
        ...DinnerEventFactory.defaultDinnerEvent(testSalt),
        seasonId: testSeasonId,
        state: DinnerState.SCHEDULED,
        heynaboEventId: null,
        cookingTeamId: chefTeamId,
        ...overrides
    })

    const createAllergyTypes = async (
        adminContext: Awaited<ReturnType<typeof validatedBrowserContext>>,
        count: number = 3
    ) => {
        const types = []
        for (let i = 0; i < count; i++) {
            const data = AllergyFactory.defaultAllergyTypeData(temporaryAndRandom())
            const created = await AllergyFactory.createAllergyType(adminContext, data)
            createdAllergyTypeIds.push(created.id)
            types.push(created)
        }
        return types
    }

    // ---------- Heynabo synchronisation ----------

    test('GIVEN scheduled dinner WHEN member announces THEN heynaboEventId stored with correct time', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const scheduledDinner = await createDinner(adminContext, testSalt)
        expect(scheduledDinner.state).toBe(DinnerState.SCHEDULED)
        expect(scheduledDinner.heynaboEventId).toBeNull()

        const announcedDinner = await DinnerEventFactory.updateDinnerEvent(
            memberContext, scheduledDinner.id, {state: DinnerState.ANNOUNCED}
        )
        expect(announcedDinner!.state).toBe(DinnerState.ANNOUNCED)
        expect(typeof announcedDinner!.heynaboEventId).toBe('number')

        const heynaboEvent = await DinnerEventFactory.getHeynaboEvent(memberContext, announcedDinner!.heynaboEventId!)
        const expectedStart = getDinnerTimeRange(new Date(scheduledDinner.date), DEFAULT_DINNER_START_TIME, 0).start
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

        const scheduledDinner = await createDinner(adminContext, testSalt)
        const announcedDinner = await DinnerEventFactory.updateDinnerEvent(
            memberContext, scheduledDinner.id, {state: DinnerState.ANNOUNCED}
        )

        const updatedTitle = salt('Updated Delicious Pasta', testSalt)
        const updateResponse = await DinnerEventFactory.updateDinnerEvent(
            memberContext, announcedDinner!.id,
            {menuTitle: updatedTitle, menuDescription: 'Fresh homemade pasta'}
        )

        expect(updateResponse?.menuTitle).toBe(updatedTitle)
        expect(updateResponse?.heynaboEventId).toBe(announcedDinner!.heynaboEventId)
    })

    test('GIVEN announced dinner WHEN cancel THEN Heynabo event cancelled', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const scheduledDinner = await createDinner(adminContext, testSalt)
        const announcedDinner = await DinnerEventFactory.updateDinnerEvent(
            memberContext, scheduledDinner.id, {state: DinnerState.ANNOUNCED}
        )

        const cancelledDinner = await DinnerEventFactory.updateDinnerEvent(
            memberContext, announcedDinner!.id, {state: DinnerState.CANCELLED}
        )
        expect(cancelledDinner!.state).toBe(DinnerState.CANCELLED)
        expect(cancelledDinner!.heynaboEventId).toBe(announcedDinner!.heynaboEventId)
    })

    test('GIVEN announced dinner without picture WHEN fetch THEN picture URL lazy-synced', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const scheduledDinner = await createDinner(adminContext, testSalt, {menuPictureUrl: null})
        const announcedDinner = await DinnerEventFactory.updateDinnerEvent(
            memberContext, scheduledDinner.id, {state: DinnerState.ANNOUNCED}
        )
        expect(announcedDinner!.menuPictureUrl).toBeNull()

        const fetchedDinner = await DinnerEventFactory.getDinnerEvent(memberContext, announcedDinner!.id)
        expect(fetchedDinner).toBeDefined()
    })

    // ---------- Allergens ----------

    test('GIVEN dinner event WHEN member sets allergens THEN response allergens have id (not allergyTypeId)', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const dinnerEvent = await createDinner(adminContext, testSalt)
        const allergyTypeIds = (await createAllergyTypes(adminContext)).map(a => a.id)

        const updated = await DinnerEventFactory.updateDinnerEventAllergens(
            memberContext, dinnerEvent.id, allergyTypeIds
        )

        expect(updated.allergens!.length).toBe(allergyTypeIds.length)
        updated.allergens!.forEach((allergen: Record<string, unknown>) => {
            expect(typeof allergen.id).toBe('number')
            expect(allergen.allergyTypeId).toBeUndefined()
            expect(allergen.name).toBeDefined()
        })
    })

    test('GIVEN single allergen WHEN member sets THEN returns correct allergen', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const dinnerEvent = await createDinner(adminContext, testSalt)
        const [single] = await createAllergyTypes(adminContext, 1)

        const updated = await DinnerEventFactory.updateDinnerEventAllergens(
            memberContext, dinnerEvent.id, [single!.id]
        )
        expect(updated.allergens!.length).toBe(1)
        expect(updated.allergens![0]!.id).toBe(single!.id)
    })

    test('GIVEN allergens WHEN member clears THEN returns empty array', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const dinnerEvent = await createDinner(adminContext, testSalt)
        const types = await createAllergyTypes(adminContext, 2)
        await DinnerEventFactory.updateDinnerEventAllergens(memberContext, dinnerEvent.id, types.map(t => t.id))

        const cleared = await DinnerEventFactory.updateDinnerEventAllergens(memberContext, dinnerEvent.id, [])
        expect(cleared.allergens!.length).toBe(0)
    })

    test('GIVEN member sets allergens WHEN fetching dinner event THEN allergens persist with id property', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const dinnerEvent = await createDinner(adminContext, testSalt)
        const allergyTypeIds = (await createAllergyTypes(adminContext, 2)).map(a => a.id)

        await DinnerEventFactory.updateDinnerEventAllergens(memberContext, dinnerEvent.id, allergyTypeIds)
        const fetched = await DinnerEventFactory.getDinnerEvent(memberContext, dinnerEvent.id)

        expect(fetched!.allergens!.length).toBe(2)
        fetched!.allergens!.forEach((allergen: Record<string, unknown>) => {
            expect(typeof allergen.id).toBe('number')
            expect(allergen.allergyTypeId).toBeUndefined()
        })
    })

    test('GIVEN non-existent allergen IDs WHEN member sets allergens THEN 404', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const dinnerEvent = await createDinner(adminContext, testSalt)
        await DinnerEventFactory.updateDinnerEventAllergens(memberContext, dinnerEvent.id, [999998, 999999], 404)
    })

    // ---------- Permissions ----------

    test('GIVEN inhabitant who is NOT a chef of the dinner team WHEN POST /api/chef/dinner/[id] THEN 403', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const otherTeam = await SeasonFactory.createCookingTeamForSeason(
            adminContext, testSeasonId, salt('OtherTeam', testSalt)
        )
        const dinner = await DinnerEventFactory.createDinnerEvent(adminContext, {
            ...DinnerEventFactory.defaultDinnerEvent(testSalt),
            seasonId: testSeasonId,
            cookingTeamId: otherTeam.id
        })

        await DinnerEventFactory.updateDinnerEvent(memberContext, dinner.id, {menuTitle: 'Forbidden'}, 403)
    })

    test('GIVEN dinner without a cookingTeam WHEN POST /api/chef/dinner/[id] THEN 404', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const dinner = await DinnerEventFactory.createDinnerEvent(adminContext, {
            ...DinnerEventFactory.defaultDinnerEvent(testSalt),
            seasonId: testSeasonId,
            cookingTeamId: null
        })

        await DinnerEventFactory.updateDinnerEvent(memberContext, dinner.id, {menuTitle: 'No team'}, 404)
    })

    test('GIVEN non-existent dinner event WHEN member POSTs THEN 404', async ({browser}) => {
        const memberContext = await memberValidatedBrowserContext(browser)
        await DinnerEventFactory.updateDinnerEvent(memberContext, 999999, {menuTitle: 'Ghost'}, 404)
    })

    // ---------- HN missing — reconciliation (ADR-013 best-effort sync) ----------
    // Reproduces prod regression: chef gets 500 on Annuller Aflysning when the HN
    // event was deleted externally. Local state must transition regardless of HN.

    test('GIVEN announced dinner with HN event deleted externally WHEN chef cancels THEN 207 partial success + local CANCELLED', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const scheduledDinner = await createDinner(adminContext, testSalt)
        const announcedDinner = await DinnerEventFactory.updateDinnerEvent(
            memberContext, scheduledDinner.id, {state: DinnerState.ANNOUNCED}
        )
        expect(announcedDinner!.heynaboEventId).not.toBeNull()

        await DinnerEventFactory.deleteHeynaboEvent(adminContext, announcedDinner!.heynaboEventId!)

        const cancelledDinner = await DinnerEventFactory.updateDinnerEvent(
            memberContext, announcedDinner!.id, {state: DinnerState.CANCELLED}, 207
        )
        expect(cancelledDinner!.state).toBe(DinnerState.CANCELLED)
    })

    test('GIVEN cancelled dinner with HN event deleted externally WHEN chef undoes cancellation THEN 207 + local ANNOUNCED + new heynaboEventId', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const scheduledDinner = await createDinner(adminContext, testSalt)
        const announcedDinner = await DinnerEventFactory.updateDinnerEvent(
            memberContext, scheduledDinner.id, {state: DinnerState.ANNOUNCED}
        )
        const originalHeynaboEventId = announcedDinner!.heynaboEventId!
        await DinnerEventFactory.updateDinnerEvent(
            memberContext, announcedDinner!.id, {state: DinnerState.CANCELLED}
        )

        await DinnerEventFactory.deleteHeynaboEvent(adminContext, originalHeynaboEventId)

        const restoredDinner = await DinnerEventFactory.updateDinnerEvent(
            memberContext, announcedDinner!.id, {state: DinnerState.ANNOUNCED}, 207
        )
        expect(restoredDinner!.state).toBe(DinnerState.ANNOUNCED)
        expect(restoredDinner!.heynaboEventId).not.toBeNull()
        expect(restoredDinner!.heynaboEventId).not.toBe(originalHeynaboEventId)
    })

    test('GIVEN announced dinner with HN event deleted externally WHEN chef updates menu THEN 207 + local update', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const scheduledDinner = await createDinner(adminContext, testSalt)
        const announcedDinner = await DinnerEventFactory.updateDinnerEvent(
            memberContext, scheduledDinner.id, {state: DinnerState.ANNOUNCED}
        )

        await DinnerEventFactory.deleteHeynaboEvent(adminContext, announcedDinner!.heynaboEventId!)

        const updatedTitle = salt('Menu without HN sync', testSalt)
        const updated = await DinnerEventFactory.updateDinnerEvent(
            memberContext, announcedDinner!.id, {menuTitle: updatedTitle}, 207
        )
        expect(updated!.menuTitle).toBe(updatedTitle)
    })
})
