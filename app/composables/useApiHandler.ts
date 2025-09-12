export const useApiHandler = () => {
    const handleApiError = (error: any, action: string): string => {
        console.warn(`API Error in ${action}:`, error)
        let message: string

        switch (error.statusCode) {
            case 400:
                message = '' +
                    'Ugyldig forespørgsel. Tjek venligst dine data'
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
            title: `${error.statusCode ?? 500}: Uh, åh, fejl kan ske`,
            description: `${error.message ?? 'Der opstod en uventet fejl'}: ${error.cause ?? 'Ukendt fejl'}`,
            timeout: 10000,
            color: 'orange'
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
