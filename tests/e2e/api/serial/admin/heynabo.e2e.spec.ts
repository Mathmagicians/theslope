import {test, expect} from '@playwright/test'
import testHelpers from '~~/tests/e2e/testHelpers'
import {useHeynaboValidation} from '~/composables/useHeynaboValidation'
import {isAdmin, isAllergyManager} from '~/composables/usePermissions'
import type {UserDisplay, InhabitantDisplay, HouseholdDetail} from '~/composables/useCoreValidation'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'

const {validatedBrowserContext, saltedId, salt, headers} = testHelpers
const {HeynaboImportResponseSchema} = useHeynaboValidation()

/**
 * Heynabo Import E2E Tests
 *
 * Tests the 3-layer reconciliation (Household → Inhabitant → User) with 4 outcomes each:
 * - CREATE: Delete households from DB → verify recreated from Heynabo
 * - UPDATE: Mutate TheSlope data to differ from Heynabo → verify Heynabo overwrites
 * - IDEMPOTENT: TheSlope-owned fields preserved when Heynabo data unchanged
 * - DELETE: Add entities not in Heynabo → verify deleted
 *
 * Coverage Matrix:
 * | Entity      | CREATE                  | UPDATE               | IDEMPOTENT              | DELETE         |
 * |-------------|-------------------------|----------------------|-------------------------|----------------|
 * | Household   | heynaboId 4,28 recreated| name restored        | pbsId, movedInDate      | Fake deleted   |
 * | Inhabitant  | With households 4,28    | Babyyoda name        | Skraaningen unchanged   | Fake deleted   |
 * | User        | With households 4,28    | phone restored       | ALLERGYMANAGER role     | Orphan deleted |
 *
 * Test Flow:
 * - beforeAll: Run 1 (init) → Mutations → Run 2 (reconciliation)
 * - Test 1: Verify reconciliation (CREATE/UPDATE/DELETE/IDEMPOTENT)
 * - Test 2: Run 3 → verify idempotency (all counts = 0)
 *
 * Test household: heynaboId=2 ("Heynabo!") from Heynabo API
 * Inhabitants:
 * - heynaboId=153 (Skraaningen API) - has User with ADMIN+ALLERGYMANAGER
 * - heynaboId=154 (Babyyoda Yoda) - limited role, no user in Heynabo
 */

const TEST_HOUSEHOLD_HEYNABO_ID = 2
const TEST_HOUSEHOLD_PBS_ID = 2 // Seed pbsId (unique, TheSlope-owned)
const SEED_USER_EMAIL = 'agata@mathmagicians.dk'

// Inhabitants in test household (from Heynabo API)
// Note: name = firstName from Heynabo (lastName is separate field)
const INHABITANTS = {
    SKRAANINGEN: {heynaboId: 153, hasUser: true, name: 'Skraaningen'},
    BABYYODA: {heynaboId: 154, hasUser: false, name: 'Babyyoda'}
}

// ========================================================================
// RECREATE TEST - Households to delete and verify recreation from Heynabo
// Only heynaboIds are stable keys - all other data comes from Heynabo
// ========================================================================
const RECREATE_HOUSEHOLD_HEYNABO_IDS = [4, 28]

// Cleanup arrays - populated during setup, cleaned in afterAll
const createdHouseholdIds: number[] = []
const createdUserIds: number[] = []

// Test data containers - populated in beforeAll, verified in tests
const testData = {
    householdId: 0,

    // Run 2 reconciliation result - stored for Test 1 assertions
    reconciliationResult: null as null | {
        householdsCreated: number
        householdsUpdated: number
        householdsIdempotent: number
        householdsDeleted: number
        inhabitantsCreated: number
        inhabitantsUpdated: number
        inhabitantsIdempotent: number
        inhabitantsDeleted: number
        usersCreated: number
        usersUpdated: number
        usersIdempotent: number
        usersDeleted: number
        usersLinked: number
        sanityCheck: {
            passed: boolean
            orphanUsers: unknown[]
            householdsInDb: number
            householdsInHeynabo: number
            householdsMismatch: boolean
            inhabitantsInDb: number
            inhabitantsInHeynabo: number
            inhabitantsMismatch: boolean
            usersInDb: number
            usersInHeynabo: number
            usersMismatch: boolean
        }
    },

    // ========================================================================
    // HOUSEHOLD TEST DATA
    // ========================================================================
    household: {
        // IDEMPOTENT: Households at test address captured before import — TheSlope-owned fields must survive
        beforeImport: [] as HouseholdDetail[],
        // Heynabo's address — captured after initial import, before mutations
        heynaboAddress: '',
        // UPDATE: Heynabo-owned field mutated, should be restored
        originalName: '',
        mutatedName: '',
        // DELETE: Fake household not in Heynabo
        fakeId: 0,
        // CREATE: Ids of deleted households, keyed by heynaboId — verify recreation produces new ids
        deletedIdsByHeynaboId: new Map<number, number>()
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
        const initialResult = HeynaboImportResponseSchema.parse(await initialImport.json())

        // Seed household (heynaboId=2) should be UPDATE or IDEMPOTENT, never deleted+recreated
        expect(initialResult.householdsDeleted, 'Initial import: seed household must not be deleted').toBe(0)

        // ========================================================================
        // STEP 2: Find test household (now exists after import)
        // ========================================================================
        const households = await HouseholdFactory.getAllHouseholds(context)
        const household = households.find(h => h.pbsId === TEST_HOUSEHOLD_PBS_ID)
        expect(household, `Test household pbsId=${TEST_HOUSEHOLD_PBS_ID} must exist after import. Got pbsIds: ${households.map(h => h.pbsId).join(',')}`).toBeDefined()
        testData.householdId = household!.id
        testData.household.heynaboAddress = household!.address

        const householdDetail = await HouseholdFactory.getHouseholdById(context, testData.householdId)
        expect(householdDetail, 'Household detail must exist').not.toBeNull()

        // ========================================================================
        // STEP 2b: Create moved-out sibling at same heynaboId (multi-household scenario)
        // ========================================================================
        const sibling = await HouseholdFactory.createHousehold(context, {
            heynaboId: TEST_HOUSEHOLD_HEYNABO_ID,
            pbsId: saltedId(800000, testSalt),
            name: salt('Sibling Leaving', testSalt),
            address: household!.address,
            movedInDate: new Date('2018-01-01'),
            moveOutDate: new Date('2026-06-01')
        })
        createdHouseholdIds.push(sibling.id)

        // Mutate sibling's address — import should broadcast Heynabo's address to ALL households at this heynaboId
        await HouseholdFactory.updateHousehold(context, sibling.id, {
            address: `Wrong Address ${testSalt}`
        }, 200, true)

        // Capture both households before reconciliation import — TheSlope-owned fields must survive
        testData.household.beforeImport = [
            (await HouseholdFactory.getHouseholdById(context, testData.householdId))!,
            (await HouseholdFactory.getHouseholdById(context, sibling.id))!
        ]

        // ========================================================================
        // STEP 3: HOUSEHOLD MUTATIONS (for UPDATE/DELETE/IDEMPOTENT tests)
        // ========================================================================

        // UPDATE: Mutate Heynabo-owned field (name) — import should restore it
        testData.household.originalName = household!.name
        testData.household.mutatedName = `Mutated-Household-${testSalt}`

        await HouseholdFactory.updateHousehold(context, testData.householdId, {
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
        createdHouseholdIds.push(fakeHousehold.id)

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
        createdUserIds.push(orphanUser.id)

        // Link orphan user to Babyyoda (limited role in Heynabo = no user)
        await HouseholdFactory.updateInhabitant(context, babyyoda!.id, {userId: orphanUser.id})

        // CREATE: Delete households to verify recreation from Heynabo
        // Record ids before deletion so we can verify recreation (new id) after import
        const householdsBeforeDelete = await HouseholdFactory.getAllHouseholds(context)
        const deletedIdsByHeynaboId = new Map<number, number>()
        for (const heynaboId of RECREATE_HOUSEHOLD_HEYNABO_IDS) {
            const household = householdsBeforeDelete.find(h => h.heynaboId === heynaboId)
            if (household) {
                deletedIdsByHeynaboId.set(heynaboId, household.id)
                await context.request.delete(`/api/admin/household/${household.id}`)
            }
        }
        testData.household.deletedIdsByHeynaboId = deletedIdsByHeynaboId

        // Run 2: Reconciliation import
        const reconciliationImport = await context.request.get('/api/admin/heynabo/import')
        expect(reconciliationImport.status(), 'Reconciliation import must succeed').toBe(200)
        testData.reconciliationResult = HeynaboImportResponseSchema.parse(await reconciliationImport.json())
    })

    test('should reconcile mutations from Heynabo (CREATE/UPDATE/DELETE/IDEMPOTENT)', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const result = testData.reconciliationResult!

        // Verify reconciliation counts
        expect(result.householdsCreated, 'CREATE: Deleted households recreated').toBeGreaterThanOrEqual(RECREATE_HOUSEHOLD_HEYNABO_IDS.length)
        expect(result.householdsDeleted, 'DELETE: Fake household deleted').toBeGreaterThanOrEqual(1)
        expect(result.inhabitantsDeleted, 'DELETE: Fake inhabitant deleted').toBeGreaterThanOrEqual(1)
        expect(result.usersDeleted, 'DELETE: Orphan user deleted').toBeGreaterThanOrEqual(1)
        expect(result.sanityCheck.passed, 'Sanity check passed').toBe(true)

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

        // CREATE: Deleted households recreated from Heynabo (new id, different from deleted)
        for (const heynaboId of RECREATE_HOUSEHOLD_HEYNABO_IDS) {
            const recreated = households.find(h => h.heynaboId === heynaboId)
            expect(recreated, `CREATE: Household heynaboId=${heynaboId} recreated`).toBeDefined()
            const deletedId = testData.household.deletedIdsByHeynaboId.get(heynaboId)
            expect(recreated!.id, `CREATE: Household heynaboId=${heynaboId} has new id (was ${deletedId})`).not.toBe(deletedId)
        }

        // MULTI-HOUSEHOLD: For ALL households at same heynaboId:
        // - TheSlope-owned fields (pbsId, movedInDate, moveOutDate) preserved
        // - Heynabo-owned fields (address) broadcast-updated to match Heynabo
        for (const before of testData.household.beforeImport) {
            const after = await HouseholdFactory.getHouseholdById(context, before.id)
            expect(after, `Household ${before.id}: still exists after import`).not.toBeNull()
            // TheSlope-owned fields preserved
            expect(after!.pbsId, `Household ${before.id}: pbsId preserved`).toBe(before.pbsId)
            expect(new Date(after!.movedInDate).toISOString().slice(0, 10), `Household ${before.id}: movedInDate preserved`)
                .toBe(new Date(before.movedInDate).toISOString().slice(0, 10))
            expect(after!.moveOutDate, `Household ${before.id}: moveOutDate preserved`).toEqual(before.moveOutDate)
            // Heynabo-owned fields broadcast to all households at same address
            expect(after!.address, `Household ${before.id}: address updated from Heynabo`).toBe(testData.household.heynaboAddress)
        }

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

        // IDEMPOTENCY: All entities should be idempotent (no create/update/delete)
        expect(result.householdsIdempotent, 'IDEMPOTENT: All households idempotent').toBe(result.sanityCheck.householdsInHeynabo)
        expect(result.householdsCreated, 'IDEMPOTENT: No households created').toBe(0)
        expect(result.householdsUpdated, 'IDEMPOTENT: No households updated').toBe(0)
        expect(result.householdsDeleted, 'IDEMPOTENT: No households deleted').toBe(0)
        expect(result.inhabitantsIdempotent, 'IDEMPOTENT: All inhabitants idempotent').toBe(result.sanityCheck.inhabitantsInHeynabo)
        expect(result.inhabitantsCreated, 'IDEMPOTENT: No inhabitants created').toBe(0)
        expect(result.inhabitantsUpdated, 'IDEMPOTENT: No inhabitants updated').toBe(0)
        expect(result.inhabitantsDeleted, 'IDEMPOTENT: No inhabitants deleted').toBe(0)
        expect(result.usersIdempotent, 'IDEMPOTENT: All users idempotent').toBe(result.sanityCheck.usersInHeynabo)
        expect(result.usersCreated, 'IDEMPOTENT: No users created').toBe(0)
        expect(result.usersUpdated, 'IDEMPOTENT: No users updated').toBe(0)
        expect(result.usersDeleted, 'IDEMPOTENT: No users deleted').toBe(0)
        expect(result.sanityCheck.passed, 'IDEMPOTENT: Sanity check passed').toBe(true)
    })

    test('should route recreated inhabitant to active household, not sibling', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Delete Babyyoda from seed household
        await HouseholdFactory.deleteInhabitant(context, testData.inhabitant.babyyodaId)

        // Run import — Heynabo still has Babyyoda at heynaboId=2
        const result = await HouseholdFactory.runHeynaboImport(context)
        expect(result.inhabitantsCreated, 'Babyyoda recreated').toBeGreaterThanOrEqual(1)

        // Babyyoda must be on the seed household (active, no moveOutDate), not the sibling
        const seedHousehold = await HouseholdFactory.getHouseholdById(context, testData.householdId)
        const babyyoda = seedHousehold!.inhabitants.find(
            (i: InhabitantDisplay) => i.heynaboId === INHABITANTS.BABYYODA.heynaboId
        )
        expect(babyyoda, 'ROUTING: Babyyoda recreated on active household').toBeDefined()

        // Sibling must NOT have Babyyoda
        const siblingBefore = testData.household.beforeImport.find(h => h.moveOutDate !== null)!
        const siblingAfter = await HouseholdFactory.getHouseholdById(context, siblingBefore.id)
        const babyyodaOnSibling = siblingAfter!.inhabitants.find(
            (i: InhabitantDisplay) => i.heynaboId === INHABITANTS.BABYYODA.heynaboId
        )
        expect(babyyodaOnSibling, 'ROUTING: Babyyoda NOT on sibling').toBeUndefined()
    })

    test('should preserve admin-assigned household when inhabitant moved to sibling at same address', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Ensure Babyyoda is on the seed household (winner) after previous test
        const seedBefore = await HouseholdFactory.getHouseholdById(context, testData.householdId)
        const babyyoda = seedBefore!.inhabitants.find(
            (i: InhabitantDisplay) => i.heynaboId === INHABITANTS.BABYYODA.heynaboId
        )
        expect(babyyoda, 'Setup: Babyyoda exists on seed household').toBeDefined()

        // Find sibling household (same heynaboId, has moveOutDate)
        const sibling = testData.household.beforeImport.find(h => h.moveOutDate !== null)!
        expect(sibling, 'Setup: Sibling household exists').toBeDefined()

        // Admin moves Babyyoda to sibling (same address, different householdId)
        await HouseholdFactory.updateInhabitant(context, babyyoda!.id, {householdId: sibling.id})

        // Verify move happened
        const movedBabyyoda = await HouseholdFactory.getInhabitantById(context, babyyoda!.id)
        expect(movedBabyyoda!.householdId, 'Babyyoda moved to sibling').toBe(sibling.id)

        // Run HNI — Heynabo still has Babyyoda at this address
        const result = await HouseholdFactory.runHeynaboImport(context)

        // Rule 1: HNI should NOT create a duplicate (inhabitant already exists at this address)
        expect(result.inhabitantsCreated, 'No inhabitants created (Babyyoda already at address)').toBe(0)

        // Rule 2: HNI should NOT move Babyyoda back to winner (admin assignment preserved)
        const babyyodaAfter = await HouseholdFactory.getInhabitantById(context, babyyoda!.id)
        expect(babyyodaAfter!.householdId, 'Babyyoda stays in admin-assigned sibling').toBe(sibling.id)

        // Seed household should NOT have Babyyoda
        const seedAfter = await HouseholdFactory.getHouseholdById(context, testData.householdId)
        const babyyodaOnSeed = seedAfter!.inhabitants.find(
            (i: InhabitantDisplay) => i.heynaboId === INHABITANTS.BABYYODA.heynaboId
        )
        expect(babyyodaOnSeed, 'Babyyoda NOT on seed household').toBeUndefined()

        // Sibling should still have Babyyoda
        const siblingAfter = await HouseholdFactory.getHouseholdById(context, sibling.id)
        const babyyodaOnSibling = siblingAfter!.inhabitants.find(
            (i: InhabitantDisplay) => i.heynaboId === INHABITANTS.BABYYODA.heynaboId
        )
        expect(babyyodaOnSibling, 'Babyyoda still on sibling').toBeDefined()

        // Sanity: import should pass
        expect(result.sanityCheck.passed, 'Sanity check passed').toBe(true)
    })

    // Cleanup: Remove test data if tests fail before import can reconcile
    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Best-effort cleanup — entities may already be deleted by import
        await Promise.all(createdHouseholdIds.map(id =>
            HouseholdFactory.deleteHousehold(context, id).catch(() => {})
        ))
        await Promise.all(createdUserIds.map(id =>
            context.request.delete(`/api/admin/users/${id}`).catch(() => {})
        ))
    })
})
