import {test, expect, type BrowserContext} from '@playwright/test'
import testHelpers from '~~/tests/e2e/testHelpers'
import {useHeynaboValidation} from '~/composables/useHeynaboValidation'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {isInhabitantDataEqual} from '~/composables/useHeynabo'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {isAdmin, isAllergyManager} from '~/composables/usePermissions'
import type {UserDisplay, InhabitantDisplay, HouseholdDetail} from '~/composables/useCoreValidation'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'

const {validatedBrowserContext, saltedId, salt, headers} = testHelpers
const {HeynaboImportResponseSchema} = useHeynaboValidation()
const {DinnerStateSchema} = useBookingValidation()
const DinnerState = DinnerStateSchema.enum

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
const SEED_USER_EMAIL = 'agata@mathmagicians.dk' // Auth user — never mutate
const MEMBER_USER_EMAIL = 'test@mathmagicians.dk' // Non-auth seed user — safe to mutate locally

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
        // IDEMPOTENT: ALLERGYMANAGER role on agata preserved (TheSlope-owned, no mutation)
        seedUserEmail: SEED_USER_EMAIL,
        // UPDATE: Heynabo-owned fields on test@ mutated locally, should be restored from HN.
        // Email change is a regression guard: HN updating a user's email must rewrite the existing row
        // (keyed by Inhabitant.heynaboId), not create a duplicate via email-keyed upsert.
        // ALLERGYMANAGER (TheSlope-owned, granted in setup) must survive the email change.
        memberUserId: 0,
        memberUserOriginalEmail: '',
        memberUserOriginalPhone: '',
        memberUserMutatedEmail: '',
        memberUserMutatedPhone: '+4599999999',
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
        HeynaboImportResponseSchema.parse(await initialImport.json())

        // ========================================================================
        // STEP 2: Find test household (now exists after import)
        // Seed household (heynaboId=2) must survive the initial import — never deleted+recreated.
        // ========================================================================
        const households = await HouseholdFactory.getAllHouseholds(context)
        const seedAfterInitial = households.find(h => h.heynaboId === TEST_HOUSEHOLD_HEYNABO_ID)
        expect(seedAfterInitial, `Initial import preserves seed household (heynaboId=${TEST_HOUSEHOLD_HEYNABO_ID})`).toBeDefined()
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

        // UPDATE: mutate Heynabo-owned fields on the non-auth member user (test@).
        // Email mutation simulates the production regression (RoseMarie HN email change):
        // import UPDATE bucket must rewrite the existing row by id, not email-keyed upsert.
        // ALLERGYMANAGER (TS-owned, granted in same partial update) must survive the email change.
        // We do NOT mutate agata (auth user) — re-auth in this run would break.
        const usersResponse = await context.request.get('/api/admin/users')
        const users: UserDisplay[] = await usersResponse.json()
        const memberUser = users.find(u => u.email === MEMBER_USER_EMAIL)
        expect(memberUser, 'Member user must exist after import').toBeDefined()
        testData.user.memberUserId = memberUser!.id
        testData.user.memberUserOriginalEmail = memberUser!.email
        testData.user.memberUserOriginalPhone = memberUser!.phone || ''
        testData.user.memberUserMutatedEmail = `mutated-${testSalt}@old.dk`

        const mutateResponse = await context.request.post(`/api/admin/users/${memberUser!.id}`, {
            headers,
            data: {
                systemRoles: ['ALLERGYMANAGER'],
                email: testData.user.memberUserMutatedEmail,
                phone: testData.user.memberUserMutatedPhone
            }
        })
        expect(mutateResponse.status(), 'Setup precondition: admin POST accepts partial {systemRoles, email, phone}').toBe(200)

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

        // IDEMPOTENT: agata's TheSlope-owned ALLERGYMANAGER + HN-owned ADMIN preserved (no mutation)
        const agata = users.find(u => u.email === testData.user.seedUserEmail)
        expect(agata, 'Agata (auth user) row exists after import').toBeDefined()
        expect(isAdmin(agata!), 'Agata: ADMIN preserved (HN-owned)').toBe(true)
        expect(isAllergyManager(agata!), 'Agata: ALLERGYMANAGER preserved (TS-owned, idempotent)').toBe(true)

        // REGRESSION (RoseMarie bug): HN email change must update existing row by id, not duplicate.
        // Setup mutated test@'s email + phone locally, granted ALLERGYMANAGER. Import must:
        //   (a) restore HN-owned email/phone on the SAME row (no email-keyed upsert duplicate),
        //   (b) preserve TS-owned ALLERGYMANAGER across the email change.
        const memberAfter = users.find(u => u.id === testData.user.memberUserId)
        expect(memberAfter, 'test@ row preserved (id-keyed update, no duplicate)').toBeDefined()
        expect(memberAfter!.email, 'test@ email: HN value restored, mutated value overwritten')
            .toBe(testData.user.memberUserOriginalEmail)
        expect(memberAfter!.phone, 'test@ phone: HN value restored')
            .toBe(testData.user.memberUserOriginalPhone)
        expect(isAllergyManager(memberAfter!), 'test@ ALLERGYMANAGER preserved across HN email change (regression guard)')
            .toBe(true)
        expect(users.filter(u => u.email === testData.user.memberUserMutatedEmail).length,
            'No duplicate row was created with the mutated email').toBe(0)

        // DELETE: orphan user removed (Babyyoda has limited role in HN, so its linked user is purged)
        expect(users.find(u => u.email === testData.user.orphanEmail), 'Orphan user (Babyyoda link) deleted').toBeUndefined()

        // Verify Babyyoda has no user (limited role in Heynabo)
        expect(babyyoda!.userId, 'User: Babyyoda has no user (limited role)').toBeNull()

        // Sanity check passed
        expect(result.sanityCheck.passed, `Orphans found: ${JSON.stringify(result.sanityCheck.orphanUsers)}`).toBe(true)
    })

    test('should be idempotent (third import has no changes)', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const captureInhabitants = async () => {
            const households = await HouseholdFactory.getAllHouseholds(context)
            return new Map(households.flatMap(h => (h.inhabitants ?? []).map(i => [i.id, i] as const)))
        }

        const before = await captureInhabitants()

        // Run idempotency import (third import - no mutations since last import)
        const response = await context.request.get('/api/admin/heynabo/import')
        const responseBody = await response.text()
        expect(response.status(), `Import failed: ${responseBody}`).toBe(200)

        const result = HeynaboImportResponseSchema.parse(JSON.parse(responseBody))

        const after = await captureInhabitants()
        const drift = [...before.entries()]
            .map(([id, b]) => [b, after.get(id)] as const)
            .filter(([b, a]) => !a || !isInhabitantDataEqual(b, a))
        expect(drift, `Inhabitants drifted on no-op import:\n${JSON.stringify(drift, null, 2)}`).toEqual([])

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

    /**
     * When a family moves out and a new family moves in at the same address, the address
     * holds two households: the old one (with moveOutDate) and the new active one.
     *
     * Heynabo owns inhabitants and users. Deleting a person in Heynabo must delete them in
     * TheSlope, whichever of the two households at the address they belong to.
     */
    test.describe('old household at an address where a new family moved in', () => {

        const getOldHousehold = () => {
            const oldHousehold = testData.household.beforeImport.find(h => h.moveOutDate !== null)!
            expect(oldHousehold, 'Setup: old household at the address exists').toBeDefined()
            return oldHousehold
        }

        test('deletes an inhabitant of the old household when deleted in Heynabo', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const oldHousehold = getOldHousehold()

            // GIVEN: an inhabitant in the old household that Heynabo does not have
            const inhabitant = await HouseholdFactory.createInhabitantForHousehold(
                context, oldHousehold.id, `Departed-${Date.now()}`
            )
            expect(inhabitant.householdId, 'Setup: inhabitant is in the old household').toBe(oldHousehold.id)

            // WHEN: import runs
            const result = await HouseholdFactory.runHeynaboImport(context)

            // THEN: the inhabitant is gone from TheSlope
            const response = await context.request.get(`/api/admin/household/inhabitants/${inhabitant.id}`)
            expect(response.status(), 'Inhabitant deleted').toBe(404)
            expect(result.inhabitantsDeleted, 'Deletion reported in import result').toBeGreaterThanOrEqual(1)
            expect(result.sanityCheck.passed, 'No count drift between TheSlope and Heynabo').toBe(true)
        })

        test('deletes a user of the old household when deleted in Heynabo', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const oldHousehold = getOldHousehold()
            const testSalt = Date.now().toString()

            // GIVEN: an inhabitant in the old household, linked to a user, neither known to Heynabo
            const inhabitant = await HouseholdFactory.createInhabitantForHousehold(
                context, oldHousehold.id, `DepartedUser-${testSalt}`
            )
            const email = `departed-${testSalt}@test.dk`
            const userResponse = await context.request.put('/api/admin/users', {
                headers,
                data: {email, phone: '+4512345678', passwordHash: 'test', systemRoles: []}
            })
            expect(userResponse.status(), 'Setup: user created').toBe(201)
            const user = await userResponse.json()
            createdUserIds.push(user.id)
            await HouseholdFactory.updateInhabitant(context, inhabitant.id, {userId: user.id})

            // WHEN: import runs
            await HouseholdFactory.runHeynaboImport(context)

            // THEN: the user is gone from TheSlope
            const usersResponse = await context.request.get('/api/admin/users')
            const users: UserDisplay[] = await usersResponse.json()
            expect(users.find(u => u.email === email), 'User deleted').toBeUndefined()
        })
    })

    /**
     * Heynabo owns the member's address. When the member's Heynabo address differs from their
     * TheSlope address (the address of the household holding their inhabitant), the import
     * moves the SAME inhabitant row to a household at the Heynabo address, so orders and
     * allergies survive the move.
     */
    test.describe('member whose Heynabo address differs from their TheSlope address', () => {

        // The member's inhabitant row, wherever it lives among the households at a Heynabo address
        const findInhabitantAtHeynaboAddress = async (context: BrowserContext, addressHeynaboId: number, memberHeynaboId: number) => {
            const households = await HouseholdFactory.getAllHouseholds(context)
            return households
                .filter(h => h.heynaboId === addressHeynaboId)
                .flatMap(h => h.inhabitants ?? [])
                .find(i => i.heynaboId === memberHeynaboId)
        }

        test('moves the inhabitant to a household at the Heynabo address, keeping the inhabitant row', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // GIVEN: Heynabo has Babyyoda at the test address; TheSlope holds their inhabitant
            // in a household at a different address
            const households = await HouseholdFactory.getAllHouseholds(context)
            const householdAtDifferentAddress = households.find(h => h.heynaboId === RECREATE_HOUSEHOLD_HEYNABO_IDS[0])
            expect(householdAtDifferentAddress, 'Setup: household at a different address exists').toBeDefined()

            const babyyoda = await findInhabitantAtHeynaboAddress(context, TEST_HOUSEHOLD_HEYNABO_ID, INHABITANTS.BABYYODA.heynaboId)
            expect(babyyoda, 'Setup: Babyyoda starts at their Heynabo address').toBeDefined()

            await HouseholdFactory.deleteInhabitant(context, babyyoda!.id)
            const driftedInhabitant = await HouseholdFactory.createInhabitantWithConfig(context, householdAtDifferentAddress!.id, {
                heynaboId: INHABITANTS.BABYYODA.heynaboId,
                name: `Drifted-${Date.now()}`
            })

            // WHEN: import runs
            const result = await HouseholdFactory.runHeynaboImport(context)

            // THEN: TheSlope address agrees with Heynabo again — same row, member data restored
            const moved = await findInhabitantAtHeynaboAddress(context, TEST_HOUSEHOLD_HEYNABO_ID, INHABITANTS.BABYYODA.heynaboId)
            expect(moved, 'Inhabitant lives in a household at their Heynabo address').toBeDefined()
            expect(moved!.id, 'Same inhabitant row — orders and allergies follow the move').toBe(driftedInhabitant.id)
            expect(moved!.name, 'Member data restored from Heynabo on the move').toBe(INHABITANTS.BABYYODA.name)
            expect(result.inhabitantsUpdated, 'The move is reported as an update').toBeGreaterThanOrEqual(1)
            expect(result.sanityCheck.passed, 'No count drift between TheSlope and Heynabo').toBe(true)
        })
    })

    /**
     * Deleting an inhabitant only SET-NULLs DinnerEvent.chefId. The business-level chef-loss
     * handling — Heynabo event deletion, CHEF_LOSS_DINNER_UPDATES, allergen clear — is shared
     * with "Meld afbud" (removeChefRole) and runs for every not-yet-consumed dinner the
     * deleted member was chef on, so the dinner is ready for a new chef.
     */
    test.describe('member deleted in Heynabo while chef on an upcoming dinner', () => {
        let chefLossSeasonId: number

        test.afterAll(async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            if (chefLossSeasonId) await SeasonFactory.cleanupSeasons(context, [chefLossSeasonId])
        })

        test('reverts the dinner to a clean SCHEDULED state', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const testSalt = Date.now().toString()

            // GIVEN: an inhabitant unknown to Heynabo is chef on an ANNOUNCED dinner with a menu
            const departingChef = await HouseholdFactory.createInhabitantForHousehold(
                context, testData.householdId, `DepartingChef-${testSalt}`
            )
            const season = await SeasonFactory.createSeason(context)
            chefLossSeasonId = season.id!
            const dinner = await DinnerEventFactory.createDinnerEvent(context, {
                seasonId: chefLossSeasonId,
                state: DinnerState.ANNOUNCED,
                menuTitle: salt('Chef-loss menu', testSalt),
                chefId: departingChef.id
            })

            // WHEN: import runs (Heynabo does not know the chef → inhabitant deleted)
            const result = await HouseholdFactory.runHeynaboImport(context)
            expect(result.inhabitantsDeleted, 'Departing chef deleted').toBeGreaterThanOrEqual(1)

            // THEN: the dinner is ready for a new chef — clean SCHEDULED, no menu, no allergens
            const reset = await DinnerEventFactory.getDinnerEvent(context, dinner.id)
            expect(reset!.state, 'Dinner reverted to SCHEDULED').toBe(DinnerState.SCHEDULED)
            expect(reset!.chefId, 'Chef cleared').toBeNull()
            expect(reset!.menuTitle, 'Menu cleared').toBe('')
            expect(reset!.heynaboEventId, 'Heynabo event reference cleared').toBeNull()
            expect(reset!.allergens ?? [], 'Allergens cleared').toEqual([])
        })
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
