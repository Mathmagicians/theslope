// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import HouseholdEditPanel from '~/components/admin/HouseholdEditPanel.vue'
import {nextTick} from 'vue'
import {enableAutoUnmount} from '@vue/test-utils'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import type {HouseholdDisplay} from '~/composables/useCoreValidation'
import {mountWithTooltipProvider, resetStores} from '~~/tests/component/testHelpers'

enableAutoUnmount(afterEach)

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

    beforeEach(() => {
        resetStores()
    })

    const mount = (household: HouseholdDisplay = household1) =>
        mountWithTooltipProvider(HouseholdEditPanel, {props: {household, allHouseholds}, isMd: true})

    it('shows the stamdata, the residens section, every inhabitant at the address with its place, and the delete naming the household', async () => {
        const stamdata = [
            ['PBS-nummer', '100'],
            ['Adresse', household1.address],
            ['Heynabo-ID', String(household1.heynaboId)],
            ['Forkortelse', 'S_31']
        ]
        const wrapper = await mount()
        const text = wrapper.text()

        stamdata.forEach(([label, value]) => {
            expect(text).toContain(label)
            expect(text).toContain(value)
        })
        expect(text).toContain('Residens')
        // Own inhabitants read "I denne husstand", the sibling household's offer "Flyt hertil"
        expect(text).toContain('Emil')
        expect(text).toContain('Anna')
        expect(text).toContain('I denne husstand')
        expect(text).toContain('Flyt hertil')
        expect(text).toContain('Slet S_31 (PBS 100)')
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
})
