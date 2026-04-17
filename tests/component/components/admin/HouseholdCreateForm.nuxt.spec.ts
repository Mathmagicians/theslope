// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {flushPromises} from '@vue/test-utils'
import HouseholdCreateForm from '~/components/admin/HouseholdCreateForm.vue'
import {nextTick, ref} from 'vue'
import type {HouseholdDisplay} from '~/composables/useCoreValidation'
import {formatDate} from '~/utils/date'

// ---- Test data helpers ----

const makeHousehold = (overrides: Partial<HouseholdDisplay> = {}): HouseholdDisplay => ({
    id: 1,
    pbsId: 101,
    address: 'Skråningen 14',
    shortName: 'S_14',
    name: 'Husstand 1',
    heynaboId: 42,
    movedInDate: new Date('2020-01-01'),
    moveOutDate: null,
    inhabitants: [],
    ...overrides,
})

// Default: one placeholder household so the form renders (not empty state) and tests can
// pick its address without arranging prev owners explicitly.
const DEFAULT_HOUSEHOLDS: HouseholdDisplay[] = [makeHousehold()]

const mount = (props: {existingHouseholds?: HouseholdDisplay[]} = {}) =>
    mountSuspended(HouseholdCreateForm, {
        props: {existingHouseholds: props.existingHouseholds ?? DEFAULT_HOUSEHOLDS},
        global: {provide: {isMd: ref(true)}}
    })

// ---- Interaction helpers ----

// USelectMenu doesn't expose an <input name="address">; simulate selection
// by emitting update:modelValue on the v-modeled component (same value key "value" = address string).
const pickAddress = async (wrapper: Awaited<ReturnType<typeof mount>>, address: string) => {
    const addressSelect = wrapper.findComponent({name: 'USelectMenu'})
    addressSelect.vm.$emit('update:modelValue', address)
    await nextTick()
    await nextTick()
}

const fillPbs = async (wrapper: Awaited<ReturnType<typeof mount>>, pbsId: string) => {
    await wrapper.find('input[name="pbsId"]').setValue(pbsId)
    await nextTick()
}

const pickDateByName = async (wrapper: Awaited<ReturnType<typeof mount>>, name: string, date: Date) => {
    const picker = wrapper.findAllComponents({name: 'CalendarDatePicker'}).find(p => p.props('name') === name)
    const vm = picker!.vm as unknown as {updateDate: (d: Date) => boolean}
    vm.updateDate(date)
    await nextTick()
    await nextTick()
}

const pickMoveInDate = (wrapper: Awaited<ReturnType<typeof mount>>, date: Date) =>
    pickDateByName(wrapper, 'movedInDate', date)

// The submit button's @click calls formRef.submit() internally (NuxtUI pattern for
// buttons outside the <form> scope — https://ui.nuxt.com/components/form#methods).
// UForm.submit() validates schema + contextual rules asynchronously, so flush promises.
const clickSubmit = async (wrapper: Awaited<ReturnType<typeof mount>>) => {
    const submitBtn = wrapper.findAll('button').find(b => b.text().includes('Opret husstand'))
    await submitBtn!.trigger('click')
    await flushPromises()
    await nextTick()
}

// ---- Tests ----

describe('HouseholdCreateForm', () => {

    // ========== RENDERING ==========

    it.each([
        ['Ny husstand'],
        ['PBS'],
        ['Adresse'],
        ['Vælg en indflytningsdato'],
        ['Annuller'],
        ['Opret husstand'],
    ])('renders label/button "%s"', async (label) => {
        const wrapper = await mount()
        expect(wrapper.text()).toContain(label)
    })

    // ========== PBS CONFLICT ==========

    it('shows PBS conflict warning when pbsId matches existing household', async () => {
        const existing = [makeHousehold({pbsId: 101, shortName: 'S_17'})]
        const wrapper = await mount({existingHouseholds: existing})
        await fillPbs(wrapper, '101')
        expect(wrapper.text()).toContain('101')
        expect(wrapper.text()).toContain('S_17')
        expect(wrapper.text()).toContain('bruges af')
    })

    it('does not show PBS warning when pbsId is unique', async () => {
        const existing = [makeHousehold({pbsId: 200, shortName: 'S_17'})]
        const wrapper = await mount({existingHouseholds: existing})
        await fillPbs(wrapper, '101')
        expect(wrapper.html()).not.toContain('bruges af')
    })

    // ========== COEXISTENCE NOTICE ==========

    it('shows coexistence notice when address matches existing household', async () => {
        const existing = [makeHousehold({pbsId: 115, address: 'Skråningen 14', shortName: 'S_14', heynaboId: 42})]
        const wrapper = await mount({existingHouseholds: existing})
        await pickAddress(wrapper, 'Skråningen 14')
        expect(wrapper.text()).toContain('S_14')
        expect(wrapper.text()).toContain('115')
        expect(wrapper.text()).toMatch(/[Ee]ksisterende husstand/)
    })

    it('shows heynaboId in the address option label (admin reference)', async () => {
        const existing = [makeHousehold({pbsId: 115, address: 'Skråningen 14', heynaboId: 99})]
        const wrapper = await mount({existingHouseholds: existing})
        await pickAddress(wrapper, 'Skråningen 14')
        // USelect renders the label "Skråningen 14 · HN 99"
        expect(wrapper.text()).toContain('HN 99')
    })

    // ========== EMITS ==========

    it('emits cancel on Annuller click', async () => {
        const wrapper = await mount()
        const cancelBtn = wrapper.findAll('button').find(b => b.text().includes('Annuller'))
        await cancelBtn!.trigger('click')
        await nextTick()
        expect(wrapper.emitted('cancel')).toBeTruthy()
    })

    it('emits create with heynaboId + name inherited from prev owner', async () => {
        // Prev owner has moveOutDate: null → auto-sync to new movedInDate, included in prevOwnerMoveOutUpdates
        const existing = [makeHousehold({id: 7, pbsId: 115, address: 'Skråningen 14', heynaboId: 42, name: 'Familien Hansen'})]
        const wrapper = await mount({existingHouseholds: existing})

        await pickAddress(wrapper, 'Skråningen 14')
        await fillPbs(wrapper, '116')

        const moveInDate = new Date('2026-05-15')
        await pickMoveInDate(wrapper, moveInDate)
        const dateInput = wrapper.find('input[name="movedInDate"]').element as HTMLInputElement
        expect(dateInput.value).toBe(formatDate(moveInDate))

        await clickSubmit(wrapper)

        const emitted = wrapper.emitted('create')
        expect(emitted).toBeTruthy()
        expect(emitted![0]![0]).toEqual({
            pbsId: 116,
            address: 'Skråningen 14',
            movedInDate: moveInDate,
            heynaboId: 42,
            name: 'Familien Hansen',
            prevOwnerMoveOutUpdates: [{id: 7, moveOutDate: moveInDate}]
        })
    })

    // ========== VALIDATION BLOCKS SUBMIT ==========
    // All paths (missing fields, PBS conflict, move-in before prev owner moves out) are
    // handled by Zod schema + refine + validateForm callback — UForm blocks submit for all.
    interface ValidationScenario {
        existingHouseholds?: HouseholdDisplay[]
        pbsId?: string
        address?: string
        movedInDate?: Date
    }

    it.each<[string, ValidationScenario]>([
        ['no fields filled',                              {}],
        ['only pbsId',                                    {pbsId: '999'}],
        ['only address',                                  {address: 'Skråningen 14'}],
        ['pbsId + address (missing date)',                {pbsId: '999', address: 'Skråningen 14'}],
        ['PBS conflicts with existing household',         {
            existingHouseholds: [makeHousehold({pbsId: 101, shortName: 'S_14', address: 'Skråningen 14'})],
            pbsId: '101', address: 'Skråningen 14', movedInDate: new Date('2026-06-01')
        }],
        ['new family moves in before prev owner moves out', {
            existingHouseholds: [makeHousehold({id: 9, pbsId: 200, address: 'Skråningen 14', moveOutDate: new Date('2026-06-01')})],
            pbsId: '201', address: 'Skråningen 14', movedInDate: new Date('2026-05-15')
        }]
    ])('form validation blocks submit: %s', async (_, s) => {
        const wrapper = await mount(s.existingHouseholds ? {existingHouseholds: s.existingHouseholds} : undefined)
        if (s.pbsId) await fillPbs(wrapper, s.pbsId)
        if (s.address) await pickAddress(wrapper, s.address)
        if (s.movedInDate) await pickMoveInDate(wrapper, s.movedInDate)
        await clickSubmit(wrapper)

        expect(wrapper.emitted('create')).toBeFalsy()
    })
})
