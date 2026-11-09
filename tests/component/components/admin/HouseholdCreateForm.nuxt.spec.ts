// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {enableAutoUnmount, flushPromises} from '@vue/test-utils'
import HouseholdCreateForm from '~/components/admin/HouseholdCreateForm.vue'
import CalendarDatePicker from '~/components/calendar/CalendarDatePicker.vue'
import {nextTick} from 'vue'
import type {HouseholdDisplay} from '~/composables/useCoreValidation'
import {mountWithTooltipProvider, findDateSegments, resetStores} from '~~/tests/component/testHelpers'
import {BUTTON_WORDS} from '~/config/buttonWords'
import {HOUSEHOLD_WORDS} from '~/config/householdWords'
import {formatDate} from '~/utils/date'

const WORDS = HOUSEHOLD_WORDS.createForm

enableAutoUnmount(afterEach)

beforeEach(() => {
    resetStores()
})

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
    mountWithTooltipProvider(HouseholdCreateForm, {props: {existingHouseholds: props.existingHouseholds ?? DEFAULT_HOUSEHOLDS}, isMd: true})

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
    const picker = wrapper.findAllComponents(CalendarDatePicker).find(p => p.props('name') === name)
    if (!picker) throw new Error(`No date picker named ${name}`)
    picker.vm.$emit('update:modelValue', date)
    await nextTick()
    await nextTick()
}

const pickMoveInDate = (wrapper: Awaited<ReturnType<typeof mount>>, date: Date) =>
    pickDateByName(wrapper, 'movedInDate', date)

// The submit button's @click calls formRef.submit() internally (NuxtUI pattern for
// buttons outside the <form> scope — https://ui.nuxt.com/components/form#methods).
// UForm.submit() validates schema + contextual rules asynchronously, so flush promises.
const buttonReading = (wrapper: Awaited<ReturnType<typeof mount>>, label: string) => {
    const button = wrapper.findAll('button').find(candidate => candidate.text().includes(label))
    if (!button) throw new Error(`No button reading ${label}`)
    return button
}

const clickSubmit = async (wrapper: Awaited<ReturnType<typeof mount>>) => {
    await buttonReading(wrapper, WORDS.submit).trigger('click')
    await flushPromises()
    await nextTick()
}

// ---- Tests ----

describe('HouseholdCreateForm', () => {

    // ========== RENDERING ==========

    it('renders its labels and buttons', async () => {
        const labels = [WORDS.title, WORDS.pbs.label, WORDS.address.label, WORDS.movedIn, BUTTON_WORDS.cancel, WORDS.submit]
        const wrapper = await mount()
        labels.forEach(label => expect(wrapper.text(), label).toContain(label))
    })

    // ========== PBS CONFLICT ==========

    it('shows PBS conflict warning when pbsId matches existing household', async () => {
        const existing = [makeHousehold({pbsId: 101, shortName: 'S_17'})]
        const wrapper = await mount({existingHouseholds: existing})
        await fillPbs(wrapper, '101')
        expect(wrapper.text()).toContain(WORDS.pbsTaken(101, 'S_17'))
    })

    it('does not show PBS warning when pbsId is unique', async () => {
        const existing = [makeHousehold({pbsId: 200, shortName: 'S_17'})]
        const wrapper = await mount({existingHouseholds: existing})
        await fillPbs(wrapper, '101')
        expect(wrapper.text()).not.toContain(WORDS.pbsTaken(101, 'S_17'))
    })

    // ========== COEXISTENCE NOTICE ==========

    it('shows coexistence notice when address matches existing household, and the heynaboId in the address option label (admin reference)', async () => {
        const existing = [makeHousehold({pbsId: 115, address: 'Skråningen 14', shortName: 'S_14', heynaboId: 99})]
        const wrapper = await mount({existingHouseholds: existing})
        await pickAddress(wrapper, 'Skråningen 14')
        expect(wrapper.text()).toContain(WORDS.prevOwners(1))
        expect(wrapper.text()).toContain(WORDS.prevOwner('S_14', 99, 115))
        expect(wrapper.text()).toContain(WORDS.addressOption('Skråningen 14', 99))
    })

    it('names the date a household at the address moved out, and offers it no move-out field', async () => {
        const movedOut = new Date('2024-06-01')
        const existing = [makeHousehold({id: 9, pbsId: 200, address: 'Skråningen 14', moveOutDate: movedOut})]
        const wrapper = await mount({existingHouseholds: existing})
        await pickAddress(wrapper, 'Skråningen 14')

        expect(wrapper.text()).toContain(WORDS.movedOut(formatDate(movedOut)))
        expect(wrapper.findAllComponents(CalendarDatePicker).map(picker => picker.props('name'))).toEqual(['movedInDate'])
    })

    // ========== EMITS ==========

    it('emits cancel on Annuller click', async () => {
        const wrapper = await mount()
        await buttonReading(wrapper, BUTTON_WORDS.cancel).trigger('click')
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
        // The one move-in picker reads the day and the year it was given
        const movedInPickers = wrapper.findAllComponents(CalendarDatePicker).filter(p => p.props('name') === 'movedInDate')
        const segmentValues = (segment: Parameters<typeof findDateSegments>[1]) => movedInPickers.flatMap(picker => findDateSegments(picker, segment)).map(found => found.attributes('aria-valuenow'))
        expect(segmentValues('day')).toEqual([String(moveInDate.getDate())])
        expect(segmentValues('year')).toEqual([String(moveInDate.getFullYear())])

        await clickSubmit(wrapper)

        expect(wrapper.emitted('create')?.[0]).toEqual([
            {pbsId: 116, address: 'Skråningen 14', movedInDate: moveInDate, heynaboId: 42, name: 'Familien Hansen'},
            [{id: 7, moveOutDate: moveInDate}]
        ])
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
