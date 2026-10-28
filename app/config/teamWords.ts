/**
 * The cooking team words users read on the chef page. Plain module without auto-imports (ADR-017).
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
    /** The person's role on the team on view */
    roles: {
        [Role.CHEF]: {
            title: 'Du er chefkok',
            description: (teamShortName: string) =>
                `Du er chefkok på ${teamShortName} og har ansvaret for at slå en menu op, handle ind og håndtere madlavningen.`
        },
        [Role.COOK]: {
            title: 'Du er kok',
            description: (teamShortName: string) => `Du hjælper cheffen på ${teamShortName} med at lave maden`
        },
        [Role.JUNIORHELPER]: {
            title: 'Du er kokkespire',
            description: (teamShortName: string) => `Du er en sej kokkespire, som hjælper de voksne på ${teamShortName}`
        }
    } satisfies Record<TeamRole, {title: string, description: (teamShortName: string) => string}>,
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
        }
    }
} as const
