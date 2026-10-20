/**
 * The manifests `make developer-assemble` writes under environments/: one per environment plus index.json with the
 * names. Every path is relative to the site root, so the same code reads the gh-pages site and a local build.
 */
export interface SuiteResult {
    passed: number
    failed: number
    flaky: number
    skipped: number
    report: string
}

export interface Manifest {
    environment: string
    version: string
    sha: string
    deployedAt: string
    run: number | string
    url?: string
    suites: Record<string, SuiteResult>
}

export const useManifests = () => {
    const fetchEnvironmentNames = () => $fetch<string[]>('/environments/index.json')

    const fetchManifest = (name: string) => $fetch<Manifest>(`/environments/${name}.json`)

    // The manifests that answer; an environment listed without a manifest is left out
    const fetchManifests = async (): Promise<Manifest[]> => {
        const names = await fetchEnvironmentNames().catch(() => [] as string[])
        const settled = await Promise.allSettled(names.map(fetchManifest))
        return settled.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])
    }

    const exists = (path: string) => fetch(path, {method: 'HEAD'}).then(response => response.ok).catch(() => false)

    const scenarios = (suite: SuiteResult) => suite.passed + suite.failed + suite.flaky + suite.skipped

    const resultText = (suite: SuiteResult) => suite.failed > 0 ? `${suite.failed} failed` : 'passed'

    const resultColor = (suite: SuiteResult) => suite.failed > 0 ? 'error' as const : 'success' as const

    // The version without its +sha build metadata
    const displayVersion = (version: string) => version.split('+')[0] ?? version

    const shortSha = (sha: string) => sha.slice(0, 7)

    const reportPath = (environment: string, suite: string, result: SuiteResult) =>
        `/environments/${environment}/${suite}/${result.report}`

    return {
        fetchEnvironmentNames,
        fetchManifest,
        fetchManifests,
        exists,
        scenarios,
        resultText,
        resultColor,
        displayVersion,
        shortSha,
        reportPath
    }
}
