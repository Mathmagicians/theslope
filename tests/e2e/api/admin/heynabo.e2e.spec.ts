import {test, expect} from '@playwright/test'
import testHelpers from '../../testHelpers'
import {useHeynaboValidation} from '~/composables/useHeynaboValidation'
import {isAdmin, isAllergyManager} from '~/composables/usePermissions'
import type {UserDisplay, InhabitantDisplay} from '~/composables/useCoreValidation'
import {HouseholdFactory} from '../../testDataFactories/householdFactory'

const {validatedBrowserContext, saltedId, headers} = testHelpers
const {HeynaboImportResponseSchema} = useHeynaboValidation()

/**
 * Heynabo Import E2E Tests
 *
 * Tests the 3-layer reconciliation (Household → Inhabitant → User) with 4 outcomes each:
 * - CREATE: Tested via initial import (populates DB from Heynabo)
 * - UPDATE: Mutate TheSlope data to differ from Heynabo → verify Heynabo overwrites
 * - IDEMPOTENT: TheSlope-owned fields preserved when Heynabo data unchanged
 * - DELETE: Add entities not in Heynabo → verify deleted
 *
 * Coverage Matrix:
 * | Entity      | IDEMPOTENT              | UPDATE               | DELETE         | CREATE       |
 * |-------------|-------------------------|----------------------|----------------|--------------|
 * | Household   | pbsId, movedInDate      | name restored        | Fake deleted   | Initial sync |
 * | Inhabitant  | Skraaningen unchanged   | Babyyoda name        | Fake deleted   | Initial sync |
 * | User        | ALLERGYMANAGER role     | phone restored       | Orphan deleted | Initial sync |
 *
 * Test Flow:
 * 1. beforeAll: Run initial Heynabo import (CREATE - populates DB from clean state)
 * 2. beforeAll: Mutate data to test UPDATE/DELETE/IDEMPOTENT
 * 3. Test 1: Run second import → verify reconciliation works
 * 4. Test 2: Run third import → verify idempotency (no changes)
 *
 * Test household: heynaboId=2 ("Heynabo!") from Heynabo API
 * Inhabitants:
 * - heynaboId=153 (Skraaningen API) - has User with ADMIN+ALLERGYMANAGER
 * - heynaboId=154 (Babyyoda Yoda) - limited role, no user in Heynabo
 */

const TEST_HOUSEHOLD_HEYNABO_ID = 2
const SEED_USER_EMAIL = 'agata@mathmagicians.dk'

// Inhabitants in test household (from Heynabo API)
// Note: name = firstName from Heynabo (lastName is separate field)
const INHABITANTS = {
    SKRAANINGEN: {heynaboId: 153, hasUser: true, name: 'Skraaningen'},
    BABYYODA: {heynaboId: 154, hasUser: false, name: 'Babyyoda'}
}

// Test data containers - populated in beforeAll, verified in tests
const testData = {
    householdId: 0,

    // ========================================================================
    // HOUSEHOLD TEST DATA
    // ========================================================================
    household: {
        // IDEMPOTENT: TheSlope-owned fields preserved
        uniquePbsId: 0,
        uniqueMovedInDate: new Date(),
        // UPDATE: Heynabo-owned field mutated, should be restored
        originalName: '',
        mutatedName: '',
        // DELETE: Fake household not in Heynabo
        fakeId: 0
    },

    // ========================================================================
    // INHABITANT TEST DATA
    // ========================================================================
    inhabitant: {
        // IDEMPOTENT: Skraaningen should remain unchanged
        skraaningenId: 0,
        // UPDATE: Babyyoda name mutated, should be restored
        babyyodaId: 0,
        babyyodaMutatedName: '',
        // DELETE: Fake inhabitant not in Heynabo
        fakeId: 0
    },

    // ========================================================================
    // USER TEST DATA
    // ========================================================================
    user: {
        // IDEMPOTENT: ALLERGYMANAGER role preserved (TheSlope-owned)
        seedUserEmail: SEED_USER_EMAIL,
        // UPDATE: Heynabo-owned field (phone) mutated, should be restored
        seedUserOriginalPhone: '',
        seedUserMutatedPhone: '+4599999999',
        // DELETE: User on limited-role inhabitant
        orphanId: 0,
        orphanEmail: ''
    }
}

// Serial: Heynabo import reconciles and DELETES all data not in Heynabo - would break parallel tests
test.describe.serial('Heynabo Integration API', () => {

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = Date.now().toString()

        // ========================================================================
        // STEP 1: Run initial Heynabo import (CREATE - populates DB from Heynabo)
        // In CI the DB is clean, so we need to import first to get all entities
        // ========================================================================
        const initialImport = await context.request.get('/api/admin/heynabo/import')
        expect(initialImport.status(), 'Initial Heynabo import must succeed').toBe(200)

        // ========================================================================
        // STEP 2: Find test household (now exists after import)
        // ========================================================================
        const households = await HouseholdFactory.getAllHouseholds(context)
        const household = households.find(h => h.heynaboId === TEST_HOUSEHOLD_HEYNABO_ID)
        expect(household, `Test household heynaboId=${TEST_HOUSEHOLD_HEYNABO_ID} must exist after import`).toBeDefined()
        testData.householdId = household!.id

        const householdDetail = await HouseholdFactory.getHouseholdById(context, testData.householdId)
        expect(householdDetail, 'Household detail must exist').not.toBeNull()

        // ========================================================================
        // STEP 3: HOUSEHOLD MUTATIONS (for UPDATE/DELETE/IDEMPOTENT tests)
        // ========================================================================

        // IDEMPOTENT: Set unique TheSlope-owned fields
        testData.household.uniquePbsId = saltedId(999000, testSalt)
        testData.household.uniqueMovedInDate = new Date('2010-05-15')

        // UPDATE: Mutate Heynabo-owned field (name)
        testData.household.originalName = household!.name
        testData.household.mutatedName = `Mutated-Household-${testSalt}`

        await HouseholdFactory.updateHousehold(context, testData.householdId, {
            pbsId: testData.household.uniquePbsId,
            movedInDate: testData.household.uniqueMovedInDate,
            name: testData.household.mutatedName
        })

        // DELETE: Create fake household not in Heynabo
        const fakeHousehold = await HouseholdFactory.createHousehold(context, {
            heynaboId: saltedId(888000, testSalt),
            pbsId: saltedId(888001, testSalt),
            name: `FakeHousehold-${testSalt}`,
            address: `Fake Address ${testSalt}`,
            movedInDate: new Date('2020-01-01')
        })
        testData.household.fakeId = fakeHousehold.id

        // ========================================================================
        // STEP 4: INHABITANT MUTATIONS
        // ========================================================================

        // IDEMPOTENT: Record Skraaningen's ID
        const skraaningen = householdDetail!.inhabitants.find(i => i.heynaboId === INHABITANTS.SKRAANINGEN.heynaboId)
        expect(skraaningen, 'Skraaningen must exist after import').toBeDefined()
        testData.inhabitant.skraaningenId = skraaningen!.id

        // UPDATE: Mutate Babyyoda's name (Babyyoda now exists after import)
        const babyyoda = householdDetail!.inhabitants.find(i => i.heynaboId === INHABITANTS.BABYYODA.heynaboId)
        expect(babyyoda, 'Babyyoda must exist after import').toBeDefined()
        testData.inhabitant.babyyodaId = babyyoda!.id
        testData.inhabitant.babyyodaMutatedName = `Mutated-Babyyoda-${testSalt}`
        await HouseholdFactory.updateInhabitant(context, babyyoda!.id, {
            name: testData.inhabitant.babyyodaMutatedName
        })

        // DELETE: Create fake inhabitant not in Heynabo
        const fakeInhabitant = await HouseholdFactory.createInhabitantForHousehold(
            context, testData.householdId, `FakeInhabitant-${testSalt}`
        )
        testData.inhabitant.fakeId = fakeInhabitant.id

        // ========================================================================
        // STEP 5: USER MUTATIONS
        // ========================================================================

        // IDEMPOTENT + UPDATE: Get seed user and mutate phone
        const usersResponse = await context.request.get('/api/admin/users')
        const users: UserDisplay[] = await usersResponse.json()
        const seedUser = users.find(u => u.email === SEED_USER_EMAIL)
        expect(seedUser, 'Seed user must exist after import').toBeDefined()
        testData.user.seedUserOriginalPhone = seedUser!.phone || ''

        // Mutate phone (Heynabo-owned field)
        await context.request.post(`/api/admin/users/${seedUser!.id}`, {
            headers,
            data: {phone: testData.user.seedUserMutatedPhone}
        })

        // DELETE: Create orphan user on limited-role inhabitant
        testData.user.orphanEmail = `orphan-${testSalt}@test.dk`
        const userResponse = await context.request.put('/api/admin/users', {
            headers,
            data: {
                email: testData.user.orphanEmail,
                phone: '+4512345678',
                passwordHash: 'test',
                systemRoles: []
            }
        })
        expect(userResponse.status()).toBe(201)
        const orphanUser = await userResponse.json()
        testData.user.orphanId = orphanUser.id

        // Link orphan user to Babyyoda (limited role in Heynabo = no user)
        await HouseholdFactory.updateInhabitant(context, babyyoda!.id, {userId: orphanUser.id})
    })

    test('should reconcile mutations from Heynabo (UPDATE/DELETE/IDEMPOTENT)', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Run reconciliation import (second import - after mutations)
        const response = await context.request.get('/api/admin/heynabo/import')
        const responseBody = await response.text()
        expect(response.status(), `Import failed: ${responseBody}`).toBe(200)

        const result = HeynaboImportResponseSchema.parse(JSON.parse(responseBody))

        // Verify import ran delete operations
        expect(result.householdsDeleted, 'DELETE: At least fake household deleted').toBeGreaterThanOrEqual(1)
        expect(result.inhabitantsDeleted, 'DELETE: At least fake inhabitant deleted').toBeGreaterThanOrEqual(1)
        expect(result.usersDeleted, 'DELETE: At least orphan user deleted').toBeGreaterThanOrEqual(1)
        expect(result.sanityCheck.passed).toBe(true)

        // Verify our specific test items were deleted via direct API checks
        const fakeHouseholdResponse = await context.request.get(`/api/admin/household/${testData.household.fakeId}`)
        expect(fakeHouseholdResponse.status(), 'DELETE: Fake household deleted (404)').toBe(404)

        const fakeInhabitantResponse = await context.request.get(`/api/admin/household/inhabitants/${testData.inhabitant.fakeId}`)
        expect(fakeInhabitantResponse.status(), 'DELETE: Fake inhabitant deleted (404)').toBe(404)

        const orphanUserResponse = await context.request.get(`/api/admin/users/${testData.user.orphanId}`)
        expect(orphanUserResponse.status(), 'DELETE: Orphan user deleted (404)').toBe(404)

        // Fetch post-import data
        const households = await HouseholdFactory.getAllHouseholds(context)
        const household = households.find(h => h.id === testData.householdId)
        expect(household).toBeDefined()

        const householdDetail = await HouseholdFactory.getHouseholdById(context, testData.householdId)

        const usersResponse = await context.request.get('/api/admin/users')
        const users: UserDisplay[] = await usersResponse.json()

        // ========================================================================
        // HOUSEHOLD ASSERTIONS
        // ========================================================================

        // IDEMPOTENT: TheSlope-owned fields preserved
        expect(household!.pbsId, 'Household: pbsId preserved (TheSlope-owned)').toBe(testData.household.uniquePbsId)
        expect(
            new Date(household!.movedInDate).toISOString().slice(0, 10),
            'Household: movedInDate preserved (TheSlope-owned)'
        ).toBe(testData.household.uniqueMovedInDate.toISOString().slice(0, 10))

        // UPDATE: Heynabo-owned field restored
        expect(household!.name, 'Household: name restored from Heynabo').not.toBe(testData.household.mutatedName)
        expect(household!.name, 'Household: name matches original').toBe(testData.household.originalName)

        // DELETE: Fake household removed
        const fakeHouseholdExists = households.some(h => h.id === testData.household.fakeId)
        expect(fakeHouseholdExists, 'Household: Fake household deleted').toBe(false)

        // ========================================================================
        // INHABITANT ASSERTIONS
        // ========================================================================

        // IDEMPOTENT: Skraaningen unchanged
        const skraaningen = householdDetail!.inhabitants.find(
            (i: InhabitantDisplay) => i.heynaboId === INHABITANTS.SKRAANINGEN.heynaboId
        )
        expect(skraaningen, 'Inhabitant: Skraaningen exists').toBeDefined()
        expect(skraaningen!.name, 'Inhabitant: Skraaningen name unchanged').toBe(INHABITANTS.SKRAANINGEN.name)

        // UPDATE: Babyyoda name restored
        const babyyoda = householdDetail!.inhabitants.find(
            (i: InhabitantDisplay) => i.heynaboId === INHABITANTS.BABYYODA.heynaboId
        )
        expect(babyyoda, 'Inhabitant: Babyyoda exists').toBeDefined()
        expect(babyyoda!.name, 'Inhabitant: Babyyoda name restored').not.toBe(testData.inhabitant.babyyodaMutatedName)
        expect(babyyoda!.name, 'Inhabitant: Babyyoda name matches Heynabo').toBe(INHABITANTS.BABYYODA.name)

        // DELETE: Fake inhabitant removed
        const fakeExists = householdDetail!.inhabitants.some(
            (i: InhabitantDisplay) => i.id === testData.inhabitant.fakeId
        )
        expect(fakeExists, 'Inhabitant: Fake inhabitant deleted').toBe(false)

        // ========================================================================
        // USER ASSERTIONS
        // ========================================================================

        // IDEMPOTENT: ALLERGYMANAGER role preserved (TheSlope-owned)
        const seedUser = users.find(u => u.email === testData.user.seedUserEmail)
        expect(seedUser, 'User: Seed user exists').toBeDefined()
        expect(isAdmin(seedUser!), 'User: Seed user has ADMIN').toBe(true)
        expect(isAllergyManager(seedUser!), 'User: ALLERGYMANAGER preserved (TheSlope-owned)').toBe(true)

        // UPDATE: Heynabo-owned field (phone) restored
        expect(seedUser!.phone, 'User: phone restored from Heynabo').not.toBe(testData.user.seedUserMutatedPhone)
        expect(seedUser!.phone, 'User: phone matches original').toBe(testData.user.seedUserOriginalPhone)

        // DELETE: Orphan user removed
        const orphanUser = users.find(u => u.email === testData.user.orphanEmail)
        expect(orphanUser, 'User: Orphan user deleted').toBeUndefined()

        // Verify Babyyoda has no user (limited role in Heynabo)
        expect(babyyoda!.userId, 'User: Babyyoda has no user (limited role)').toBeNull()

        // Sanity check passed
        expect(result.sanityCheck.passed, `Orphans found: ${JSON.stringify(result.sanityCheck.orphanUsers)}`).toBe(true)
    })

    test('should be idempotent (third import has no changes)', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Run idempotency import (third import - no mutations since last import)
        const response = await context.request.get('/api/admin/heynabo/import')
        const responseBody = await response.text()
        expect(response.status(), `Import failed: ${responseBody}`).toBe(200)

        const result = HeynaboImportResponseSchema.parse(JSON.parse(responseBody))

        // IDEMPOTENCY: No changes should occur
        expect(result.householdsDeleted, 'IDEMPOTENT: No households deleted').toBe(0)
        expect(result.householdsCreated, 'IDEMPOTENT: No households created').toBe(0)
        expect(result.inhabitantsDeleted, 'IDEMPOTENT: No inhabitants deleted').toBe(0)
        expect(result.inhabitantsCreated, 'IDEMPOTENT: No inhabitants created').toBe(0)
        expect(result.usersDeleted, 'IDEMPOTENT: No users deleted').toBe(0)
        expect(result.usersCreated, 'IDEMPOTENT: No users created').toBe(0)
        expect(result.sanityCheck.passed, 'IDEMPOTENT: Sanity check passed').toBe(true)
    })
})
