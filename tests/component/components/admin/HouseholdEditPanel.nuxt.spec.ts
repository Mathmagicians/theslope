// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import HouseholdEditPanel from '~/components/admin/HouseholdEditPanel.vue'
import {nextTick, ref} from 'vue'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import type {HouseholdDisplay} from '~/composables/useCoreValidation'

describe('HouseholdEditPanel', () => {

    const makeInhabitant = (id: number, name: string, lastName: string, householdId: number): HouseholdDisplay['inhabitants'][number] => ({
        id, name, lastName, householdId,
        heynaboId: id * 10, pictureUrl: null, birthDate: null, dinnerPreferences: null
    })

    // Shared heynaboId → household1 and household2 coexist at the same address
    // (HouseholdEditPanel scopes inhabitant listing to siblings by heynaboId)
    const SHARED_HEYNABO_ID = 99999

    const makeHousehold = (id: number, shortName: string, pbsId: number, inhabitants: HouseholdDisplay['inhabitants'] = []): HouseholdDisplay => ({
        ...HouseholdFactory.defaultHouseholdData(`panel-${id}`),
        id, shortName, pbsId, inhabitants,
        heynaboId: SHARED_HEYNABO_ID
    })

    const household1 = makeHousehold(1, 'S_31', 100, [
        makeInhabitant(1, 'Emil', 'Sørensen', 1),
        makeInhabitant(2, 'Frida', 'Sørensen', 1)
    ])
    const household2 = makeHousehold(2, 'S_32', 200, [
        makeInhabitant(3, 'Anna', 'Hansen', 2)
    ])
    const allHouseholds = [household1, household2]

    const mount = (household: HouseholdDisplay = household1) =>
        mountSuspended(HouseholdEditPanel, {
            props: {household, allHouseholds},
            global: {provide: {isMd: ref(true)}}
        })

    // ========== STAMDATA ==========

    it.each([
        ['PBS-nummer', '100'],
        ['Adresse', household1.address],
        ['Heynabo-ID', String(household1.heynaboId)],
        ['Forkortelse', 'S_31']
    ])('shows stamdata %s = %s', async (label, value) => {
        const wrapper = await mount()
        expect(wrapper.text()).toContain(label)
        expect(wrapper.text()).toContain(value)
    })

    // ========== RESIDENS ==========

    it('shows residens section', async () => {
        const wrapper = await mount()
        expect(wrapper.text()).toContain('Residens')
    })

    // ========== BEBOERE ==========

    it('shows all inhabitants across households', async () => {
        const wrapper = await mount()
        const text = wrapper.text()
        expect(text).toContain('Emil')
        expect(text).toContain('Anna')
    })

    it('shows "I denne husstand" for own inhabitants', async () => {
        const wrapper = await mount()
        expect(wrapper.text()).toContain('I denne husstand')
    })

    it('shows "Flyt hertil" for other inhabitants', async () => {
        const wrapper = await mount()
        expect(wrapper.text()).toContain('Flyt hertil')
    })

    // ========== EMITS ==========

    it('emits move:inhabitant on Flyt hertil click', async () => {
        const wrapper = await mount()
        const btn = wrapper.findAll('button').find(b => b.text().includes('Flyt hertil'))
        await btn!.trigger('click')
        await nextTick()
        expect(wrapper.emitted('move:inhabitant')).toBeTruthy()
    })

    it('emits close on Annuller click', async () => {
        const wrapper = await mount()
        const btn = wrapper.findAll('button').find(b => b.text().includes('Annuller'))
        await btn!.trigger('click')
        await nextTick()
        expect(wrapper.emitted('close')).toBeTruthy()
    })

    // ========== DELETE ==========

    it('shows delete with shortName and PBS', async () => {
        const wrapper = await mount()
        expect(wrapper.text()).toContain('Slet S_31 (PBS 100)')
    })
})
