import {PrismaD1} from "@prisma/adapter-d1"
import {PrismaClient} from "@prisma/client"
import {SETTING_REGISTRY, SettingDetailSchema, type SettingDetail, type SettingKey} from '~/composables/useSettingValidation'

const LOG = '⚙️ > SETTING'

/**
 * Settings persistence. `Setting.key` is the primary key, so every write is an upsert on a
 * unique field (ADR-010 rule 5).
 *
 * The `value` column holds JSON for every key, whatever the key's shape: a text setting is
 * stored as `JSON.stringify(text)` and read back with `JSON.parse` followed by the key's own
 * schema. Serialization is the repository's business (ADR-010) - the endpoints, the store and
 * the components all work with the domain value.
 */
const getPrismaClientConnection = async (d1Client: D1Database) => {
    const adapter = new PrismaD1(d1Client)
    const prisma = new PrismaClient({adapter})
    await prisma.$connect()
    return prisma
}

const toDomain = (row: {key: string, value: string, updatedAt: Date, updatedByUserId: number | null}): SettingDetail =>
    SettingDetailSchema.parse({
        ...row,
        value: SETTING_REGISTRY[row.key as SettingKey].valueSchema.parse(JSON.parse(row.value))
    })

/** The stored row, or null while the key has never been written (the caller answers with the registry default) */
export async function fetchSetting(d1Client: D1Database, key: SettingKey): Promise<SettingDetail | null> {
    const prisma = await getPrismaClientConnection(d1Client)
    const row = await prisma.setting.findUnique({where: {key}})

    if (!row) {
        console.info(`${LOG} > [GET] No row for ${key} - the caller falls back to the registry default`)
        return null
    }
    return toDomain(row)
}

/** Writes the value and who wrote it, creating the row on first edit */
export async function upsertSetting(
    d1Client: D1Database,
    key: SettingKey,
    value: string,
    updatedByUserId: number
): Promise<SettingDetail> {
    const prisma = await getPrismaClientConnection(d1Client)
    const serialized = JSON.stringify(value)

    const row = await prisma.setting.upsert({
        where: {key},
        create: {key, value: serialized, updatedByUserId},
        update: {value: serialized, updatedByUserId}
    })

    console.info(`${LOG} > [POST] Stored ${key} (user id=${updatedByUserId})`)
    return toDomain(row)
}
