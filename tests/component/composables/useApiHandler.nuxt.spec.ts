import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import { useApiHandler, resolveUncaughtApiError } from '~/composables/useApiHandler'

// Mock the useToast composable (mockNuxtImport replaces the one auto-import; a #imports module mock breaks the runtime boot)
mockNuxtImport('useToast', () => () => ({
    add: vi.fn()
}))

describe('useApiHandler', () => {
    // @nuxt/test-utils 4 starts Nuxt in beforeAll: composables run there, not in the describe body
    let apiCall: ReturnType<typeof useApiHandler>['apiCall']
    beforeAll(() => {
        ({apiCall} = useApiHandler())
    })
    const state = ref('idle')

    beforeEach(() => {
        state.value = 'idle'
        vi.clearAllMocks()
    })

    it('should handle successful API calls', async () => {
        const mockData = { id: 1, name: 'test' }
        const mockAction = vi.fn().mockResolvedValue(mockData)

        const result = await apiCall(mockAction, state, 'testAction')

        expect(result).toEqual(mockData)
        expect(state.value).toBe('idle')
        expect(mockAction).toHaveBeenCalledTimes(1)
    })

    it('should handle API errors', async () => {
        // Mock must include all 4 properties checked by isApiError()
        const mockError = { statusCode: 400, message: 'Bad Request', statusMessage: 'Bad Request', data: null }
        const mockAction = vi.fn().mockRejectedValue(mockError)

        await expect(apiCall(mockAction, state, 'testAction'))
            .rejects
            .toThrow('Ugyldig forespørgsel. Tjek venligst dine data')

        expect(state.value).toBe('error')
        expect(mockAction).toHaveBeenCalledTimes(1)
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
