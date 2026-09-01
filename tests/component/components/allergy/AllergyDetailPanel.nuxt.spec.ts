// @vitest-environment nuxt
import {describe, it, expect, vi} from 'vitest'
import {mountSuspended, mockNuxtImport, mockComponent} from '@nuxt/test-utils/runtime'
import {ref, h, nextTick} from 'vue'
import AllergyDetailPanel from '~/components/allergy/AllergyDetailPanel.vue'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'

// Mock Heynabo composable to prevent URL resolution issues
mockNuxtImport('useHeynabo', () => () => ({
    getUserUrl: vi.fn((heynaboId: number) => `/user/${heynaboId}`)
}))

// Mock UserListItem to avoid tooltip provider issues in tests
mockComponent('UserListItem', {
    props: ['inhabitants'],
    setup: () => () => h('div', {'data-testid': 'user-list-item'})
})

const mockAllergyTypes = AllergyFactory.createMockAllergyTypesWithInhabitants()
const [firstType] = mockAllergyTypes

const TEST_IDS = {
    form: 'allergy-type-form',
    edit: 'edit-allergy-type',
    delete: 'delete-allergy-type',
    deleteConfirm: 'delete-allergy-type-confirm',
    cancelDelete: 'cancel-delete-allergy-type',
    confirmDelete: 'confirm-delete-allergy-type',
    save: 'save-allergy-type'
} as const

// The portable detail region of the allergy catalog (bug-fix doc D1): the SAME
// component mounts beside the master on desktop and under the selected row on
// mobile, so its behavior is specced once, independent of the mount point.
const mountPanel = async (props: Record<string, unknown> = {}) => {
    const wrapper = await mountSuspended(AllergyDetailPanel, {
        props: {
            allergyType: firstType,
            panelMode: 'view',
            canEdit: true,
            ...props
        },
        global: {provide: {isMd: ref(false)}}
    })
    await nextTick()
    return wrapper
}

type Wrapper = Awaited<ReturnType<typeof mountPanel>>

const find = (wrapper: Wrapper, testId: string) => wrapper.find(`[data-testid="${testId}"]`)

const click = async (wrapper: Wrapper, testId: string) => {
    await find(wrapper, testId).trigger('click')
    await nextTick()
}

describe('AllergyDetailPanel', () => {
    describe('view mode', () => {
        it('renders the selected allergy', async () => {
            const wrapper = await mountPanel()

            expect(wrapper.text()).toContain(firstType!.name)
            expect(wrapper.text()).toContain('Detaljer')
        })

        it.each([
            {control: 'edit', testId: TEST_IDS.edit, event: 'edit'},
            {control: 'delete', testId: TEST_IDS.delete, event: 'delete'}
        ])('emits $event from the $control action', async ({testId, event}) => {
            const wrapper = await mountPanel()

            await click(wrapper, testId)

            expect(wrapper.emitted(event)).toBeTruthy()
        })

        it.each([TEST_IDS.edit, TEST_IDS.delete])('hides %s when canEdit is false', async (testId) => {
            const wrapper = await mountPanel({canEdit: false})

            expect(find(wrapper, testId).exists()).toBe(false)
        })

        it('shows a placeholder when nothing is selected', async () => {
            const wrapper = await mountPanel({allergyType: undefined})

            expect(wrapper.text()).toContain('Vælg en allergi')
            expect(find(wrapper, TEST_IDS.edit).exists()).toBe(false)
        })
    })

    describe.each([
        {panelMode: 'edit', heading: 'Rediger allergi'},
        {panelMode: 'create', heading: 'Opret allergi'}
    ])('$panelMode mode', ({panelMode, heading}) => {
        it('renders the form', async () => {
            const wrapper = await mountPanel({panelMode})

            expect(find(wrapper, TEST_IDS.form).exists()).toBe(true)
            expect(wrapper.text()).toContain(heading)
        })
    })

    describe('edit mode', () => {
        it('forwards save from the form with the allergy data', async () => {
            const wrapper = await mountPanel({panelMode: 'edit'})

            await click(wrapper, TEST_IDS.save)

            const emitted = wrapper.emitted('save')
            expect(emitted).toBeTruthy()
            expect(emitted![0]![0]).toMatchObject({name: firstType!.name})
        })
    })

    describe('confirm-delete mode', () => {
        it('names the allergy and the cascade to inhabitants', async () => {
            const wrapper = await mountPanel({panelMode: 'confirm-delete'})

            const confirmPanel = find(wrapper, TEST_IDS.deleteConfirm)
            expect(confirmPanel.exists()).toBe(true)
            expect(confirmPanel.text()).toContain(firstType!.name)
            expect(confirmPanel.text()).toContain(String(firstType!.inhabitants!.length))
        })

        it.each([
            {control: 'cancel', testId: TEST_IDS.cancelDelete, event: 'cancel-delete'},
            {control: 'confirm', testId: TEST_IDS.confirmDelete, event: 'confirm-delete'}
        ])('emits $event from the $control action', async ({testId, event}) => {
            const wrapper = await mountPanel({panelMode: 'confirm-delete'})

            await click(wrapper, testId)

            expect(wrapper.emitted(event)).toBeTruthy()
        })
    })
})
