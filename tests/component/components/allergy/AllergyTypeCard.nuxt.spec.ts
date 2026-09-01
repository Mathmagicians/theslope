// @vitest-environment nuxt
import {describe, it, expect, vi} from 'vitest'
import {mountSuspended, mockNuxtImport, mockComponent} from '@nuxt/test-utils/runtime'
import {ref, h, nextTick} from 'vue'
import AllergyTypeCard from '~/components/allergy/AllergyTypeCard.vue'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'

mockNuxtImport('useHeynabo', () => () => ({
    getUserUrl: vi.fn((heynaboId: number) => `/user/${heynaboId}`)
}))

// Avoid tooltip provider issues in tests; the badge slot renders so per-person badges stay testable
mockComponent('UserListItem', {
    props: ['inhabitants', 'label'],
    setup: (props: {inhabitants: unknown}, {slots}: {slots: Record<string, ((scope: {inhabitant: unknown}) => unknown) | undefined>}) =>
        () => h('div', {'data-testid': 'user-list-item'}, slots.badge?.({inhabitant: props.inhabitants}) as never)
})

const [existingType] = AllergyFactory.createMockAllergyTypesWithInhabitants()

const TEST_IDS = {
    form: 'allergy-type-form',
    save: 'save-allergy-type',
    cancel: 'cancel-allergy-type'
} as const

const mountCard = async (props: Record<string, unknown>) =>
    await mountSuspended(AllergyTypeCard, {
        props,
        global: {provide: {isMd: ref(false)}}
    })

const find = (wrapper: Awaited<ReturnType<typeof mountCard>>, testId: string) =>
    wrapper.find(`[data-testid="${testId}"]`)

const fillField = async (wrapper: Awaited<ReturnType<typeof mountCard>>, name: string, value: string) => {
    const field = wrapper.find(`[name="${name}"]`)
    await field.setValue(value)
    await nextTick()
}

const clickSave = async (wrapper: Awaited<ReturnType<typeof mountCard>>) => {
    await find(wrapper, TEST_IDS.save).trigger('click')
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

            expect(find(wrapper, TEST_IDS.form).exists()).toBe(true)
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
            await clickSave(wrapper)

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

            expect(find(wrapper, TEST_IDS.save).attributes('disabled')).toBeDefined()
        })

        it('emits cancel', async () => {
            const wrapper = await mountCard(props)

            await find(wrapper, TEST_IDS.cancel).trigger('click')
            await nextTick()

            expect(wrapper.emitted('cancel')).toBeTruthy()
        })
    })

    describe('view modes', () => {
        it('renders the allergy details without a form', async () => {
            const wrapper = await mountCard({allergyType: existingType})

            expect(find(wrapper, TEST_IDS.form).exists()).toBe(false)
            expect(wrapper.text()).toContain(existingType!.name)
        })

        it('renders the compact variant used by AllergenMultiSelector', async () => {
            const wrapper = await mountCard({allergyType: existingType, compact: true})

            expect(find(wrapper, TEST_IDS.form).exists()).toBe(false)
            expect(wrapper.text()).toContain(existingType!.name)
            expect(wrapper.text()).toContain(`${existingType!.inhabitants!.length} beboer`)
        })

        it('shows an age category badge per inhabitant (child renders Barn, not Voksen)', async () => {
            // Factory canon: Anna is an adult, Bob a child
            const wrapper = await mountCard({allergyType: existingType})

            const badges = wrapper.findAll('[data-testid="inhabitant-age-badge"]')
            expect(badges.map(b => b.text())).toEqual(['Voksen', 'Barn'])
        })
    })
})
