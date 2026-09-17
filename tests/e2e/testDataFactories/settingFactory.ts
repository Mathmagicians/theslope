import {expect, type BrowserContext} from '@playwright/test'
import testHelpers from '../testHelpers'
import {SETTING_REGISTRY, SettingDetailSchema, type SettingDetail, type SettingKey} from '~/composables/useSettingValidation'

const {headers} = testHelpers

const endpoint = (key: SettingKey | string) => `/api/admin/setting/${key}`

/**
 * Settings (ADR-003 factory). One row per registered key, global to the app - a spec that
 * writes one restores the registry default in `afterAll`, so the next spec reads what the
 * app ships with.
 */
export class SettingFactory {
    /** GET /api/admin/setting/[key] - the stored row, or the registry default with no author */
    static readonly getSetting = async (
        context: BrowserContext,
        key: SettingKey | string,
        expectedStatus: number = 200
    ): Promise<SettingDetail | null> => {
        const response = await context.request.get(endpoint(key), {headers})

        const status = response.status()
        const errorBody = status !== expectedStatus ? await response.text() : ''
        expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

        return status === 200 ? SettingDetailSchema.parse(await response.json()) : null
    }

    /** POST /api/admin/setting/[key] - writes the value as the session user */
    static readonly updateSetting = async (
        context: BrowserContext,
        key: SettingKey | string,
        value: unknown,
        expectedStatus: number = 200
    ): Promise<SettingDetail | null> => {
        const response = await context.request.post(endpoint(key), {headers, data: {value}})

        const status = response.status()
        const errorBody = status !== expectedStatus ? await response.text() : ''
        expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

        return status === 200 ? SettingDetailSchema.parse(await response.json()) : null
    }

    /** Put the key back to what the code registry declares - cleanup for any spec that wrote it */
    static readonly restoreDefault = async (context: BrowserContext, key: SettingKey): Promise<void> => {
        await SettingFactory.updateSetting(context, key, SETTING_REGISTRY[key].defaultValue)
    }
}
