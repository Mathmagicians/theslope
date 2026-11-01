/**
 * The season words users read. Plain module without auto-imports (ADR-017).
 */
import {FORM_MODES, type FormMode} from '~/types/form'

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
    /**
     * The admin's season form: the title's verb per form mode before the season's name, the line naming the holiday
     * calendar the season follows and its link, the cooking days' unit, each field's label, the two lists' headings, and
     * the heading over the form's errors
     */
    editor: {
        titleVerbs: {[FORM_MODES.VIEW]: '', [FORM_MODES.EDIT]: 'Redigerer', [FORM_MODES.CREATE]: 'Opretter'} satisfies Record<FormMode, string>,
        name: 'fællesspisning sæson',
        holidayCalendar: {lead: 'Vi følger folkeskolernes feriekalender i', link: 'Lejre Kommune.'},
        cookingDays: 'Madlavningsdage',
        seasonDates: 'Fællesspisning sæsonens start - slut datoer',
        weekdays: 'Hvilke ugedage skal der være fællesspisning?',
        holidays: 'Hvornår holder fællesspisning fri?',
        ticketIsCancellableDaysBefore: 'Hvor mange dage før fællespisning, skal man kunne afbestille sin billet?',
        diningModeIsEditableMinutesBefore: 'Hvor mange minutter før fællespisning, skal man kunne ændre mellem spisesal og takeaway?',
        consecutiveCookingDays: 'Hvor mange dage i træk laver madholdene mad?',
        ticketPrices: 'Billetpriser',
        errors: 'Formen indeholder fejl, som skal rettes:'
    },
    /**
     * The season form's ticket prices: the add card's title, its fields' labels and placeholders, its add button, and a
     * price's remove button by its ticket type
     */
    ticketPriceEditor: {
        addTitle: 'Tilføj billettyper',
        ticketType: 'Billettype',
        price: 'Pris (DKK)',
        maxAge: {label: 'Angiv aldersgrænse', placeholder: 'Eventuel aldersgrænse'},
        description: {label: 'Beskrivelse (valgfrit)', placeholder: "F.eks. 'Fra 11 år og opefter'"},
        add: 'Tilføj billet',
        remove: (ticketType: string) => `Fjern ${ticketType}-billet`
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
