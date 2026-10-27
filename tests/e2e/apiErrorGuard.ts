import type {BrowserContext, Response} from '@playwright/test'

/**
 * The API error guard of the UI cases (`tests/e2e/uiTest.ts`): a case fails at its end on a 4xx or 5xx its pages got
 * from `/api/`, unless the case declared that status and url (`expectApiError`). `undeclaredApiErrors` is the rule;
 * the rest records what the pages of each case receive.
 */

/** A response a page received */
export type ResponseSeen = {method: string, url: string, status: number}

/** An error a case drives on purpose: its status, and its url as a string the url contains or a RegExp it matches */
export type DeclaredApiError = {status: number, url: string | RegExp}

const FIRST_ERROR_STATUS = 400

const isApiError = ({url, status}: ResponseSeen): boolean =>
    status >= FIRST_ERROR_STATUS && new URL(url).pathname.startsWith('/api/')

const matchesUrl = (pattern: string | RegExp, url: string): boolean =>
    typeof pattern === 'string' ? url.includes(pattern) : pattern.test(url)

const isDeclaredIn = (declared: DeclaredApiError[]) => (response: ResponseSeen): boolean =>
    declared.some(error => error.status === response.status && matchesUrl(error.url, response.url))

/** The 4xx and 5xx `/api/` responses no declaration covers, each named by its method, url and status */
export const undeclaredApiErrors = (responses: ResponseSeen[], declared: DeclaredApiError[]): string[] =>
    responses
        .filter(isApiError)
        .filter(response => !isDeclaredIn(declared)(response))
        .map(({method, url, status}) => `${method} ${url} ${status}`)

/** The responses each guarded context received while the case runs */
type RunningCase = Map<BrowserContext, ResponseSeen[]>

// A worker runs one case at a time; a declaration is the case's, so a context shared across cases starts each without one
let runningCase: RunningCase | null = null
let declarations = new WeakMap<BrowserContext, DeclaredApiError[]>()

/**
 * Records the responses the context's pages receive. A context opened in a case reports to that case alone, so a page
 * a case leaves open never reaches the next one; a context opened outside a case (a `beforeAll`) reports to each case
 */
export const guardContext = (context: BrowserContext): BrowserContext => {
    const openedIn = runningCase
    context.on('response', (response: Response) => {
        const current = runningCase
        if (!current || (openedIn && openedIn !== current)) return
        const seen = current.get(context) ?? []
        seen.push({method: response.request().method(), url: response.url(), status: response.status()})
        current.set(context, seen)
    })
    return context
}

/** Declares an error the case drives on purpose: the context's pages may get `status` from a url matching `url` */
export const expectApiError = (context: BrowserContext, status: number, url: string | RegExp): void => {
    declarations.set(context, [...(declarations.get(context) ?? []), {status, url}])
}

/** Starts recording a case */
export const openCase = (): void => {
    runningCase = new Map()
    declarations = new WeakMap()
}

/** Ends the case: the API errors its pages got and it did not declare */
export const closeCase = (): string[] => {
    const finished: RunningCase = runningCase ?? new Map()
    runningCase = null
    return [...finished].flatMap(([context, seen]) => undeclaredApiErrors(seen, declarations.get(context) ?? []))
}
