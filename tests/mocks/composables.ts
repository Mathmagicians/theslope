
import { vi } from 'vitest'
export const mockApiCall = vi.fn()
export const mockLoadDraft = vi.fn()
export const mockSaveDraft = vi.fn()

export const useApiHandler = () => ({
    apiCall: mockApiCall
})

export const useDraftStorage = () => ({
    loadDraft: mockLoadDraft,
    saveDraft: mockSaveDraft
})
