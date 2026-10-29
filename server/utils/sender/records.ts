/**
 * The rows a sender event's notifications name, read once per kind (ADR-014), and the user each notification about an
 * inhabitant goes to: the inhabitant's closest user (findClosestUserInHousehold)
 */
import type {HouseholdDisplay, InhabitantDisplay, UserDisplay} from '~/composables/useCoreValidation'
import type {NotificationChannel} from '~/composables/useUserPreferenceValidation'
import {fetchHouseholdsByIds, fetchInhabitantsByIds, fetchUsersByIds} from '~~/server/data/prismaRepository'

/** The ids named, once each */
export const idsOf = (ids: (number | null | undefined)[]): number[] => [...new Set(ids.filter((id): id is number => !!id))]

/** The rows of the ids named, in one read; a kind no notification names is not read */
export const readNamed = async <T extends {id: number}>(
    d1Client: D1Database, ids: (number | null | undefined)[], read: (d1Client: D1Database, ids: number[]) => Promise<T[]>
): Promise<Map<number, T>> => {
    const named = idsOf(ids)
    return new Map((named.length === 0 ? [] : await read(d1Client, named)).map(row => [row.id, row]))
}

/** The inhabitants a run's notifications name, their households with their members and the users of both, by id */
export interface PeopleRecords {
    households: Map<number, HouseholdDisplay>
    inhabitants: Map<number, InhabitantDisplay>
    users: Map<number, UserDisplay>
}

/** The people of the inhabitants and households named, one read of each kind: the households come with their members */
export const readPeople = async (
    d1Client: D1Database, inhabitantIds: (number | null | undefined)[], householdIds: number[] = []
): Promise<PeopleRecords> => {
    const inhabitants = await readNamed(d1Client, inhabitantIds, fetchInhabitantsByIds)
    const households = await readNamed(d1Client, [...[...inhabitants.values()].map(inhabitant => inhabitant.householdId), ...householdIds], fetchHouseholdsByIds)
    const users = await readNamed(d1Client, [
        ...[...inhabitants.values(), ...[...households.values()].flatMap(household => household.inhabitants)].map(inhabitant => inhabitant.userId)
    ], fetchUsersByIds)
    return {households, inhabitants, users}
}

/** Who a notification goes to: the address and the user (null where the records name none), the name it greets, the user's channels */
export interface Recipient {
    to: string | null
    userId: number | null
    name: string
    notificationChannels: NotificationChannel[]
}

/** An inhabitant's closest user: the inhabitant's own user, else the first user of the inhabitant's household */
export const findClosestUserInHousehold = ({households, inhabitants, users}: PeopleRecords) => {
    // The member's user hears on its own channels; the notification greets the member
    const recipientOf = (member: InhabitantDisplay | undefined): Recipient => {
        const user = member?.userId ? users.get(member.userId) : undefined
        return {to: user?.email ?? null, userId: user?.id ?? null, name: member?.name ?? '', notificationChannels: user?.notificationChannels ?? []}
    }
    // A household's first user: its member of the lowest id with a user, whatever order the read lists them in
    const firstUserOf = (householdId: number | undefined) => householdId === undefined ? undefined : (households.get(householdId)?.inhabitants ?? [])
        .filter(member => member.userId)
        .sort((a, b) => a.id - b.id)[0]
    return (inhabitantId: number | null, householdId?: number): Recipient => {
        const inhabitant = inhabitantId === null ? undefined : inhabitants.get(inhabitantId)
        return recipientOf(inhabitant?.userId ? inhabitant : firstUserOf(inhabitant?.householdId ?? householdId))
    }
}
