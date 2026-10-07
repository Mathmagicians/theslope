import {describe, it, expect, vi, beforeAll, beforeEach, expectTypeOf} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {clearNuxtData} from '#app'
import {ref, type Ref} from 'vue'
import {useApiHandler, resolveUncaughtApiError, type StoreAsyncDataOptions} from '~/composables/useApiHandler'
import {useAllergyValidation, type AllergyTypeDetail} from '~/composables/useAllergyValidation'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'

const CATALOG = '/api/admin/allergy-type'
const ERROR_MESSAGE = 'Kunne ikke hente allergi katalog'

// The real showError swaps the test app for the Nuxt error page
const {showErrorSpy} = vi.hoisted(() => ({showErrorSpy: vi.fn()}))
mockNuxtImport('showError', () => showErrorSpy)

const catalogEndpoint = vi.fn()
const createEndpoint = vi.fn()
const goneEndpoint = vi.fn()
const foundEndpoint = vi.fn()
const GONE = [`${CATALOG}/404`, `${CATALOG}/410`] as const
const FOUND = `${CATALOG}/2`
GONE.forEach(path => registerEndpoint(path, goneEndpoint))
registerEndpoint(FOUND, foundEndpoint)
registerEndpoint(`${CATALOG}/1`, () => AllergyFactory.createMockAllergyTypesWithInhabitants().slice(0, 1))
registerEndpoint(CATALOG, catalogEndpoint)
registerEndpoint(CATALOG, {handler: createEndpoint, method: 'PUT'})

const failWith = (statusCode: number) => () => {
    throw createError({statusCode})
}
const lastToast = () => useToast().toasts.value.at(-1)

describe('useApiHandler', () => {
    // @nuxt/test-utils 4 starts Nuxt in beforeAll: composables run there, not in the describe body
    let storeAsyncData: ReturnType<typeof useApiHandler>['storeAsyncData']
    let apiRequest: ReturnType<typeof useApiHandler>['apiRequest']
    let AllergyTypeDetailSchema: ReturnType<typeof useAllergyValidation>['AllergyTypeDetailSchema']
    beforeAll(() => {
        ({storeAsyncData, apiRequest} = useApiHandler())
        ;({AllergyTypeDetailSchema} = useAllergyValidation())
    })

    beforeEach(() => {
        clearNuxtData()
        useToast().clear()
        vi.clearAllMocks()
        catalogEndpoint.mockImplementation(() => AllergyFactory.createMockAllergyTypesWithInhabitants())
        createEndpoint.mockImplementation(() => AllergyFactory.createMockAllergyTypesWithInhabitants()[0])
        goneEndpoint.mockImplementation(failWith(404))
        foundEndpoint.mockImplementation(() => AllergyFactory.createMockAllergyTypesWithInhabitants().slice(0, 1))
        showErrorSpy.mockImplementation((error: {statusCode: number, message: string}) => createError(error))
    })

    describe('storeAsyncData', () => {
        const readCatalog = (key: string, options: Pick<StoreAsyncDataOptions<AllergyTypeDetail[]>, 'immediate' | 'watch'> = {}) =>
            storeAsyncData(key, CATALOG, {schema: AllergyTypeDetailSchema.array(), default: () => [], errorMessage: ERROR_MESSAGE, ...options})

        it('types the data by the schema and parses the response with it', async () => {
            const {data, status} = await readCatalog('catalog-parse')

            expectTypeOf(data).toEqualTypeOf<Ref<AllergyTypeDetail[]>>()
            expect(status.value).toBe('success')
            expect(data.value).toHaveLength(AllergyFactory.createMockAllergyTypesWithInhabitants().length)
            expect(data.value[0]!.inhabitants[0]!.allergyUpdatedAt).toBeInstanceOf(Date)
        })

        it.each([
            {description: 'a failed request', key: 'catalog-request-failure', respond: failWith(500)},
            {description: 'a response the schema rejects', key: 'catalog-parse-failure', respond: () => [{id: 'not-a-number'}]}
        ])('surfaces $description through handleApiError with the call\'s message', async ({key, respond}) => {
            catalogEndpoint.mockImplementation(respond)

            const {data, status} = await readCatalog(key)

            expect(status.value).toBe('error')
            expect(data.value).toEqual([])
            expect(lastToast()?.description).toBe(ERROR_MESSAGE)
        })

        it('stays idle without a request while its gate is closed', async () => {
            const {data, status} = await storeAsyncData('catalog-gated', CATALOG, {
                schema: AllergyTypeDetailSchema.array(), default: () => [], enabled: () => false
            })

            expect(status.value).toBe('idle')
            expect(data.value).toEqual([])
            expect(catalogEndpoint).not.toHaveBeenCalled()
        })

        it('fetches once its gate opens', async () => {
            const isOpen = ref(false)
            const {data} = await storeAsyncData('catalog-opening', CATALOG, {
                schema: AllergyTypeDetailSchema.array(), default: () => [], enabled: () => isOpen.value
            })

            isOpen.value = true

            await vi.waitFor(() => expect(data.value).toHaveLength(AllergyFactory.createMockAllergyTypesWithInhabitants().length))
        })

        it('refetches when its url changes under a constant key', async () => {
            const selectedId = ref(0)
            const {data} = await storeAsyncData('catalog-entry', () => selectedId.value ? `${CATALOG}/${selectedId.value}` : CATALOG, {
                schema: AllergyTypeDetailSchema.array(), default: () => []
            })
            expect(data.value).toHaveLength(AllergyFactory.createMockAllergyTypesWithInhabitants().length)

            selectedId.value = 1

            await vi.waitFor(() => expect(data.value).toHaveLength(1))
        })

        it('resolves its url only after the datasets it depends on', async () => {
            let release = () => {}
            catalogEndpoint.mockImplementation(() => new Promise(resolve => {
                release = () => resolve(AllergyFactory.createMockAllergyTypesWithInhabitants())
            }))
            const upstream = storeAsyncData('catalog-upstream', CATALOG, {schema: AllergyTypeDetailSchema.array(), default: () => []})
            const downstream = storeAsyncData('catalog-downstream', () => `${CATALOG}/${upstream.data.value[0]?.id}`, {
                schema: AllergyTypeDetailSchema.array(), default: () => [], dependsOn: [upstream]
            })

            await vi.waitFor(() => expect(catalogEndpoint).toHaveBeenCalled())
            release()

            await vi.waitFor(() => expect(downstream.status.value).toBe('success'))
            expect(downstream.data.value).toHaveLength(1)
        })

        it('reads its gate after the datasets it depends on and stays idle when it closed meanwhile', async () => {
            const isOpen = ref(true)
            const upstream = storeAsyncData('catalog-upstream-gate', CATALOG, {schema: AllergyTypeDetailSchema.array(), default: () => []})
            const downstream = storeAsyncData('catalog-downstream-gate', `${CATALOG}/1`, {
                schema: AllergyTypeDetailSchema.array(), default: () => [], dependsOn: [upstream], enabled: () => isOpen.value
            })

            isOpen.value = false

            await vi.waitFor(() => expect(downstream.status.value).toBe('idle'))
            expect(downstream.data.value).toEqual([])
        })

        it('passes immediate through: nothing is fetched until execute', async () => {
            const {status, execute} = readCatalog('catalog-deferred', {immediate: false})
            expect(status.value).toBe('idle')
            expect(catalogEndpoint).not.toHaveBeenCalled()

            await execute()
            expect(status.value).toBe('success')
            expect(catalogEndpoint).toHaveBeenCalledTimes(1)
        })

        it('passes watch through: a change of the source refetches', async () => {
            const source = ref(0)
            const {status} = await readCatalog('catalog-watched', {watch: [source]})
            source.value++
            await vi.waitFor(() => expect(catalogEndpoint).toHaveBeenCalledTimes(2))
            expect(status.value).toBe('success')
        })

        it.each([
            {description: 'a constant key', key: (_isOpen: boolean) => 'catalog-gate-constant'},
            {description: 'a key carrying the gate', key: (isOpen: boolean) => `catalog-gate-${isOpen}`}
        ])('clears to the default and idle when the gate closes, with $description', async ({key}) => {
            const isOpen = ref(true)
            const {data, status} = await storeAsyncData(() => key(isOpen.value), `${CATALOG}/1`, {
                schema: AllergyTypeDetailSchema.array(),
                default: () => [],
                enabled: () => isOpen.value
            })
            expect(data.value).toHaveLength(1)

            isOpen.value = false

            await vi.waitFor(() => expect(status.value).toBe('idle'))
            expect(data.value).toEqual([])
        })

        it('follows a reactive key and url', async () => {
            const selectedId = ref<number | null>(null)
            const {data} = await storeAsyncData(
                () => `catalog-entry-${selectedId.value}`,
                () => `${CATALOG}/${selectedId.value}`,
                {schema: AllergyTypeDetailSchema.array(), default: () => [], enabled: () => selectedId.value !== null}
            )
            expect(data.value).toEqual([])

            selectedId.value = 1
            await vi.waitFor(() => expect(data.value).toHaveLength(1))
        })

        describe('a missing resource (404)', () => {
            type Options = StoreAsyncDataOptions<AllergyTypeDetail[]>
            const TOAST = 'Kan ikke finde allergitypen'
            const MESSAGE = 'Den findes ikke længere'
            const DEFAULT_TEXT = 'Kan ikke finde det, du leder efter'
            // Long enough for a second, unwanted request to land before the counts are read
            const settled = () => new Promise(resolve => setTimeout(resolve, 50))
            // The selection a store holds: the url derives from it, recover replaces it
            const readSelection = (key: string, path: Ref<string>, options: Pick<Options, 'notFound' | 'errorMessage'>) =>
                storeAsyncData(key, () => path.value, {schema: AllergyTypeDetailSchema.array(), default: () => [], ...options})
            const toggle = (path: Ref<string>) => () => {
                path.value = path.value === GONE[0] ? GONE[1] : GONE[0]
            }
            const requests = () => ({gone: goneEndpoint.mock.calls.length, found: foundEndpoint.mock.calls.length})

            it('recovers from the first 404: toast, recover once, the re-derived url requested once, no error page', async () => {
                const path = ref<string>(GONE[0])
                const recover = vi.fn(() => {
                    path.value = FOUND
                })

                const {data, status} = readSelection('gone-recover', path, {notFound: {recover, toast: TOAST, message: MESSAGE}})

                await vi.waitFor(() => expect(data.value).toHaveLength(1))
                await settled()
                expect(status.value).toBe('success')
                expect(recover).toHaveBeenCalledTimes(1)
                expect(requests()).toEqual({gone: 1, found: 1})
                expect(lastToast()?.title).toBe(TOAST)
                expect(showErrorSpy).not.toHaveBeenCalled()
            })

            it('ends the request idle and never re-requests the dead url when recover leaves the url', async () => {
                const path = ref<string>(GONE[0])
                const recover = vi.fn()

                const {data, status} = readSelection('gone-idle', path, {notFound: {recover, toast: TOAST}})

                await vi.waitFor(() => expect(recover).toHaveBeenCalledTimes(1))
                await settled()
                expect(status.value).toBe('idle')
                expect(data.value).toEqual([])
                expect(requests()).toEqual({gone: 1, found: 0})
                expect(showErrorSpy).not.toHaveBeenCalled()
            })

            it.each([1, 2])('shows the error page once %i retries are spent, after retries + 1 requests', async (retries) => {
                const path = ref<string>(GONE[0])
                const recover = vi.fn(toggle(path))

                readSelection(`gone-exhausted-${retries}`, path, {notFound: {recover, retries, toast: TOAST, message: MESSAGE}})

                await vi.waitFor(() => expect(showErrorSpy).toHaveBeenCalledWith({statusCode: 404, message: MESSAGE}))
                await settled()
                expect(requests()).toEqual({gone: retries + 1, found: 0})
                expect(recover).toHaveBeenCalledTimes(retries)
                expect(showErrorSpy).toHaveBeenCalledTimes(1)
            })

            it('retries 0: the error page on the first 404, recover still runs, no recovery toast', async () => {
                const path = ref<string>(GONE[0])
                const recover = vi.fn()

                readSelection('gone-no-retry', path, {notFound: {recover, retries: 0, toast: TOAST, message: MESSAGE}})

                await vi.waitFor(() => expect(showErrorSpy).toHaveBeenCalledWith({statusCode: 404, message: MESSAGE}))
                await settled()
                expect(recover).toHaveBeenCalledTimes(1)
                expect(requests()).toEqual({gone: 1, found: 0})
                expect(lastToast()).toBeUndefined()
            })

            it('a success resets the count: a later 404 recovers again', async () => {
                const path = ref<string>(GONE[0])
                const recover = vi.fn(() => {
                    path.value = FOUND
                })
                const {data} = readSelection('gone-reset', path, {notFound: {recover, toast: TOAST}})
                await vi.waitFor(() => expect(data.value).toHaveLength(1))

                path.value = GONE[1]

                await vi.waitFor(() => expect(recover).toHaveBeenCalledTimes(2))
                await settled()
                expect(requests()).toEqual({gone: 2, found: 2})
                expect(showErrorSpy).not.toHaveBeenCalled()
            })

            it.each([
                {description: 'the getters at use time', toast: (name: Ref<string>) => () => `Kan ikke finde ${name.value}`, message: (name: Ref<string>) => () => `Væk: ${name.value}`, expected: {toast: 'Kan ikke finde anden', page: 'Væk: anden'}},
                {description: 'the toast when no message is given', toast: () => TOAST, message: () => undefined, expected: {toast: TOAST, page: TOAST}},
                {description: 'the default for both', toast: () => undefined, message: () => undefined, expected: {toast: DEFAULT_TEXT, page: DEFAULT_TEXT}}
            ])('the toast and the error page read $description', async ({toast, message, expected}) => {
                const name = ref('første')
                const path = ref<string>(GONE[0])
                readSelection(`gone-text-${expected.page}`, path, {
                    notFound: {recover: toggle(path), toast: toast(name), message: message(name)}
                })
                name.value = 'anden'

                await vi.waitFor(() => expect(showErrorSpy).toHaveBeenCalledWith({statusCode: 404, message: expected.page}))
                expect(lastToast()?.title).toBe(expected.toast)
            })

            it.each([
                {description: 'the errorMessage', errorMessage: TOAST, expected: TOAST},
                {description: 'the 404 default', errorMessage: undefined, expected: DEFAULT_TEXT}
            ])('without notFound a 404 toasts $description, no error page', async ({errorMessage, expected}) => {
                const {status} = readSelection(`gone-toast-${expected}`, ref<string>(GONE[0]), {errorMessage})

                await vi.waitFor(() => expect(status.value).toBe('error'))
                expect(lastToast()?.description).toBe(expected)
                expect(String(lastToast()?.title)).toContain('404')
                expect(showErrorSpy).not.toHaveBeenCalled()
            })
        })
    })

    describe('apiRequest', () => {
        const createType = (errorMessage?: string) => apiRequest(CATALOG, {
            method: 'PUT',
            body: AllergyFactory.createMockAllergyTypes()[0],
            action: 'createAllergyType',
            errorMessage,
            schema: AllergyTypeDetailSchema
        })

        it('returns the response parsed with the schema', async () => {
            const created = await createType()

            expectTypeOf(created).toEqualTypeOf<AllergyTypeDetail>()
            expect(created.inhabitants[0]!.allergyUpdatedAt).toBeInstanceOf(Date)
            expect(createEndpoint).toHaveBeenCalledTimes(1)
        })

        it.each([
            {errorMessage: ERROR_MESSAGE, expected: ERROR_MESSAGE},
            {errorMessage: undefined, expected: 'Ugyldig forespørgsel. Tjek venligst dine data'}
        ])('toasts $expected and rethrows the error', async ({errorMessage, expected}) => {
            createEndpoint.mockImplementation(failWith(400))

            await expect(createType(errorMessage)).rejects.toMatchObject({statusCode: 400})
            expect(lastToast()?.description).toBe(expected)
        })
    })

    describe('resolveUncaughtApiError (the error floor of plugins/apiErrors.client.ts)', () => {
        const page = {path: '/admin/teams', fullPath: '/admin/teams?mode=create&team=5'}
        const actions = {login: vi.fn(), toast: vi.fn()}

        it.each([
            {error: {statusCode: 401}, route: page, expectedCall: () => expect(actions.login).toHaveBeenCalledWith(page.fullPath), description: 'a dead session re-authenticates with a return path'},
            {error: {status: 401}, route: page, expectedCall: () => expect(actions.login).toHaveBeenCalledWith(page.fullPath), description: 'FetchError status spelling counts as 401'},
            {error: {statusCode: 500}, route: page, expectedCall: () => expect(actions.toast).toHaveBeenCalledWith({statusCode: 500}), description: 'any other API error surfaces as the standard toast'}
        ])('$description', ({error, route, expectedCall}) => {
            const handler = resolveUncaughtApiError(error, route, actions)
            expect(handler).toBeTypeOf('function')
            handler!()
            expectedCall()
        })

        it.each([
            {error: {statusCode: 401}, route: {path: '/login', fullPath: '/login'}, description: 'the login page keeps its own 401s'},
            {error: new Error('not an api error'), route: page, description: 'non-API errors are not this floor\'s to handle'}
        ])('$description', ({error, route}) => {
            expect(resolveUncaughtApiError(error, route, actions)).toBeNull()
            expect(actions.login).not.toHaveBeenCalled()
            expect(actions.toast).not.toHaveBeenCalled()
        })
    })
})
