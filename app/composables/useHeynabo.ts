/**
 * Heynabo Integration Composable
 *
 * Provides utilities for integrating with the Heynabo platform:
 * - User profile links
 * - Event creation (future)
 * - Message posting (future)
 */

export function useHeynabo() {
    const config = useRuntimeConfig()

    /**
     * Construct URL to a Heynabo user profile
     * @param heynaboId - The Heynabo user ID
     * @returns Full URL to user profile in Heynabo, or null if no ID provided
     * @example
     * // Input: heynaboId = 48
     * // API URL: https://skraaningeni.spaces.heynabo.com/api
     * // Returns: https://skraaningeni.spaces.heynabo.com/desktop/users/residents/48
     */
    const getUserUrl = (heynaboId?: number): string | null => {
        if (!heynaboId) return null
        const apiUrl = config.public.HEY_NABO_API
        return apiUrl.replace('/api', `/desktop/users/residents/${heynaboId}`)
    }



    return {
        getUserUrl
    }
}
