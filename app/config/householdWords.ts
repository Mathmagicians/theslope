/**
 * The household words users read. Plain module without auto-imports (ADR-017).
 */
// Type only: useHousehold reads the family name from here, so a value import would close a cycle
import type {ResidencyStatus} from '~/composables/useHousehold'
import type {DinnerMode} from '~/composables/useBookingValidation'
import {BUTTON_WORDS} from '~/config/buttonWords'

const pbsLabel = (pbsId: number) => `PBS ${pbsId}`
const householdLabel = (shortName: string, pbsId: number) => `${shortName} · ${pbsLabel(pbsId)}`
const householdInParens = (shortName: string, pbsId: number) => `${shortName} (${pbsLabel(pbsId)})`
const address = 'Adresse'
const shortNameWord = 'Forkortelse'
const inhabitantsWord = 'Beboere'

export const HOUSEHOLD_WORDS = {
    /**
     * A failed read of the households, the household on view and a household's detail, the household page naming it;
     * a failed save of a household's data
     */
    failed: {
        households: 'Kunne ikke hente husstande',
        household: 'Kunne ikke hente husstand',
        householdDetail: (householdId: number) => `Kunne ikke hente husstand ${householdId}`,
        householdPage: (shortName: string) => `Kunne ikke hente data for husstanden ${shortName}`,
        save: {title: 'Kunne ikke gemme', description: 'Der opstod en fejl. Prøv igen senere.'}
    },
    /**
     * The household card's dinner preferences: its title, an inhabitant's toggle, the power row's name and the label of
     * its faces, the editor's label for the whole household and for one inhabitant, the description of the alert over power
     * mode's editor, the toast of a save, the alert of the last save, and the how-to under the table with its dinner modes
     */
    preferences: {
        title: 'Husstandens ugentlige booking præferencer',
        edit: 'Rediger præferencer',
        powerRow: {name: 'Alle medlemmer', faces: 'beboere'},
        editor: {
            household: 'Power mode: Opdater præferencer for hele husstanden',
            inhabitant: (name: string) => `Opdater fællesspisning præferencer for ${name}`
        },
        powerAlert: {
            description: (memberCount: number) => `Her kan du editere hele familien på en gang. Ændringer påvirker alle ${memberCount} medlemmer i husstanden. Individuelle præferencer overskrives.`
        },
        saved: {inhabitant: 'Præferencer opdateret', household: 'Alle præferencer opdateret'},
        lastResult: {
            title: 'Sidste ændring',
            description: (lines: string) => `Du har ændret præferencer, og familiens bookinger har ændret sig:\n${lines}`
        },
        powerHint: 'Power mode opdaterer alle medlemmer samtidigt - ændringer opdaterer fremtidige tilmeldinger',
        howTo: {
            title: 'Sådan redigerer du præferencer',
            pencil: 'Klik på blyanten for at redigere enkeltpersoner',
            save: 'Ændringer gemmes når du trykker på GEM, og påvirker fremtidige bookinger',
            modesTitle: 'Valg for fællesspisning:',
            modes: {
                DINEIN: 'Fællesspisning',
                DINEINLATE: 'Sen spisning',
                TAKEAWAY: 'Takeaway',
                NONE: 'Ingen spisning'
            } satisfies Record<DinnerMode, string>
        }
    },
    /** The household the URL names and is gone, as the not-found toast names it before its shortName */
    notFound: 'husstanden',
    /** A household's family name from its last names: the first, the second, and "m.fl." past two */
    familyName: (first: string, second: string | undefined, more: boolean) =>
        `Familien ${first}${second ? ` & ${second}` : ''}${more ? ' m.fl.' : ''}`,
    /**
     * The admin's household list: its title, the create button, a failed read, the search and its sort, and the columns
     */
    adminList: {
        title: 'Husstande på Skråningen',
        create: 'Ny husstand',
        failed: 'Kan ikke hente data for husstande',
        search: 'Søg efter adresse, navn eller person...',
        sort: address,
        columns: {shortName: shortNameWord, pbs: 'PBS', address, inhabitants: inhabitantsWord}
    },
    /** The inhabitant finder's defaults: its search, its columns and its list without inhabitants */
    inhabitantSelector: {
        search: 'Søg efter navn...',
        columns: {name: 'Navn', status: 'Status', action: 'Handling'},
        empty: 'Ingen beboere tilgængelige'
    },
    /**
     * The admin's new household: the rules of the PBS number, the move-in date and the previous household at the
     * address; the form with no address to offer, its title, its fields, a PBS number another household holds, the
     * households already at the address with the move-out of each, and the submit
     */
    createForm: {
        pbsNotNumber: 'PBS skal være et tal',
        pbsNotInteger: 'PBS skal være et helt tal',
        pbsNotPositive: 'PBS skal være positivt',
        movedInDateMissing: 'Du skal sætte en indflytningsdato for den nye familie',
        previousNotMovedOut: 'Ny familie kan ikke flytte ind, så længe den forrige ikke er flyttet ud',
        noAddresses: `I mangler nogen huse at bo i, admin skal synkronisere først med ${BUTTON_WORDS.heynabo.name}`,
        title: 'Ny husstand',
        address: {label: address, placeholder: 'Vælg adresse...'},
        addressOption: (address: string, heynaboId: number) => `${address} · HN ${heynaboId}`,
        pbs: {label: 'PBS', placeholder: 'F.eks. 12345'},
        pbsTaken: (pbsId: number, shortName: string) => `${pbsLabel(pbsId)} bruges af ${shortName}`,
        movedIn: 'Vælg en indflytningsdato',
        prevOwners: (count: number) => `${count === 1 ? 'Eksisterende husstand' : 'Eksisterende husstande'} på adressen`,
        prevOwner: (shortName: string, heynaboId: number, pbsId: number) => `${shortName} · HN ${heynaboId} · ${pbsLabel(pbsId)}`,
        movedOut: (date: string) => `Fraflyttede ${date}`,
        setMoveOut: (shortName: string, pbsId: number) => `Sæt fraflytningsdato for ${householdLabel(shortName, pbsId)}`,
        submit: 'Opret husstand'
    },
    /**
     * The admin's household panel: the facts Heynabo owns, the residency, the inhabitants at the address with the move
     * to this household, and the delete with its confirmation
     */
    editPanel: {
        facts: {
            title: 'Stamdata',
            pbs: 'PBS-nummer',
            address,
            heynaboId: `${BUTTON_WORDS.heynabo.name}-ID`,
            shortName: shortNameWord
        },
        residency: {title: 'Residens', active: 'Aktiv beboer'},
        inhabitants: {
            title: inhabitantsWord,
            household: 'Husstand',
            action: 'Handling',
            search: 'Søg navn, PBS eller adresse...',
            empty: 'Ingen beboere i fællesskabet',
            householdBadge: (shortName: string, pbsId: number) => `${shortName} ${pbsLabel(pbsId)}`,
            here: 'I denne husstand',
            moveHere: 'Flyt hertil'
        },
        delete: {
            label: (shortName: string, pbsId: number) => `Slet ${householdInParens(shortName, pbsId)}`,
            confirm: (shortName: string, pbsId: number, inhabitantCount: number) =>
                `Tryk igen for at slette ${householdInParens(shortName, pbsId)} (${inhabitantCount} beboere slettes)...`
        }
    },
    /**
     * A household moving in, moving out or moved out: per residency status the badge's prefix and the sentence before
     * the date; the alert of a household that cannot book
     */
    residency: {
        status: {
            'pending': {prefix: 'Indflytter', description: 'Familien flytter ind d.'},
            'leaving': {prefix: 'Fraflytter', description: 'Familien fraflytter d.'},
            'moved-out': {prefix: 'Fraflyttet', description: 'Familien er fraflyttet d.'}
        } satisfies Record<Exclude<ResidencyStatus, typeof ResidencyStatus.active>, {prefix: string, description: string}>,
        alert: {
            title: 'Fællesspisning er for beboere',
            description: (dateText: string) => `Familien skal bo her, for at kunne bestille. ${dateText}.`
        }
    },
    /** The settings tab's household facts: the section's title, the PBS number and the move-in date */
    facts: {
        title: 'Husstandsoplysninger',
        pbs: pbsLabel,
        movedIn: (date: string) => `Indflyttet ${date}`
    },
    /**
     * The household's move-out: the card's title, its status without plans, the alert while the date is edited, the
     * date's label, the undo, set and save buttons, the toasts of a save, and the "Sidste ændring" alert's sentence
     * over the household's changed bookings
     */
    moveOut: {
        title: 'Fraflytning',
        noPlans: 'Familien har ingen flytteplaner',
        changeAlert: {
            title: 'Ændring af fraflytningsdato',
            description: 'Bookinger efter den nye dato slettes, og bookinger før den nye dato kan genoprettes.'
        },
        setAlert: {
            title: 'Advarsel',
            description: 'Når du sætter en fraflytningsdato, slettes alle bookinger efter den valgte dato for husstanden.'
        },
        dateLabel: 'Fraflytningsdato',
        undo: {label: 'Fortryd flytning', confirm: 'Klik igen for at fortryde'},
        set: {label: 'Sæt fraflytningsdato', confirm: 'Klik igen for at bekræfte fraflytning'},
        save: 'Gem fraflytningsdato',
        toasts: {
            set: 'Fraflytningsdato sat',
            cleared: 'Fraflytning fortrudt'
        },
        lastResult: (lines: string) => `Fraflytningsdato ændret, og familiens bookinger har ændret sig:\n${lines}`
    },
    /** The household's calendar subscription: its title, the how-to, the fetch button, and the file to download */
    calendarFeed: {
        title: 'Kalenderabonnement',
        intro: 'Abonner på familiens fællesspisningskalender i din foretrukne kalenderapp (Google Calendar, Apple Calendar, Outlook)',
        fetch: 'Hent kalender (.ical)',
        generated: 'Kalenderfeed genereret:',
        fileName: 'skraaningen-faellesspisning.ics',
        download: (fileName: string) => `Download ${fileName}`
    },
    /** The household page: its description, the banner a visitor reads and the admin's override */
    page: {
        description: (shortName: string) => `Tilmeldinger for husstanden ${shortName}`,
        visitor: {
            title: 'Du besøger nu en anden husstand end din egen',
            description: 'Kigge, ikke røre',
            override: 'Admin røre alligevel',
            confirmOverride: 'Klik igen for at låse op'
        },
        override: {
            title: 'Admin rører, men forsigtigt',
            exit: 'Afslut'
        }
    },
    /** The admin's household toasts: a household named by its shortName and PBS number */
    toasts: {
        created: {title: 'Husstand oprettet', description: householdLabel},
        deleted: {title: 'Husstand slettet', description: householdLabel},
        /** An inhabitant moved to another household; a household the list has dropped is named by its id */
        moved: {
            title: (name: string, lastName: string, household: string) => `${name} ${lastName} flyttet til ${household}`,
            household: householdInParens,
            goneHousehold: (householdId: number) => `husstand ${householdId}`
        }
    }
} as const
