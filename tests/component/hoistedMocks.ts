/**
 * The runtime a spec fakes before Nuxt boots. The mock macro rewrites each call into a hoisted `vi.mock`, so its
 * factory sees hoisted bindings only; a spec builds them here, inside `vi.hoisted`, and hands them to the macro:
 *
 *   const {session, useUserSession} = await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).mockSession())
 *   mockNuxtImport('useUserSession', () => useUserSession)
 *
 *   const {mockRoute, mockNavigateTo, useRoute} = await vi.hoisted(async () =>
 *       (await import('~~/tests/component/hoistedMocks')).mockRouteAndNavigation({path: '/admin/economy'}))
 *   mockNuxtImport('useRoute', () => useRoute)
 *   mockNuxtImport('navigateTo', () => mockNavigateTo)
 */
import {reactive, ref, watch} from 'vue'
import {vi} from 'vitest'
import type {UserDetail} from '~/composables/useCoreValidation'

/**
 * The session nuxt-auth-utils would hydrate from a cookie the test runtime has none of; the auth store reading it is real.
 * `session.user` is the one switch: `loggedIn` follows it, and a spec that gates on login alone writes `loggedIn` itself.
 */
export const mockSession = (user: UserDetail | null = null) => {
    const session = {
        user: ref<UserDetail | null>(user),
        loggedIn: ref(user !== null),
        fetch: vi.fn(),
        clear: vi.fn()
    }
    watch(session.user, current => { session.loggedIn.value = current !== null }, {flush: 'sync'})
    const useUserSession = () => ({
        loggedIn: session.loggedIn,
        user: session.user,
        session: ref(null),
        clear: session.clear,
        fetch: session.fetch
    })
    return {session, useUserSession}
}

type RouteQuery = Record<string, string | undefined>
type RouteParams = Record<string, string | undefined>

/**
 * The route a page reads and the navigation it writes, with no router in the test runtime. `mockRoute` is reactive, so
 * the computeds over `route.query` follow a write; `mockNavigateTo` records the calls, and
 * `mockNavigateTo.mockImplementation(landNavigation)` lands each call on the route, as the router does.
 */
export const mockRouteAndNavigation = ({path = '/', params = {}, query = {}}: {path?: string, params?: RouteParams, query?: RouteQuery} = {}) => {
    const mockRoute = reactive({path, params, query, hash: ''})
    const mockNavigateTo = vi.fn()
    const landNavigation = async (to: {path?: string, query?: RouteQuery}) => {
        if (to.path !== undefined) mockRoute.path = to.path
        if (to.query !== undefined) mockRoute.query = to.query
    }
    const useRoute = () => mockRoute
    return {mockRoute, mockNavigateTo, landNavigation, useRoute}
}

/**
 * The app config a server module reads through Nitro's `useAppConfig`, from `app.config.ts` as the app has it; the
 * config module calls Nuxt's `defineAppConfig`, which the unit runtime lacks. Stubbed before the imports, so a module
 * that reads the config as it loads finds it:
 *
 *   await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).stubAppConfig())
 */
export const stubAppConfig = async () => {
    vi.stubGlobal('defineAppConfig', <T>(config: T) => config)
    const appConfig = (await import('~/app.config')).default
    vi.stubGlobal('useAppConfig', () => appConfig)
    return appConfig
}
