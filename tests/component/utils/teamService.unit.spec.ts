import {describe, it, expect, vi, beforeEach} from 'vitest'
import {createError} from 'h3'
import {assignAffinitiesAndEvents} from '~~/server/utils/teamService'
import {fetchSeason, updateTeam} from '~~/server/data/prismaRepository'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {spyOnLogs} from '~~/tests/component/logSpies'
import type {Season} from '~/composables/useSeasonValidation'

// The repositories stand for the database the unit runtime lacks
vi.mock('~~/server/data/prismaRepository', () => ({fetchSeason: vi.fn(), createTeam: vi.fn(), updateTeam: vi.fn()}))
vi.mock('~~/server/data/financesRepository', () => ({assignCookingTeamToDinnerEvent: vi.fn()}))

await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).stubAppConfig())

const d1Client = {} as D1Database
const SEASON_ID = 1
const DELETED_TEAM_ID = 2
const TEAM_IDS = [1, DELETED_TEAM_ID, 3]
const season: Season = {
    ...SeasonFactory.defaultSeason(),
    id: SEASON_ID,
    CookingTeams: TEAM_IDS.map(id => SeasonFactory.defaultCookingTeamDisplay({id, name: `Hold ${id}`, affinity: null}))
}

describe('assignAffinitiesAndEvents', () => {
    const logs = spyOnLogs()

    beforeEach(() => {
        vi.clearAllMocks()
        Object.values(logs).forEach(spy => spy.mockImplementation(() => {}))
        vi.mocked(fetchSeason).mockResolvedValue(season)
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
