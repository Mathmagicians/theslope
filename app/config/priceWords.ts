/**
 * The words a price reads in. Plain module without imports: useTicket, which the server imports, formats an amount
 * with it, and the booking words import what useTicket imports (ADR-017).
 */
export const PRICE_WORDS = {
    /** An amount in whole kroner: "1.500 kr" */
    kroner: (figure: string) => `${figure} kr`
} as const
