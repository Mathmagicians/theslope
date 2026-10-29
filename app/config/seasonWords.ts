/**
 * The season words users read. Plain module without auto-imports (ADR-017).
 */

/** A season's status as its badge and the season selector name it; the values of `SeasonStatusSchema` */
export const SEASON_STATUS = {
    ACTIVE: 'aktiv',
    FUTURE: 'kommende',
    CURRENT: 'i gang',
    PAST: 'afsluttet'
} as const

export const SEASON_WORDS = {
    /** A failed read of the season on view */
    failed: {
        season: 'Kunne ikke hente sæson'
    },
    /** The season the URL names and is gone, as the not-found toast names it before its shortName */
    notFound: 'sæsonen',
    /** The toasts of the admin's season saves; an update's description reports what the save set in motion */
    toasts: {
        created: 'Sæson oprettet',
        updated: {
            title: 'Sæson opdateret',
            reconciled: (created: number, deleted: number) => `${created} datoer tilføjet, ${deleted} fjernet.`,
            scaffolded: 'Forudbestillinger er opdateret.',
            assignTeams: 'Husk at tildele madhold til nye datoer.'
        }
    }
} as const
