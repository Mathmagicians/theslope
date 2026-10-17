// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {nextTick} from 'vue'
import {enableAutoUnmount, flushPromises} from '@vue/test-utils'
import AllergyTypeCard from '~/components/allergy/AllergyTypeCard.vue'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {ALLERGY_TEST_IDS} from './allergyTestIds'
import {mountWithTooltipProvider, findByTestId, findAllByTestId, clickByTestId, resetStores} from '~~/tests/component/testHelpers'
import {FORM_MODES} from '~/types/form'

// AllergyTypeCard reads the active season's ticket prices from the plan store - fake its HTTP (Rule 6)
registerEndpoint('/api/admin/season/active', () => null)
registerEndpoint('/api/admin/season', () => [])

// The next test's resetStores drops the datasets a still-mounted card reads
enableAutoUnmount(afterEach)

const [existingType] = AllergyFactory.createMockAllergyTypesWithInhabitants()

// Renders the real UserListItem - its avatar tooltips need the provider the wrapper supplies
const mountCard = (props: Record<string, unknown>) =>
    mountWithTooltipProvider(AllergyTypeCard, {props, isMd: false})

type Wrapper = Awaited<ReturnType<typeof mountCard>>

// Gem submits the UForm; its schema validates asynchronously
const submit = async (wrapper: Wrapper) => {
    await clickByTestId(wrapper, ALLERGY_TEST_IDS.save)
    await flushPromises()
    await nextTick()
}

const fillField = async (wrapper: Wrapper, name: string, value: string) => {
    const field = wrapper.find(`[name="${name}"]`)
    await field.setValue(value)
    await nextTick()
}

describe('AllergyTypeCard', () => {
    beforeEach(() => {
        resetStores()
    })

    // Edit and create are the same form - only the presence of allergyType differs
    describe.each([
        {mode: FORM_MODES.EDIT, props: {allergyType: existingType, mode: FORM_MODES.EDIT}, heading: 'Rediger allergi', name: existingType!.name},
        {mode: FORM_MODES.CREATE, props: {mode: FORM_MODES.EDIT}, heading: 'Opret allergi', name: ''}
    ])('$mode', ({props, heading, name}) => {
        it('renders the form with the right heading, prefilled from allergyType or empty when creating', async () => {
            const wrapper = await mountCard(props)

            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.form).exists()).toBe(true)
            expect(wrapper.text()).toContain(heading)
            expect((wrapper.find('[name="allergy-name"]').element as HTMLInputElement).value).toBe(name)
        })
    })

    // The one form both modes render: its save, validation and cancel
    describe('the form', () => {
        const createProps = {mode: FORM_MODES.EDIT}

        it('emits save with the entered values', async () => {
            const wrapper = await mountCard(createProps)

            await fillField(wrapper, 'allergy-name', 'Sesam')
            await fillField(wrapper, 'allergy-description', 'Sesamallergi')
            await submit(wrapper)

            expect(wrapper.emitted('save')).toBeTruthy()
            expect(wrapper.emitted('save')![0]![0]).toMatchObject({
                name: 'Sesam',
                description: 'Sesamallergi'
            })
        })

        it('an empty name and description block the save and show the schema message on each field', async () => {
            const wrapper = await mountCard(createProps)
            const issues = useAllergyValidation().AllergyTypeCreateSchema.safeParse({name: '', description: ''}).error!.issues

            await fillField(wrapper, 'allergy-name', '')
            await fillField(wrapper, 'allergy-description', '')
            await submit(wrapper)

            expect(wrapper.emitted('save')).toBeFalsy()
            issues.forEach(issue => expect(wrapper.text()).toContain(issue.message))
        })

        it('emits cancel', async () => {
            const wrapper = await mountCard(createProps)

            await clickByTestId(wrapper, ALLERGY_TEST_IDS.cancel)

            expect(wrapper.emitted('cancel')).toBeTruthy()
        })
    })

    describe('view modes', () => {
        it('renders the allergy details without a form, with an age category badge per inhabitant (child renders Barn, not Voksen)', async () => {
            const wrapper = await mountCard({allergyType: existingType})

            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.form).exists()).toBe(false)
            expect(wrapper.text()).toContain(existingType!.name)
            // Factory canon: Anna is an adult, Bob a child
            const badges = findAllByTestId(wrapper, ALLERGY_TEST_IDS.ageBadge)
            expect(badges.map(b => b.text())).toEqual(['Voksen', 'Barn'])
        })

        it('renders the compact variant used by AllergenMultiSelector', async () => {
            const wrapper = await mountCard({allergyType: existingType, compact: true})

            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.form).exists()).toBe(false)
            expect(wrapper.text()).toContain(existingType!.name)
            expect(wrapper.text()).toContain(`${existingType!.inhabitants!.length} beboer`)
        })
    })
})
