import {describe, it, expect} from 'vitest'
import {useDutyValidation, type JokerSlot} from '~/composables/useDutyValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {SeasonFactory} from "~~/tests/e2e/testDataFactories/seasonFactory"

const {RoleSchema, JokerSlotCreateSchema, serializeJokerSlot, deserializeJokerSlot} = useDutyValidation()
const {createDefaultWeekdayMap} = useWeekDayMapValidation()

const baseSlot: JokerSlot = {
    id: 1,
    cookingTeamId: 2,
    role: RoleSchema.enum.COOK,
    allocationPercentage: 100,
    affinity: createDefaultWeekdayMap([true, false, true, false, false, false, false]),
    startDate: new Date(2026, 9, 7),
    endDate: new Date(2026, 11, 1),
    note: null,
    createdAt: new Date(2026, 9, 1),
    updatedAt: new Date(2026, 9, 2)
}

describe('useDutyValidation', () => {
    describe.each([
        {name: 'a cook slot without note', slot: baseSlot},
        {name: 'a chef slot with note at half allocation', slot: {...baseSlot, role: RoleSchema.enum.CHEF, allocationPercentage: 50, note: 'Barsel'}},
        {name: 'a junior helper slot on every weekday', slot: {...baseSlot, role: RoleSchema.enum.JUNIORHELPER, affinity: createDefaultWeekdayMap(true)}}
    ])('JokerSlot serialization round trip: $name', ({slot}) => {
        it('stores affinity as a string and restores the domain slot', () => {
            const serialized = serializeJokerSlot(slot)
            expect(typeof serialized.affinity).toBe('string')
            expect(deserializeJokerSlot(serialized)).toEqual(slot)
        })
    })
    describe('JokerSlotCreateSchema', () => {
        const slot = SeasonFactory.defaultJokerSlot()
        const {allocationPercentage: _allocation, note: _note, ...withoutDefaults} = slot

        it.each([
            {name: 'the default slot', input: slot},
            {name: 'a slot ending on its start day', input: {...slot, endDate: slot.startDate}},
            {name: 'the lowest allocation', input: {...slot, allocationPercentage: 1}}
        ])('accepts $name', ({input}) => {
            expect(JokerSlotCreateSchema.safeParse(input).success).toBe(true)
        })

        it('defaults the allocation to 100 and leaves the note out when omitted', () => {
            const parsed = JokerSlotCreateSchema.parse(withoutDefaults)
            expect(parsed.allocationPercentage).toBe(100)
            expect(parsed.note).toBeUndefined()
        })

        describe.each([
            {name: 'an empty weekday map', input: {...slot, affinity: createDefaultWeekdayMap(false)}, path: 'affinity'},
            {name: 'an end before the start', input: {...slot, endDate: new Date(slot.startDate.getTime() - 86_400_000)}, path: 'endDate'},
            {name: 'an allocation of 0', input: {...slot, allocationPercentage: 0}, path: 'allocationPercentage'},
            {name: 'an allocation above 100', input: {...slot, allocationPercentage: 101}, path: 'allocationPercentage'}
        ])('rejects $name', ({input, path}) => {
            it(`reports the issue on ${path}`, () => {
                const result = JokerSlotCreateSchema.safeParse(input)
                expect(result.success).toBe(false)
                expect(result.error?.issues.map(issue => issue.path.join('.'))).toContain(path)
            })
        })
    })
})
