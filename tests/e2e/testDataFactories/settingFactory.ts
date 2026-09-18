import {expect, type BrowserContext} from '@playwright/test'
import testHelpers from '../testHelpers'
import {SETTING_REGISTRY, SettingDetailSchema, type SettingDetail, type SettingKey} from '~/composables/useSettingValidation'

const {headers} = testHelpers

const endpoint = (key: SettingKey | string) => `/api/admin/setting/${key}`

/**
 * Settings (ADR-003 factory). One row per registered key, global to the whole app: every
 * spec in every project writes the same row, and the projects have no dependency on each
 * other. So a spec never sets the row - it APPENDS its own salted line, asserts only that
 * line, and removes that line again in `afterAll`. Two suites then leave each other's lines
 * (and the user's own text) alone.
 *
 * Append and remove are read-modify-write, so a write from another suite can land in between
 * and drop the change. `rewrite` re-reads after every write and retries, which is what makes
 * these helpers safe under `--workers=4`.
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

    /**
     * Read the row, change its lines, write it back, and read again to confirm the change
     * survived. A concurrent write from another suite loses the change, so retry on that.
     * A setting cannot be empty, so a row emptied by `change` falls back to the registry default.
     */
    private static readonly rewrite = async (
        context: BrowserContext,
        key: SettingKey,
        change: (lines: string[]) => string[],
        done: (value: string) => boolean,
        attempts: number = 3
    ): Promise<SettingDetail> => {
        let written!: SettingDetail

        for (let attempt = 1; attempt <= attempts; attempt++) {
            const current = await SettingFactory.getSetting(context, key)
            const lines = change(current!.value.split('\n').map(line => line.trim()).filter(Boolean))
            const value = lines.length ? lines.join('\n') : SETTING_REGISTRY[key].defaultValue

            written = (await SettingFactory.updateSetting(context, key, value))!

            const readBack = await SettingFactory.getSetting(context, key)
            if (done(readBack!.value)) return written

            expect(attempt, `Setting ${key} lost the change to a concurrent write ${attempts} times`)
                .toBeLessThan(attempts)
        }
        return written
    }

    /** Add one salted line to the row, keeping every line that is already there */
    static readonly appendLine = (context: BrowserContext, key: SettingKey, line: string): Promise<SettingDetail> =>
        SettingFactory.rewrite(context, key, lines => [...lines, line], value => value.includes(line))

    /**
     * Remove the lines this spec added, keeping everyone else's - cleanup for `afterAll`.
     * `afterAll` runs in every worker that ran a test of the describe, and each worker only knows
     * its own lines; a worker that added none leaves the shared row alone.
     */
    static readonly removeLines = async (context: BrowserContext, key: SettingKey, lines: string[]): Promise<void> => {
        if (lines.length === 0) return
        await SettingFactory.rewrite(
            context,
            key,
            current => current.filter(line => !lines.includes(line)),
            value => lines.every(line => !value.includes(line))
        )
    }
}
