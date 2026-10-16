import {test, expect} from '@playwright/test'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import type {AllergyTypeDetail} from '~/composables/useAllergyValidation'

const {validatedBrowserContext} = testHelpers

// Variables to store IDs for cleanup
const createdAllergyTypeIds: number[] = []
const createdHouseholdIds: number[] = []

test.describe('AllergyType API - CRUD Operations', () => {

    test('GIVEN valid allergy type data WHEN creating and fetching by ID THEN both return the allergy type', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create allergy type
        const allergyTypeData = AllergyFactory.defaultAllergyTypeData()
        const created = await AllergyFactory.createAllergyType(context, allergyTypeData)
        createdAllergyTypeIds.push(created.id)

        // THEN: The create response carries the allergy type
        expect(created.id).toBeGreaterThan(0)
        expect(created.name).toBe(allergyTypeData.name)
        expect(created.description).toBe(allergyTypeData.description)
        expect(created.icon).toBe(allergyTypeData.icon)

        // WHEN: Fetch by ID
        const fetched = await AllergyFactory.getAllergyType(context, created.id)

        // THEN: Verify it matches
        expect(fetched).not.toBeNull()
        expect(fetched!.id).toBe(created.id)
        expect(fetched!.name).toBe(allergyTypeData.name)
        expect(fetched!.description).toBe(allergyTypeData.description)
        expect(fetched!.icon).toBe(allergyTypeData.icon)
    })

    test('GIVEN allergy types exist WHEN fetching all THEN returns array with all types', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create multiple allergy types
        const allergyType1 = await AllergyFactory.createAllergyType(context)
        const allergyType2 = await AllergyFactory.createAllergyType(context)
        createdAllergyTypeIds.push(allergyType1.id, allergyType2.id)

        // WHEN: Fetch all allergy types
        const allergyTypes = await AllergyFactory.getAllergyTypes(context)

        // THEN: Verify both are in the list
        expect(Array.isArray(allergyTypes)).toBe(true)
        expect(allergyTypes.length).toBeGreaterThanOrEqual(2)

        const found1 = allergyTypes.find((at: AllergyTypeDetail) => at.id === allergyType1.id)
        const found2 = allergyTypes.find((at: AllergyTypeDetail) => at.id === allergyType2.id)

        expect(found1).toBeDefined()
        expect(found2).toBeDefined()
        expect(found1!.name).toBe(allergyType1.name)
        expect(found2!.name).toBe(allergyType2.name)
    })

    test('GIVEN allergy type exists WHEN updating THEN updates successfully', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create allergy type
        const original = await AllergyFactory.createAllergyType(context)
        createdAllergyTypeIds.push(original.id)

        // WHEN: Update allergy type
        const updateData = {
            name: 'Updated Peanuts',
            description: 'Updated description for severe peanut allergy',
            icon: '🥜🚫'
        }
        const updated = await AllergyFactory.updateAllergyType(context, original.id, updateData)

        // THEN: Verify updates
        expect(updated.id).toBe(original.id)
        expect(updated.name).toBe(updateData.name)
        expect(updated.description).toBe(updateData.description)
        expect(updated.icon).toBe(updateData.icon)

        // Verify via GET to ensure persistence
        const fetched = await AllergyFactory.getAllergyType(context, original.id)
        expect(fetched).not.toBeNull()
        expect(fetched!.name).toBe(updateData.name)
        expect(fetched!.description).toBe(updateData.description)
    })

    test('GIVEN allergy type exists WHEN deleting THEN deletes successfully, and a removed allergy type answers 404', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create allergy type
        const created = await AllergyFactory.createAllergyType(context)
        createdAllergyTypeIds.push(created.id)

        // WHEN: Delete allergy type
        const deleted = await AllergyFactory.deleteAllergyType(context, created.id)

        // THEN: Verify deletion
        expect(deleted).not.toBeNull()
        expect(deleted!.id).toBe(created.id)

        // Verify it no longer exists (should return 404)
        await AllergyFactory.getAllergyType(context, created.id, 404)
    })

    test('GIVEN allergy type with optional icon omitted WHEN creating THEN creates successfully', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // WHEN: Create allergy type without icon (explicitly set to undefined to override default)
        const allergyTypeData = {
            name: 'Lactose (no icon)',
            description: 'Lactose intolerance without icon',
            icon: undefined
        }
        const created = await AllergyFactory.createAllergyType(context, allergyTypeData)
        createdAllergyTypeIds.push(created.id)

        // THEN: Verify it was created (icon should be null or undefined in database)
        expect(created.id).toBeGreaterThan(0)
        expect(created.name).toBe(allergyTypeData.name)
        // Icon can be null or undefined when omitted
        expect(created.icon === null || created.icon === undefined).toBe(true)
    })

    test('GIVEN allergies assigned to inhabitants WHEN fetching all types THEN includes inhabitants data', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create allergy type
        const allergyType = await AllergyFactory.createAllergyType(context, {
            name: 'Test Peanuts for Inhabitants',
            description: 'Test allergy for checking inhabitants',
            icon: '🥜'
        })
        createdAllergyTypeIds.push(allergyType.id)

        // GIVEN: Create household with inhabitants (parametrized)
        const household = await HouseholdFactory.createHousehold(context)
        createdHouseholdIds.push(household.id)
        const inhabitantsData = [
            { name: 'TestPerson1', comment: 'Severe allergy' },
            { name: 'TestPerson2', comment: 'Mild reaction' }
        ]

        const inhabitants = await Promise.all(
            inhabitantsData.map(data =>
                HouseholdFactory.createInhabitantForHousehold(context, household.id, data.name)
            )
        )

        // GIVEN: Assign allergies to inhabitants (parametrized)
        await Promise.all(
            inhabitants.map((inhabitant, index) =>
                AllergyFactory.createAllergy(context, {
                    inhabitantId: inhabitant.id,
                    allergyTypeId: allergyType.id,
                    inhabitantComment: inhabitantsData[index]!.comment
                })
            )
        )

        // WHEN: Fetch all allergy types
        const allergyTypes = await AllergyFactory.getAllergyTypes(context)

        // THEN: Find our allergy type and verify structure
        const found = allergyTypes.find((at: AllergyTypeDetail) => at.id === allergyType.id)
        expect(found).toBeDefined()
        expect(found!.inhabitants).toBeDefined()
        expect(Array.isArray(found!.inhabitants)).toBe(true)
        expect(found!.inhabitants!.length).toBe(2)

        // Verify each inhabitant (parametrized)
        inhabitants.forEach((inhabitant, index) => {
            const foundInhabitant = found!.inhabitants!.find((i) => i.id === inhabitant.id)
            expect(foundInhabitant).toBeDefined()
            expect(foundInhabitant!.name).toBe(inhabitantsData[index]!.name)
            expect(foundInhabitant!.householdId).toBe(household.id)
            expect(foundInhabitant!.inhabitantComment).toBe(inhabitantsData[index]!.comment)
            expect(foundInhabitant!.allergyUpdatedAt).toBeDefined()
            expect(new Date(foundInhabitant!.allergyUpdatedAt!).getTime()).not.toBeNaN()
        })
    })
})

test.describe('AllergyType API - Validation', () => {

    // One 400 for the endpoint; the schema's field rules are proven in the useAllergyValidation unit spec
    test('GIVEN invalid data (empty name) WHEN creating THEN returns 400', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // WHEN: Try to create with empty name
        const response = await context.request.put('/api/admin/allergy-type', {
            headers: testHelpers.headers,
            data: {
                name: '',
                description: 'Test description'
            }
        })

        // THEN: Should fail validation
        expect(response.status()).toBe(400)
    })

    test('GIVEN invalid ID (negative) WHEN fetching THEN returns 400', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // WHEN: Try to fetch with invalid ID
        const response = await context.request.get('/api/admin/allergy-type/-1')

        // THEN: Should fail validation
        expect(response.status()).toBe(400)
    })
})

// Cleanup after all tests: a household cascades to its inhabitants and their allergies (ADR-005)
test.afterAll(async ({browser}) => {
    const context = await validatedBrowserContext(browser)
    await HouseholdFactory.deleteHousehold(context, createdHouseholdIds)
    await AllergyFactory.cleanupAllergyTypes(context, createdAllergyTypeIds)
})
