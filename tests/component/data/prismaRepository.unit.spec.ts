import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createError} from 'h3'
import {createUsers, saveUser} from '~~/server/data/prismaRepository'
import {useCoreValidation} from '~/composables/useCoreValidation'
import {DEFAULT_APPEARANCE, DEFAULT_NOTIFICATION_CHANNELS, TextScaleSchema} from '~/composables/useUserPreferenceValidation'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'

// The repository builds its errors with createError from the Nitro auto-import scope the unit runtime lacks
vi.stubGlobal('createError', createError)

// The unit runtime has no D1: a client standing for the binding answers each statement from the test
const {fakePrisma} = await vi.hoisted(async () => ({
    fakePrisma: (await import('~~/tests/component/data/fakePrismaClient')).fakePrismaClient({
        user: ['update', 'upsert', 'createManyAndReturn']
    })
}))
vi.mock('~~/server/utils/database', () => ({getPrismaClientConnection: async () => fakePrisma}))

const {serializeUserInput} = useCoreValidation()
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
})
