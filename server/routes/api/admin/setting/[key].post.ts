/**
 * POST /api/admin/setting/[key] - write a registered setting.
 *
 * The route table gates this coarsely (any authenticated caller reaches it); the key's own
 * `canWrite` predicate in `SETTING_REGISTRY` decides, so key names never enter the table.
 * The value is validated against the key's own schema, and the session user is recorded as
 * the author.
 *
 * ADR Compliance:
 * - ADR-002: separate try-catch for validation (400) and business logic (500)
 * - ADR-009: a mutation returns the entity
 * - ADR-010: the repository owns serialization; the body and the response are domain types
 */
import {defineEventHandler, getValidatedRouterParams, readValidatedBody, setResponseStatus} from 'h3'
import * as z from 'zod'
import {upsertSetting} from '~~/server/data/settingsRepository'
import {SETTING_REGISTRY, SettingKeySchema, type SettingDetail, type SettingKey} from '~/composables/useSettingValidation'
import {requireSettingWriteAccess} from '~~/server/utils/authorizationHelper'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'

const {throwH3Error} = eventHandlerHelper
const LOG = '⚙️ > SETTING > [POST]'

const paramsSchema = z.object({key: SettingKeySchema})

export default defineEventHandler(async (event): Promise<SettingDetail> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Validation - FAIL EARLY (400). The key comes first: it selects the value schema
    let key!: SettingKey
    let value!: string
    try {
        key = (await getValidatedRouterParams(event, paramsSchema.parse)).key
        const bodySchema = z.object({value: SETTING_REGISTRY[key].valueSchema})
        value = (await readValidatedBody(event, bodySchema.parse)).value
    } catch (error) {
        return throwH3Error(`${LOG} Input validation error`, error, 400)
    }

    // Authorization - the key's own writer predicate (403)
    const user = await requireSettingWriteAccess(event, key)

    // Business logic
    try {
        const setting = await upsertSetting(d1Client, key, value, user.id!)

        console.info(`${LOG} Saved ${key} for user id=${user.id}`)
        setResponseStatus(event, 200)
        return setting
    } catch (error) {
        return throwH3Error(`${LOG} Error saving setting ${key}`, error)
    }
})
