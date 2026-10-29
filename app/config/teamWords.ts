/**
 * The cooking team words users read on the chef page and the admin's team page. Plain module without auto-imports (ADR-017).
 */
import {useCookingTeamValidation, type TeamRole} from '~/composables/useCookingTeamValidation'

const Role = useCookingTeamValidation().TeamRoleSchema.enum

const heynaboSyncProblem = 'Din ændring er gemt, men Heynabo havde et problem. Vi har forsøgt at fikse det, tjek om det ser rigtig ud i Heynabo.'

export const TEAM_WORDS = {
    /** A team on view the person is not on: the badge on its tab and the line under the tabs */
    visit: {
        badge: 'Ikke dit hold',
        line: (teamShortName: string) => `Du er ikke på ${teamShortName}`
    },
    /** A role: its name, and the banner of the person's role on the team on view */
    roles: {
        [Role.CHEF]: {
            label: 'Chefkok',
            title: 'Du er chefkok',
            description: (teamShortName: string) =>
                `Du er chefkok på ${teamShortName} og har ansvaret for at slå en menu op, handle ind og håndtere madlavningen.`
        },
        [Role.COOK]: {
            label: 'Kok',
            title: 'Du er kok',
            description: (teamShortName: string) => `Du hjælper cheffen på ${teamShortName} med at lave maden`
        },
        [Role.JUNIORHELPER]: {
            label: 'Kokkespire',
            title: 'Du er kokkespire',
            description: (teamShortName: string) => `Du er en sej kokkespire, som hjælper de voksne på ${teamShortName}`
        }
    } satisfies Record<TeamRole, {label: string, title: string, description: (teamShortName: string) => string}>,
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
            description: (line: string, amount: string) => `${line}: ${amount} kr`,
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
    /** The admin's team page: a failed team read and the toasts of its team, member and joker saves */
    admin: {
        failed: 'Kunne ikke hente hold',
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
