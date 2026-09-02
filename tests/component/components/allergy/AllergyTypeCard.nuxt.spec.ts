// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {nextTick} from 'vue'
import AllergyTypeCard from '~/components/allergy/AllergyTypeCard.vue'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {ALLERGY_TEST_IDS} from './allergyTestIds'
import {mountWithTooltipProvider, findByTestId, findAllByTestId, clickByTestId} from '~~/tests/component/testHelpers'

// AllergyTypeCard reads the active season's ticket prices from the plan store - fake its HTTP (Rule 6)
registerEndpoint('/api/admin/season/active', () => null)
registerEndpoint('/api/admin/season', () => [])

const [existingType] = AllergyFactory.createMockAllergyTypesWithInhabitants()

// Renders the real UserListItem - its avatar tooltips need the provider the wrapper supplies
const mountCard = (props: Record<string, unknown>) =>
    mountWithTooltipProvider(AllergyTypeCard, {props, isMd: false})

type Wrapper = Awaited<ReturnType<typeof mountCard>>

const fillField = async (wrapper: Wrapper, name: string, value: string) => {
    const field = wrapper.find(`[name="${name}"]`)
    await field.setValue(value)
    await nextTick()
}

describe('AllergyTypeCard', () => {

    // Edit and create are the same form - only the presence of allergyType differs
    describe.each([
        {mode: 'edit', props: {allergyType: existingType, mode: 'edit'}, heading: 'Rediger allergi'},
        {mode: 'create', props: {mode: 'edit'}, heading: 'Opret allergi'}
    ])('$mode', ({props, heading, mode}) => {

        it('renders the form with the right heading', async () => {
            const wrapper = await mountCard(props)

            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.form).exists()).toBe(true)
            expect(wrapper.text()).toContain(heading)
        })

        it('prefills from allergyType, or starts empty when creating', async () => {
            const wrapper = await mountCard(props)
            const nameField = wrapper.find('[name="allergy-name"]').element as HTMLInputElement

            const expected = mode === 'edit' ? existingType!.name : ''
            expect(nameField.value).toBe(expected)
        })

        it('emits save with the entered values', async () => {
            const wrapper = await mountCard(props)

            await fillField(wrapper, 'allergy-name', 'Sesam')
            await fillField(wrapper, 'allergy-description', 'Sesamallergi')
            await clickByTestId(wrapper, ALLERGY_TEST_IDS.save)

            expect(wrapper.emitted('save')).toBeTruthy()
            expect(wrapper.emitted('save')![0]![0]).toMatchObject({
                name: 'Sesam',
                description: 'Sesamallergi'
            })
        })

        it('cannot save while required fields are empty', async () => {
            const wrapper = await mountCard(props)

            await fillField(wrapper, 'allergy-name', '')
            await fillField(wrapper, 'allergy-description', '')

            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.save).attributes('disabled')).toBeDefined()
        })

        it('emits cancel', async () => {
            const wrapper = await mountCard(props)

            await clickByTestId(wrapper, ALLERGY_TEST_IDS.cancel)

            expect(wrapper.emitted('cancel')).toBeTruthy()
        })
    })

    describe('view modes', () => {
        it('renders the allergy details without a form', async () => {
            const wrapper = await mountCard({allergyType: existingType})

            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.form).exists()).toBe(false)
            expect(wrapper.text()).toContain(existingType!.name)
        })

        it('renders the compact variant used by AllergenMultiSelector', async () => {
            const wrapper = await mountCard({allergyType: existingType, compact: true})

            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.form).exists()).toBe(false)
            expect(wrapper.text()).toContain(existingType!.name)
            expect(wrapper.text()).toContain(`${existingType!.inhabitants!.length} beboer`)
        })

        it('shows an age category badge per inhabitant (child renders Barn, not Voksen)', async () => {
            // Factory canon: Anna is an adult, Bob a child
            const wrapper = await mountCard({allergyType: existingType})

            const badges = findAllByTestId(wrapper, ALLERGY_TEST_IDS.ageBadge)
            expect(badges.map(b => b.text())).toEqual(['Voksen', 'Barn'])
        })
    })
})
