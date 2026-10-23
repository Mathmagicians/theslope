import {test, expect, type BrowserContext} from '@playwright/test'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import testHelpers from '~~/tests/e2e/testHelpers'

const {validatedBrowserContext, memberValidatedBrowserContext, getSessionUserInfo, salt, temporaryAndRandom} = testHelpers

// Variables to store IDs for cleanup
// Only track root entities - CASCADE will delete children; a person in the member's household goes on its own
const createdAllergyTypeIds: number[] = []
const createdHouseholdIds: number[] = []
const createdInhabitantIds: number[] = []

// The admin changes the allergies of the spec's own households through the override (ADR-004)
test.describe('Allergy API - CRUD Operations', () => {

    test('GIVEN inhabitant and allergy type exist WHEN creating and fetching an allergy by ID THEN both return the allergy', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create household with inhabitant and allergy type
        const household = await HouseholdFactory.createHousehold(context)
        createdHouseholdIds.push(household.id)

        const inhabitant = await HouseholdFactory.createInhabitantForHousehold(context, household.id, 'Bob Jensen')

        const allergyType = await AllergyFactory.createAllergyType(context, {name: salt('Test Gluten'), icon: '🌾'})
        createdAllergyTypeIds.push(allergyType.id)

        // WHEN: Create allergy
        const created = await AllergyFactory.createAllergy(context, {
            inhabitantId: inhabitant.id,
            allergyTypeId: allergyType.id,
            inhabitantComment: 'Cøliaki'
        }, 201, true)

        // THEN: The create response carries the allergy
        expect(created.id).toBeGreaterThan(0)
        expect(created.inhabitantId).toBe(inhabitant.id)
        expect(created.allergyTypeId).toBe(allergyType.id)
        expect(created.inhabitantComment).toBe('Cøliaki')
        expect(created).toHaveProperty('createdAt')
        expect(created).toHaveProperty('updatedAt')

        // WHEN: Fetch by ID
        const fetched = await AllergyFactory.getAllergy(context, created.id)

        // THEN: Verify it matches
        expect(fetched).not.toBeNull()
        expect(fetched!.id).toBe(created.id)
        expect(fetched!.inhabitantId).toBe(inhabitant.id)
        expect(fetched!.allergyTypeId).toBe(allergyType.id)
        expect(fetched!.inhabitantComment).toBe('Cøliaki')

        // Verify nested relations are included
        expect(fetched!.allergyType).toBeDefined()
        expect(fetched!.allergyType.name).toBe(allergyType.name)
        expect(fetched!.inhabitant).toBeDefined()
        expect(fetched!.inhabitant.name).toBe('Bob')
    })

    test('GIVEN inhabitant has allergies WHEN fetching by inhabitantId THEN returns all allergies', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create inhabitant with multiple allergies
        const household = await HouseholdFactory.createHousehold(context)
        createdHouseholdIds.push(household.id)

        const inhabitant = await HouseholdFactory.createInhabitantForHousehold(context, household.id, 'Test Person')

        const allergyType1 = await AllergyFactory.createAllergyType(context, {name: salt('Test Peanuts'), icon: '🥜'})
        const allergyType2 = await AllergyFactory.createAllergyType(context, {name: salt('Test Shellfish'), icon: '🦐'})
        createdAllergyTypeIds.push(allergyType1.id, allergyType2.id)

        await AllergyFactory.createAllergy(context, {
            inhabitantId: inhabitant.id,
            allergyTypeId: allergyType1.id,
            inhabitantComment: 'Severe'
        }, 201, true)
        await AllergyFactory.createAllergy(context, {
            inhabitantId: inhabitant.id,
            allergyTypeId: allergyType2.id,
            inhabitantComment: null
        }, 201, true)

        // WHEN: Fetch allergies for inhabitant
        const allergies = await AllergyFactory.getAllergiesForInhabitant(context, inhabitant.id)

        // THEN: Verify both allergies are returned
        expect(Array.isArray(allergies)).toBe(true)
        expect(allergies.length).toBe(2)

        const foundAllergy1 = allergies.find((a) => a.allergyTypeId === allergyType1.id)
        const foundAllergy2 = allergies.find((a) => a.allergyTypeId === allergyType2.id)

        expect(foundAllergy1).toBeTruthy()
        expect(foundAllergy1!.inhabitantComment).toBe('Severe')
        expect(foundAllergy2).toBeTruthy()
        expect(foundAllergy2!.inhabitantComment).toBeNull()
    })

    test('GIVEN household members have allergies WHEN fetching by householdId THEN returns all allergies', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create household with multiple inhabitants having allergies
        const household = await HouseholdFactory.createHousehold(context, {name: 'Multi-Allergy Household'})
        createdHouseholdIds.push(household.id)

        const inhabitant1 = await HouseholdFactory.createInhabitantForHousehold(context, household.id, 'Person One')
        const inhabitant2 = await HouseholdFactory.createInhabitantForHousehold(context, household.id, 'Person Two')

        const allergyType = await AllergyFactory.createAllergyType(context, {name: salt('Test Lactose'), icon: '🥛'})
        createdAllergyTypeIds.push(allergyType.id)

        await AllergyFactory.createAllergy(context, {
            inhabitantId: inhabitant1.id,
            allergyTypeId: allergyType.id,
            inhabitantComment: 'Mild'
        }, 201, true)
        await AllergyFactory.createAllergy(context, {
            inhabitantId: inhabitant2.id,
            allergyTypeId: allergyType.id,
            inhabitantComment: 'Severe'
        }, 201, true)

        // WHEN: Fetch allergies for household
        const allergies = await AllergyFactory.getAllergiesForHousehold(context, household.id)

        // THEN: Verify both allergies are returned
        expect(Array.isArray(allergies)).toBe(true)
        expect(allergies.length).toBe(2)

        const allergiesForInhabitant1 = allergies.filter((a) => a.inhabitantId === inhabitant1.id)
        const allergiesForInhabitant2 = allergies.filter((a) => a.inhabitantId === inhabitant2.id)

        expect(allergiesForInhabitant1.length).toBe(1)
        expect(allergiesForInhabitant2.length).toBe(1)
    })

    test('GIVEN allergy exists WHEN updating THEN updates successfully', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create allergy
        const household = await HouseholdFactory.createHousehold(context)
        createdHouseholdIds.push(household.id)

        const inhabitant = await HouseholdFactory.createInhabitantForHousehold(context, household.id)

        const allergyType = await AllergyFactory.createAllergyType(context)
        createdAllergyTypeIds.push(allergyType.id)

        const original = await AllergyFactory.createAllergy(context, {
            inhabitantId: inhabitant.id,
            allergyTypeId: allergyType.id,
            inhabitantComment: 'Original comment'
        }, 201, true)

        // WHEN: Update allergy comment
        const updateData = {
            inhabitantComment: 'Updated comment - now has EpiPen'
        }
        const updated = await AllergyFactory.updateAllergy(context, original.id, updateData, 200, true)

        // THEN: Verify updates
        expect(updated.id).toBe(original.id)
        expect(updated.inhabitantComment).toBe(updateData.inhabitantComment)

        // Verify via GET to ensure persistence
        const fetched = await AllergyFactory.getAllergy(context, original.id)
        expect(fetched).not.toBeNull()
        expect(fetched!.inhabitantComment).toBe(updateData.inhabitantComment)
    })

    test('GIVEN allergy exists WHEN deleting THEN deletes successfully, and a removed allergy answers 404', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create allergy
        const household = await HouseholdFactory.createHousehold(context)
        createdHouseholdIds.push(household.id)

        const inhabitant = await HouseholdFactory.createInhabitantForHousehold(context, household.id)

        const allergyType = await AllergyFactory.createAllergyType(context)
        createdAllergyTypeIds.push(allergyType.id)

        const created = await AllergyFactory.createAllergy(context, {
            inhabitantId: inhabitant.id,
            allergyTypeId: allergyType.id
        }, 201, true)

        // WHEN: Delete allergy
        const deleted = await AllergyFactory.deleteAllergy(context, created.id, 200, true)

        // THEN: Verify deletion
        expect(deleted).not.toBeNull()
        expect(deleted!.id).toBe(created.id)

        // Verify it no longer exists (should return 404)
        await AllergyFactory.getAllergy(context, created.id, 404)
    })

    test('GIVEN allergy with optional comment omitted WHEN creating THEN creates successfully', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Setup
        const household = await HouseholdFactory.createHousehold(context)
        createdHouseholdIds.push(household.id)

        const inhabitant = await HouseholdFactory.createInhabitantForHousehold(context, household.id)

        const allergyType = await AllergyFactory.createAllergyType(context)
        createdAllergyTypeIds.push(allergyType.id)

        // WHEN: Create allergy without comment
        const created = await AllergyFactory.createAllergy(context, {
            inhabitantId: inhabitant.id,
            allergyTypeId: allergyType.id
        }, 201, true)

        // THEN: Verify it was created without comment
        expect(created.id).toBeGreaterThan(0)
        expect(created.inhabitantComment).toBeNull()
    })
})

// Every member reads; a household changes its own allergies, an admin or the allergy manager another household's through
// the override, asked per change (ADR-004). The rows that set the member's roles run in
// tests/e2e/api/serial/sessionUserRoles.e2e.spec.ts
test.describe('Allergy API - who changes a household\'s allergies', () => {
    const testSalt = temporaryAndRandom()
    let adminContext: BrowserContext
    const inhabitantIn: Record<'their own household' | 'another household', number> = {'their own household': 0, 'another household': 0}

    test.beforeAll(async ({browser}) => {
        adminContext = await validatedBrowserContext(browser)
        const {householdId} = await getSessionUserInfo(await memberValidatedBrowserContext(browser))
        const household = await HouseholdFactory.createHousehold(adminContext)
        createdHouseholdIds.push(household.id)
        const [own, another] = await Promise.all([
            HouseholdFactory.createInhabitantWithConfig(adminContext, householdId, {name: salt('Anders', testSalt), lastName: 'Allergiker'}),
            HouseholdFactory.createInhabitantForHousehold(adminContext, household.id)
        ])
        createdInhabitantIds.push(own.id)
        inhabitantIn['their own household'] = own.id
        inhabitantIn['another household'] = another.id
    })

    const actors = [
        {who: 'a member of the household', session: memberValidatedBrowserContext, on: 'their own household', adminBypass: false, allowed: true},
        {who: 'a member of another household', session: memberValidatedBrowserContext, on: 'another household', adminBypass: false, allowed: false},
        {who: 'an admin with the override', session: validatedBrowserContext, on: 'another household', adminBypass: true, allowed: true},
        {who: 'an admin without the override', session: validatedBrowserContext, on: 'another household', adminBypass: false, allowed: false}
    ] as const

    for (const {who, session, on, adminBypass, allowed} of actors) {
        for (const allergyChange of AllergyFactory.ALLERGY_CHANGES) {
            const {change, status, after} = allergyChange
            test(`GIVEN ${who} WHEN it ${change} an allergy on ${on} THEN it answers ${allowed ? status : 403}`, async ({browser}) => {
                const comments = await AllergyFactory.changeAllergyAs(adminContext, await session(browser), allergyChange, {
                    inhabitantId: inhabitantIn[on], testSalt, expectedStatus: allowed ? status : 403, adminBypass, createdAllergyTypeIds
                })

                expect(comments).toEqual(allowed ? after.allowed : after.refused)
            })
        }
    }
})

test.describe('Allergy API - Validation', () => {

    // One 400 for the create endpoint; the schema's field rules are proven in the useAllergyValidation unit spec
    test('GIVEN invalid data (missing inhabitantId) WHEN creating THEN returns 400', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create allergy type
        const allergyType = await AllergyFactory.createAllergyType(context)
        createdAllergyTypeIds.push(allergyType.id)

        // WHEN: Try to create without inhabitantId
        const response = await context.request.put('/api/household/allergy', {
            headers: testHelpers.headers,
            data: {
                allergyTypeId: allergyType.id,
                inhabitantComment: 'Test'
            }
        })

        // THEN: Should fail validation
        expect(response.status()).toBe(400)
    })

    test('GIVEN invalid ID (negative) WHEN fetching THEN returns 400', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // WHEN: Try to fetch with invalid ID - THEN: Should fail validation
        await AllergyFactory.getAllergy(context, -1, 400)
    })

    test('GIVEN no query parameters WHEN fetching allergies THEN returns 400', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // WHEN: Try to fetch without householdId or inhabitantId
        const response = await context.request.get('/api/household/allergy')

        // THEN: Should return 400
        expect(response.status()).toBe(400)
    })

    test('GIVEN both query parameters WHEN fetching allergies THEN returns 400', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // WHEN: Try to fetch with both householdId and inhabitantId
        const response = await context.request.get('/api/household/allergy?householdId=1&inhabitantId=1')

        // THEN: Should return 400
        expect(response.status()).toBe(400)
    })
})

test.describe('Allergy API - CASCADE Deletion', () => {

    test('GIVEN allergy type has allergies WHEN deleting allergy type THEN cascades to allergies', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create allergy type with allergy
        const household = await HouseholdFactory.createHousehold(context)
        createdHouseholdIds.push(household.id)

        const inhabitant = await HouseholdFactory.createInhabitantForHousehold(context, household.id)

        const allergyType = await AllergyFactory.createAllergyType(context, {name: salt('Test Cascade'), icon: '🧪'})
        createdAllergyTypeIds.push(allergyType.id)

        const allergy = await AllergyFactory.createAllergy(context, {
            inhabitantId: inhabitant.id,
            allergyTypeId: allergyType.id,
            inhabitantComment: 'Will be cascaded'
        }, 201, true)

        // WHEN: Delete allergy type
        await AllergyFactory.deleteAllergyType(context, allergyType.id)

        // THEN: Verify allergy was also deleted (CASCADE)
        await AllergyFactory.getAllergy(context, allergy.id, 404)
    })

    test('GIVEN inhabitant has allergies WHEN deleting inhabitant THEN cascades to allergies', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create inhabitant with allergy
        const household = await HouseholdFactory.createHousehold(context)
        createdHouseholdIds.push(household.id)

        const inhabitant = await HouseholdFactory.createInhabitantForHousehold(context, household.id, 'Will Be Deleted')

        const allergyType = await AllergyFactory.createAllergyType(context)
        createdAllergyTypeIds.push(allergyType.id)

        const allergy = await AllergyFactory.createAllergy(context, {
            inhabitantId: inhabitant.id,
            allergyTypeId: allergyType.id
        }, 201, true)

        // WHEN: Delete inhabitant
        await HouseholdFactory.deleteInhabitant(context, inhabitant.id, 200)

        // THEN: Verify allergy was also deleted (CASCADE)
        await AllergyFactory.getAllergy(context, allergy.id, 404)
    })
})

// Cleanup after all tests
test.afterAll(async ({browser}) => {
    const context = await validatedBrowserContext(browser)

    // Only need to delete root entities - CASCADE will handle the rest
    // Deleting Household cascades to Inhabitants and their Allergies
    // Deleting AllergyType cascades to any remaining Allergies
    await HouseholdFactory.deleteHousehold(context, createdHouseholdIds)
    await Promise.all(createdInhabitantIds.map(id => HouseholdFactory.deleteInhabitant(context, id)))
    await AllergyFactory.cleanupAllergyTypes(context, createdAllergyTypeIds)
})
