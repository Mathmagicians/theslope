/**
 * The `data-testid` contract of UserPreferencesCard, shared by the component specs and the e2e
 * helpers and steps, so one rename lands in all of them.
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
