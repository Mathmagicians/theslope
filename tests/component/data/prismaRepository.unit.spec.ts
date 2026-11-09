import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createError} from 'h3'
import {createUsers, deleteUser, fetchUsers, fetchUsersByIds, fetchUsersByRole, saveUser, updateTeam} from '~~/server/data/prismaRepository'
import {useCoreValidation} from '~/composables/useCoreValidation'
import {DEFAULT_APPEARANCE, DEFAULT_NOTIFICATION_CHANNELS, TextScaleSchema} from '~/composables/useUserPreferenceValidation'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'

// The repository builds its errors with createError from the Nitro auto-import scope the unit runtime lacks
vi.stubGlobal('createError', createError)

// The unit runtime has no D1: a client standing for the binding answers each statement from the test
const {fakePrisma} = await vi.hoisted(async () => ({
    fakePrisma: (await import('~~/tests/component/data/fakePrismaClient')).fakePrismaClient({
        user: ['update', 'upsert', 'delete', 'createManyAndReturn', 'findMany'],
        cookingTeam: ['update']
    })
}))
vi.mock('~~/server/utils/database', () => ({getPrismaClientConnection: async () => fakePrisma}))

const {serializeUserInput, SystemRoleSchema} = useCoreValidation()
const d1Client = {} as D1Database

// A user's own settings: e-mail off, the larger text
const ownSettings = {notificationChannels: [], appearance: {...DEFAULT_APPEARANCE, textScale: TextScaleSchema.enum.larger}}
const defaults = {notificationChannels: JSON.stringify(DEFAULT_NOTIFICATION_CHANNELS), appearance: JSON.stringify(DEFAULT_APPEARANCE)}
// A user as the Heynabo import sends it: its login, phone and roles, no settings
const {notificationChannels: _channels, appearance: _appearance, ...importedUser} = UserFactory.defaultUser('anna')

// The settings columns a write sets; a column the write leaves alone carries Prisma.skip or no key
const SETTINGS = ['notificationChannels', 'appearance']
const settingsOf = (data: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(data).filter(([column, value]) => SETTINGS.includes(column) && typeof value === 'string'))

beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, 'info').mockImplementation(() => {})
    const row = {...serializeUserInput(UserFactory.defaultUser('anna')), id: 7, createdAt: new Date(), updatedAt: new Date()}
    fakePrisma.user.update.mockResolvedValue(row)
    fakePrisma.user.upsert.mockResolvedValue(row)
    fakePrisma.user.delete.mockResolvedValue(row)
    fakePrisma.user.createManyAndReturn.mockResolvedValue([{id: row.id, email: row.email}])
})

// A user's channels and appearance change only through the user's own save: a new user starts on the column defaults,
// and no other write of an existing user carries either
describe('the user\'s own settings', () => {
    it.each([
        {write: 'the import\'s update of a user by id', save: () => saveUser(d1Client, importedUser, 7), data: () => fakePrisma.user.update.mock.calls[0]![0].data},
        {write: 'the email-keyed upsert of an existing user', save: () => saveUser(d1Client, {...importedUser, ...ownSettings}), data: () => fakePrisma.user.upsert.mock.calls[0]![0].update}
    ])('GIVEN $write WHEN saved THEN neither the channels nor the appearance is written', async ({save, data}) => {
        await save()

        expect(settingsOf(data())).toEqual({})
    })

    it.each([
        {write: 'the email-keyed upsert creating a user', save: () => saveUser(d1Client, importedUser), data: () => fakePrisma.user.upsert.mock.calls[0]![0].create},
        {write: 'the import creating users', save: () => createUsers(d1Client, [importedUser]), data: () => fakePrisma.user.createManyAndReturn.mock.calls[0]![0].data[0]}
    ])('GIVEN $write WHEN saved THEN the new user starts on the default channels and appearance', async ({save, data}) => {
        await save()

        expect(settingsOf(data())).toEqual(defaults)
    })

    // The partial saves by id: only the columns the caller set are written
    it.each([
        {write: 'the user\'s own save of channels and appearance', delta: ownSettings,
            written: {notificationChannels: JSON.stringify(ownSettings.notificationChannels), appearance: JSON.stringify(ownSettings.appearance)}},
        {write: 'an admin\'s edit of the phone', delta: {phone: importedUser.phone}, written: {}}
    ])('GIVEN $write WHEN saved by id THEN the update writes the settings it carries and no others', async ({delta, written}) => {
        await saveUser(d1Client, delta, 7)

        expect(settingsOf(fakePrisma.user.update.mock.calls[0]![0].data)).toEqual(written)
    })
})

// A mutation returns the user's Detail (ADR-009): the Heynabo token in the row's passwordHash stays in the repository,
// and the write fetches no inhabitant
describe('the user a mutation returns', () => {
    it.each([
        {write: 'a save by id', save: () => saveUser(d1Client, importedUser, 7)},
        {write: 'a save by email', save: () => saveUser(d1Client, importedUser)},
        {write: 'a delete', save: () => deleteUser(d1Client, 7)}
    ])('GIVEN $write WHEN it returns THEN the detail carries no passwordHash and its Inhabitant is null', async ({save}) => {
        const detail = await save()

        expect(detail).not.toHaveProperty('passwordHash')
        expect(detail.Inhabitant).toBeNull()
    })
})

// The display reads list users for the admin pages: each user as stored, the Heynabo token left out
describe('the user display reads', () => {
    // A stored user with settings of its own, and the fake answering a read with the columns its select names, as D1 does
    const stored = {...serializeUserInput({...importedUser, ...ownSettings}), id: 7, createdAt: new Date(), updatedAt: new Date(), Inhabitant: null}
    const selected = ({select}: {select: Record<string, unknown>}) => [Object.fromEntries(Object.keys(select).map(column => [column, stored[column as keyof typeof stored]]))]

    it.each([
        {read: 'every user', fetch: () => fetchUsers(d1Client)},
        {read: 'the users of a role', fetch: () => fetchUsersByRole(d1Client, SystemRoleSchema.enum.ADMIN)},
        {read: 'the users by id', fetch: () => fetchUsersByIds(d1Client, [stored.id])}
    ])('GIVEN a user with settings of its own WHEN $read is read THEN each display carries the stored settings', async ({fetch}) => {
        fakePrisma.user.findMany.mockImplementation(selected)

        const displays = await fetch()

        expect(displays.map(({notificationChannels, appearance}) => ({notificationChannels, appearance}))).toEqual([ownSettings])
    })
})

// The D1 adapter reads a team back after its update; a team a parallel request deleted in between reads as null
describe('a team deleted while it is updated', () => {
    it('GIVEN the team read back as null WHEN updated THEN the update answers not found', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        fakePrisma.cookingTeam.update.mockResolvedValue(null)

        await expect(updateTeam(d1Client, 2, {id: 2, affinity: null})).rejects.toMatchObject({statusCode: 404})
    })
})
