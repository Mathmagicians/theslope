import {test, expect} from '@playwright/test'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import testHelpers from '~~/tests/e2e/testHelpers'

const {validatedBrowserContext, salt} = testHelpers

// Variables to store IDs for cleanup
// Only track root entities - CASCADE will delete children
const createdAllergyTypeIds: number[] = []
const createdHouseholdIds: number[] = []

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
        })

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
        })
        await AllergyFactory.createAllergy(context, {
            inhabitantId: inhabitant.id,
            allergyTypeId: allergyType2.id,
            inhabitantComment: null
        })

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
        })
        await AllergyFactory.createAllergy(context, {
            inhabitantId: inhabitant2.id,
            allergyTypeId: allergyType.id,
            inhabitantComment: 'Severe'
        })

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
        })

        // WHEN: Update allergy comment
        const updateData = {
            inhabitantComment: 'Updated comment - now has EpiPen'
        }
        const updated = await AllergyFactory.updateAllergy(context, original.id, updateData)

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
        })

        // WHEN: Delete allergy
        const deleted = await AllergyFactory.deleteAllergy(context, created.id)

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
        })

        // THEN: Verify it was created without comment
        expect(created.id).toBeGreaterThan(0)
        expect(created.inhabitantComment).toBeNull()
    })
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
        })

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
        })

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
    await AllergyFactory.cleanupAllergyTypes(context, createdAllergyTypeIds)
})
