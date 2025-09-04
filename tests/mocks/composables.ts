import { vi } from 'vitest'
export const mockApiCall = vi.fn()

export const useApiHandler = () => ({
    apiCall: mockApiCall
})