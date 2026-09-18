/**
 * Setting validation - the `Setting` table's validation layer and its key registry (ADR-001).
 *
 * A setting is a key the code knows about and a value the users edit. Everything the server
 * needs to serve a key lives in `SETTING_REGISTRY`: the shape of the value, the text to answer
 * with while the key has no row, and the predicate that decides who may write it. A new
 * editable text is a key plus a registry entry - never a migration.
 *
 * One entity type: an index of settings would carry the same four fields as a detail, so
 * Display is Detail (ADR-009 caps at two, and here two would be the same type).
 *
 * Isomorphic (ADR-017): explicit imports only, no Vue, Pinia or NuxtUI, because the
 * repository, the authorization helper and both endpoints import it.
 */
import {z} from 'zod'
import type {UserDetail, UserDisplay} from '~/composables/useCoreValidation'
import {canMutateAllergies} from '~/composables/usePermissions'

/** Every key the app stores in `Setting`. A new editable text is an entry here and one in SETTING_REGISTRY */
export const SETTING_KEYS = ['allergy-poster-notes'] as const

export const SettingKeySchema = z.enum(SETTING_KEYS)

/**
 * A setting as it crosses the wire. `updatedAt` and `updatedByUserId` are null for a key
 * that has no row yet - the endpoint answers with the registry default, which nobody wrote.
 */
export const SettingDetailSchema = z.object({
    key: SettingKeySchema,
    value: z.string(),
    updatedAt: z.coerce.date().nullable(),
    updatedByUserId: z.number().int().nullable()
})

export type SettingKey = z.infer<typeof SettingKeySchema>
export type SettingDetail = z.infer<typeof SettingDetailSchema>

/** Allergy poster and catalog footer notes - one note per line */
export const DEFAULT_ALLERGY_POSTER_NOTES = [
    'Glutenfri boller findes i fryseren og tages op af madholdet',
    'Ved mælkeprodukter i brød, vil mælke-allergikere også have brug for glutenfrit brød (som altid er mælkefrit)',
    'Husk at give besked om allergener ved menu-præsentationen'
].join('\n')

/** One note per line; blank lines and surrounding whitespace are not notes */
export const splitNotes = (text: string): string[] =>
    text.split('\n').map(line => line.trim()).filter(Boolean)

type SettingRegistryEntry = {
    /** Validates the value on the way in, and the stored JSON on the way out */
    valueSchema: z.ZodType<string>
    /** Answered while the key has no row */
    defaultValue: string
    /** Runs on the session user in the POST endpoint (403 when it says no) */
    canWrite: (user: UserDetail | UserDisplay) => boolean
}

export const SETTING_REGISTRY: Record<SettingKey, SettingRegistryEntry> = {
    'allergy-poster-notes': {
        valueSchema: z.string().trim().min(1).max(2000),
        defaultValue: DEFAULT_ALLERGY_POSTER_NOTES,
        canWrite: canMutateAllergies
    }
}

export const useSettingValidation = () => ({
    SETTING_KEYS,
    SettingKeySchema,
    SettingDetailSchema,
    SETTING_REGISTRY,
    DEFAULT_ALLERGY_POSTER_NOTES,
    splitNotes
})
