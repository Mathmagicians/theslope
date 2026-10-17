import {describe, it, expect} from 'vitest'
import {useDutyValidation, type JokerSlot} from '~/composables/useDutyValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {SeasonFactory} from "~~/tests/e2e/testDataFactories/seasonFactory"

const {RoleSchema, JokerSlotCreateSchema, serializeJokerSlot, deserializeJokerSlot} = useDutyValidation()
const {createDefaultWeekdayMap} = useWeekDayMapValidation()

const slotWithNote: JokerSlot = {
    id: 1,
    cookingTeamId: 2,
    role: RoleSchema.enum.CHEF,
    allocationPercentage: 50,
    affinity: createDefaultWeekdayMap([true, false, true, false, false, false, false]),
    startDate: new Date(2026, 9, 7),
    endDate: new Date(2026, 11, 1),
    note: 'Barsel',
    createdAt: new Date(2026, 9, 1),
    updatedAt: new Date(2026, 9, 2)
}

describe('useDutyValidation', () => {
    it('JokerSlot serialization round trip stores affinity as a string and restores the domain slot', () => {
        const serialized = serializeJokerSlot(slotWithNote)
        expect(typeof serialized.affinity).toBe('string')
        expect(deserializeJokerSlot(serialized)).toEqual(slotWithNote)
    })

    describe('JokerSlotCreateSchema', () => {
        const slot = SeasonFactory.defaultJokerSlot()
        const {allocationPercentage: _allocation, note: _note, ...withoutDefaults} = slot

        it('accepts a slot ending on its start day', () => {
            expect(JokerSlotCreateSchema.safeParse({...slot, endDate: slot.startDate}).success).toBe(true)
        })

        it('defaults the allocation to 100 and leaves the note out when omitted', () => {
            const parsed = JokerSlotCreateSchema.parse(withoutDefaults)
            expect(parsed.allocationPercentage).toBe(100)
            expect(parsed.note).toBeUndefined()
        })

        it.each([
            {name: 'an empty weekday map', input: {...slot, affinity: createDefaultWeekdayMap(false)}, path: 'affinity'},
            {name: 'an end before the start', input: {...slot, endDate: new Date(slot.startDate.getTime() - 86_400_000)}, path: 'endDate'}
        ])('rejects $name and reports the issue on $path', ({input, path}) => {
            const result = JokerSlotCreateSchema.safeParse(input)
            expect(result.success).toBe(false)
            expect(result.error?.issues.map(issue => issue.path.join('.'))).toContain(path)
        })
    })
})
