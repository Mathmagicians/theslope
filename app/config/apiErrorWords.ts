/**
 * The words of a failed request: the toast that reports it and the not-found texts. Plain module (ADR-017).
 */
export const API_ERROR_WORDS = {
    /** The toast's title: the response's status and the house apology */
    toastTitle: (statusCode: number) => `${statusCode}: Uh, åh, fejl kan ske`,
    /** The toast's text per response status, when the caller names no text of its own */
    status: {
        badRequest: 'Ugyldig forespørgsel. Tjek venligst dine data',
        unauthorized: 'Du er ikke autoriseret til at udføre denne handling',
        serverError: 'Vi har desværre en intern server fejl',
        unexpected: 'Der opstod en uventet fejl'
    },
    /** A resource that is gone, when its caller names no text of its own */
    notFound: 'Kan ikke finde det, du leder efter',
    /** A selected entity that is gone, named by its shortName or its id */
    notFoundOf: (noun: string, name: string) => `Kan ikke finde ${noun} ${name}`
} as const
