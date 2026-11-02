import {describe, it, expect, vi, beforeEach} from 'vitest'
import {createError, type H3Event} from 'h3'
import {Prisma} from '~~/prisma/generated/client/client'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {spyOnLogs} from '~~/tests/component/logSpies'

// The helper reads createError from the Nitro auto-import scope
vi.stubGlobal('createError', createError)

// nuxt-auth-utils' Nitro auto-import reads a sealed cookie with the runtime config the unit runtime lacks
const getUserSession = vi.fn()
vi.stubGlobal('getUserSession', getUserSession)

const {nuxtErrorFromPrismaError, nuxtErrorFromCatch, getSessionUser} = eventHandlerHelper

const PREPEND = '🎟️ > ORDER > [BATCH CREATE]'

const prismaError = (code: string, message: string) =>
    new Prisma.PrismaClientKnownRequestError(message, {code, clientVersion: 'test'})

// Prisma's known request errors map to the HTTP code that describes the client's situation
describe.each([
    {code: 'P2002', message: 'Unique constraint failed on the fields: (`inhabitantId`,`dinnerEventId`)', statusCode: 409, statusMessage: 'Conflict'},
    {code: 'P2025', message: 'Record to update not found.', statusCode: 404, statusMessage: 'Not Found'},
    {code: 'P2003', message: 'Foreign key constraint failed', statusCode: 500, statusMessage: 'Internal Server Error'},
    // A dropped connection to D1: the adapter's fetch fails and Prisma reports the query as a failed raw query
    {code: 'P2010', message: 'Raw query failed. Code: `N/A`. Message: `fetch failed`', statusCode: 503, statusMessage: 'Service Unavailable'},
    // A raw query the database rejects is a server error, not a lost connection
    {code: 'P2010', message: 'Raw query failed. Code: `N/A`. Message: `D1_ERROR: too many SQL variables`', statusCode: 500, statusMessage: 'Internal Server Error'}
])('Prisma error $code', ({code, message, statusCode, statusMessage}) => {
    it(`maps to ${statusCode} ${statusMessage} and keeps the database message`, () => {
        const error = nuxtErrorFromPrismaError(PREPEND, prismaError(code, message))

        expect(error.statusCode).toBe(statusCode)
        expect(error.statusMessage).toBe(statusMessage)
        expect(error.message).toContain(PREPEND)
        expect(error.message).toContain(message)
    })
})

it('nuxtErrorFromCatch reaches the Prisma mapping', () => {
    const error = nuxtErrorFromCatch(PREPEND, prismaError('P2002', 'Unique constraint failed'))

    expect(error.statusCode).toBe(409)
})

// A unique violation reads as a conflict whether it arrives raw from Prisma or already mapped by throwH3Error
describe('isConflict', () => {
    it.each([
        {name: 'a Prisma unique violation', error: prismaError('P2002', 'Unique constraint failed'), expected: true},
        {name: 'an H3 error with status 409', error: createError({statusCode: 409}), expected: true},
        {name: 'a Prisma not-found', error: prismaError('P2025', 'Record to update not found.'), expected: false},
        {name: 'an H3 error with status 400', error: createError({statusCode: 400}), expected: false},
        {name: 'a plain error', error: new Error('boom'), expected: false}
    ])('is $expected for $name', ({error, expected}) => {
        expect(eventHandlerHelper.isConflict(error)).toBe(expected)
    })
})

// The session holds its user as JSON: the dates are strings until the schema reads them
describe('getSessionUser', () => {
    const event = {} as H3Event
    const user = UserFactory.defaultUserWithInhabitant('session-user')
    const {email: _email, ...withoutEmail} = JSON.parse(JSON.stringify(user))
    const logs = spyOnLogs()

    beforeEach(() => {
        Object.values(logs).forEach(spy => spy.mockReset().mockImplementation(() => {}))
    })

    it.each([
        {name: 'a session user', session: {user: JSON.parse(JSON.stringify(user))}, answer: 'the domain\'s user, its dates as dates', expected: user, warned: 0},
        {name: 'no session', session: {}, answer: 'null', expected: null, warned: 0},
        {name: 'a session user the schema rejects', session: {user: withoutEmail}, answer: 'null', expected: null, warned: 1}
    ])('GIVEN $name THEN it answers $answer with $warned warning', async ({session, expected, warned}) => {
        getUserSession.mockResolvedValue(session)

        await expect(getSessionUser(event)).resolves.toEqual(expected)
        expect(logs.warn).toHaveBeenCalledTimes(warned)
    })
    it('GIVEN a session user the schema rejects THEN the warning carries none of its data', async () => {
        getUserSession.mockResolvedValue({user: withoutEmail})

        await getSessionUser(event)

        const warning = logs.warn.mock.calls.flat().join(' ')
        expect([user.Inhabitant!.name, user.Inhabitant!.lastName, user.phone!].filter(value => warning.includes(value))).toEqual([])
    })
})
