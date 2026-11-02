// @vitest-environment nuxt
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {flushPromises} from '@vue/test-utils'
import {asyncDataStatus, resetStores} from '~~/tests/component/testHelpers'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {useCoreValidation} from '~/composables/useCoreValidation'
import {useUsersStore} from '~/stores/users'
import {MAINTENANCE_WORDS} from '~/config/maintenanceWords'
import {USER_WORDS} from '~/config/userWords'
import {useMaintenanceValidation} from '~/composables/useMaintenanceValidation'

const {SystemRoleSchema} = useCoreValidation()
const SystemRole = SystemRoleSchema.enum
const heynaboImportDone = MAINTENANCE_WORDS.job.completed(MAINTENANCE_WORDS.jobTypes[useMaintenanceValidation().JobType.HEYNABO_IMPORT])

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

const USERS_KEY = 'users'
const user = UserFactory.defaultUserWithInhabitant('users-store')
const allergyManager = UserFactory.defaultUserWithInhabitant('users-store-am', {id: 2, systemRoles: [SystemRole.ALLERGYMANAGER]})
const myTeam = SeasonFactory.defaultCookingTeamDetail()
const toastTitles = () => useToast().toasts.value.map(toast => String(toast.title))

type UsersStore = ReturnType<typeof useUsersStore>

// Each read loads for the component that shows it: all users on /admin/users, the allergy managers in the allergy box,
// the person's own teams on /chef
const reads = [
    {
        list: 'all users', key: USERS_KEY, endpoint: usersEndpoint, answer: () => [user],
        load: (store: UsersStore) => store.loadUsers(),
        ids: (store: UsersStore) => store.users.map(listed => listed.id),
        isErrored: (store: UsersStore) => store.isUsersErrored
    },
    {
        list: 'the allergy managers', key: 'allergyManagers', endpoint: allergyManagersEndpoint, answer: () => [allergyManager],
        load: (store: UsersStore) => store.loadAllergyManagers(),
        ids: (store: UsersStore) => store.allergyManagers.map(listed => listed.id),
        isErrored: (store: UsersStore) => store.isAllergyManagersErrored
    },
    {
        list: 'the own teams', key: 'users-store-my-teams', endpoint: myTeamsEndpoint, answer: () => [myTeam],
        load: (store: UsersStore) => store.loadMyTeams(),
        ids: (store: UsersStore) => store.myTeams.map(team => team.id),
        isErrored: (store: UsersStore) => store.isMyTeamsErrored
    }
]

const listUsers = async (store: UsersStore) => {
    store.loadUsers()
    await vi.waitFor(() => expect(asyncDataStatus(USERS_KEY)).toBe('success'))
}

describe('Users store', () => {
    beforeEach(() => {
        resetStores()
        useToast().clear()
        vi.clearAllMocks()
        reads.forEach(({endpoint, answer}) => endpoint.mockImplementation(answer))
        heynaboImportEndpoint.mockImplementation(() => HouseholdFactory.defaultHeynaboImportResponse({householdsCreated: 2}))
        updateUserEndpoint.mockImplementation(() => user)
    })

    describe('reads', () => {
        it.each(reads)('$list stay idle and unrequested until asked for, and the ready flag waits for them while they load', async ({key, endpoint, answer, load, ids}) => {
            const store = useUsersStore()
            await flushPromises()

            expect(asyncDataStatus(key)).toBe('idle')
            expect(endpoint).not.toHaveBeenCalled()
            expect(store.isUsersStoreReady).toBe(true)

            let land = () => {}
            endpoint.mockImplementationOnce(() => new Promise(resolve => {
                land = () => resolve(answer())
            }))
            load(store)

            await vi.waitFor(() => expect(endpoint).toHaveBeenCalledTimes(1))
            expect(store.isUsersStoreReady).toBe(false)
            land()
            await vi.waitFor(() => expect(asyncDataStatus(key)).toBe('success'))
            expect(ids(store)).toEqual(answer().map(listed => listed.id))
            expect(store.isUsersStoreReady).toBe(true)
        })

        it.each(reads)('a failed read of $list errors the store', async ({endpoint, load, isErrored}) => {
            endpoint.mockImplementation(failure)
            const store = useUsersStore()
            expect(store.isUsersStoreErrored).toBe(false)

            load(store)

            await vi.waitFor(() => expect(isErrored(store)).toBe(true))
            expect(store.isUsersStoreErrored).toBe(true)
        })

        it('a later loadMyTeams reloads the own teams, parsed to domain types', async () => {
            const store = useUsersStore()
            store.loadMyTeams()
            await vi.waitFor(() => expect(store.isMyTeamsInitialized).toBe(true))
            const otherTeam = SeasonFactory.defaultCookingTeamDetail({id: myTeam.id + 1})
            myTeamsEndpoint.mockImplementationOnce(() => [myTeam, otherTeam])

            await store.loadMyTeams()

            expect(store.myTeams).toEqual([myTeam, otherTeam])
        })

        it('a later loadMyTeams rejects when the reload fails', async () => {
            const store = useUsersStore()
            store.loadMyTeams()
            await vi.waitFor(() => expect(store.isMyTeamsInitialized).toBe(true))
            myTeamsEndpoint.mockImplementation(failure)

            await expect(store.loadMyTeams()).rejects.toBeTruthy()
            expect(store.isMyTeamsErrored).toBe(true)
        })
    })

    describe('importHeynaboData', () => {
        it.each([
            {description: 'the listed users reload', listed: true, reloads: 1, status: 'success'},
            {description: 'users no component lists stay idle and unrequested', listed: false, reloads: 0, status: 'idle'}
        ])('keeps the import result and toasts it; $description', async ({listed, reloads, status}) => {
            const store = useUsersStore()
            if (listed) await listUsers(store)
            const userFetchesBefore = usersEndpoint.mock.calls.length

            await store.importHeynaboData()

            expect(store.heynaboImport?.householdsCreated).toBe(2)
            expect(toastTitles()).toContain(heynaboImportDone)
            expect(usersEndpoint.mock.calls.length - userFetchesBefore).toBe(reloads)
            expect(asyncDataStatus(USERS_KEY)).toBe(status)
        })

        it('rejects and exposes the error of a failed import', async () => {
            heynaboImportEndpoint.mockImplementation(failure)
            const store = useUsersStore()

            await expect(store.importHeynaboData()).rejects.toBeTruthy()
            expect(store.isImportHeynaboErrored).toBe(true)
            expect(store.heynaboImportError?.message).toBeTruthy()
            expect(toastTitles()).not.toContain(heynaboImportDone)
        })
    })

    describe('updateUserRoles', () => {
        it('posts the roles, toasts and reloads the listed users', async () => {
            const store = useUsersStore()
            await listUsers(store)
            const userFetchesBefore = usersEndpoint.mock.calls.length

            await store.updateUserRoles(user.id, [SystemRole.ADMIN])

            expect(updateUserEndpoint).toHaveBeenCalledTimes(1)
            expect(toastTitles()).toContain(USER_WORDS.toasts.rolesUpdated.title)
            expect(usersEndpoint.mock.calls.length).toBeGreaterThan(userFetchesBefore)
        })

        it('rethrows a failed update without the success toast', async () => {
            updateUserEndpoint.mockImplementation(failure)
            const store = useUsersStore()

            await expect(store.updateUserRoles(user.id, [SystemRole.ADMIN])).rejects.toBeTruthy()
            expect(toastTitles()).not.toContain(USER_WORDS.toasts.rolesUpdated.title)
        })
    })
})
