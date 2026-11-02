/**
 * The words a button reads, as its label or as the accessible name of an icon button. Plain module without
 * auto-imports. A label that names its domain's object ("Tilføj gæst", "Gem for alle") lives in that
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
    working: 'Arbejder...',
    /** The label a two-click button shows once the first click arms it */
    confirmAgain: 'Er du sikker? Tryk igen for at bekræfte',
    /** The toggle that shows an order's history */
    history: 'Vis ordrehistorik',
    /** A link out to Heynabo: the logo's name, and the link to a dinner's event there */
    heynabo: {name: 'Heynabo', openEvent: 'Se på Heynabo'},
    /** The button back to the view before, and the button that prints a sheet */
    back: 'Tilbage',
    print: 'Print'
} as const
