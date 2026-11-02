/**
 * The cooking team words users read on the chef page and the admin's team page. Plain module without auto-imports: the server imports it too.
 */
import {useCookingTeamValidation, type TeamRole} from '~/composables/useCookingTeamValidation'
import {DinnerMode} from '~/composables/useBookingValidation'
import {PRICE_WORDS} from '~/config/priceWords'
import {SEASON_WORDS} from '~/config/seasonWords'

const Role = useCookingTeamValidation().TeamRoleSchema.enum

const heynaboSyncProblem = 'Din ændring er gemt, men Heynabo havde et problem. Vi har forsøgt at fikse det, tjek om det ser rigtig ud i Heynabo.'
const changeChefDuty = 'Rediger chefkokketjans'

export const TEAM_WORDS = {
    /** The chef page: its tab's title and description, the master's title, and the failed reads of the person's teams and of the calendar */
    page: {
        title: '👨‍🍳 Madlavning',
        description: 'Menu editing and dinner management for cooking teams',
        myTeams: 'Mine Madhold',
        teamsFailed: 'Vi kan ikke hente dine madhold. Prøv at genindlæse siden.',
        calendarFailed: 'Vi kan ikke hente data til kalenderen. Prøv at genindlæse siden 🔃.'
    },
    /** The kitchen's panels on the dinner page: one per eating mode the kitchen serves, then the tickets for sale */
    kitchen: {
        panels: {
            [DinnerMode.TAKEAWAY]: 'TAKEAWAY',
            [DinnerMode.DINEIN]: 'SPISESAL',
            [DinnerMode.DINEINLATE]: 'SPIS SENT'
        } satisfies Record<Exclude<DinnerMode, typeof DinnerMode.NONE>, string>,
        forSale: 'TIL SALG'
    },
    /** A team on view the person is not on: the badge on its tab and the line under the tabs */
    visit: {
        badge: 'Ikke dit hold',
        line: (teamShortName: string) => `Du er ikke på ${teamShortName}`
    },
    /** A role: its name, its name for a group on the kitchen monitor, and the banner of the person's role on the team on view */
    roles: {
        [Role.CHEF]: {
            label: 'Chefkok',
            plural: 'Chefkokke',
            title: 'Du er chefkok',
            description: (teamShortName: string) =>
                `Du er chefkok på ${teamShortName} og har ansvaret for at slå en menu op, handle ind og håndtere madlavningen.`
        },
        [Role.COOK]: {
            label: 'Kok',
            plural: 'Kokke',
            title: 'Du er kok',
            description: (teamShortName: string) => `Du hjælper cheffen på ${teamShortName} med at lave maden`
        },
        [Role.JUNIORHELPER]: {
            label: 'Kokkespire',
            plural: 'Kokkespirer',
            title: 'Du er kokkespire',
            description: (teamShortName: string) => `Du er en sej kokkespire, som hjælper de voksne på ${teamShortName}`
        }
    } satisfies Record<TeamRole, {label: string, plural: string, title: string, description: (teamShortName: string) => string}>,
    /**
     * The team card: a team without a name, the name field, the delete and its second click's line, the members' section
     * and a member's removal, the jokers' section with a slot's shifts and its delete, the finder's heading, its action
     * column and the badge of a free inhabitant, the team that must be saved first, the joker add row, the cooking days
     * on the edit face and on view
     */
    card: {
        fallbackName: (teamNumber: number) => `Madhold ${teamNumber}`,
        nameField: 'Holdnavn',
        delete: {label: (team: string) => `Slet ${team}`, confirm: (team: string) => `Tryk igen for at slette ${team}...`},
        members: 'Holdmedlemmer',
        removeMember: (fullName: string) => `Fjern ${fullName} fra holdet`,
        jokers: 'Jokere',
        shifts: (count: number) => `${count} ${count === 1 ? 'vagt' : 'vagter'}`,
        deleteJoker: (period: string) => `Slet jokertjans ${period}`,
        addMembers: 'Tilføj medlemmer',
        addToTeam: 'Tilføj til hold',
        free: 'LEDIG',
        unsaved: 'Hold skal gemmes før medlemmer kan tilføjes',
        addJokers: 'Tilføj jokere',
        jokerRow: 'Joker · en plads uden navn',
        cookingDays: {edit: 'Holdets madlavningsdage', view: SEASON_WORDS.editor.cookingDays}
    },
    /**
     * The button by a taken chef duty that changes it; the danger zone's dinner cancel, its action, what it does and its
     * second click's line, and its pointer to that button for a chef who only resigns
     */
    dutyChange: {
        trigger: changeChefDuty,
        cancelDinner: {
            action: 'Aflys middagen',
            effect: '— hele fællesspisningen aflyses for alle beboere.',
            confirm: (date: string) => `Tryk igen for at aflyse ${date}`
        },
        resignHint: `Skal du blot melde fra som chefkok? Brug «${changeChefDuty}» ved kokkens portræt nedenfor.`
    },
    /**
     * The chef's menu card: the action row (the menu edit and its hint, the publish before the dinner is on Heynabo, the
     * actions trigger's name, a cancelled dinner's reopen and its second click's line), the danger zone's heading, the
     * alert of a menu too bare to publish, the extra portions (the entry, the waiting list alert's title, the form), the
     * menu form's fields, the allergen line and its editor, the grocery lines, and the compact card's budget in whole kroner
     */
    menuCard: {
        editMenu: 'Rediger menu',
        editHint: 'Rediger og publicer aftenens menu',
        publish: 'Publicer',
        moreActions: 'Flere handlinger',
        reopen: {action: 'Annuller aflysning', confirm: (date: string) => `Tryk igen for at genåbne ${date}...`},
        dangerZone: 'Farezone',
        menuMissing: 'Chefkokken skal oprette en menu, før den kan publiceres',
        extraPortions: {
            open: 'Frigiv portioner',
            queueTitle: (queued: string, portions: string) => `${queued} · ${portions} portioner`,
            label: 'Kan du frigive portioner?',
            hint: 'Portioner, f.eks. 2,5',
            dismiss: 'Fortryd',
            submit: 'Frigiv'
        },
        menuForm: {
            title: {label: 'Menu titel', hint: 'Hvad er aftenens ret?', placeholder: 'Aftenens ret, f.eks. Spaghetti Carbonara'},
            description: {label: 'Beskrivelse', hint: 'Beskriv menuen kort', placeholder: 'Kort beskrivelse af retten og evt. tilbehør'}
        },
        allergens: {label: 'Allergener', edit: 'Rediger allergener', editorTitle: 'Allergener i menuen'},
        groceries: {title: 'Madbestilling', hint: 'Hvad kostede indkøbene?', empty: 'Madbestilling mangler', edit: 'Rediger madbestilling'},
        budget: (kroner: number) => `💰 ${PRICE_WORDS.kroner(`${kroner}`)}`
    },
    /**
     * The chef calendar: its countdown's title and time label ("madlavning kl 18:00"), its two views, the agenda's
     * heading over the days, and the chevron's name when the calendar is open and when it is closed
     */
    calendar: {
        countdownTitle: 'Næste Madlavning',
        countdownTimeLabel: 'madlavning',
        views: {agenda: 'Agenda', calendar: 'Kalender'},
        agendaTitle: 'Maddage',
        hide: 'Skjul kalender',
        show: 'Vis kalender'
    },
    /** The chef calendar's legend; the selected day reads the calendars' shared word (`DATE_WORDS.calendarLegend`) */
    calendarLegend: {
        next: 'Næste madlavning',
        planned: 'Planlagt madlavning',
        past: 'Tidligere madlavning',
        overdue: 'Deadline overskredet',
        critical: 'Deadline kritisk (<24t)',
        soon: 'Deadline snart (24-72t)',
        cancelled: 'Aflyst madlavning',
        otherTeam: 'Andet madholds fællesspisning'
    },
    /**
     * The toasts of the chef's dinner actions, and the words of a failed one; a dinner without a menu title is named
     * `untitledDinner`
     */
    toasts: {
        untitledDinner: 'Fællesspisningen',
        allergensSaved: {
            title: 'Allergeninformation gemt',
            withAllergens: 'Beboerne kan nu se allergenerne i menuen',
            withoutAllergens: 'Menuen er markeret uden allergener',
            failed: 'Kunne ikke gemme allergeninformation'
        },
        announced: {
            title: (isRepublish: boolean) => isRepublish
                ? 'Du har opdateret din menu på Heynabo'
                : 'Du har publiceret din menu på Heynabo',
            description: (heynaboEventId: number | null) => heynaboEventId
                ? `Heynabo event ID: ${heynaboEventId}`
                : 'Ingen Heynabo ID returneret',
            failed: 'Kunne ikke annoncere fællesspisningen'
        },
        cancelled: {
            title: 'Middag aflyst',
            description: (dinner: string, date: string) => `${dinner} d. ${date} er blevet aflyst`,
            failed: 'Kunne ikke aflyse fællesspisningen'
        },
        reopened: {
            title: 'Aflysning annulleret',
            description: (dinner: string, date: string) => `${dinner} d. ${date} er genåbnet`,
            failed: 'Kunne ikke annullere aflysningen'
        },
        /** A dinner save that landed while the Heynabo sync failed (207); without an event id the chef publishes again */
        heynaboSync: {
            title: 'Heynabo-synkronisering',
            description: (heynaboEventId: number | null) => heynaboEventId
                ? heynaboSyncProblem
                : `${heynaboSyncProblem} Tryk på Publicer knappen igen`
        },
        /** A role the person just took on a dinner: the role's label, the dinner's date, and the team when it has one */
        roleClaimed: (roleLabel: string, date: string, teamShortName: string | null) =>
            `Du er nu blevet ${roleLabel.toLowerCase()} for middagen d. ${date}${teamShortName ? ` med ${teamShortName}` : ''}`,
        /** A save on a dinner without a chef claims the role, and the title names it */
        menuSaved: {
            title: (roleClaimed: string | null) => roleClaimed ? `Menu gemt — ${roleClaimed}` : 'Menu gemt',
            description: (menuTitle: string) => `"${menuTitle}" er nu opdateret`,
            failed: 'Kunne ikke gemme ændringer til menuen'
        },
        expenseAdded: {
            title: 'Indkøb gemt',
            description: (line: string, amount: string) => `${line}: ${PRICE_WORDS.kroner(amount)}`,
            failed: 'Kunne ikke gemme indkøbet'
        },
        expenseRemoved: {
            title: 'Indkøb slettet',
            failed: 'Kunne ikke slette indkøbet'
        },
        extraPortions: {
            title: 'Portioner frigivet',
            description: (assigned: number, waiting: number) => `${assigned} fik billet, ${waiting} står stadig på ventelisten`,
            failed: 'Kunne ikke frigive portionerne'
        },
        /** A chef's resignation; a 207 means the role is gone and the Heynabo event still stands */
        resigned: {
            title: 'Du har meldt afbud. Tjansen som chefkok er nu ledig.',
            heynaboFailed: {
                title: 'Heynabo-synkronisering fejlede',
                description: 'Tjansen er fjernet, men Heynabo-begivenheden kunne ikke slettes. Tjek Heynabo.'
            }
        }
    },
    /**
     * The admin's team page: a failed team read, the create button, the create face's question (how many teams, and how
     * many more beside the season's teams), and the toasts of its team, member and joker saves
     */
    admin: {
        failed: 'Kunne ikke hente hold',
        create: 'Opret madhold',
        count: {
            first: 'Hvor mange madhold skal vi have?',
            more: (teams: number) => `Vi har allerede ${teams} madhold. Hvor mange nye vil du lave?`
        },
        created: {
            title: 'Madhold oprettet',
            description: (teams: number, eventsAssigned: number) => `${teams} madhold oprettet · ${eventsAssigned} madlavninger tildelt`
        },
        affinityUpdated: 'Madlavningsdage for teams opdateret',
        deleted: 'Madhold slettet',
        memberAdded: 'Medlem tilføjet til hold',
        memberUpdated: 'Medlem opdateret',
        memberRemoved: 'Medlem fjernet fra hold',
        jokerAdded: 'Joker tilføjet',
        jokerRemoved: 'Joker fjernet'
    }
} as const
