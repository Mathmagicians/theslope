/**
 * The verbs a button reads, as its label or as the accessible name of an icon button. Plain module without
 * auto-imports (ADR-017). A label that names its object ("Tilføj gæst", "Gem for alle") stays with its component.
 */
export const BUTTON_WORDS = {
    cancel: 'Annuller',
    save: 'Gem',
    edit: 'Rediger',
    close: 'Luk',
    add: 'Tilføj',
    remove: 'Slet'
} as const
