import {test, expect} from '@playwright/test'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'
import type {DinnerEventCreate} from '~/composables/useBookingValidation'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import testHelpers from '~~/tests/e2e/testHelpers'

/**
 * E2E tests for `POST /api/team/cooking/[id]/remove-role` ("Meld afbud").
 *
 * Twin of assign-role: a chef withdraws from a dinner. Clears the dinner-level
 * chef + menu + allergens, reverts state to SCHEDULED, deletes the Heynabo event.
 * Team membership (CookingTeamAssignment) is preserved.
 */

const {validatedBrowserContext, memberValidatedBrowserContext, salt, temporaryAndRandom, getSessionUserInfo} = testHelpers
const {DinnerStateSchema} = useBookingValidation()
const {TeamRoleSchema} = useCookingTeamValidation()
const DinnerState = DinnerStateSchema.enum
const Role = TeamRoleSchema.enum

let adminContext: Awaited<ReturnType<typeof validatedBrowserContext>>
let memberContext: Awaited<ReturnType<typeof memberValidatedBrowserContext>>
let testSeasonId: number
let chefTeamId: number
let memberInhabitantId: number
const createdAllergyTypeIds: number[] = []

test.describe('Remove Role Endpoint (Meld afbud)', () => {

    test.beforeAll(async ({browser}) => {
        adminContext = await validatedBrowserContext(browser)
        memberContext = await memberValidatedBrowserContext(browser)

        testSeasonId = (await SeasonFactory.createSeason(adminContext)).id!
        chefTeamId = (await SeasonFactory.createCookingTeamForSeason(
            adminContext, testSeasonId, salt('ChefTeam', temporaryAndRandom())
        )).id!
        memberInhabitantId = (await getSessionUserInfo(memberContext)).inhabitantId
        await SeasonFactory.assignMemberToTeam(adminContext, chefTeamId, memberInhabitantId, Role.CHEF)
    })

    test.afterAll(async () => {
        if (testSeasonId) await SeasonFactory.cleanupSeasons(adminContext, [testSeasonId])
        await AllergyFactory.cleanupAllergyTypes(adminContext, createdAllergyTypeIds)
    })

    // Create a SCHEDULED dinner on the chef team with the member assigned as chef.
    const createDinnerWithChef = async (overrides: Partial<DinnerEventCreate> = {}) => {
        const dinner = await DinnerEventFactory.createDinnerEvent(adminContext, {
            ...DinnerEventFactory.defaultDinnerEvent(temporaryAndRandom()),
            seasonId: testSeasonId,
            state: DinnerState.SCHEDULED,
            heynaboEventId: null,
            cookingTeamId: chefTeamId,
            ...overrides
        })
        await DinnerEventFactory.assignRoleToDinnerEvent(adminContext, dinner.id, memberInhabitantId, Role.CHEF)
        return dinner
    }

    const removeRole = (dinnerEventId: number, expectedStatus = 200) =>
        DinnerEventFactory.removeRoleFromDinnerEvent(memberContext, dinnerEventId, memberInhabitantId, Role.CHEF, expectedStatus)

    test('GIVEN scheduled dinner with chef + menu + allergens WHEN remove-role THEN all cleared, state SCHEDULED', async () => {
        const testSalt = temporaryAndRandom()
        const dinner = await createDinnerWithChef()

        await DinnerEventFactory.updateDinnerEvent(memberContext, dinner.id, {
            menuTitle: salt('Pasta', testSalt),
            menuDescription: 'A test menu'
        })
        const allergyType = await AllergyFactory.createAllergyType(adminContext, AllergyFactory.defaultAllergyTypeData(testSalt))
        createdAllergyTypeIds.push(allergyType.id)
        await DinnerEventFactory.updateDinnerEventAllergens(memberContext, dinner.id, [allergyType.id])

        const result = await removeRole(dinner.id)
        expect(result!.chefId).toBeNull()
        expect(result!.chef).toBeNull()
        expect(result!.menuTitle).toBe('')
        expect(result!.menuDescription).toBe('')
        expect(result!.menuPictureUrl).toBeNull()
        expect(result!.totalCost).toBe(0)
        expect(result!.state).toBe(DinnerState.SCHEDULED)
        expect(result!.allergens!.length).toBe(0)
    })

    test('GIVEN announced dinner with Heynabo event WHEN remove-role THEN heynaboEventId cleared and HN event deleted', async () => {
        const dinner = await createDinnerWithChef()
        const heynaboEventId = (await DinnerEventFactory.updateDinnerEvent(
            memberContext, dinner.id, {state: DinnerState.ANNOUNCED}
        ))!.heynaboEventId!
        expect(typeof heynaboEventId).toBe('number')

        const result = await removeRole(dinner.id)
        expect(result!.chefId).toBeNull()
        expect(result!.heynaboEventId).toBeNull()
        expect(result!.state).toBe(DinnerState.SCHEDULED)

        const getResponse = await memberContext.request.get(`/api/test/heynabo/event/${heynaboEventId}`)
        expect(getResponse.status(), `HN event ${heynaboEventId} should be deleted`).not.toBe(200)
    })

    test('GIVEN consumed dinner WHEN remove-role THEN 400', async () => {
        const dinner = await createDinnerWithChef({state: DinnerState.CONSUMED})
        await removeRole(dinner.id, 400)
    })

    test('GIVEN non-existent dinner WHEN remove-role THEN 404', async () => {
        await removeRole(999999, 404)
    })

    test('GIVEN remove-role WHEN completed THEN team membership preserved', async () => {
        const dinner = await createDinnerWithChef()
        await removeRole(dinner.id)

        const team = await SeasonFactory.getCookingTeamById(adminContext, chefTeamId)
        expect(
            team!.assignments.find(a => a.inhabitantId === memberInhabitantId),
            'Chef stays on the cooking team after Meld afbud'
        ).toBeDefined()
    })
})
