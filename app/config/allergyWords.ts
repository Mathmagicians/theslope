/**
 * The allergy words users read. Plain module without auto-imports.
 */
export const ALLERGY_WORDS = {
    /**
     * The allergy editor: the picker's placeholder, a comment's placeholder by its allergy, and the names of the save
     * and remove buttons
     */
    editor: {
        placeholder: '🥛🥐🥚🥜 Vælg allergi...',
        comment: (allergy: string) => `Kommentar til ${allergy}...`,
        saveComment: 'Gem kommentar',
        remove: 'Fjern allergi'
    },
    /**
     * The household's allergies: the card's title and the editor's label on an inhabitant's row
     */
    household: {
        title: 'Familiens allergier og diætkrav',
        editorLabel: 'Tilføj og rediger allergier'
    },
    /**
     * The toasts of the household's allergies: an allergy added or removed, by its name, and a saved comment; and of the
     * catalog: an allergy type created, updated or deleted, by its name, and the saved poster notes
     */
    toasts: {
        title: 'Allergi',
        added: (allergy: string) => `${allergy} tilføjet`,
        removed: (allergy: string) => `${allergy} fjernet`,
        commentSaved: 'Din kommentar er gemt',
        typeCreated: {title: 'Allergi oprettet', description: (allergy: string) => `${allergy} er tilføjet til kataloget`},
        typeUpdated: {title: 'Allergi opdateret', description: (allergy: string) => `${allergy} er opdateret`},
        typeDeleted: {title: 'Allergi slettet', description: (allergy: string) => `${allergy} er fjernet fra kataloget`},
        posterNotesSaved: 'Bemærkninger gemt'
    },
    /** A failed read of the allergy catalog, the allergy poster's notes or the household's allergies */
    failed: {
        allergyTypes: 'Kunne ikke hente allergi katalog',
        posterNotes: 'Kunne ikke hente bemærkninger',
        allergies: 'Kunne ikke hente allergier'
    },
    /** The toggle that opens an inhabitant's allergies on the household page */
    edit: 'Rediger allergier',
    /** The allergy managers' box: its title, its default line, the poster's line and the label beside the managers' faces */
    managers: {
        title: 'Spørgsmål om allergier?',
        message: 'Kontakt den allergiansvarlige, hvis du har brug for at snakke om allergier i din familie:',
        posterMessage: 'Tal med allergiansvarlig for hjælp til at spotte allergener i opskrifterne og udtænke allergihensyn!',
        label: 'Allergiansvarlige'
    },
    /** The printed allergy poster: its title, the date it holds for, its columns and the caption under its QR code */
    poster: {
        title: 'ALLERGI-LISTE for skrånere',
        asOf: (date: string) => `pr. ${date}`,
        allergen: 'ALLERGEN / INTOLERANCE',
        person: 'PERSON',
        scan: 'Scan for online version'
    },
    /** What the URL names and is gone, also on a failed read: the allergy type on view */
    notFound: {
        allergyType: 'Kan ikke finde allergitypen'
    }
} as const
