import {test, expect} from '@playwright/test'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import {useCoreValidation} from '~/composables/useCoreValidation'
import type {UserDisplay} from '~/composables/useCoreValidation'

const {validatedBrowserContext, salt, temporaryAndRandom} = testHelpers
const {UserDisplaySchema, SystemRoleSchema} = useCoreValidation()
const SystemRole = SystemRoleSchema.enum

// Constants for seeded data
const SEEDED_ADMIN_EMAIL = 'agata@mathmagicians.dk'

// Emails are unique: salted per run, so parallel runs and reruns do not collide
const testSalt = temporaryAndRandom()

// Variable to store ID for cleanup
const createdUserIds: number[] = []
const newUser = UserFactory.defaultUser(testSalt)

// Test for creating and retrieving a user
test("PUT /api/admin/users should create a new user and GET should list it among valid users", async ({browser}) => {
    const context = await validatedBrowserContext(browser)
    const created = await UserFactory.createUser(context, newUser)
    // Save ID for cleanup
    createdUserIds.push(created.id as number)

    // Verify response
    expect(created).toHaveProperty('email')
    expect(created.email).toBe(newUser.email)

    // Get user list to verify it appears there
    const users = await UserFactory.getUsers(context)
    const foundUser = users.find(u => u.email === newUser.email)

    expect(foundUser).toBeTruthy()
    expect(foundUser!.id).toBe(created.id)

    // Every user the index returns is a valid UserDisplay
    users.forEach(user => UserDisplaySchema.parse(user))
})

// Test for validation
test("PUT /api/admin/users validation should fail for invalid user data", async ({browser}) => {
    const context = await validatedBrowserContext(browser)

    // Try to create a user without an email (should fail validation)
    const response = await context.request.put('/api/admin/users', {
        data: {
            phone: '+4512345678',
            systemRoles: [SystemRole.ADMIN]
        }
    })

    // Should return 400 Bad Request for validation error
    expect(response.status()).toBe(400)
})

test('GET /api/admin/users/by-role/[role] should return the users holding the role, multi-role users in each list', async ({browser}) => {
    const context = await validatedBrowserContext(browser)

    const adminUser = await UserFactory.createUser(context, UserFactory.createAdmin())
    createdUserIds.push(adminUser.id as number)

    const allergyManagerUser = await UserFactory.createUser(context, UserFactory.createAllergyManager())
    createdUserIds.push(allergyManagerUser.id as number)

    const regularUser = await UserFactory.createUser(context, UserFactory.defaultUser())
    createdUserIds.push(regularUser.id as number)

    // Create user with both ADMIN and ALLERGYMANAGER roles
    const multiRoleUser = await UserFactory.createUser(context, UserFactory.createAdminAndAllergyManager())
    createdUserIds.push(multiRoleUser.id as number)

    const adminResponse = await context.request.get(`/api/admin/users/by-role/${SystemRole.ADMIN}`)
    expect(adminResponse.status()).toBe(200)
    const adminUsers = await adminResponse.json()
    expect(Array.isArray(adminUsers)).toBe(true)
    const foundAdmin = adminUsers.find((u: UserDisplay) => u.id === adminUser.id)
    expect(foundAdmin).toBeTruthy()
    UserDisplaySchema.parse(foundAdmin) // Validate structure
    expect(foundAdmin!.systemRoles).toContain(SystemRole.ADMIN)

    const allergyManagerResponse = await context.request.get(`/api/admin/users/by-role/${SystemRole.ALLERGYMANAGER}`)
    expect(allergyManagerResponse.status()).toBe(200)
    const allergyManagers = await allergyManagerResponse.json()
    expect(Array.isArray(allergyManagers)).toBe(true)
    const foundAllergyManager = allergyManagers.find((u: UserDisplay) => u.id === allergyManagerUser.id)
    expect(foundAllergyManager).toBeTruthy()
    UserDisplaySchema.parse(foundAllergyManager) // Validate structure including Inhabitant
    expect(foundAllergyManager!.systemRoles).toContain(SystemRole.ALLERGYMANAGER)

    // The seeded admin is an allergy manager and comes with its Inhabitant
    const seededAdmin = allergyManagers.find((u: UserDisplay) => u.email === SEEDED_ADMIN_EMAIL)
    expect(seededAdmin).toBeTruthy()
    UserDisplaySchema.parse(seededAdmin) // Validates Inhabitant structure
    expect(seededAdmin!.Inhabitant).toBeTruthy()

    const regularUserInAdminList = adminUsers.find((u: UserDisplay) => u.id === regularUser.id)
    expect(regularUserInAdminList).toBeFalsy()

    // The multi-role user appears in both lists, carrying both roles
    expect(adminUsers.find((u: UserDisplay) => u.id === multiRoleUser.id)).toBeTruthy()
    const multiRoleInAllergyManagers = allergyManagers.find((u: UserDisplay) => u.id === multiRoleUser.id)
    expect(multiRoleInAllergyManagers).toBeTruthy()
    expect(multiRoleInAllergyManagers!.systemRoles).toEqual(expect.arrayContaining([SystemRole.ADMIN, SystemRole.ALLERGYMANAGER]))
})

// POST /api/admin/users/[id] - Role update tests (ADR: TS owns ALLERGYMANAGER, HN owns ADMIN)
// Role reconciliation is unit-tested in useUserRoles.unit.spec.ts; these prove it end to end
test.describe('POST /api/admin/users/[id] role updates', () => {
    test('should preserve ADMIN role (HN-owned) when updating TS-owned roles', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Create user with ADMIN (HN-owned)
        const user = await UserFactory.createUser(context, UserFactory.createAdmin())
        createdUserIds.push(user.id as number)
        expect(user.systemRoles).toContain(SystemRole.ADMIN)

        // Try to add ALLERGYMANAGER - ADMIN should be preserved
        const updated = await UserFactory.setSystemRoles(context, user.id as number, [SystemRole.ALLERGYMANAGER])
        expect(updated.systemRoles).toContain(SystemRole.ADMIN) // HN-owned preserved
        expect(updated.systemRoles).toContain(SystemRole.ALLERGYMANAGER) // TS-owned added
    })

    test('should not remove ADMIN role (HN-owned) via TS caller', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Create user with both roles
        const user = await UserFactory.createUser(context, UserFactory.createAdminAndAllergyManager())
        createdUserIds.push(user.id as number)
        expect(user.systemRoles).toContain(SystemRole.ADMIN)
        expect(user.systemRoles).toContain(SystemRole.ALLERGYMANAGER)

        // Send empty roles - should only remove ALLERGYMANAGER, preserve ADMIN
        const updated = await UserFactory.setSystemRoles(context, user.id as number, [])
        expect(updated.systemRoles).toContain(SystemRole.ADMIN) // HN-owned preserved
        expect(updated.systemRoles).not.toContain(SystemRole.ALLERGYMANAGER) // TS-owned removed
    })

    test('should return 400 for invalid user ID', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const response = await context.request.post('/api/admin/users/invalid', {
            data: { systemRoles: [] }
        })
        expect(response.status()).toBe(400)
    })

    test('should return 404 for a removed user ID', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const removedUser = await UserFactory.createUser(context, UserFactory.defaultUser(salt('removed', testSalt)))
        await UserFactory.deleteUser(context, removedUser.id as number)

        const response = await context.request.post(`/api/admin/users/${removedUser.id}`, {
            data: { systemRoles: [] }
        })
        expect(response.status()).toBe(404)
    })
})

// POST /api/admin/users/[id] contact updates — happy-path integration smoke
// Schema edge cases (RFC 5322 normalization, phone format) are unit-tested in useCoreValidation.unit.spec.ts;
// these tests prove the body → UserUpdateSchema (picked) → repository → response wiring works.
const updatedEmail = `${salt('updated', testSalt)}@andeby.dk`
const contactUpdateCases: Array<{
    label: string
    body: {email?: string; phone?: string | null}
    expected: {email?: string; phone?: string | null}
}> = [
    {label: 'plain email persists',                body: {email: updatedEmail},                 expected: {email: updatedEmail}},
    {label: 'phone persists',                      body: {phone: '+45 12 34 56 78'},            expected: {phone: '+45 12 34 56 78'}},
    {label: 'phone null clears value',             body: {phone: null},                         expected: {phone: null}}
]

for (const {label, body, expected} of contactUpdateCases) {
    test(`POST /api/admin/users/[id]: ${label}`, async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const user = await UserFactory.createUser(context, UserFactory.defaultUser())
        createdUserIds.push(user.id as number)

        const response = await context.request.post(`/api/admin/users/${user.id}`, {data: body})
        expect(response.status(), `Expected 200, got ${response.status()}: ${await response.text()}`).toBe(200)

        const updated = await response.json()
        if (expected.email !== undefined) expect(updated.email).toBe(expected.email)
        if (expected.phone !== undefined) expect(updated.phone).toBe(expected.phone)
    })
}

// Cleanup after all tests
test.afterAll(async ({browser}) => {
    const context = await validatedBrowserContext(browser)
    await UserFactory.cleanupUsers(context, createdUserIds)
})
