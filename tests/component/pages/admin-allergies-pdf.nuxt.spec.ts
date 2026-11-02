// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach, onTestFinished} from 'vitest'
import {registerEndpoint, mountSuspended} from '@nuxt/test-utils/runtime'
import {flushPromises, enableAutoUnmount} from '@vue/test-utils'
import AllergyPosterPage from '~/pages/admin/allergies/pdf.vue'
import AllergyManagersList from '~/components/allergy/AllergyManagersList.vue'
import {useAllergiesStore} from '~/stores/allergies'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {ALLERGY_TEST_IDS} from '../components/allergy/allergyTestIds'
import {ALLERGY_WORDS} from '~/config/allergyWords'
import {BUTTON_WORDS} from '~/config/buttonWords'
import {withTooltipProvider, findByTestId, findAllByTestId, present, resetStores, registerEmptyStoreEndpoints} from '~~/tests/component/testHelpers'

const POSTER_ROUTE = '/admin/allergies/pdf'

// The poster prints the same Setting row the catalog footer edits
const POSTER_NOTES_ENDPOINT = '/api/admin/setting/allergy-poster-notes'
const STORED_NOTES = 'Glutenfri boller findes i fryseren\nHusk at give besked ved menu-præsentationen'

// Only HTTP is faked
registerEmptyStoreEndpoints()
registerEndpoint(POSTER_NOTES_ENDPOINT, () => ({
    key: 'allergy-poster-notes',
    value: STORED_NOTES,
    updatedAt: new Date('2026-09-18T10:00:00.000Z').toISOString(),
    updatedByUserId: 3
}))
registerEndpoint('/api/admin/allergy-type', () => AllergyFactory.createMockAllergyTypesWithInhabitants())

// The next test's resetStores drops the datasets a still-mounted poster reads
enableAutoUnmount(afterEach)

// Fetching is the store's concern; explicit load repopulates after resetStores.
// The poster has no layout (no UApp), so the real AllergyManagersList gets its
// tooltip provider from the wrapper. The page mounts on its own route, where the
// router hands its page meta to the colour-mode module.
const mountPage = async () => {
    const store = useAllergiesStore()
    await store.loadAllergyTypes()
    await store.loadPosterNotes()
    const root = await mountSuspended(withTooltipProvider(AllergyPosterPage), {route: POSTER_ROUTE})
    await flushPromises()
    return root.findComponent(AllergyPosterPage)
}

/** The variant and colour of the UButton labelled `label` */
const buttonFace = (wrapper: Awaited<ReturnType<typeof mountPage>>, label: string) => {
    const button = wrapper.findAllComponents({name: 'UButton'}).find(candidate => candidate.text() === label)
    const labelled = present(button, `UButton labelled ${label}`)
    return {variant: labelled.props('variant'), color: labelled.props('color')}
}

describe('admin/allergies/pdf (allergy poster)', () => {
    beforeEach(() => {
        resetStores()
        vi.clearAllMocks()
    })

    // Factory canon: Anna adult (V), Bob child (B), Clara baby (b)
    it('marks each person with their age category, children and babies not adults, and counts the categories via the shared formatTicketCounts formatter', async () => {
        const wrapper = await mountPage()
        const text = wrapper.text()

        expect(text).toMatch(/Anna\s*\(V\)/)
        expect(text).toMatch(/Bob\s*\(B\)/)
        expect(text).toMatch(/Clara\s*\(b\)/)
        expect(text).toContain('[1V 1B]')  // Mælk: Anna + Bob
        expect(text).toContain('[1b]')     // Jordnødder: Clara
    })

    // Same component and same text source (the Setting row) as the catalog footer on /admin/allergies;
    // the poster is read-only (the notes are edited on /admin/allergies) and renders the QR itself
    // (no external image service), so it survives offline and prints
    it('renders the notes box with the stored notes and no pencil, and the QR code for the poster URL', async () => {
        const wrapper = await mountPage()

        expect(findByTestId(wrapper, ALLERGY_TEST_IDS.notes).text()).toContain('Vigtige bemærkninger')
        expect(findAllByTestId(wrapper, ALLERGY_TEST_IDS.notesItem).map(item => item.text()))
            .toEqual(STORED_NOTES.split('\n'))
        expect(findByTestId(wrapper, ALLERGY_TEST_IDS.editNotes).exists()).toBe(false)

        const qr = findByTestId(wrapper, ALLERGY_TEST_IDS.qr)

        expect(qr.exists()).toBe(true)
        expect(qr.attributes('aria-label')).toContain(POSTER_ROUTE)
    })

    // The sheet is printed on white paper, where every dark-mode face reads pale
    it('renders in light mode for a member who reads the app in dark mode, and leaves the member\'s preference dark', async () => {
        const colorMode = useColorMode()
        colorMode.preference = 'dark'
        onTestFinished(() => {
            colorMode.preference = 'light'
        })
        await useRouter().replace('/')
        expect(colorMode.value).toBe('dark')

        await mountPage()

        expect(colorMode.value).toBe('light')
        expect(colorMode.preference).toBe('dark')
    })

    // The managers' box renders its line once the managers load; that rendering is the box's own spec
    it('prints its title, the date, the columns and the scan caption, and hands the managers\' box the poster\'s line', async () => {
        const wrapper = await mountPage()
        const {poster, managers} = ALLERGY_WORDS
        const words = [poster.title, poster.asOf(formatDate(useClock().value, DATE_SETTINGS.LONG_DATE_MASK)), poster.allergen, poster.person, poster.scan]

        expect(words.filter(word => !wrapper.text().includes(word))).toEqual([])
        expect(wrapper.findComponent(AllergyManagersList).props('message')).toBe(managers.posterMessage)
    })

    it('dresses the back button as the print button', async () => {
        const wrapper = await mountPage()

        expect(buttonFace(wrapper, BUTTON_WORDS.back)).toEqual(buttonFace(wrapper, BUTTON_WORDS.print))
    })
})
