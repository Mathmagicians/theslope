// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import AllergyNotes from '~/components/allergy/AllergyNotes.vue'
import {ALLERGY_TEST_IDS} from './allergyTestIds'
import {mountWithTooltipProvider, findByTestId, findAllByTestId} from '~~/tests/component/testHelpers'

// The notes box is prop-driven and mounts on two surfaces (catalog footer, poster).
// The text is one note per line - blank lines and stray whitespace are not notes.
const mountNotes = (notes: string) => mountWithTooltipProvider(AllergyNotes, {props: {notes}})

describe('AllergyNotes', () => {
    it('renders the heading and one bullet per non-empty line', async () => {
        const wrapper = await mountNotes('A\n\nB \n')

        expect(findByTestId(wrapper, ALLERGY_TEST_IDS.notes).text()).toContain('Vigtige bemærkninger')
        expect(findAllByTestId(wrapper, ALLERGY_TEST_IDS.notesItem).map(item => item.text())).toEqual(['A', 'B'])
    })

    it('renders nothing when there are no notes', async () => {
        const wrapper = await mountNotes('')

        expect(findByTestId(wrapper, ALLERGY_TEST_IDS.notes).exists()).toBe(false)
        expect(findAllByTestId(wrapper, ALLERGY_TEST_IDS.notesItem)).toHaveLength(0)
    })
})
