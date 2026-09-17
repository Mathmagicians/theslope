// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {defineComponent, h, nextTick, ref} from 'vue'
import {TooltipProvider} from 'reka-ui'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import AllergyNotes from '~/components/allergy/AllergyNotes.vue'
import {ALLERGY_TEST_IDS} from './allergyTestIds'
import {mountWithTooltipProvider, findByTestId, findAllByTestId, clickByTestId} from '~~/tests/component/testHelpers'

// The notes box is prop-driven and mounts on two surfaces (catalog footer, poster).
// The text is one note per line - blank lines and stray whitespace are not notes.
// Editing happens in place: the pencil swaps the bullets for a textarea; the parent
// receives the trimmed text on `save` and owns the round trip to the Setting row.
const mountNotes = (props: {notes: string, canEdit?: boolean, isSaving?: boolean}, isMd = false) =>
    mountWithTooltipProvider(AllergyNotes, {props, isMd})

type Wrapper = Awaited<ReturnType<typeof mountNotes>>

const VIEWPORTS = [
    {viewport: 'desktop', isMd: true},
    {viewport: 'mobile', isMd: false}
] as const

const textareaEl = (wrapper: Wrapper) =>
    findByTestId(wrapper, ALLERGY_TEST_IDS.notesTextarea).element as HTMLTextAreaElement

describe('AllergyNotes - view face', () => {
    it('renders the heading and one bullet per non-empty line', async () => {
        const wrapper = await mountNotes({notes: 'A\n\nB \n'})

        expect(findByTestId(wrapper, ALLERGY_TEST_IDS.notes).text()).toContain('Vigtige bemærkninger')
        expect(findAllByTestId(wrapper, ALLERGY_TEST_IDS.notesItem).map(item => item.text())).toEqual(['A', 'B'])
    })

    // A note list is positional: the same sentence may legitimately appear twice
    it('renders a repeated line as two bullets', async () => {
        const wrapper = await mountNotes({notes: 'Husk kniven\nHusk kniven\nOg en tredje'})

        expect(findAllByTestId(wrapper, ALLERGY_TEST_IDS.notesItem).map(item => item.text()))
            .toEqual(['Husk kniven', 'Husk kniven', 'Og en tredje'])
    })

    it('renders nothing when there are no notes', async () => {
        const wrapper = await mountNotes({notes: ''})

        expect(findByTestId(wrapper, ALLERGY_TEST_IDS.notes).exists()).toBe(false)
        expect(findAllByTestId(wrapper, ALLERGY_TEST_IDS.notesItem)).toHaveLength(0)
    })
})

describe.each(VIEWPORTS)('AllergyNotes - edit face on $viewport', ({isMd}) => {
    const mount = (props: {notes: string, canEdit?: boolean, isSaving?: boolean}) => mountNotes(props, isMd)

    const openEditor = (wrapper: Wrapper) => clickByTestId(wrapper, ALLERGY_TEST_IDS.editNotes)

    it.each([
        {canEdit: true, expected: true},
        {canEdit: false, expected: false}
    ])('pencil with canEdit=$canEdit', async ({canEdit, expected}) => {
        const wrapper = await mount({notes: 'A\nB', canEdit})

        expect(findByTestId(wrapper, ALLERGY_TEST_IDS.editNotes).exists()).toBe(expected)
    })

    it('shows the current text in the textarea, one note per line', async () => {
        const wrapper = await mount({notes: 'A\nB', canEdit: true})

        await openEditor(wrapper)

        expect(textareaEl(wrapper).value).toBe('A\nB')
        expect(findAllByTestId(wrapper, ALLERGY_TEST_IDS.notesItem)).toHaveLength(0)
    })

    it('Annuller restores the text and returns to the bullets', async () => {
        const wrapper = await mount({notes: 'A\nB', canEdit: true})
        await openEditor(wrapper)
        await findByTestId(wrapper, ALLERGY_TEST_IDS.notesTextarea).setValue('Noget helt andet')

        await clickByTestId(wrapper, ALLERGY_TEST_IDS.cancelNotes)

        expect(wrapper.emitted('save')).toBeFalsy()
        expect(findAllByTestId(wrapper, ALLERGY_TEST_IDS.notesItem).map(item => item.text())).toEqual(['A', 'B'])

        await openEditor(wrapper)
        expect(textareaEl(wrapper).value).toBe('A\nB')
    })

    it('Gem emits the trimmed text and closes the editor', async () => {
        const wrapper = await mount({notes: 'A', canEdit: true})
        await openEditor(wrapper)
        await findByTestId(wrapper, ALLERGY_TEST_IDS.notesTextarea).setValue('  A\nB  ')

        await clickByTestId(wrapper, ALLERGY_TEST_IDS.saveNotes)
        await nextTick()

        expect(wrapper.emitted('save')).toEqual([['A\nB']])
        expect(findByTestId(wrapper, ALLERGY_TEST_IDS.notesTextarea).exists()).toBe(false)
    })

    // The parent owns the round trip. A host that reports `isSaving` while it writes keeps
    // the editor open, so the user sees the text they sent until it is stored.
    it('stays open while the parent reports isSaving, and closes when the save resolves', async () => {
        const isSaving = ref(false)
        const Host = defineComponent({
            render: () => h(TooltipProvider, {}, () => h(AllergyNotes, {
                notes: 'A',
                canEdit: true,
                isSaving: isSaving.value,
                onSave: () => { isSaving.value = true }
            }))
        })
        const root = await mountSuspended(Host, {global: {provide: {isMd: ref(isMd)}}})
        const wrapper = root.findComponent(AllergyNotes)
        await openEditor(wrapper)

        await clickByTestId(wrapper, ALLERGY_TEST_IDS.saveNotes)
        await nextTick()
        expect(findByTestId(wrapper, ALLERGY_TEST_IDS.notesTextarea).exists()).toBe(true)

        isSaving.value = false
        await nextTick()
        await nextTick()

        expect(findByTestId(wrapper, ALLERGY_TEST_IDS.notesTextarea).exists()).toBe(false)
    })
})
