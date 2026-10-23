// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {getQuery, type H3Event} from 'h3'
import {mountWithTooltipProvider, resetStores, registerEmptyStoreEndpoints, holdEndpoint, isTableLoading, untilTrue, mountedStore, clickByTestId, findByTestId} from '~~/tests/component/testHelpers'
import HouseholdAllergies from '~/components/household/HouseholdAllergies.vue'
import {useAllergiesStore} from '~/stores/allergies'
import {nextTick} from 'vue'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {COLOR} from '~/composables/useTheSlopeDesignSystem'

// The store reads the session user's household: the session comes from a cookie the test runtime lacks
const {session, useUserSession} = await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).mockSession())
mockNuxtImport('useUserSession', () => useUserSession)

// Only HTTP is faked (testing.md Rule 6)
const user = UserFactory.defaultUserWithInhabitant('household-allergies')
const household = {...HouseholdFactory.defaultHouseholdDetail('household-allergies'), id: user.Inhabitant!.household!.id}
registerEmptyStoreEndpoints()
registerEndpoint('/api/admin/allergy-type', () => [])
registerEndpoint(`/api/admin/household/${household.id}`, () => household)

// The next test's resetStores drops the datasets a still-mounted table reads
enableAutoUnmount(afterEach)

// While the household's allergies load, the table runs its loading bar over its inhabitants
describe('HouseholdAllergies while the allergies load', () => {
    let held: ReturnType<typeof holdEndpoint>

    beforeEach(() => {
        resetStores()
        session.user.value = user
        held = holdEndpoint('/api/household/allergy', [])
    })

    afterEach(() => {
        held.release()
        held.unregister()
    })

    it('GIVEN the allergies are on the way THEN the table runs its loading bar over the inhabitants, WHEN they land THEN the bar stops', async () => {
        const wrapper = await mountWithTooltipProvider(HouseholdAllergies, {props: {household, canEdit: true}, isMd: true})
        const name = household.inhabitants[0]!.name
        const allergies = mountedStore(useAllergiesStore)

        await untilTrue(() => allergies.isAllergiesLoading)
        await nextTick()
        expect(isTableLoading(wrapper)).toBe(true)
        expect(wrapper.text()).toContain(name)

        held.release()

        await untilTrue(() => !allergies.isAllergiesLoading)
        await nextTick()
        expect(isTableLoading(wrapper)).toBe(false)
        expect(wrapper.text()).toContain(name)
    })
})

// A household changes its own allergies; an admin or the allergy manager changes another household's through the
// override the page hands down as `adminBypass`, asked on each change (ADR-004)
describe('HouseholdAllergies and the override', () => {
    type Wrapper = Awaited<ReturnType<typeof mountWithTooltipProvider>>
    const anna = household.inhabitants[0]!
    const [listedType, addedType] = AllergyFactory.createMockAllergyTypesWithInhabitants()
    const [mockAllergy] = AllergyFactory.createMockAllergies()
    // Anna's one allergy, of the listed type: the editor updates and removes it, and adds the other type
    const allergy = {
        ...mockAllergy!,
        inhabitantId: anna.id,
        allergyTypeId: listedType!.id,
        allergyType: {id: listedType!.id, name: listedType!.name, description: listedType!.description, icon: listedType!.icon},
        inhabitant: {...mockAllergy!.inhabitant, id: anna.id}
    }

    // The writes the table sends, each with its method and its query
    const sent: {method: string, query: Record<string, unknown>}[] = []
    const write = (answer: unknown) => (event: H3Event) => {
        sent.push({method: event.method, query: getQuery(event)})
        return answer
    }
    let unregister: (() => void)[] = []

    beforeEach(() => {
        resetStores()
        session.user.value = user
        sent.length = 0
        useToast().clear()
        unregister = [
            registerEndpoint('/api/admin/allergy-type', {method: 'GET', handler: () => AllergyFactory.createMockAllergyTypesWithInhabitants()}),
            registerEndpoint('/api/household/allergy', {method: 'GET', handler: () => [allergy]}),
            registerEndpoint('/api/household/allergy', {method: 'PUT', handler: write(allergy)}),
            registerEndpoint(`/api/household/allergy/${allergy.id}`, {method: 'POST', handler: write(allergy)}),
            registerEndpoint(`/api/household/allergy/${allergy.id}`, {method: 'DELETE', handler: write({id: allergy.id})})
        ]
    })

    afterEach(() => {
        unregister.forEach(off => off())
    })

    const changes = [
        {change: 'adds an allergy', method: 'PUT', act: async (wrapper: Wrapper) => {
            const select = wrapper.findAllComponents({name: 'USelectMenu'}).find(menu => findByTestId(menu, 'allergy-editor-select').exists())
            select!.vm.$emit('update:modelValue', addedType!.id)
            await nextTick()
        }},
        {change: 'updates a comment', method: 'POST', act: (wrapper: Wrapper) => clickByTestId(wrapper, `allergy-${listedType!.id}-save-comment`)},
        {change: 'removes an allergy', method: 'DELETE', act: (wrapper: Wrapper) => clickByTestId(wrapper, `allergy-${listedType!.id}-remove`)}
    ]
    const editors = [
        {editor: 'the household\'s own member', adminBypass: false, query: {}},
        {editor: 'an override', adminBypass: true, query: {adminBypass: 'true'}}
    ]

    it.each(changes.flatMap(change => editors.map(editor => ({...change, ...editor}))))('GIVEN $editor WHEN the table $change THEN the $method sends the query $query', async ({method, act, adminBypass, query}) => {
        const wrapper = await mountWithTooltipProvider(HouseholdAllergies, {props: {household, canEdit: true, adminBypass}, isMd: true})
        const allergies = mountedStore(useAllergiesStore)
        await untilTrue(() => allergies.isAllergiesInitialized && allergies.isAllergyTypesInitialized)
        await clickByTestId(wrapper, `inhabitant-${anna.id}-allergy-toggle`)
        await vi.waitFor(() => expect(findByTestId(wrapper, 'allergy-editor-select').exists()).toBe(true))

        await act(wrapper)

        // The success toast follows the write and its re-read, so no read of this case lands in the next
        await untilTrue(() => useToast().toasts.value.some(toast => toast.color === COLOR.success))
        expect(sent).toEqual([{method, query}])
    })
})
