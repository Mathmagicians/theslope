// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {flushPromises, enableAutoUnmount} from '@vue/test-utils'
import {getQuery, type H3Event} from 'h3'
import {ref} from 'vue'
import {mountWithTooltipProvider, clickByTestId, findByTestId, resetStores, VIEWPORTS} from '~~/tests/component/testHelpers'
import HouseholdCard from '~/components/household/HouseholdCard.vue'
import ActionPreview from '~/components/booking/ActionPreview.vue'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {COMPONENTS, createResponsiveSizes, createTableColumns} from '~/composables/useTheSlopeDesignSystem'
import {formatPreviewLines} from '~/composables/useBookingUi'
import {useBookingValidation, type InhabitantUpdateResponse, type ScaffoldResult} from '~/composables/useBookingValidation'
import {useCoreValidation} from '~/composables/useCoreValidation'
import {WEEKDAYS} from '~/types/dateTypes'
import {formatDate, DATE_SETTINGS} from '~/utils/date'

const {BookingActionSchema, DinnerModeSchema} = useBookingValidation()
const {deserializeWeekDayMap} = useCoreValidation()
const Action = BookingActionSchema.enum
const DinnerMode = DinnerModeSchema.enum

const household = HouseholdFactory.defaultHouseholdDetail('household-card')
const inhabitant = household.inhabitants[0]!

// Only HTTP is faked (testing.md Rule 6); the preview and the toast name the run's dinners by their dates
const dinner = DinnerEventFactory.dinnerEventAt(1, 10)
const season = {...SeasonFactory.defaultSeason('household-card'), id: 1, dinnerEvents: [dinner]}
registerEndpoint('/api/admin/season/active', () => season.id)
registerEndpoint(`/api/admin/season/${season.id}`, () => season)
registerEndpoint('/api/admin/season', () => [season])
registerEndpoint('/api/admin/household', () => [])

// Each member's preference endpoint answers its preview, a read (GET) with the draft in its query, and its save (POST):
// the member's Ingen cancels their dinner. The previews are kept in `sent`
const sent: {inhabitantId: number, query: Record<string, unknown>}[] = []
const previewOf = (inhabitantId: number): ScaffoldResult => OrderFactory.defaultScaffoldResult({dinners: [{id: dinner.id, date: dinner.date}], results: [OrderFactory.defaultBookingResult({
    inhabitantId, inhabitantName: household.inhabitants.find(({id}) => id === inhabitantId)!.name, dinnerEventId: dinner.id, dinnerMode: DinnerMode.NONE, action: Action.CANCEL
})]})
let answerPreview = (inhabitantId: number): InhabitantUpdateResponse | Promise<InhabitantUpdateResponse> =>
    ({inhabitant: {...household.inhabitants.find(({id}) => id === inhabitantId)!, userId: null}, scaffoldResult: previewOf(inhabitantId)})
const answerOf = answerPreview
household.inhabitants.forEach(({id}) => {
    registerEndpoint(`/api/household/inhabitants/${id}/preferences`, {
        method: 'GET',
        handler: (event: H3Event) => {
            sent.push({inhabitantId: id, query: getQuery(event)})
            return answerPreview(id)
        }
    })
    registerEndpoint(`/api/household/inhabitants/${id}/preferences`, {method: 'POST', handler: () => answerPreview(id)})
})

// The next test's resetStores drops the datasets a still-mounted card reads
enableAutoUnmount(afterEach)

const mountCard = async (isMd: boolean) => {
    const wrapper = await mountWithTooltipProvider(HouseholdCard, {props: {household, canEdit: true}, isMd})
    await flushPromises()
    return wrapper
}

describe.each(VIEWPORTS)('HouseholdCard on $viewport', ({isMd}) => {
    beforeEach(() => {
        resetStores()
    })

    it('the name and ticket type columns bind their column tokens, and an open member row groups its actions at the card field group size', async () => {
        const wrapper = await mountCard(isMd)
        const columns = wrapper.findComponent({name: 'UTable'}).props('columns') as Array<{id: string}>
        const tokens = createTableColumns(ref(isMd))
        expect(columns.find(column => column.id === 'name')).toEqual({id: 'name', ...tokens.householdMemberName})
        expect(columns.find(column => column.id === 'ticketType')).toEqual({id: 'ticketType', ...tokens.householdTicketType})

        await clickByTestId(wrapper, `inhabitant-${inhabitant.id}-edit-preferences`)
        const actions = wrapper.findAllComponents({name: 'UFieldGroup'})
            .find(group => group.find('[data-testid="cancel-preferences"]').exists())
        expect(actions?.props('size')).toBe(createResponsiveSizes(ref(isMd)).cardFieldGroup)
    })

    // The power row's faces set the name column's width: a household's faces past the power row's max fold into the count
    it('the power row\'s face group stops at the power row\'s max', async () => {
        const wrapper = await mountCard(isMd)
        expect(wrapper.findComponent({name: 'UAvatarGroup'}).props('max')).toBe(COMPONENTS.avatar.powerRowMax)
    })

    it('the hint\'s line of dinner modes binds the hint modes token, and each mode holds its glyph and its word in a hint mode element', async () => {
        const wrapper = await mountCard(isMd)
        const line = wrapper.find('strong').element.parentElement!
        const modes = [...line.children].filter(element => element.tagName !== 'STRONG')

        expect(line.getAttribute('class')).toBe(COMPONENTS.householdCard.hintModes)
        expect(modes.map(mode => mode.getAttribute('class'))).toEqual(DinnerModeSchema.options.map(() => COMPONENTS.householdCard.hintMode))
        modes.forEach(mode => expect(mode.textContent!.trim()).not.toBe(''))
    })
})

// A preference change previews what Gem does through the server's dry run, one person or every member in power mode
describe('HouseholdCard previews a preference change', () => {
    const MONDAY = WEEKDAYS[0]
    const householdOrder = household.inhabitants.map(({id}) => id)
    const previewTexts = (wrapper: Awaited<ReturnType<typeof mountCard>>) =>
        wrapper.findComponent(ActionPreview).props('days').map(day => day.lines.map(line => line.text))

    beforeEach(() => {
        resetStores()
        sent.length = 0
        answerPreview = answerOf
    })

    it.each([
        {who: 'one person', toggle: `inhabitant-${inhabitant.id}-edit-preferences`, editor: `inhabitant-${inhabitant.id}-preferences-edit`, inhabitantIds: [inhabitant.id]},
        {who: 'power mode', toggle: 'power-mode-toggle', editor: 'power-mode-preferences-edit', inhabitantIds: householdOrder}
    ])('$who: the draft goes to each member\'s dry run and the reply renders under the dinner\'s day', async ({toggle, editor, inhabitantIds}) => {
        const wrapper = await mountCard(false)
        await clickByTestId(wrapper, toggle)
        await clickByTestId(wrapper, `${editor}-${MONDAY}-${DinnerMode.NONE}`)

        const expected = formatPreviewLines(
            OrderFactory.defaultScaffoldResult({dinners: previewOf(inhabitant.id).dinners, results: inhabitantIds.flatMap(id => previewOf(id).results)}), householdOrder)
        await vi.waitFor(() => expect(previewTexts(wrapper)).toEqual(expected.map(day => day.lines.map(line => line.text))))
        sent.forEach(({query}) => expect(deserializeWeekDayMap(String(query.dinnerPreferences))).toMatchObject({[MONDAY]: DinnerMode.NONE}))
    })

    it('while the draft equals the saved preferences no preview is asked for', async () => {
        const wrapper = await mountCard(false)
        await clickByTestId(wrapper, `inhabitant-${inhabitant.id}-edit-preferences`)
        await flushPromises()

        expect(sent).toEqual([])
        expect(wrapper.findComponent(ActionPreview).props('days')).toEqual([])
        expect(wrapper.findComponent(ActionPreview).props('pending')).toBe(false)
    })

    it('while the dry run works the loader stands in place of the lines', async () => {
        let land: () => void = () => {}
        const landed = new Promise<void>(resolve => {
            land = resolve
        })
        answerPreview = async (inhabitantId) => {
            await landed
            return answerOf(inhabitantId)
        }
        const wrapper = await mountCard(false)
        await clickByTestId(wrapper, `inhabitant-${inhabitant.id}-edit-preferences`)
        await clickByTestId(wrapper, `inhabitant-${inhabitant.id}-preferences-edit-${MONDAY}-${DinnerMode.NONE}`)

        await vi.waitFor(() => expect(wrapper.findComponent(ActionPreview).props('pending')).toBe(true))
        land()
        await vi.waitFor(() => expect(wrapper.findComponent(ActionPreview).props('pending')).toBe(false))
        expect(previewTexts(wrapper)).toHaveLength(1)
    })
})

// Gem reports what the save did: the toast's lines, a line per day, and the same lines in the "Sidste ændring" alert
describe('HouseholdCard reports a saved preference change', () => {
    const MONDAY = WEEKDAYS[0]
    const [first, second] = household.inhabitants

    beforeEach(() => {
        resetStores()
        sent.length = 0
        useToast().clear()
        // The save's run covers the household: the other member's line comes back first beside the person's own
        answerPreview = inhabitantId => ({
            inhabitant: {...household.inhabitants.find(({id}) => id === inhabitantId)!, userId: null},
            scaffoldResult: OrderFactory.defaultScaffoldResult({dinners: previewOf(inhabitantId).dinners, results: [second!.id, first!.id].flatMap(id => previewOf(id).results)})
        })
    })

    it('the toast and the alert read the day\'s line, the people in the household\'s order', async () => {
        const wrapper = await mountCard(false)
        await clickByTestId(wrapper, `inhabitant-${first!.id}-edit-preferences`)
        await clickByTestId(wrapper, `inhabitant-${first!.id}-preferences-edit-${MONDAY}-${DinnerMode.NONE}`)
        await clickByTestId(wrapper, 'save-preferences')

        const line = `${formatDate(dinner.date, DATE_SETTINGS.DAY_MONTH_MASK)}  frameldt: ${first!.name}, ${second!.name}`
        await vi.waitFor(() => expect(useToast().toasts.value.at(-1)).toMatchObject({title: 'Præferencer opdateret', description: line}))
        expect(findByTestId(wrapper, 'last-result-alert').text()).toContain(`Du har ændret præferencer, og familiens bookinger har ændret sig:\n${line}`)
    })
})
