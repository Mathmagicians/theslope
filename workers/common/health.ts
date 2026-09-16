/**
 * The health report every worker answers with — one shape for the app (/api/public/health),
 * the sender (/sender/health) and the smoke test that verifies both against EXPECTED_VERSION.
 */
import {z} from 'zod'

export const HealthReportSchema = z.object({
    status: z.literal('ok'),
    timestamp: z.string().datetime(),
    version: z.string().min(1),
    releaseDate: z.string().nullable(),
    sha: z.string().nullable(),
    isRelease: z.boolean()
})

export type HealthReport = z.infer<typeof HealthReportSchema>

/** The build-time values both workers bake from the same env vars (NUXT_PUBLIC_RELEASE_VERSION / _DATE, GITHUB_SHA). */
export type VersionInfo = {
    RELEASE_VERSION?: string
    RELEASE_DATE?: string
    COMMIT_ID?: string
}

export const buildHealthReport = (info: VersionInfo, now: Date = new Date()): HealthReport => ({
    status: 'ok',
    timestamp: now.toISOString(),
    version: info.RELEASE_VERSION || info.COMMIT_ID || 'development',
    releaseDate: info.RELEASE_DATE || null,
    sha: info.COMMIT_ID || null,
    isRelease: !!info.RELEASE_VERSION
})
