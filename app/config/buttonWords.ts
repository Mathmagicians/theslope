/**
 * The words a button reads, as its label or as the accessible name of an icon button. Plain module without
 * auto-imports (ADR-017). A label that names its domain's object ("Tilføj gæst", "Gem for alle") lives in that
 * domain's words.
 */
export const BUTTON_WORDS = {
    cancel: 'Annuller',
    save: 'Gem',
    edit: 'Rediger',
    close: 'Luk',
    add: 'Tilføj',
    remove: 'Slet',
    /** The toggle that opens a table row's details */
    openDetails: 'Åbn detaljer',
    /** The label a button shows while its action runs */
    working: 'Arbejder...'
} as const
