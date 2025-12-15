import {parse} from 'date-fns'
import type {DateRange, WeekDay, WeekDayMap} from '~/types/dateTypes'
import {createWeekDayMapFromSelection} from '~/types/dateTypes'
import {parseCSVLine} from '~/utils/csvUtils'

/**
 * Server-side CSV parsing for season and team imports
 */

const CALENDAR_DATE_FORMAT = 'dd-MM-yyyy'

// ========================================================================
// CALENDAR CSV PARSING
// ========================================================================

export interface ParsedCalendar {
    seasonDates: DateRange
    cookingDays: WeekDayMap<boolean>
    holidays: Array<{name: string, start: Date, end: Date}>
    teamDateMapping: Map<number, Date[]>
}

export function parseCalendarCSV(csvContent: string): ParsedCalendar {
    const lines = csvContent.trim().split('\n')
    if (lines.length < 2) throw new Error('Calendar CSV must have header and at least one data row')

    const rows = lines.slice(1).map((line, index) => {
        const cells = parseCSVLine(line)
        const [dateStr, weekday, team] = cells.map(s => s.trim())
        if (!dateStr) {
            throw new Error(`Calendar CSV row ${index + 2}: missing date`)
        }
        const date = parse(dateStr, CALENDAR_DATE_FORMAT, new Date())
        if (isNaN(date.getTime())) {
            throw new Error(`Calendar CSV row ${index + 2}: invalid date '${dateStr}'`)
        }
        return {date, weekday: weekday as WeekDay, team: team ?? ''}
    })

    const firstRow = rows[0]
    const lastRow = rows[rows.length - 1]
    if (!firstRow || !lastRow) {
        throw new Error('Calendar CSV must have at least one data row')
    }
    const seasonDates: DateRange = {
        start: firstRow.date,
        end: lastRow.date
    }

    const uniqueWeekdays = [...new Set(rows.map(r => r.weekday))]
    const cookingDays = createWeekDayMapFromSelection(uniqueWeekdays)

    const holidays: Array<{name: string, start: Date, end: Date}> = []
    let currentHoliday: {name: string, start: Date, end: Date} | null = null

    rows.forEach(r => {
        const isHoliday = isNaN(Number(r.team))
        if (isHoliday) {
            if (!currentHoliday || currentHoliday.name !== r.team) {
                if (currentHoliday) holidays.push(currentHoliday)
                currentHoliday = {name: r.team, start: r.date, end: r.date}
            } else {
                currentHoliday.end = r.date
            }
        } else {
            if (currentHoliday) {
                holidays.push(currentHoliday)
                currentHoliday = null
            }
        }
    })
    if (currentHoliday) holidays.push(currentHoliday)

    const teamDateMapping = new Map<number, Date[]>()
    rows.forEach(r => {
        const teamNum = Number(r.team)
        if (!isNaN(teamNum)) {
            const teamDates = teamDateMapping.get(teamNum) ?? []
            teamDates.push(r.date)
            teamDateMapping.set(teamNum, teamDates)
        }
    })

    return {seasonDates, cookingDays, holidays, teamDateMapping}
}

// ========================================================================
// TEAMS CSV PARSING
// ========================================================================

const AFFINITY_ABBREVIATIONS: Record<string, WeekDay> = {
    'man': 'mandag',
    'tirs': 'tirsdag',
    'ons': 'onsdag',
    'tors': 'torsdag'
}

export interface ParsedTeamMember {
    csvName: string
    role: 'CHEF' | 'COOK' | 'JUNIORHELPER'
    affinity: WeekDayMap<boolean> | null
    inhabitantId: number | null
}

export interface ParsedTeam {
    name: string
    members: ParsedTeamMember[]
}

export interface ParseTeamsResult {
    teams: ParsedTeam[]
    unmatched: string[]
}

export function parseTeamsCSV(
    csvContent: string,
    matchInhabitant: (name: string) => number | null
): ParseTeamsResult {
    const lines = csvContent.trim().split('\n')
    if (lines.length < 2) throw new Error('Teams CSV must have header and at least one data row')

    const unmatched: string[] = []
    const teamMap = new Map<string, ParsedTeam>()

    lines.slice(1).forEach((line, index) => {
        const cells = parseCSVLine(line)
        const [team, role, name, affinityStr] = cells.map(s => s.trim())

        if (!team || !role || !name) {
            throw new Error(`Teams CSV row ${index + 2}: missing required fields`)
        }

        if (!['CHEF', 'COOK', 'JUNIORHELPER'].includes(role)) {
            throw new Error(`Teams CSV row ${index + 2}: invalid role '${role}'`)
        }

        const weekday = affinityStr ? AFFINITY_ABBREVIATIONS[affinityStr.toLowerCase()] : null
        const affinity = weekday ? createWeekDayMapFromSelection([weekday]) : null

        const inhabitantId = matchInhabitant(name)
        if (inhabitantId === null) {
            unmatched.push(name)
        }

        const member: ParsedTeamMember = {
            csvName: name,
            role: role as 'CHEF' | 'COOK' | 'JUNIORHELPER',
            affinity,
            inhabitantId
        }

        const existing = teamMap.get(team)
        if (existing) {
            existing.members.push(member)
        } else {
            teamMap.set(team, {name: team, members: [member]})
        }
    })

    return {teams: Array.from(teamMap.values()), unmatched}
}
