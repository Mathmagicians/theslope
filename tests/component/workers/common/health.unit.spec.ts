import {describe, expect, it} from 'vitest'
import {HealthReportSchema, buildHealthReport} from '~~/workers/common/health'

const NOW = new Date('2026-09-16T20:00:00.000Z')

describe('buildHealthReport', () => {
    it.each([
        ['a release build', {RELEASE_VERSION: '0.9.1', RELEASE_DATE: '2026-09-16', COMMIT_ID: 'abc1234'}, {version: '0.9.1', releaseDate: '2026-09-16', sha: 'abc1234', isRelease: true}],
        ['a commit build without a release version', {RELEASE_DATE: '2026-09-16', COMMIT_ID: 'abc1234'}, {version: 'abc1234', releaseDate: '2026-09-16', sha: 'abc1234', isRelease: false}],
        ['a local build', {COMMIT_ID: 'development'}, {version: 'development', releaseDate: null, sha: 'development', isRelease: false}],
        ['no information at all', {}, {version: 'development', releaseDate: null, sha: null, isRelease: false}]
    ])('reports %s', (_name, info, expected) => {
        const report = buildHealthReport(info, NOW)

        expect(report).toEqual({status: 'ok', timestamp: NOW.toISOString(), ...expected})
        expect(HealthReportSchema.safeParse(report).success).toBe(true)
    })
})
