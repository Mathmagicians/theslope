/**
 * The household words users read. Plain module without auto-imports (ADR-017).
 */
const householdLabel = (shortName: string, pbsId: number) => `${shortName} · PBS ${pbsId}`

export const HOUSEHOLD_WORDS = {
    /** A failed read of the households, the household on view and a household's detail; the household page names it */
    failed: {
        households: 'Kunne ikke hente husstande',
        household: 'Kunne ikke hente husstand',
        householdDetail: (householdId: number) => `Kunne ikke hente husstand ${householdId}`,
        householdPage: (shortName: string) => `Kunne ikke hente data for husstanden ${shortName}`
    },
    /** The household the URL names and is gone, as the not-found toast names it before its shortName */
    notFound: 'husstanden',
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
            household: (shortName: string, pbsId: number) => `${shortName} (PBS ${pbsId})`,
            goneHousehold: (householdId: number) => `husstand ${householdId}`
        }
    }
} as const
