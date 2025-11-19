import {test, expect} from '@playwright/test'
import {AllergyFactory} from '../../testDataFactories/allergyFactory'
import {HouseholdFactory} from '../../testDataFactories/householdFactory'
import testHelpers from '../../testHelpers'

const {validatedBrowserContext} = testHelpers

// Variables to store IDs for cleanup
// Only track root entities - CASCADE will delete children
let createdAllergyTypeIds: number[] = []
const createdHouseholdIds: number[] = []

test.describe('Allergy API - CRUD Operations', () => {

    test('GIVEN inhabitant and allergy type exist WHEN creating allergy THEN allergy is created', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create household with inhabitant and allergy type
        const household = await HouseholdFactory.createHousehold(context, {name: 'Test Household Allergy'})
        createdHouseholdIds.push(household.id)

        const inhabitant = await HouseholdFactory.createInhabitantForHousehold(context, household.id, 'Anna Hansen')

        const allergyType = await AllergyFactory.createAllergyType(context)
        createdAllergyTypeIds.push(allergyType.id)

        // WHEN: Create allergy
        const allergyData = {
            inhabitantId: inhabitant.id,
            allergyTypeId: allergyType.id,
            inhabitantComment: 'Meget alvorlig - har EpiPen'
        }
        const created = await AllergyFactory.createAllergy(context, allergyData)

        // THEN: Verify response
        expect(created).toHaveProperty('id')
        expect(created.id).toBeGreaterThan(0)
        expect(created.inhabitantId).toBe(inhabitant.id)
        expect(created.allergyTypeId).toBe(allergyType.id)
        expect(created.inhabitantComment).toBe(allergyData.inhabitantComment)
        expect(created).toHaveProperty('createdAt')
        expect(created).toHaveProperty('updatedAt')
    })

    test('GIVEN allergy exists WHEN fetching by ID THEN returns correct allergy', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create allergy
        const household = await HouseholdFactory.createHousehold(context)
        createdHouseholdIds.push(household.id)

        const inhabitant = await HouseholdFactory.createInhabitantForHousehold(context, household.id, 'Bob Jensen')

        const allergyType = await AllergyFactory.createAllergyType(context, {name: 'Gluten', icon: '🌾'})
        createdAllergyTypeIds.push(allergyType.id)

        const created = await AllergyFactory.createAllergy(context, {
            inhabitantId: inhabitant.id,
            allergyTypeId: allergyType.id,
            inhabitantComment: 'Cøliaki'
        })

        // WHEN: Fetch by ID
        const fetched = await AllergyFactory.getAllergy(context, created.id)

        // THEN: Verify it matches
        expect(fetched.id).toBe(created.id)
        expect(fetched.inhabitantId).toBe(inhabitant.id)
        expect(fetched.allergyTypeId).toBe(allergyType.id)
        expect(fetched.inhabitantComment).toBe('Cøliaki')

        // Verify nested relations are included
        expect(fetched.allergyType).toBeDefined()
        expect(fetched.allergyType.name).toBe('Gluten')
        expect(fetched.inhabitant).toBeDefined()
        expect(fetched.inhabitant.name).toBe('Bob')
    })

    test('GIVEN inhabitant has allergies WHEN fetching by inhabitantId THEN returns all allergies', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create inhabitant with multiple allergies
        const household = await HouseholdFactory.createHousehold(context)
        createdHouseholdIds.push(household.id)

        const inhabitant = await HouseholdFactory.createInhabitantForHousehold(context, household.id, 'Test Person')

        const allergyType1 = await AllergyFactory.createAllergyType(context, {name: 'Peanuts', icon: '🥜'})
        const allergyType2 = await AllergyFactory.createAllergyType(context, {name: 'Shellfish', icon: '🦐'})
        createdAllergyTypeIds.push(allergyType1.id, allergyType2.id)

        const allergy1 = await AllergyFactory.createAllergy(context, {
            inhabitantId: inhabitant.id,
            allergyTypeId: allergyType1.id,
            inhabitantComment: 'Severe'
        })
        const allergy2 = await AllergyFactory.createAllergy(context, {
            inhabitantId: inhabitant.id,
            allergyTypeId: allergyType2.id,
            inhabitantComment: null
        })

        // WHEN: Fetch allergies for inhabitant
        const allergies = await AllergyFactory.getAllergiesForInhabitant(context, inhabitant.id)

        // THEN: Verify both allergies are returned
        expect(Array.isArray(allergies)).toBe(true)
        expect(allergies.length).toBe(2)

        const foundAllergy1 = allergies.find((a: any) => a.allergyTypeId === allergyType1.id)
        const foundAllergy2 = allergies.find((a: any) => a.allergyTypeId === allergyType2.id)

        expect(foundAllergy1).toBeTruthy()
        expect(foundAllergy1.inhabitantComment).toBe('Severe')
        expect(foundAllergy2).toBeTruthy()
        expect(foundAllergy2.inhabitantComment).toBeNull()
    })

    test('GIVEN household members have allergies WHEN fetching by householdId THEN returns all allergies', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create household with multiple inhabitants having allergies
        const household = await HouseholdFactory.createHousehold(context, {name: 'Multi-Allergy Household'})
        createdHouseholdIds.push(household.id)

        const inhabitant1 = await HouseholdFactory.createInhabitantForHousehold(context, household.id, 'Person One')
        const inhabitant2 = await HouseholdFactory.createInhabitantForHousehold(context, household.id, 'Person Two')

        const allergyType = await AllergyFactory.createAllergyType(context, {name: 'Lactose', icon: '🥛'})
        createdAllergyTypeIds.push(allergyType.id)

        const allergy1 = await AllergyFactory.createAllergy(context, {
            inhabitantId: inhabitant1.id,
            allergyTypeId: allergyType.id,
            inhabitantComment: 'Mild'
        })
        const allergy2 = await AllergyFactory.createAllergy(context, {
            inhabitantId: inhabitant2.id,
            allergyTypeId: allergyType.id,
            inhabitantComment: 'Severe'
        })

        // WHEN: Fetch allergies for household
        const allergies = await AllergyFactory.getAllergiesForHousehold(context, household.id)

        // THEN: Verify both allergies are returned
        expect(Array.isArray(allergies)).toBe(true)
        expect(allergies.length).toBe(2)

        const allergiesForInhabitant1 = allergies.filter((a: any) => a.inhabitantId === inhabitant1.id)
        const allergiesForInhabitant2 = allergies.filter((a: any) => a.inhabitantId === inhabitant2.id)

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
        expect(fetched.inhabitantComment).toBe(updateData.inhabitantComment)
    })

    test('GIVEN allergy exists WHEN deleting THEN deletes successfully', async ({browser}) => {
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
        expect(deleted.id).toBe(created.id)

        // Verify it no longer exists (should return 404)
        const response = await context.request.get(`/api/household/allergy/${created.id}`)
        expect(response.status()).toBe(404)
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

    test('GIVEN invalid data (missing allergyTypeId) WHEN creating THEN returns 400', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create inhabitant
        const household = await HouseholdFactory.createHousehold(context)
        createdHouseholdIds.push(household.id)

        const inhabitant = await HouseholdFactory.createInhabitantForHousehold(context, household.id)

        // WHEN: Try to create without allergyTypeId
        const response = await context.request.put('/api/household/allergy', {
            headers: testHelpers.headers,
            data: {
                inhabitantId: inhabitant.id,
                inhabitantComment: 'Test'
            }
        })

        // THEN: Should fail validation
        expect(response.status()).toBe(400)
    })

    test('GIVEN invalid data (comment too long) WHEN creating THEN returns 400', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Setup
        const household = await HouseholdFactory.createHousehold(context)
        createdHouseholdIds.push(household.id)

        const inhabitant = await HouseholdFactory.createInhabitantForHousehold(context, household.id)

        const allergyType = await AllergyFactory.createAllergyType(context)
        createdAllergyTypeIds.push(allergyType.id)

        // WHEN: Try to create with comment > 500 chars
        const response = await context.request.put('/api/household/allergy', {
            headers: testHelpers.headers,
            data: {
                inhabitantId: inhabitant.id,
                allergyTypeId: allergyType.id,
                inhabitantComment: 'a'.repeat(501)
            }
        })

        // THEN: Should fail validation
        expect(response.status()).toBe(400)
    })

    test('GIVEN non-existent ID WHEN fetching THEN returns 404', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // WHEN: Try to fetch non-existent allergy
        const response = await context.request.get('/api/household/allergy/999999')

        // THEN: Should return 404
        expect(response.status()).toBe(404)
    })

    test('GIVEN invalid ID (negative) WHEN fetching THEN returns 400', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // WHEN: Try to fetch with invalid ID
        const response = await context.request.get('/api/household/allergy/-1')

        // THEN: Should fail validation
        expect(response.status()).toBe(400)
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

        const allergyType = await AllergyFactory.createAllergyType(context, {name: 'Cascade Test', icon: '🧪'})
        createdAllergyTypeIds.push(allergyType.id)

        const allergy = await AllergyFactory.createAllergy(context, {
            inhabitantId: inhabitant.id,
            allergyTypeId: allergyType.id,
            inhabitantComment: 'Will be cascaded'
        })

        // WHEN: Delete allergy type
        await AllergyFactory.deleteAllergyType(context, allergyType.id)

        // THEN: Verify allergy was also deleted (CASCADE)
        const allergyResponse = await context.request.get(`/api/household/allergy/${allergy.id}`)
        expect(allergyResponse.status()).toBe(404)

        // Remove from cleanup list since already deleted
        createdAllergyTypeIds = createdAllergyTypeIds.filter(id => id !== allergyType.id)
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
        await HouseholdFactory.deleteInhabitant(context, inhabitant.id)

        // THEN: Verify allergy was also deleted (CASCADE)
        const allergyResponse = await context.request.get(`/api/household/allergy/${allergy.id}`)
        expect(allergyResponse.status()).toBe(404)
    })
})

// Cleanup after all tests
test.afterAll(async ({browser}) => {
    const context = await validatedBrowserContext(browser)

    // Only need to delete root entities - CASCADE will handle the rest
    // Deleting Household cascades to Inhabitants and their Allergies
    // Deleting AllergyType cascades to any remaining Allergies
    if (createdHouseholdIds.length > 0) {
        for (const id of createdHouseholdIds) {
            try {
                await HouseholdFactory.deleteHousehold(context, id)
            } catch (error) {
                console.warn(`Failed to cleanup household ${id}:`, error)
            }
        }
    }

    if (createdAllergyTypeIds.length > 0) {
        await AllergyFactory.cleanupAllergyTypes(context, createdAllergyTypeIds)
    }
})
