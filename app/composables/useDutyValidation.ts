import {z} from 'zod'
import {RoleSchema} from '~~/prisma/generated/zod'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {IdSchema} from '~/composables/useCoreValidation'

/**
 * Validation schemas for the duty roster (ADR-001, ADR-010); isomorphic, the repository imports it (ADR-017)
 */
export const useDutyValidation = () => {
    const {WeekDayMapSchemaOptional, serializeWeekDayMap, deserializeWeekDayMap} = useWeekDayMapValidation<boolean>({
        valueSchema: z.boolean(),
        defaultValue: false
    })

    // Dates coerce because the client parses the slot from JSON
    const JokerSlotSchema = z.object({
        id: IdSchema,
        cookingTeamId: IdSchema,
        role: RoleSchema,
        allocationPercentage: z.number().int().min(1).max(100),
        affinity: WeekDayMapSchemaOptional,
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        note: z.string().nullable(),
        createdAt: z.coerce.date(),
        updatedAt: z.coerce.date()
    })

    const JokerSlotCreateSchema = JokerSlotSchema
        .omit({id: true, cookingTeamId: true, createdAt: true, updatedAt: true})
        .extend({
            allocationPercentage: JokerSlotSchema.shape.allocationPercentage.default(100),
            note: z.string().nullish()
        })
        .refine(slot => Object.values(slot.affinity).some(Boolean), {message: 'Vælg mindst én ugedag', path: ['affinity']})
        .refine(slot => slot.endDate >= slot.startDate, {message: 'Slutdato skal være på eller efter startdato', path: ['endDate']})

    const SerializedJokerSlotSchema = JokerSlotSchema.extend({
        affinity: z.string()
    })

    type JokerSlot = z.infer<typeof JokerSlotSchema>
    type SerializedJokerSlot = z.infer<typeof SerializedJokerSlotSchema>

    const serializeJokerSlot = <T extends Pick<JokerSlot, 'affinity'>>(slot: T): Omit<T, 'affinity'> & {affinity: string} => ({
        ...slot,
        affinity: serializeWeekDayMap(slot.affinity)
    })

    const deserializeJokerSlot = (serialized: SerializedJokerSlot): JokerSlot => JokerSlotSchema.parse({
        ...serialized,
        affinity: deserializeWeekDayMap(serialized.affinity)
    })

    return {
        RoleSchema,
        JokerSlotSchema,
        JokerSlotCreateSchema,
        SerializedJokerSlotSchema,
        serializeJokerSlot,
        deserializeJokerSlot
    }
}

export type JokerSlot = z.infer<ReturnType<typeof useDutyValidation>['JokerSlotSchema']>
export type SerializedJokerSlot = z.infer<ReturnType<typeof useDutyValidation>['SerializedJokerSlotSchema']>
export type JokerSlotCreate = z.infer<ReturnType<typeof useDutyValidation>['JokerSlotCreateSchema']>
