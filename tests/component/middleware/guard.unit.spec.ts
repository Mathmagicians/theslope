import {describe, it, expect, vi, beforeEach} from 'vitest'
import {createApp, createError, getRequestURL, toWebHandler} from 'h3'
import guard from '~~/server/middleware/1.guard'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'

// The guard calls Nitro's auto-imports, which the unit runtime lacks; the session is faked, as nuxt-auth-utils
// reads it from a sealed cookie with the runtime config
const getUserSession = vi.fn()
const clearUserSession = vi.fn()
vi.stubGlobal('getRequestURL', getRequestURL)
vi.stubGlobal('createError', createError)
vi.stubGlobal('getUserSession', getUserSession)
vi.stubGlobal('clearUserSession', clearUserSession)

// The guard in front of a route, as Nitro runs a server middleware
const request = toWebHandler(createApp().use(guard).use(() => 'the route'))

const member = UserFactory.defaultUserWithInhabitant('guard')
const {email: _email, ...memberWithoutEmail} = member
const API_ROUTE = '/api/team/my'
const PAGE_ROUTE = '/chef?date=2026-11-02'

describe('guard', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it.each([
        {name: 'no session', session: {}, path: API_ROUTE, status: 401, location: null, cleared: 0},
        {name: 'a session without its Heynabo token', session: {user: member}, path: API_ROUTE, status: 401, location: null, cleared: 1},
        {name: 'a session without its Heynabo token', session: {user: member}, path: PAGE_ROUTE, status: 302,
            location: `/login?redirect=${encodeURIComponent(PAGE_ROUTE)}`, cleared: 1},
        {name: 'a session user the schema rejects', session: {user: memberWithoutEmail, secure: {heynaboToken: 'heynabo-token'}}, path: API_ROUTE, status: 401, location: null, cleared: 1},
        {name: 'a signed-in session', session: {user: member, secure: {heynaboToken: 'heynabo-token'}}, path: API_ROUTE, status: 200, location: null, cleared: 0}
    ])('GIVEN $name WHEN it requests $path THEN the guard answers $status and clears the session $cleared times', async ({session, path, status, location, cleared}) => {
        getUserSession.mockResolvedValue(session)

        const response = await request(new Request(`http://localhost${path}`))

        expect(response.status).toBe(status)
        expect(response.headers.get('location')).toBe(location)
        expect(clearUserSession).toHaveBeenCalledTimes(cleared)
    })
})
