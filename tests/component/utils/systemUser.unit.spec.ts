import {describe, it, expect, vi, beforeEach} from 'vitest'
import {getSystemUserId, clearSystemUserCache} from '~~/server/utils/systemUser'
import {fetchUser, fetchUsersByRole} from '~~/server/data/prismaRepository'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'

// The repository stands for the database the unit runtime lacks
vi.mock('~~/server/data/prismaRepository', () => ({fetchUser: vi.fn(), fetchUsersByRole: vi.fn()}))

const d1Client = {} as D1Database
const SYSTEM_ACCOUNT = 'system-account@example.com'
const systemUser = UserFactory.defaultUserWithInhabitant('system', {id: 7, email: SYSTEM_ACCOUNT})
const otherAdmin = UserFactory.defaultUserWithInhabitant('admin', {id: 1, email: 'first-admin@example.com'})

describe('getSystemUserId', () => {
    beforeEach(() => {
        clearSystemUserCache()
        vi.clearAllMocks()
        vi.stubEnv('HEY_NABO_USERNAME', SYSTEM_ACCOUNT)
        vi.mocked(fetchUsersByRole).mockResolvedValue([otherAdmin])
    })

    it('GIVEN another admin listed first WHEN resolving the system user THEN it is the account the Heynabo integration logs in with', async () => {
        vi.mocked(fetchUser).mockImplementation(async (_d1, {email}) => email === SYSTEM_ACCOUNT ? systemUser : null)

        expect(await getSystemUserId(d1Client)).toBe(systemUser.id)
        expect(fetchUser).toHaveBeenCalledWith(d1Client, {email: SYSTEM_ACCOUNT})
    })

    it('GIVEN the system user resolved once WHEN resolving again THEN the cached id answers', async () => {
        vi.mocked(fetchUser).mockResolvedValue(systemUser)

        await getSystemUserId(d1Client)
        expect(await getSystemUserId(d1Client)).toBe(systemUser.id)
        expect(fetchUser).toHaveBeenCalledTimes(1)
    })

    it('GIVEN no user with the account\'s email WHEN resolving the system user THEN it fails naming the account', async () => {
        vi.mocked(fetchUser).mockResolvedValue(null)

        await expect(getSystemUserId(d1Client)).rejects.toThrow('HEY_NABO_USERNAME')
    })
})
