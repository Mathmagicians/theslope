import {describe, it, expect, vi, beforeAll, beforeEach, expectTypeOf} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {clearNuxtData} from '#app'
import {ref, type Ref} from 'vue'
import {useApiHandler, resolveUncaughtApiError, type StoreAsyncDataOptions} from '~/composables/useApiHandler'
import {useAllergyValidation, type AllergyTypeDetail} from '~/composables/useAllergyValidation'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'

const CATALOG = '/api/admin/allergy-type'
const ERROR_MESSAGE = 'Kunne ikke hente allergi katalog'

const catalogEndpoint = vi.fn()
const createEndpoint = vi.fn()
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
