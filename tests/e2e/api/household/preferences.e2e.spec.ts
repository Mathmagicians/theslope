import {test, expect} from '@playwright/test'
import {HouseholdFactory} from '../../testDataFactories/householdFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import testHelpers from '../../testHelpers'

const {validatedBrowserContext, memberValidatedBrowserContext, getSessionUserInfo, temporaryAndRandom, salt, headers} = testHelpers
const {DinnerModeSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum
const {createDefaultWeekdayMap} = useWeekDayMapValidation({valueSchema: DinnerModeSchema, defaultValue: DinnerMode.NONE})

// Cleanup tracking
const createdHouseholdIds: number[] = []

test.describe('Household Preferences API', () => {

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await HouseholdFactory.deleteHousehold(context, createdHouseholdIds)
    })

    // Parametrized happy path tests for different DinnerMode values
    const dinnerModes = [DinnerMode.DINEIN, DinnerMode.TAKEAWAY, DinnerMode.DINEINLATE, DinnerMode.NONE] as const

    dinnerModes.forEach((mode) => {
        test(`GIVEN member WHEN updating preferences to ${mode} THEN succeeds`, async ({browser}) => {
            const memberContext = await memberValidatedBrowserContext(browser)
            const {inhabitantId} = await getSessionUserInfo(memberContext)
            const preferences = createDefaultWeekdayMap(mode)

            const result = await HouseholdFactory.updateInhabitantPreferences(memberContext, inhabitantId, preferences)

            expect(result).not.toBeNull()
            expect(result!.inhabitant.id).toBe(inhabitantId)
            expect(result!.inhabitant.dinnerPreferences).toEqual(preferences)
            expect(result!.scaffoldResult).toBeDefined()
        })
    })

    test('GIVEN member WHEN updating different household inhabitant THEN returns 403', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
            adminContext, {name: salt('Other-Household', testSalt)}, 1
        )
        createdHouseholdIds.push(household.id)

        const memberContext = await memberValidatedBrowserContext(browser)
        await HouseholdFactory.updateInhabitantPreferences(
            memberContext, inhabitants[0]!.id, createDefaultWeekdayMap(DinnerMode.DINEIN), 403
        )
    })

    // Parametrized validation tests
    const validationTests = [
        {name: 'non-existent inhabitant', id: 999999, data: {dinnerPreferences: createDefaultWeekdayMap(DinnerMode.DINEIN)}, expectedStatus: 404},
        {name: 'negative inhabitant ID', id: -1, data: {dinnerPreferences: createDefaultWeekdayMap(DinnerMode.DINEIN)}, expectedStatus: 400},
        {name: 'missing dinnerPreferences', id: 'own', data: {}, expectedStatus: 400},
        {name: 'invalid preferences format', id: 'own', data: {dinnerPreferences: 'invalid'}, expectedStatus: 400},
    ] as const

    validationTests.forEach(({name, id, data, expectedStatus}) => {
        test(`GIVEN ${name} WHEN updating THEN returns ${expectedStatus}`, async ({browser}) => {
            const memberContext = await memberValidatedBrowserContext(browser)
            const {inhabitantId} = await getSessionUserInfo(memberContext)
            const targetId = id === 'own' ? inhabitantId : id

            const response = await memberContext.request.post(`/api/household/inhabitants/${targetId}/preferences`, {headers, data})
            expect(response.status()).toBe(expectedStatus)
        })
    })
})
