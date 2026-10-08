import {describe, it, expect} from 'vitest'
import {useDutyValidation, type JokerSlot} from '~/composables/useDutyValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'

const {RoleSchema, serializeJokerSlot, deserializeJokerSlot} = useDutyValidation()
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
})
