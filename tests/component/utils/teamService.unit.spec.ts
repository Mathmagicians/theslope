import {describe, it, expect, vi, beforeEach} from 'vitest'
import {createError} from 'h3'
import {assignAffinitiesAndEvents} from '~~/server/utils/teamService'
import {fetchSeason, updateTeam} from '~~/server/data/prismaRepository'
import {assignCookingTeamToDinnerEvent} from '~~/server/data/financesRepository'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {spyOnLogs} from '~~/tests/component/logSpies'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import type {Season} from '~/composables/useSeasonValidation'

// The repositories stand for the database the unit runtime lacks
vi.mock('~~/server/data/prismaRepository', () => ({fetchSeason: vi.fn(), createTeam: vi.fn(), updateTeam: vi.fn()}))
vi.mock('~~/server/data/financesRepository', () => ({assignCookingTeamToDinnerEvent: vi.fn()}))

await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).stubAppConfig())

const {createDefaultWeekdayMap} = useWeekDayMapValidation()

const d1Client = {} as D1Database
const SEASON_ID = 1
const DELETED_TEAM_ID = 2
const TEAM_IDS = [1, DELETED_TEAM_ID, 3]
const teams = TEAM_IDS.map(id => SeasonFactory.defaultCookingTeamDisplay({id, name: `Hold ${id}`, affinity: null}))
const season: Season = {
    ...SeasonFactory.defaultSeason(),
    id: SEASON_ID,
    CookingTeams: teams
}

// Mon, Wed, Fri with one cooking day in a row: each team holds one weekday, in team order, and cooks the dinner on it
const TEAM_AFFINITIES = [
    createDefaultWeekdayMap([true, false, false, false, false, false, false]),
    createDefaultWeekdayMap([false, false, true, false, false, false, false]),
    createDefaultWeekdayMap([false, false, false, false, true, false, false])
]
const FIRST_DINNER_ID = 11
const DINNER_DATES = [new Date(2025, 0, 6), new Date(2025, 0, 8), new Date(2025, 0, 10)]
const seasonWithDinners: Season = {
    ...season,
    seasonDates: {start: new Date(2025, 0, 6), end: new Date(2025, 0, 10)},
    cookingDays: createDefaultWeekdayMap([true, false, true, false, true, false, false]),
    consecutiveCookingDays: 1,
    dinnerEvents: DINNER_DATES.map((date, i) => ({...DinnerEventFactory.defaultDinnerEventDisplay(), id: FIRST_DINNER_ID + i, date, seasonId: SEASON_ID, cookingTeamId: null}))
}
const seasonHoldingAffinities: Season = {
    ...seasonWithDinners,
    CookingTeams: teams.map((team, i) => ({...team, affinity: TEAM_AFFINITIES[i]}))
}

describe('assignAffinitiesAndEvents', () => {
    const logs = spyOnLogs()

    beforeEach(() => {
        vi.clearAllMocks()
        Object.values(logs).forEach(spy => spy.mockImplementation(() => {}))
        vi.mocked(fetchSeason).mockResolvedValue(season)
    })

    it('GIVEN a season with teams and dinners WHEN assigning THEN each team saves its affinity and each dinner its team', async () => {
        vi.mocked(fetchSeason).mockResolvedValueOnce(seasonWithDinners).mockResolvedValueOnce(seasonHoldingAffinities)
        vi.mocked(updateTeam).mockImplementation(async (_d1, id) => SeasonFactory.defaultCookingTeamDetail({id}))

        const assigned = await assignAffinitiesAndEvents(d1Client, SEASON_ID)

        expect(vi.mocked(updateTeam).mock.calls.map(([, id, team]) => [id, team.affinity])).toEqual(TEAM_IDS.map((id, i) => [id, TEAM_AFFINITIES[i]]))
        expect(vi.mocked(assignCookingTeamToDinnerEvent).mock.calls.map(([, dinnerEventId, cookingTeamId]) => [dinnerEventId, cookingTeamId]))
            .toEqual(TEAM_IDS.map((cookingTeamId, i) => [FIRST_DINNER_ID + i, cookingTeamId]))
        expect(assigned).toBe(DINNER_DATES.length)
    })

    it('GIVEN a team deleted by a parallel request since the season was read WHEN assigning affinities THEN the other teams get theirs and the run goes on to the dinners', async () => {
        vi.mocked(updateTeam).mockImplementation(async (_d1, id) => {
            if (id === DELETED_TEAM_ID) throw createError({statusCode: 404})
            return SeasonFactory.defaultCookingTeamDetail({id})
        })

        await assignAffinitiesAndEvents(d1Client, SEASON_ID)

        expect(vi.mocked(updateTeam).mock.calls.map(([, id]) => id)).toEqual(TEAM_IDS)
        expect(fetchSeason).toHaveBeenCalledTimes(2)
        expect(logs.warn).toHaveBeenCalledWith(expect.stringContaining(`Team ${DELETED_TEAM_ID}`))
    })

    it('GIVEN a team update failing on the server WHEN assigning affinities THEN the run fails with it', async () => {
        vi.mocked(updateTeam).mockRejectedValue(createError({statusCode: 500}))

        await expect(assignAffinitiesAndEvents(d1Client, SEASON_ID)).rejects.toMatchObject({statusCode: 500})
        expect(fetchSeason).toHaveBeenCalledTimes(1)
    })
})
