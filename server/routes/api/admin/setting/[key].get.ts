/**
 * GET /api/admin/setting/[key] - the stored value of a registered setting.
 *
 * Open to every authenticated user (the route table lets admin GETs through), because the
 * surfaces that read settings are member-facing - the allergy poster prints the notes.
 *
 * A registered key never answers 404: without a row the answer is the registry default,
 * with no author and no timestamp.
 *
 * ADR Compliance:
 * - ADR-002: separate try-catch for validation (400) and business logic (500)
 * - ADR-009: one entity type for a setting (Display is Detail)
 * - ADR-010: the repository owns serialization; the response is a domain type
 */
import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from 'h3'
import * as z from 'zod'
import {fetchSetting} from '~~/server/data/settingsRepository'
import {SETTING_REGISTRY, SettingKeySchema, type SettingDetail, type SettingKey} from '~/composables/useSettingValidation'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error} = eventHandlerHelper
const LOG = '⚙️ > SETTING > [GET]'

const paramsSchema = z.object({key: SettingKeySchema})

export default defineEventHandler(async (event): Promise<SettingDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Validation - FAIL EARLY (400): an unregistered key is a bad request, not a missing row
    let key!: SettingKey
    try {
        key = (await getValidatedRouterParams(event, paramsSchema.parse)).key
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error, 400)
    }

    // Business logic
    try {
        const stored = await fetchSetting(d1Client, key)
        const setting = stored ?? {
            key,
            value: SETTING_REGISTRY[key].defaultValue,
            updatedAt: null,
            updatedByUserId: null
        }

        console.info(`${LOG} Answered ${key} from ${stored ? 'the stored row' : 'the registry default'}`)
        setResponseStatus(event, 200)
        return setting
    } catch (error) {
        return throwH3Error(`${LOG} Error fetching setting ${key}`, error)
    }
})
