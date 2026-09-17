// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {setActivePinia, createPinia} from 'pinia'
import {flushPromises} from '@vue/test-utils'
import {clearNuxtData} from '#app'
import AllergyPosterPage from '~/pages/admin/allergies/pdf.vue'
import {useAllergiesStore} from '~/stores/allergies'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {ALLERGY_TEST_IDS} from '../components/allergy/allergyTestIds'
import {mountWithTooltipProvider, findByTestId, findAllByTestId} from '~~/tests/component/testHelpers'

// The poster prints the same Setting row the catalog footer edits
const POSTER_NOTES_ENDPOINT = '/api/admin/setting/allergy-poster-notes'
const STORED_NOTES = 'Glutenfri boller findes i fryseren\nHusk at give besked ved menu-præsentationen'

// Endpoint mocks - specific FIRST, generic LAST (docs/testing.md)
registerEndpoint(POSTER_NOTES_ENDPOINT, () => ({
    key: 'allergy-poster-notes',
    value: STORED_NOTES,
    updatedAt: new Date('2026-09-18T10:00:00.000Z').toISOString(),
    updatedByUserId: 3
}))
registerEndpoint('/api/admin/season/active', () => null)
registerEndpoint('/api/admin/season', () => [])
registerEndpoint('/api/admin/allergy-type', () => AllergyFactory.createMockAllergyTypesWithInhabitants())
registerEndpoint('/api/admin/users/by-role/ALLERGYMANAGER', () => [])
registerEndpoint('/api/admin/users', () => [])

// Fetching is the store's concern; explicit load repopulates after clearNuxtData.
// The poster has no layout (no UApp), so the real AllergyManagersList gets its
// tooltip provider from the mount helper.
const mountPage = async () => {
    const store = useAllergiesStore()
    await store.loadAllergyTypes()
    await store.loadPosterNotes()
    const wrapper = await mountWithTooltipProvider(AllergyPosterPage)
    await flushPromises()
    return wrapper
}

describe('admin/allergies/pdf (allergy poster)', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        clearNuxtData()
    })

    // Factory canon: Anna adult (V), Bob child (B), Clara baby (b)
    it('marks each person with their age category - children and babies are not adults', async () => {
        const wrapper = await mountPage()
        const text = wrapper.text()

        expect(text).toMatch(/Anna\s*\(V\)/)
        expect(text).toMatch(/Bob\s*\(B\)/)
        expect(text).toMatch(/Clara\s*\(b\)/)
    })

    it('renders category counts via the shared formatTicketCounts formatter', async () => {
        const wrapper = await mountPage()
        const text = wrapper.text()

        expect(text).toContain('[1V 1B]')  // Mælk: Anna + Bob
        expect(text).toContain('[1b]')     // Jordnødder: Clara
    })

    // Same component and same text source (the Setting row) as the catalog footer on /admin/allergies
    it('renders the notes box with the stored notes', async () => {
        const wrapper = await mountPage()

        expect(findByTestId(wrapper, ALLERGY_TEST_IDS.notes).text()).toContain('Vigtige bemærkninger')
        expect(findAllByTestId(wrapper, ALLERGY_TEST_IDS.notesItem).map(item => item.text()))
            .toEqual(STORED_NOTES.split('\n'))
    })

    // The poster is read-only: the notes are edited on /admin/allergies
    it('renders no pencil on the notes', async () => {
        const wrapper = await mountPage()

        expect(findByTestId(wrapper, ALLERGY_TEST_IDS.editNotes).exists()).toBe(false)
    })

    // The poster renders the QR itself (no external image service), so it survives offline and prints
    it('renders the QR code for the poster URL', async () => {
        const wrapper = await mountPage()
        const qr = findByTestId(wrapper, ALLERGY_TEST_IDS.qr)

        expect(qr.exists()).toBe(true)
        expect(qr.attributes('aria-label')).toContain('/admin/allergies/pdf')
    })
})
