type ApiError = { message?: string; statusCode?: number; statusMessage?: string; data?: unknown }

const isApiError = (error: unknown): error is ApiError => {
    if (typeof error !== 'object' || error === null) return false
    return 'statusCode' in error || 'status' in error
}

export const useApiHandler = () => {
    // Capture toast reference during setup context
    const toast = useToast()

    const handleApiError = (error: ApiError | unknown, action: string, customMessage?: string): string => {
        // Extract serializable parts (FetchError is not a POJO)
        // FetchError may use 'status' instead of 'statusCode'
        const rawErr = error as Record<string, unknown>
        const err: ApiError = isApiError(error)
            ? { ...error, statusCode: error.statusCode ?? (rawErr.status as number) }
            : { message: String(error) }

        // ADR-004: Consistent CTX log format, no raw error objects
        const statusInfo = err.statusCode ? `${err.statusCode}` : 'unknown'
        const msgInfo = err.message ?? err.statusMessage ?? 'No message'
        console.error(`❌ > API_ERROR > [${action}] ${statusInfo}: ${msgInfo}`)
        let message: string

        if (customMessage) {
            message = customMessage
        } else {
            switch (err.statusCode) {
                case 400:
                    message = 'Ugyldig forespørgsel. Tjek venligst dine data'
                    break
                case 401:
                    message = 'Du er ikke autoriseret til at udføre denne handling'
                    break
                case 404:
                    message = 'Data blev ikke fundet'
                    break
                case 500:
                    message = 'Vi har desværre en intern server fejl'
                    break
                default:
                    message = 'Der opstod en uventet fejl'
            }
        }

        toast.add({
            icon: 'i-heroicons-exclamation-triangle',
            title: `${err.statusCode ?? 500}: Uh, åh, fejl kan ske`,
            description: message,
            duration: 10000,
            color: 'warning'
        })

        return message
    }

    const apiCall = async <T>(
        action: () => Promise<T>,
        state: Ref<string>,
        actionName: string
    ) => {
        const prevState = state.value
        state.value = 'loading'
        try {
            const result = await action()
            state.value = prevState
            return result
        } catch (e: unknown) {
            state.value = 'error'
            throw new Error(handleApiError(e, actionName))
        }
    }

    return {
        apiCall,
        handleApiError
    }
}
