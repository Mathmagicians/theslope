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

/** The contrast badge every palette with a verified level carries - the AA and the AAA one alike */
export const PALETTE_BADGE_TEXT = 'EN 301 549 · Kontrast AA'

/** The badge the colour-safe palette carries beside its contrast badge */
export const COLOUR_SAFE_BADGE_TEXT = 'Nedsat farvesyn · Okabe–Ito'
