type ApiError = { message?: string; statusCode?: number; statusMessage?: string; data?: unknown }

const isApiError = (error: unknown): error is ApiError => {
    if (typeof error !== 'object' || error === null) return false
    return 'statusCode' in error && 'message' in error && 'statusMessage' in error && 'data' in error
}

export const useApiHandler = () => {
    const handleApiError = (error: ApiError | unknown, action: string): string => {
        // Extract serializable parts (FetchError is not a POJO)
        const err = isApiError(error) ? error : { message: String(error) }
        console.error(`API Error in ${action}:`, {
            message: err.message,
            statusCode: err.statusCode,
            statusMessage: err.statusMessage,
            data: err.data
        })
        let message: string

        switch (err.statusCode) {
            case 400:
                message = '' +
                    'Ugyldig forespørgsel. Tjek venligst dine data'
                break
            case 401:
                message = '' +
                    'Du er ikke autoriseret til at udføre denne handling'
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

        const toast = useToast()
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
        } catch (e: any) {
            state.value = 'error'
            throw new Error(handleApiError(e, actionName))
        }
    }

    return {
        apiCall,
        handleApiError
    }
}
