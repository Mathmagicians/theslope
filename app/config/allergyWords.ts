/**
 * The allergy words users read. Plain module without auto-imports (ADR-017).
 */
export const ALLERGY_WORDS = {
    /** A failed read of the allergy catalog, the allergy poster's notes or the household's allergies */
    failed: {
        allergyTypes: 'Kunne ikke hente allergi katalog',
        posterNotes: 'Kunne ikke hente bemærkninger',
        allergies: 'Kunne ikke hente allergier'
    },
    /** What the URL names and is gone, also on a failed read: the allergy type on view */
    notFound: {
        allergyType: 'Kan ikke finde allergitypen'
    }
} as const
