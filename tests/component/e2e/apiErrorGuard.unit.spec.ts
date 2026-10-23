import {EventEmitter} from 'node:events'
import {beforeEach, describe, expect, it} from 'vitest'
import type {BrowserContext, Response} from '@playwright/test'
import {
    closeCase,
    expectApiError,
    guardContext,
    openCase,
    undeclaredApiErrors,
    type DeclaredApiError,
    type ResponseSeen
} from '~~/tests/e2e/apiErrorGuard'

const ORIGIN = 'http://localhost:3000'
const ALLERGY_URL = '/api/household/allergy'

const seen = (status: number, path = `${ALLERGY_URL}/7`, method = 'POST'): ResponseSeen => ({method, url: `${ORIGIN}${path}`, status})

describe('undeclaredApiErrors', () => {
    const forbidden = seen(403)

    it.each<{description: string, response: ResponseSeen, declared: DeclaredApiError[], failures: number}>([
        {description: 'an undeclared 403 fails', response: forbidden, declared: [], failures: 1},
        {description: 'a 403 declared by its status and a url it contains passes', response: forbidden, declared: [{status: 403, url: ALLERGY_URL}], failures: 0},
        {description: 'a 403 declared by its status and a RegExp passes', response: forbidden, declared: [{status: 403, url: /\/api\/household\/allergy\/\d+$/}], failures: 0},
        {description: 'a 403 declared on another url fails', response: forbidden, declared: [{status: 403, url: '/api/admin/allergy-type'}], failures: 1},
        {description: 'a 403 declared as another status fails', response: forbidden, declared: [{status: 401, url: ALLERGY_URL}], failures: 1},
        {description: 'an undeclared 5xx fails', response: seen(500), declared: [], failures: 1},
        {description: 'a 404 outside /api/ passes', response: seen(404, '/_nuxt/missing.js', 'GET'), declared: [], failures: 0},
        {description: 'a 2xx passes', response: seen(200), declared: [], failures: 0},
        {description: 'a 3xx passes', response: seen(302, '/api/auth/login'), declared: [], failures: 0}
    ])('$description', ({response, declared, failures}) => {
        expect(undeclaredApiErrors([response], declared)).toHaveLength(failures)
    })

    it('names each undeclared error by its method, url and status', () => {
        const responses = [seen(403), seen(200, '/api/order', 'GET'), seen(503, '/api/order', 'GET')]

        expect(undeclaredApiErrors(responses, [])).toEqual([
            `POST ${ORIGIN}${ALLERGY_URL}/7 403`,
            `GET ${ORIGIN}/api/order 503`
        ])
    })
})

describe('the case window', () => {
    // Playwright's context and response need a browser; the guard reads only the response event, the method, the url and the status
    const newContext = (): BrowserContext => guardContext(new EventEmitter() as unknown as BrowserContext)
    const receive = (context: BrowserContext, {method, url, status}: ResponseSeen) => {
        const response = {request: () => ({method: () => method}), url: () => url, status: () => status}
        const emitter = context as unknown as EventEmitter
        emitter.emit('response', response as unknown as Response)
    }
    const forbidden = seen(403)

    beforeEach(() => {
        closeCase()
    })

    it('GIVEN a context opened in the case WHEN its page gets an undeclared 403 THEN the case reports it', () => {
        openCase()
        const context = newContext()

        receive(context, forbidden)

        expect(closeCase()).toEqual([`POST ${forbidden.url} 403`])
    })

    it.each([
        {description: 'the same context passes it', declaredOn: 'same', failures: 0},
        {description: 'another context still reports it', declaredOn: 'other', failures: 1}
    ] as const)('GIVEN the 403 declared on $declaredOn context WHEN the page gets it THEN $description', ({declaredOn, failures}) => {
        openCase()
        const context = newContext()
        const other = newContext()
        expectApiError(declaredOn === 'same' ? context : other, 403, ALLERGY_URL)

        receive(context, forbidden)

        expect(closeCase()).toHaveLength(failures)
    })

    it('GIVEN a context opened outside a case (a beforeAll) WHEN each case gets a 403 on it THEN each case reports it', () => {
        const shared = newContext()

        const reportsPerCase = [1, 2].map(() => {
            openCase()
            receive(shared, forbidden)
            return closeCase().length
        })

        expect(reportsPerCase).toEqual([1, 1])
    })

    it('GIVEN a context an earlier case opened and left open WHEN it gets a 403 in a later case THEN the later case does not report it', () => {
        openCase()
        const earlier = newContext()
        closeCase()

        openCase()
        receive(earlier, forbidden)

        expect(closeCase()).toEqual([])
    })

    it('GIVEN no running case WHEN a guarded context gets a 403 THEN the next case does not report it', () => {
        const context = newContext()

        receive(context, forbidden)
        openCase()

        expect(closeCase()).toEqual([])
    })
})
