// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import HouseholdEditPanel from '~/components/admin/HouseholdEditPanel.vue'
import {nextTick} from 'vue'
import {enableAutoUnmount} from '@vue/test-utils'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import type {HouseholdDisplay} from '~/composables/useCoreValidation'
import {mountWithTooltipProvider, resetStores} from '~~/tests/component/testHelpers'
import {BUTTON_WORDS} from '~/config/buttonWords'
import {HOUSEHOLD_WORDS} from '~/config/householdWords'

const WORDS = HOUSEHOLD_WORDS.editPanel

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
    const buttonReading = (wrapper: Awaited<ReturnType<typeof mount>>, label: string) => {
        const button = wrapper.findAll('button').find(candidate => candidate.text().includes(label))
        if (!button) throw new Error(`No button reading ${label}`)
        return button
    }

    it('shows the stamdata, the residens section, every inhabitant at the address with its place, and the delete naming the household', async () => {
        const stamdata = [
            [WORDS.facts.pbs, '100'],
            [WORDS.facts.address, household1.address],
            [WORDS.facts.heynaboId, String(household1.heynaboId)],
            [WORDS.facts.shortName, 'S_31']
        ]
        const wrapper = await mount()
        const text = wrapper.text()

        stamdata.forEach(([label, value]) => {
            expect(text).toContain(label)
            expect(text).toContain(value)
        })
        expect(text).toContain(WORDS.facts.title)
        expect(text).toContain(BUTTON_WORDS.heynabo.name)
        expect(text).toContain(WORDS.residency.title)
        // Own inhabitants read "I denne husstand", the sibling household's offer "Flyt hertil"
        expect(text).toContain('Emil')
        expect(text).toContain('Anna')
        expect(text).toContain(WORDS.inhabitants.here)
        expect(text).toContain(WORDS.inhabitants.moveHere)
        expect(text).toContain(WORDS.inhabitants.householdBadge('S_32', 200))
        expect(text).toContain(WORDS.delete.label('S_31', 100))
    })

    // ========== EMITS ==========

    it('emits move:inhabitant on Flyt hertil click', async () => {
        const wrapper = await mount()
        await buttonReading(wrapper, WORDS.inhabitants.moveHere).trigger('click')
        await nextTick()
        expect(wrapper.emitted('move:inhabitant')).toBeTruthy()
    })

    it('emits close on Annuller click', async () => {
        const wrapper = await mount()
        await buttonReading(wrapper, BUTTON_WORDS.cancel).trigger('click')
        await nextTick()
        expect(wrapper.emitted('close')).toBeTruthy()
    })
})
