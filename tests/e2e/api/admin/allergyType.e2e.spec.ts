import {test, expect} from '@playwright/test'
import {AllergyFactory} from '../../testDataFactories/allergyFactory'
import testHelpers from '../../testHelpers'

const {validatedBrowserContext} = testHelpers

// Variables to store IDs for cleanup
let createdAllergyTypeIds: number[] = []

test.describe('AllergyType API - CRUD Operations', () => {

    test('GIVEN valid allergy type data WHEN creating THEN allergy type is created', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // WHEN: Create allergy type
        const allergyTypeData = AllergyFactory.defaultAllergyTypeData()
        const created = await AllergyFactory.createAllergyType(context, allergyTypeData)

        // Save ID for cleanup
        createdAllergyTypeIds.push(created.id)

        // THEN: Verify response
        expect(created).toHaveProperty('id')
        expect(created.id).toBeGreaterThan(0)
        expect(created.name).toBe(allergyTypeData.name)
        expect(created.description).toBe(allergyTypeData.description)
        expect(created.icon).toBe(allergyTypeData.icon)
    })

    test('GIVEN allergy type exists WHEN fetching by ID THEN returns correct allergy type', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create allergy type
        const allergyTypeData = AllergyFactory.defaultAllergyTypeData()
        const created = await AllergyFactory.createAllergyType(context, allergyTypeData)
        createdAllergyTypeIds.push(created.id)

        // WHEN: Fetch by ID
        const fetched = await AllergyFactory.getAllergyType(context, created.id)

        // THEN: Verify it matches
        expect(fetched.id).toBe(created.id)
        expect(fetched.name).toBe(allergyTypeData.name)
        expect(fetched.description).toBe(allergyTypeData.description)
        expect(fetched.icon).toBe(allergyTypeData.icon)
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

        const found1 = allergyTypes.find((at: any) => at.id === allergyType1.id)
        const found2 = allergyTypes.find((at: any) => at.id === allergyType2.id)

        expect(found1).toBeTruthy()
        expect(found2).toBeTruthy()
        expect(found1.name).toBe(allergyType1.name)
        expect(found2.name).toBe(allergyType2.name)
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
        expect(fetched.name).toBe(updateData.name)
        expect(fetched.description).toBe(updateData.description)
    })

    test('GIVEN allergy type exists WHEN deleting THEN deletes successfully', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create allergy type
        const created = await AllergyFactory.createAllergyType(context)
        createdAllergyTypeIds.push(created.id)

        // WHEN: Delete allergy type
        const deleted = await AllergyFactory.deleteAllergyType(context, created.id)

        // THEN: Verify deletion
        expect(deleted.id).toBe(created.id)

        // Verify it no longer exists (should return 404)
        const response = await context.request.get(`/api/admin/allergy-type/${created.id}`)
        expect(response.status()).toBe(404)

        // Remove from cleanup list since already deleted
        createdAllergyTypeIds = createdAllergyTypeIds.filter(id => id !== created.id)
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
})

test.describe('AllergyType API - Validation', () => {

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

    test('GIVEN invalid data (empty description) WHEN creating THEN returns 400', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // WHEN: Try to create with empty description
        const response = await context.request.put('/api/admin/allergy-type', {
            headers: testHelpers.headers,
            data: {
                name: 'Peanuts',
                description: ''
            }
        })

        // THEN: Should fail validation
        expect(response.status()).toBe(400)
    })

    test('GIVEN invalid data (name too long) WHEN creating THEN returns 400', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // WHEN: Try to create with name > 100 chars
        const response = await context.request.put('/api/admin/allergy-type', {
            headers: testHelpers.headers,
            data: {
                name: 'a'.repeat(101),
                description: 'Test description'
            }
        })

        // THEN: Should fail validation
        expect(response.status()).toBe(400)
    })

    test('GIVEN invalid data (description too long) WHEN creating THEN returns 400', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // WHEN: Try to create with description > 500 chars
        const response = await context.request.put('/api/admin/allergy-type', {
            headers: testHelpers.headers,
            data: {
                name: 'Peanuts',
                description: 'a'.repeat(501)
            }
        })

        // THEN: Should fail validation
        expect(response.status()).toBe(400)
    })

    test('GIVEN non-existent ID WHEN fetching THEN returns 404', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // WHEN: Try to fetch non-existent allergy type
        const response = await context.request.get('/api/admin/allergy-type/999999')

        // THEN: Should return 404
        expect(response.status()).toBe(404)
    })

    test('GIVEN invalid ID (negative) WHEN fetching THEN returns 400', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // WHEN: Try to fetch with invalid ID
        const response = await context.request.get('/api/admin/allergy-type/-1')

        // THEN: Should fail validation
        expect(response.status()).toBe(400)
    })
})

// Cleanup after all tests
test.afterAll(async ({browser}) => {
    if (createdAllergyTypeIds.length > 0) {
        const context = await validatedBrowserContext(browser)
        await AllergyFactory.cleanupAllergyTypes(context, createdAllergyTypeIds)
    }
})
