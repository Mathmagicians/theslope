/**
 * Settings registry - isomorphic (ADR-017): explicit imports only, no Vue, Pinia or NuxtUI,
 * so the server can import it once settings become editable.
 *
 * The values here are the registry defaults. The coming `Setting` table holds the edited
 * text; a key without a row falls back to the default below, so the UI reads one source.
 */

/** Allergy poster and catalog footer notes - one note per line */
export const DEFAULT_ALLERGY_POSTER_NOTES = [
    'Glutenfri boller findes i fryseren og tages op af madholdet',
    'Ved mælkeprodukter i brød, vil mælke-allergikere også have brug for glutenfrit brød (som altid er mælkefrit)',
    'Husk at give besked om allergener ved menu-præsentationen'
].join('\n')

/** One note per line; blank lines and surrounding whitespace are not notes */
export const splitNotes = (text: string): string[] =>
    text.split('\n').map(line => line.trim()).filter(Boolean)

export const useSetting = () => ({
    DEFAULT_ALLERGY_POSTER_NOTES,
    splitNotes
})
