import type {BrowserContext} from '@playwright/test'
import {readFileSync, existsSync} from 'fs'
import {join} from 'path'
import testHelpers from '../testHelpers'

const {headers} = testHelpers
const SEASON_IMPORT_ENDPOINT = '/api/admin/season/import'
const TEAM_IMPORT_DIR = join(process.cwd(), '.theslope', 'team-import')

export class SeasonImportFactory {

    static readonly hasTestFiles = (): boolean => {
        return existsSync(join(TEAM_IMPORT_DIR, 'calendar.csv')) &&
               existsSync(join(TEAM_IMPORT_DIR, 'test_teams.csv'))
    }

    static readonly readCalendarCSV = (): string => {
        return readFileSync(join(TEAM_IMPORT_DIR, 'calendar.csv'), 'utf-8')
    }

    static readonly readTeamsCSV = (): string => {
        return readFileSync(join(TEAM_IMPORT_DIR, 'test_teams.csv'), 'utf-8')
    }

    static readonly importSeason = async (
        context: BrowserContext,
        calendarCsv: string,
        teamsCsv: string
    ) => {
        const response = await context.request.post(SEASON_IMPORT_ENDPOINT, {
            headers,
            data: {calendarCsv, teamsCsv}
        })
        return response
    }
}
