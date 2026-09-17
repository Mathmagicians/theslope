/**
 * User preference validation - the two columns behind "Mine indstillinger" (ADR-001 validation layer).
 *
 * `User.notificationChannels` is a JSON array of the generated NotificationChannel enum; `User.appearance`
 * is the JSON object typed by AppearanceSchema. Isomorphic (ADR-017): explicit imports only, no Vue, Pinia
 * or NuxtUI, because the preferences endpoint imports it. Danish labels and badge wording belong to the
 * component; the registry here carries only the level a preset is verified at.
 */
import {z} from 'zod'
import {NotificationChannelSchema} from '~~/prisma/generated/zod'

/** One palette preset per `html[data-palette="…"]` block under app/assets/css/palettes */
export const PaletteSchema = z.enum(['default', 'tydelig', 'colorblind'])

/** One text scale per `html[data-text-scale="…"]` rule in app/assets/css/main.css */
export const TextScaleSchema = z.enum(['normal', 'large', 'larger'])

export const AppearanceSchema = z.object({
    palette: PaletteSchema.default('default'),
    textScale: TextScaleSchema.default('normal')
})

export type Palette = z.infer<typeof PaletteSchema>
export type TextScale = z.infer<typeof TextScaleSchema>
export type Appearance = z.infer<typeof AppearanceSchema>
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>

/** The `User.appearance` column default */
export const DEFAULT_APPEARANCE: Appearance = {palette: 'default', textScale: 'normal'}

/** The `User.notificationChannels` column default */
export const DEFAULT_NOTIFICATION_CHANNELS: NotificationChannel[] = ['EMAIL']

/**
 * The palette registry: one entry per preset, carrying the contrast level
 * `designSystemContrast.unit.spec.ts` verifies it at (`null` = no verified level) and whether
 * `designSystemColourVision.unit.spec.ts` verifies that its meanings stay apart under
 * protanopia, deuteranopia and tritanopia.
 */
export const PALETTES: Record<Palette, {level: 'AA' | 'AAA' | null, colourSafe: boolean}> = {
    default: {level: null, colourSafe: false},
    tydelig: {level: 'AA', colourSafe: false},
    colorblind: {level: 'AA', colourSafe: true}
}

/** Body of POST /api/user/preferences - either field alone, or both in one save */
export const UserPreferencesUpdateSchema = z.object({
    notificationChannels: z.array(NotificationChannelSchema),
    appearance: AppearanceSchema
}).partial()

export type UserPreferencesUpdate = z.infer<typeof UserPreferencesUpdateSchema>

export const useUserPreferenceValidation = () => ({
    NotificationChannelSchema,
    PaletteSchema,
    TextScaleSchema,
    AppearanceSchema,
    UserPreferencesUpdateSchema,
    PALETTES,
    DEFAULT_APPEARANCE,
    DEFAULT_NOTIFICATION_CHANNELS
})
