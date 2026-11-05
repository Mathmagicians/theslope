import {it, expect, vi} from 'vitest'
import {createApp, createError, toWebHandler, type H3EventContext} from 'h3'
import login from '~~/server/routes/api/auth/login.post'
import {fetchUser} from '~~/server/data/prismaRepository'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'

const {HEYNABO_TOKEN} = vi.hoisted(() => ({HEYNABO_TOKEN: 'heynabo-token'}))

// Heynabo signs the member in: the login reads the Heynabo user's email and the token
vi.mock('~~/server/integration/heynabo/heynaboClient', () => ({
    loginUserIntoHeynabo: vi.fn(async (email: string) => ({id: 1, email, token: HEYNABO_TOKEN}))
}))
vi.mock('~~/server/data/prismaRepository', () => ({fetchUser: vi.fn()}))

// The login calls Nitro's auto-imports, which the unit runtime lacks; nuxt-auth-utils' session needs the runtime config
const setUserSession = vi.fn()
vi.stubGlobal('setUserSession', setUserSession)
vi.stubGlobal('createError', createError)

// The route behind an h3 app, with the D1 binding Nitro hands it
const DB = {} as D1Database
const request = toWebHandler(createApp({
    onRequest: event => {
        event.context.cloudflare = {env: {DB}} as H3EventContext['cloudflare']
    }
}).use(login))

it('GIVEN Heynabo signs the member in WHEN they log in THEN the token goes to the session\'s secure data, and the session user and the answer are the member\'s detail', async () => {
    const member = UserFactory.defaultUserWithInhabitant('login')
    vi.mocked(fetchUser).mockResolvedValue(member)

    const response = await request(new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({email: member.email, password: 'heynabo-password'})
    }))

    expect(response.status).toBe(200)
    expect(setUserSession).toHaveBeenCalledWith(expect.anything(), {user: member, secure: {heynaboToken: HEYNABO_TOKEN}, loggedInAt: expect.any(Date)})
    expect(await response.json()).toEqual(JSON.parse(JSON.stringify(member)))
})
