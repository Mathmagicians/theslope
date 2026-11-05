/**
 * The admin page's words: its head, its tabs, the banner a member without the admin role reads, and a failed read
 * behind a tab. Plain module without auto-imports.
 */
export const ADMIN_WORDS = {
    /** The document's title and meta description */
    page: {
        title: '😎 Administration',
        description: 'Administration af fællesspisningen: planlægning, madhold, husstande, allergier, brugere, økonomi og system'
    },
    /** The tabs, by the path segment each one owns; the names of the areas they hold wherever the app names them */
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
