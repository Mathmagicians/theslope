/**
 * The `data-testid` contract of UserPreferencesCard, shared by its component spec and
 * the UserPreferences e2e spec so one rename lands in both.
 */
export const PREF_TEST_IDS = {
    /** The ⚙ in the UserProfileCard header that reveals the card */
    toggle: 'pref-toggle',
    card: 'pref-card',
    edit: 'pref-edit',
    save: 'pref-save',
    cancel: 'pref-cancel',
    sendTest: 'pref-send-test',
    channel: (channel: string) => `pref-channel-${channel}`,
    palette: (palette: string) => `pref-palette-${palette}`,
    textScale: (textScale: string) => `pref-text-scale-${textScale}`
} as const

/** The badge the accessibility-verified preset carries; Standard carries none */
export const PALETTE_BADGE_TEXT = 'EN 301 549 · WCAG 2.1 AA'
