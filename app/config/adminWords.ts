/**
 * The admin page's words: its tabs, the banner a member without the admin role reads, and a failed read behind a tab.
 * Plain module without auto-imports (ADR-017).
 */
export const ADMIN_WORDS = {
    /** The tabs, by the path segment each one owns */
    tabs: {
        planning: 'Planlægning',
        teams: 'Madhold',
        households: 'Husstande',
        allergies: 'Allergier',
        users: 'Brugere',
        economy: 'Økonomi',
        system: 'System'
    },
    /** The banner over the tabs for a member without the admin role */
    readOnly: {
        title: 'Hej, du er ikke administrator',
        description: 'Se, men ikke røre'
    },
    /** The plan store's failed read behind the planning and the teams tab, named by the tab */
    failed: (tab: string) => `Kunne ikke loade data for admin siden - tab ${tab}`
} as const
