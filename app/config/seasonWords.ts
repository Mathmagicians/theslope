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
    },
    /** The rules of the admin's season form: its cooking days, its holidays and its ticket prices */
    form: {
        noCookingDay: 'Man skal lave mad mindst en dag om ugen',
        holidaysOverlap: 'Ferieperioder må ikke overlappe hinanden',
        holidayOutsideSeason: 'Ferieperioder skal være inden for fællesspisningssæsonen',
        noTicketPrice: 'Udfyld mindst en billettype',
        ticketPricesAcrossSeasons: 'Alle billetpriser skal tilhøre samme sæson'
    },
    /** The alert over the season on the admin's planning page, per status */
    statusAlert: {
        [SEASON_STATUS.ACTIVE]: {
            title: 'Aktiv sæson',
            description: 'Denne sæson er synlig for alle brugere, som kan se og booke fællesspisninger. Kun én sæson kan være aktiv ad gangen.'
        },
        [SEASON_STATUS.FUTURE]: {
            title: 'Fremtidig sæson',
            description: 'Denne sæson er kun synlig for administratorer. Når du aktiverer sæsonen, kan beboere se og booke fællesspisninger.'
        },
        [SEASON_STATUS.CURRENT]: {
            title: 'Inaktiv sæson',
            description: 'Datoerne for denne sæson siger det er nu! Men den er ikke aktiveret. Aktiver sæsonen for at gøre den synlig for beboere.'
        },
        [SEASON_STATUS.PAST]: {
            title: 'Arkiveret sæson',
            description: 'Denne sæson er afsluttet og kun synlig for administratorer. Gamle sæsoner kan ikke genaktiveres.'
        }
    },
    /** The alert's activation field: its hint while the season is active and while it is not, and its two buttons */
    activation: {
        activeHint: 'Fællesspisnings sæson er i gang',
        inactiveHint: 'Denne sæson er ikke aktiv',
        deactivate: 'Deaktiver Sæson',
        confirmDeactivate: 'Tryk igen for at deaktivere...',
        activate: 'Aktiver Sæson'
    }
} as const
