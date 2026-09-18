// @vitest-environment nuxt
import {describe, it, expect, beforeEach} from 'vitest'
import {setActivePinia, createPinia} from 'pinia'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {flushPromises} from '@vue/test-utils'
import {clearNuxtData} from '#app'
import {nextTick, ref, type Ref} from 'vue'
import {mountWithTooltipProvider, findByTestId, clickByTestId} from '~~/tests/component/testHelpers'
import AdminSystem from '~/components/admin/AdminSystem.vue'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'

// Only HTTP is faked (testing.md Rule 6)
const jobRun = SeasonFactory.defaultJobRun({
    id: 7,
    jobType: 'MONTHLY_BILLING',
    resultSummary: JSON.stringify({results: [], periods: [BillingFactory.defaultPeriodSideEffects()]})
})
registerEndpoint('/api/admin/maintenance/job-run', () => [jobRun])

const PHONE_HEADERS = ['Dato', 'Job', 'Status']
const ALL_HEADERS = [...PHONE_HEADERS, 'Varighed', 'Kilde', 'Resultat']
const EXPAND = `job-history-expand-${jobRun.id}`
const DETAILS = 'job-history-details'

// The job history renders once its fetch resolves; flushPromises advances one timer round per call, nextTick alone does not
const mountSystem = async (isMd: boolean | Ref<boolean>) => {
    const wrapper = await mountWithTooltipProvider(AdminSystem, {props: {canEdit: true}, isMd})
    const {jobTypeLabels} = useMaintenance()
    const hasJobRow = () => wrapper.find('tbody').text().includes(jobTypeLabels.MONTHLY_BILLING)
    for (let attempt = 0; attempt < 20 && !hasJobRow(); attempt++) {
        await flushPromises()
    }
    await nextTick()
    return wrapper
}

const headers = (wrapper: Awaited<ReturnType<typeof mountSystem>>) =>
    wrapper.find('table').findAll('th').map(th => th.text()).filter(Boolean)

describe('AdminSystem job history', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        clearNuxtData()
    })

    describe.each([
        {viewport: 'phone', isMd: false, columns: PHONE_HEADERS, hasChevron: true},
        {viewport: 'md', isMd: true, columns: ALL_HEADERS, hasChevron: false}
    ])('$viewport', ({isMd, columns, hasChevron}) => {
        it(`shows the columns ${columns.join(', ')}`, async () => {
            expect(headers(await mountSystem(isMd))).toEqual(columns)
        })

        it(`${hasChevron ? 'shows' : 'hides'} the expand chevron`, async () => {
            expect(findByTestId(await mountSystem(isMd), EXPAND).exists()).toBe(hasChevron)
        })
    })

    it('phone: the chevron opens Varighed, Kilde and Resultat in the expanded row', async () => {
        const wrapper = await mountSystem(false)
        expect(findByTestId(wrapper, DETAILS).exists()).toBe(false)

        await clickByTestId(wrapper, EXPAND)

        const {formatDuration, formatTriggeredBy, formatResultSummary} = useMaintenance()
        const details = findByTestId(wrapper, DETAILS).text()
        expect(details).toContain(formatDuration(jobRun.durationMs))
        expect(details).toContain(formatTriggeredBy(jobRun.triggeredBy))
        expect(details).toContain(formatResultSummary(jobRun.jobType, jobRun.resultSummary))
    })

    it('phone turned to md: the open row closes, since md has no chevron to close it', async () => {
        const isMd = ref(false)
        const wrapper = await mountSystem(isMd)
        await clickByTestId(wrapper, EXPAND)
        expect(findByTestId(wrapper, DETAILS).exists()).toBe(true)

        isMd.value = true
        await flushPromises()
        await nextTick()

        expect(findByTestId(wrapper, DETAILS).exists()).toBe(false)
    })
})
