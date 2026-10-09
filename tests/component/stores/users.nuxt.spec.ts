// @vitest-environment nuxt
import {setActivePinia, createPinia} from 'pinia'
import {beforeAll, beforeEach, describe, expect, it, vi} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {clearNuxtData} from '#app'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {useCoreValidation} from '~/composables/useCoreValidation'
import {useUsersStore} from '~/stores/users'

const {SystemRoleSchema} = useCoreValidation()
const SystemRole = SystemRoleSchema.enum

const usersEndpoint = vi.fn()
const allergyManagersEndpoint = vi.fn()
const myTeamsEndpoint = vi.fn()
const heynaboImportEndpoint = vi.fn()
const updateUserEndpoint = vi.fn()

registerEndpoint(`/api/admin/users/by-role/${SystemRole.ALLERGYMANAGER}`, allergyManagersEndpoint)
registerEndpoint('/api/admin/users/1', {method: 'POST', handler: updateUserEndpoint})
registerEndpoint('/api/admin/users', usersEndpoint)
registerEndpoint('/api/team/my', myTeamsEndpoint)
registerEndpoint('/api/admin/heynabo/import', heynaboImportEndpoint)

const failure = () => {
    throw createError({statusCode: 500})
}

const user = UserFactory.defaultUserWithInhabitant('users-store')
const allergyManager = UserFactory.defaultUserWithInhabitant('users-store-am', {id: 2, systemRoles: [SystemRole.ALLERGYMANAGER]})
const toastTitles = () => useToast().toasts.value.map(toast => String(toast.title))

describe('Users store', () => {
    beforeAll(() => {
        // One pinia for the file: the Nuxt app keeps one asyncData entry per key across store instances
        setActivePinia(createPinia())
    })

    beforeEach(() => {
        clearNuxtData()
        useToast().clear()
        vi.clearAllMocks()
        usersEndpoint.mockImplementation(() => [user])
        allergyManagersEndpoint.mockImplementation(() => [allergyManager])
        myTeamsEndpoint.mockImplementation(() => [SeasonFactory.defaultCookingTeamDetail()])
        heynaboImportEndpoint.mockImplementation(() => HouseholdFactory.defaultHeynaboImportResponse({householdsCreated: 2}))
        updateUserEndpoint.mockImplementation(() => user)
    })

    describe('reads', () => {
        it('loads the users and the allergy managers', async () => {
            const store = useUsersStore()

            await store.loadUsers()
            await vi.waitFor(() => expect(store.allergyManagers).toHaveLength(1))

            expect(store.users.map(u => u.id)).toEqual([user.id])
            expect(store.allergyManagers[0]!.id).toBe(allergyManager.id)
        })

        it('loads my teams, parsed to domain types', async () => {
            const store = useUsersStore()

            await store.loadMyTeams()

            expect(store.isMyTeamsInitialized).toBe(true)
            expect(store.myTeams).toHaveLength(1)
            expect(store.myTeams[0]!.dinnerEvents![0]!.date).toBeInstanceOf(Date)
        })

        it.each([
            {slice: 'users', endpoint: usersEndpoint, load: (store: ReturnType<typeof useUsersStore>) => store.loadUsers(), isErrored: (store: ReturnType<typeof useUsersStore>) => store.isUsersErrored},
            {slice: 'my teams', endpoint: myTeamsEndpoint, load: (store: ReturnType<typeof useUsersStore>) => store.loadMyTeams(), isErrored: (store: ReturnType<typeof useUsersStore>) => store.isMyTeamsErrored}
        ])('a failed $slice fetch rejects and is exposed', async ({endpoint, load, isErrored}) => {
            endpoint.mockImplementation(failure)
            const store = useUsersStore()

            await expect(load(store)).rejects.toBeTruthy()
            expect(isErrored(store)).toBe(true)
        })
    })

    describe('importHeynaboData', () => {
        it('keeps the import result, toasts it and reloads the users', async () => {
            const store = useUsersStore()
            const userFetchesBefore = usersEndpoint.mock.calls.length

            await store.importHeynaboData()

            expect(store.heynaboImport?.householdsCreated).toBe(2)
            expect(toastTitles()).toContain('Heynabo import fuldført')
            expect(usersEndpoint.mock.calls.length).toBeGreaterThan(userFetchesBefore)
        })

        it('rejects and exposes the error of a failed import', async () => {
            heynaboImportEndpoint.mockImplementation(failure)
            const store = useUsersStore()

            await expect(store.importHeynaboData()).rejects.toBeTruthy()
            expect(store.isImportHeynaboErrored).toBe(true)
            expect(store.heynaboImportError?.message).toBeTruthy()
            expect(toastTitles()).not.toContain('Heynabo import fuldført')
        })
    })

    describe('updateUserRoles', () => {
        it('posts the roles, toasts and reloads the users', async () => {
            const store = useUsersStore()
            const userFetchesBefore = usersEndpoint.mock.calls.length

            await store.updateUserRoles(user.id!, [SystemRole.ADMIN])

            expect(updateUserEndpoint).toHaveBeenCalledTimes(1)
            expect(toastTitles()).toContain('Roller opdateret')
            expect(usersEndpoint.mock.calls.length).toBeGreaterThan(userFetchesBefore)
        })

        it('rethrows a failed update without the success toast', async () => {
            updateUserEndpoint.mockImplementation(failure)
            const store = useUsersStore()

            await expect(store.updateUserRoles(user.id!, [SystemRole.ADMIN])).rejects.toBeTruthy()
            expect(toastTitles()).not.toContain('Roller opdateret')
        })
    })
})
