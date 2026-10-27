// @vitest-environment nuxt
import {describe, it, expect, vi, beforeAll, beforeEach, afterEach} from 'vitest'
import {mockNuxtImport, registerEndpoint} from '@nuxt/test-utils/runtime'
import {DOMWrapper, enableAutoUnmount} from '@vue/test-utils'
import {shallowReactive} from 'vue'
import {createError, getQuery, type H3Event} from 'h3'
import {addDays} from 'date-fns'
import {mountWithTooltipProvider, findByTestId, resetStores, registerEmptyStoreEndpoints, untilTrue, findLoadingRow, tableHeaders, cellsByHeader, VIEWPORTS} from '~~/tests/component/testHelpers'
import AdminSystem from '~/components/admin/AdminSystem.vue'
import {DATE_SETTINGS, formatDate} from '~/utils/date'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {useMaintenanceValidation, type JobRunDisplay} from '~/composables/useMaintenanceValidation'

// The households load for a logged-in user: the session comes from a cookie the test runtime lacks
const {session, useUserSession} = await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).mockSession())
mockNuxtImport('useUserSession', () => useUserSession)

const {JobType, JobStatus, JobTypeSchema} = useMaintenanceValidation()
type Job = JobRunDisplay['jobType']

let maintenance: ReturnType<typeof useMaintenance>
beforeAll(() => {
    maintenance = useMaintenance()
})

// Only HTTP is faked (testing.md Rule 6)
registerEmptyStoreEndpoints()
const householdReads = vi.fn(() => [])
registerEndpoint('/api/admin/household', householdReads)

// The job runs D1 holds: the list answers a read without a jobType, a job's latest run a read with one
const jobRuns: {list: JobRunDisplay[], latest: Partial<Record<Job, JobRunDisplay>>} = {list: [], latest: {}}
// The reads by jobType, the list's as null; a held read answers once its jobType leaves the set
const jobRunReads: (Job | null)[] = []
const heldReads = shallowReactive(new Set<Job | null>())
registerEndpoint('/api/admin/maintenance/job-run', async (event: H3Event) => {
    const jobType = JobTypeSchema.optional().parse(getQuery(event).jobType) ?? null
    jobRunReads.push(jobType)
    await untilTrue(() => !heldReads.has(jobType))
    if (jobType === null) return jobRuns.list
    const latest = jobRuns.latest[jobType]
    return latest ? [latest] : []
})

// What each box job's run reports, stored as the run's resultSummary and answered by its button run
const heynaboSummary = HouseholdFactory.defaultHeynaboImportResponse()
const dailySummary = OrderFactory.defaultDailyMaintenanceResult()
const monthlySummary = {results: [], periods: [BillingFactory.defaultPeriodSideEffects()], jobRunId: 1}
const BOX_JOBS = [
    {jobType: JobType.HEYNABO_IMPORT, runUrl: '/api/admin/heynabo/import', summary: heynaboSummary,
        stats: () => maintenance.formatHeynaboStats(heynaboSummary), reloadsHouseholds: true},
    {jobType: JobType.DAILY_MAINTENANCE, runUrl: '/api/admin/maintenance/daily', summary: dailySummary,
        stats: () => maintenance.formatDailyMaintenanceStats(dailySummary), reloadsHouseholds: false},
    {jobType: JobType.MONTHLY_BILLING, runUrl: '/api/admin/maintenance/monthly', summary: monthlySummary,
        stats: () => maintenance.formatMonthlyBillingStats(monthlySummary), reloadsHouseholds: false}
]

// A button run answers its job's summary, or a server error while `fails` holds
const buttonRun = {fails: false}
for (const {runUrl, summary} of BOX_JOBS) {
    registerEndpoint(runUrl, () => {
        if (buttonRun.fails) throw createError({statusCode: 500, statusMessage: 'D1 down'})
        return summary
    })
}

const jobRun = SeasonFactory.defaultJobRun({
    id: 7,
    jobType: JobType.MONTHLY_BILLING,
    resultSummary: JSON.stringify(monthlySummary)
})

// The next test's resetStores drops the datasets a still-mounted table reads
enableAutoUnmount(afterEach)

beforeEach(() => {
    resetStores()
    session.user.value = UserFactory.defaultUserWithInhabitant('admin-system')
    jobRuns.list = [jobRun]
    jobRuns.latest = {}
    jobRunReads.length = 0
    buttonRun.fails = false
})
// A read still held answers, so no handler outlives its test
afterEach(() => heldReads.clear())

const HEADERS = ['Dato', 'Job', 'Status', 'Varighed', 'Kilde', 'Resultat']
const NO_RUNS = 'Ingen kørsler endnu'

const mountSystem = (isMd: boolean) => mountWithTooltipProvider(AdminSystem, {props: {canEdit: true}, isMd})
type SystemWrapper = Awaited<ReturnType<typeof mountSystem>>

const hasJobRow = (wrapper: SystemWrapper) => wrapper.find('tbody').text().includes(maintenance.jobTypeLabels[JobType.MONTHLY_BILLING])

// Every viewport shows all six columns, each run's values under them; on a phone the table scrolls sideways in its card
describe('AdminSystem job history', () => {
    it.each(VIEWPORTS)('$viewport: the columns read Dato to Resultat, the row holds the run\'s duration, source and result under theirs, and no row expands', async ({isMd}) => {
        const wrapper = await mountSystem(isMd)
        await vi.waitFor(() => expect(hasJobRow(wrapper)).toBe(true))

        expect(tableHeaders(wrapper)).toEqual(HEADERS)
        expect(cellsByHeader(wrapper)).toMatchObject({
            Varighed: maintenance.formatDuration(jobRun.durationMs),
            Kilde: maintenance.formatTriggeredBy(jobRun.triggeredBy),
            Resultat: maintenance.formatResultSummary(jobRun.jobType, jobRun.resultSummary)
        })
        expect(findByTestId(wrapper, `job-history-expand-${jobRun.id}`).exists()).toBe(false)
    })
})

// Until the job history answers, the table's loading row stands where the empty text would
describe('AdminSystem job history while it loads', () => {
    it('GIVEN the job history is on the way THEN the loading row shows, WHEN it lands THEN the job', async () => {
        heldReads.add(null)
        const wrapper = await mountSystem(true)

        await vi.waitFor(() => expect(findLoadingRow(wrapper).text()).toContain('Henter jobhistorik...'))

        heldReads.delete(null)

        await vi.waitFor(() => expect(hasJobRow(wrapper)).toBe(true))
        expect(findLoadingRow(wrapper).exists()).toBe(false)
    })
})

// A box is the card around its job's button
const boxOf = (wrapper: SystemWrapper, jobType: Job) =>
    new DOMWrapper(wrapper.find(`button[name="trigger-${jobType.toLowerCase()}"]`).element.closest('[data-slot="root"]'))
const isLoading = (box: DOMWrapper<Element>) => box.findAll('[aria-busy="true"]').length > 0
// UAlert's root, told from the card's by its orientation
const alertOf = (box: DOMWrapper<Element>) => box.find('[data-slot="root"][data-orientation]')
const startOf = (run: JobRunDisplay) => formatDate(run.startedAt, DATE_SETTINGS.DATE_TIME_MASK)
const runOf = (jobType: Job, summary: unknown, overrides: Partial<JobRunDisplay> = {}) =>
    SeasonFactory.defaultJobRun({jobType, resultSummary: JSON.stringify(summary), ...overrides})

// Each box shows its job's latest run, read on its own: the history list holds the last runs of every job
describe('AdminSystem job boxes', () => {
    it.each(BOX_JOBS)('GIVEN no run of $jobType WHEN the box loads THEN it says so, with no loading state', async ({jobType}) => {
        jobRuns.list = []
        const wrapper = await mountSystem(true)

        await vi.waitFor(() => expect(boxOf(wrapper, jobType).text()).toContain(NO_RUNS))
        expect(isLoading(boxOf(wrapper, jobType))).toBe(false)
    })

    it.each(BOX_JOBS)('GIVEN a list without $jobType and its own read with a run WHEN the box loads THEN it shows the run\'s start, its status and its stat lines', async ({jobType, summary, stats}) => {
        const run = runOf(jobType, summary)
        jobRuns.list = BOX_JOBS.filter(other => other.jobType !== jobType).map(other => runOf(other.jobType, other.summary))
        jobRuns.latest = {[jobType]: run}
        const wrapper = await mountSystem(true)

        await vi.waitFor(() => expect(boxOf(wrapper, jobType).text()).toContain(startOf(run)))
        const text = boxOf(wrapper, jobType).text()
        expect(text).toContain(maintenance.jobStatusLabels[JobStatus.SUCCESS])
        for (const {label, value} of stats()) {
            expect(text).toContain(`${label}: ${value}`)
        }
    })

    it.each(BOX_JOBS)('GIVEN the latest $jobType run failed without a summary WHEN the box loads THEN it shows the run\'s start and its failed status', async ({jobType}) => {
        const run = SeasonFactory.defaultJobRun({jobType, status: JobStatus.FAILED, resultSummary: null})
        jobRuns.list = []
        jobRuns.latest = {[jobType]: run}
        const wrapper = await mountSystem(true)

        await vi.waitFor(() => expect(boxOf(wrapper, jobType).text()).toContain(startOf(run)))
        expect(boxOf(wrapper, jobType).text()).toContain(maintenance.jobStatusLabels[JobStatus.FAILED])
        expect(boxOf(wrapper, jobType).text()).not.toContain(maintenance.jobStatusLabels[JobStatus.SUCCESS])
    })

    it.each(BOX_JOBS)('GIVEN the latest $jobType run on the way THEN the box shows its loading state, WHEN it lands THEN the run', async ({jobType, summary}) => {
        const run = runOf(jobType, summary)
        jobRuns.latest = {[jobType]: run}
        heldReads.add(jobType)
        const wrapper = await mountSystem(true)

        await vi.waitFor(() => expect(jobRunReads).toContain(jobType))
        expect(isLoading(boxOf(wrapper, jobType))).toBe(true)
        expect(boxOf(wrapper, jobType).text()).not.toContain(NO_RUNS)

        heldReads.delete(jobType)

        await vi.waitFor(() => expect(boxOf(wrapper, jobType).text()).toContain(startOf(run)))
        expect(isLoading(boxOf(wrapper, jobType))).toBe(false)
    })

    const OUTCOMES = [{outcome: 'succeeds', fails: false}, {outcome: 'fails', fails: true}]
    it.each(BOX_JOBS.flatMap(job => OUTCOMES.map(outcome => ({...job, ...outcome, householdReloads: job.reloadsHouseholds && !outcome.fails ? 1 : 0}))))(
        'GIVEN a $jobType run WHEN its button run $outcome THEN the box loads until it re-reads the run and the list, and shows the new run',
        async ({jobType, summary, fails, householdReloads}) => {
            const firstRun = runOf(jobType, summary)
            jobRuns.list = [firstRun]
            jobRuns.latest = {[jobType]: firstRun}
            const wrapper = await mountSystem(true)
            await vi.waitFor(() => expect(boxOf(wrapper, jobType).text()).toContain(startOf(firstRun)))

            const newRun = runOf(jobType, summary, {id: firstRun.id + 1, startedAt: addDays(firstRun.startedAt, 1)})
            jobRuns.list = [newRun, firstRun]
            jobRuns.latest = {[jobType]: newRun}
            buttonRun.fails = fails
            jobRunReads.length = 0
            householdReads.mockClear()
            heldReads.add(jobType)

            await boxOf(wrapper, jobType).find('button').trigger('click')

            await vi.waitFor(() => expect(jobRunReads).toContain(jobType))
            expect(isLoading(boxOf(wrapper, jobType))).toBe(true)
            expect(boxOf(wrapper, jobType).text()).not.toContain(startOf(newRun))

            heldReads.delete(jobType)

            await vi.waitFor(() => expect(boxOf(wrapper, jobType).text()).toContain(startOf(newRun)))
            expect(isLoading(boxOf(wrapper, jobType))).toBe(false)
            expect(jobRunReads).toEqual(expect.arrayContaining([null, jobType]))
            const box = boxOf(wrapper, jobType)
            expect(alertOf(box).exists()).toBe(fails)
            if (fails) expect(box.text().indexOf(startOf(newRun))).toBeLessThan(box.text().indexOf(alertOf(box).text()))
            await vi.waitFor(() => expect(householdReads).toHaveBeenCalledTimes(householdReloads))
        })
})
