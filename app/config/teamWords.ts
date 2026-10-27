/**
 * The cooking team words users read on the chef page. Plain module without auto-imports (ADR-017).
 */
import {useCookingTeamValidation, type TeamRole} from '~/composables/useCookingTeamValidation'

const Role = useCookingTeamValidation().TeamRoleSchema.enum

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
    /** The chef calendar's legend */
    calendarLegend: {
        next: 'Næste madlavning',
        selected: 'Valgt dato',
        planned: 'Planlagt madlavning',
        past: 'Tidligere madlavning',
        overdue: 'Deadline overskredet',
        critical: 'Deadline kritisk (<24t)',
        soon: 'Deadline snart (24-72t)',
        cancelled: 'Aflyst madlavning',
        otherTeam: 'Andet madholds fællesspisning'
    },
    /** The toasts of the chef's dinner actions; a dinner without a menu title is named `untitledDinner` */
    toasts: {
        untitledDinner: 'Fællesspisningen',
        allergensSaved: {
            title: 'Allergeninformation gemt',
            withAllergens: 'Beboerne kan nu se allergenerne i menuen',
            withoutAllergens: 'Menuen er markeret uden allergener'
        },
        announced: {
            title: (isRepublish: boolean) => isRepublish
                ? 'Du har opdateret din menu på Heynabo'
                : 'Du har publiceret din menu på Heynabo',
            description: (heynaboEventId: number | null) => heynaboEventId
                ? `Heynabo event ID: ${heynaboEventId}`
                : 'Ingen Heynabo ID returneret'
        },
        cancelled: {
            title: 'Middag aflyst',
            description: (dinner: string, date: string) => `${dinner} d. ${date} er blevet aflyst`
        },
        reopened: {
            title: 'Aflysning annulleret',
            description: (dinner: string, date: string) => `${dinner} d. ${date} er genåbnet`
        }
    }
} as const
