/**
 * Delivery validation — the delivery facts a run leaves behind (ADR-001 validation layer).
 * A delivery is one version of a subject reaching one channel: the CSV archived to R2, a mail queued.
 * Isomorphic (ADR-017): explicit imports only.
 */
import {z} from 'zod'
import {DeliveryKindSchema, DeliverySubjectSchema} from '~~/prisma/generated/zod'

const DeliverySchema = z.object({
    id: z.number().int(),
    subjectType: DeliverySubjectSchema,
    subjectId: z.number().int(),
    version: z.number().int().min(1),
    kind: DeliveryKindSchema,
    reference: z.string().min(1),
    jobRunId: z.number().int().nullable(),
    deliveredAt: z.coerce.date()
})

const DeliveryCreateSchema = DeliverySchema.omit({id: true, deliveredAt: true, jobRunId: true}).extend({
    jobRunId: z.number().int().optional()
})

/** The highest delivered version per kind for one subject; 0 before the first delivery of that kind (one key per DeliveryKind) */
const DeliveredVersionsSchema = z.object({
    ARCHIVE: z.number().int().min(0),
    EMAIL: z.number().int().min(0),
    SMS: z.number().int().min(0)
})

const NO_DELIVERIES: DeliveredVersions = {ARCHIVE: 0, EMAIL: 0, SMS: 0}

/** Pure: reduce a subject's delivery rows to the highest version per kind */
export const deliveredVersions = (rows: Array<Pick<Delivery, 'kind' | 'version'>>): DeliveredVersions =>
    rows.reduce((max, row) => ({...max, [row.kind]: Math.max(max[row.kind], row.version)}), {...NO_DELIVERIES})

export type Delivery = z.infer<typeof DeliverySchema>
export type DeliveryCreate = z.infer<typeof DeliveryCreateSchema>
export type DeliveredVersions = z.infer<typeof DeliveredVersionsSchema>

export const useDeliveryValidation = () => ({
    DeliverySchema,
    DeliveryCreateSchema,
    DeliveredVersionsSchema,
    DeliveryKindSchema,
    DeliverySubjectSchema
})
