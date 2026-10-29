/**
 * The user words: what admins read on the users page, and a member's own preferences in Mine indstillinger.
 * Plain module without auto-imports (ADR-017).
 */
import {useUserPreferenceValidation, type NotificationChannel, type Palette, type TextScale, type PALETTES} from '~/composables/useUserPreferenceValidation'

const {NotificationChannelSchema, PaletteSchema, TextScaleSchema} = useUserPreferenceValidation()
const Channel = NotificationChannelSchema.enum
const PaletteKey = PaletteSchema.enum
const TextScaleKey = TextScaleSchema.enum

/** A contrast level the palette registry verifies a palette at */
type ContrastLevel = NonNullable<typeof PALETTES[Palette]['level']>

export const USER_WORDS = {
    /** Mine indstillinger: the card's title and section headings, its options and the badges a palette earns */
    preferences: {
        title: 'Mine indstillinger',
        notifications: 'Notifikationer',
        palette: 'Farvevalg',
        textScale: 'Tekst',
        sendTest: 'Send testbesked',
        smsNeedsPhone: 'SMS kræver telefonnummer i Heynabo',
        channels: {
            [Channel.EMAIL]: 'E-mail',
            [Channel.SMS]: 'SMS'
        } satisfies Record<NotificationChannel, string>,
        palettes: {
            [PaletteKey.default]: 'Glade farver',
            [PaletteKey['high-contrast']]: 'Høj kontrast',
            [PaletteKey.colorblind]: 'Til farveblinde'
        } satisfies Record<Palette, string>,
        textScales: {
            [TextScaleKey.normal]: 'Normal',
            [TextScaleKey.large]: 'Stor',
            [TextScaleKey.larger]: 'Større'
        } satisfies Record<TextScale, string>,
        // The contrast badge claims contrast only - not full conformance - and names no WCAG version
        levelBadges: {
            AA: '🇪🇺 EN 301 549 · Kontrast AA ✓',
            AAA: '🇪🇺 EN 301 549 · Kontrast AAA ✓'
        } satisfies Record<ContrastLevel, string>,
        colourSafeBadge: '👁 Nedsat farvesyn · Okabe–Ito ✓'
    },
    /** The toast of a saved role change */
    toasts: {
        rolesUpdated: {
            title: 'Roller opdateret',
            description: 'Brugerens roller er blevet opdateret'
        }
    }
} as const
