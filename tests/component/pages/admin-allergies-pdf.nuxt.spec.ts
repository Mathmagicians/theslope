// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {mountSuspended, mockComponent, registerEndpoint} from '@nuxt/test-utils/runtime'
import {setActivePinia, createPinia} from 'pinia'
import {flushPromises} from '@vue/test-utils'
import {clearNuxtData} from '#app'
import {h} from 'vue'
import AllergyPosterPage from '~/pages/admin/allergies/pdf.vue'
import {useAllergiesStore} from '~/stores/allergies'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'

// Endpoint mocks - specific FIRST, generic LAST (docs/testing.md)
registerEndpoint('/api/admin/season/active', () => null)
registerEndpoint('/api/admin/season', () => [])
registerEndpoint('/api/admin/allergy-type', () => AllergyFactory.createMockAllergyTypesWithInhabitants())
registerEndpoint('/api/admin/users/by-role/ALLERGYMANAGER', () => [])

mockComponent('AllergyManagersList', {setup: () => () => h('div')})

// Fetching is the store's concern; explicit load repopulates after clearNuxtData
const mountPage = async () => {
    await useAllergiesStore().loadAllergyTypes()
    const wrapper = await mountSuspended(AllergyPosterPage)
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
})
