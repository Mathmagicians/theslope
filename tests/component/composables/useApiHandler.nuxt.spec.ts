import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useApiHandler } from '~/composables/useApiHandler'

// Mock the useToast composable
vi.mock('#imports', () => ({
    useToast: () => ({
        add: vi.fn()
    })
}))

describe('useApiHandler', () => {
    const { apiCall } = useApiHandler()
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
        const mockError = { statusCode: 400 }
        const mockAction = vi.fn().mockRejectedValue(mockError)

        await expect(apiCall(mockAction, state, 'testAction'))
            .rejects
            .toThrow('Ugyldig forespørgsel. Tjek venligst dine data')

        expect(state.value).toBe('error')
        expect(mockAction).toHaveBeenCalledTimes(1)
    })
})
