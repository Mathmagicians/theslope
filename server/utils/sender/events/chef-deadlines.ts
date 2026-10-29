/**
 * The chef deadlines sender event: the DAILY_MAINTENANCE job tells the chef what the dinner misses from the chef, one
 * notice a dinner a night at most, listing every deadline of the dinner. The deadlines and their alarms are the chef
 * page's (getChefDeadlines): a notice goes the night an alarm turns yellow or red and every night an alarm is overdue,
 * none once the dinner has started and none while no alarm is yellow. It goes to the chef's closest user
 * (findClosestUserInHousehold). The active season's dinners and their chefs are read once (ADR-014); the delivery step
 * (deliveries.ts) sends each version once. The booking emails flag (SHOULD_SEND_BOOKING_EMAILS_FLAG) off, a run sends
 * and records nothing.
 */
import {differenceInDays} from 'date-fns'
import {siteUrl} from '~~/server/utils/sender/compose'
import {bookingEmailsOff, type EmailChannel} from '~~/server/utils/sender/config'
import {deliverDesired, nothingSent, type DeliveryOptions, type DeliveryResult, type DesiredOutgoing, type LoadedDeliveries} from '~~/server/utils/sender/deliveries'
import {findClosestUserInHousehold, readPeople} from '~~/server/utils/sender/records'
import type {NotificationConfig} from '~/composables/useNotificationValidation'
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'
import {useDeliveryValidation} from '~/composables/useDeliveryValidation'
import {ALARM_LEVEL, DinnerStepState, useBooking, type AlarmLevel, type ChefDeadline, type ChefDeadlineStep} from '~/composables/useBooking'
import {useSeason, type SeasonDeadlines} from '~/composables/useSeason'
import {CHEF_DEADLINE_WORDS, NotificationKind, type ChefDeadlineWords} from '~/config/notificationTemplates'
import {fetchSeason} from '~~/server/data/prismaRepository'
import {isClosedDinner} from '~~/server/utils/waitlistAssignment'
import {DATE_SETTINGS, formatDate, formatDateInTimezone, formatTimeSince, isSameDayInTimezone} from '~/utils/date'

const {DeliverySubjectSchema, SenderEventSchema} = useDeliveryValidation()
const {CHEF_DEADLINES} = SenderEventSchema.enum

// The levels a deadline below overdue takes in a version: green or met, yellow, red
const LEVELS_BELOW_OVERDUE = ALARM_LEVEL.overdue

/**
 * A notice's version. Below overdue one per combination of the deadlines' levels, the levels the digits of a base-3
 * number, the menu first: each alarm turning yellow or red is a version of its own. Once an alarm is overdue one per
 * day since its deadline, past every combination. Null while no alarm is yellow
 */
const noticeVersion = (chefDeadlines: ChefDeadline[], now: Date): number | null => {
    if (!chefDeadlines.some(({alarm}) => alarm >= ALARM_LEVEL.yellow)) return null
    const overdue = chefDeadlines.find(({alarm}) => alarm === ALARM_LEVEL.overdue)
    if (overdue) return 1 + LEVELS_BELOW_OVERDUE ** chefDeadlines.length + differenceInDays(now, overdue.deadline)
    return 1 + chefDeadlines.reduce((combination, {alarm}) => combination * LEVELS_BELOW_OVERDUE + Math.max(alarm, ALARM_LEVEL.green), 0)
}

const wordsOf = (step: ChefDeadlineStep): ChefDeadlineWords => {
    switch (step) {
        case DinnerStepState.ANNOUNCED: return CHEF_DEADLINE_WORDS.ANNOUNCED
        case DinnerStepState.GROCERIES_DONE: return CHEF_DEADLINE_WORDS.GROCERIES_DONE
    }
}

// The line of a missing deadline's alarm level; a green deadline has none
const alarmLineOf = (words: ChefDeadlineWords, alarm: AlarmLevel) => {
    switch (alarm) {
        case ALARM_LEVEL.yellow: return words.yellow
        case ALARM_LEVEL.red: return words.red
        case ALARM_LEVEL.overdue: return words.overdue
        default: return undefined
    }
}

// A moment as the chef reads it in Copenhagen: "10/10/2026 kl. 18:00"
const momentOf = (moment: Date): string => formatDateInTimezone(moment, DATE_SETTINGS.DATE_AT_TIME_MASK)

// A deadline's lines: check once met; missing, its deadline, the countdown the chef page shows while the deadline is
// ahead or the time since it once overdue, and the line of its alarm level
const deadlineLines = (chefDeadline: ChefDeadline, booking: string, now: Date): string => {
    const words = wordsOf(chefDeadline.step)
    if (chefDeadline.met) return CHEF_DEADLINE_WORDS.met(words.title)
    const {today, tomorrow} = CHEF_DEADLINE_WORDS.deadlineDay
    const times = {deadline: momentOf(chefDeadline.deadline), booking, day: isSameDayInTimezone(chefDeadline.deadline, now) ? today : tomorrow}
    const countdown = chefDeadline.alarm === ALARM_LEVEL.overdue ? formatTimeSince(chefDeadline.deadline, now) : chefDeadline.description
    const missing = CHEF_DEADLINE_WORDS.missing(words.title, times.deadline, countdown)
    const line = alarmLineOf(words, chefDeadline.alarm)
    return line ? `${missing}\n${CHEF_DEADLINE_WORDS.alarm(line(times))}` : missing
}

/** A dinner the notice tells about: its chef, its deadlines as they stand and the version they make */
interface DinnerNotice {
    dinner: DinnerEventDisplay
    chefId: number
    chefDeadlines: ChefDeadline[]
    version: number
}

// The notice's values: the dinner by its date, its deadlines as they stand at the run and the chef page on it
const valuesOf = ({dinner, chefDeadlines}: DinnerNotice, deadlines: SeasonDeadlines, now: Date) => (config: NotificationConfig): Record<string, string> => {
    const booking = momentOf(deadlines.getBookingDeadlineTime(dinner.date))
    return {
        date: formatDate(dinner.date),
        deadlines: chefDeadlines.map(chefDeadline => deadlineLines(chefDeadline, booking, now)).join('\n\n'),
        chefUrl: useBooking().buildChefUrl(siteUrl(config, ''), dinner.cookingTeamId, dinner.date)
    }
}

// The notices of the season's dinners with a chef that have not started, eaten and cancelled dinners aside; the dinners
// come with the season
const notificationsOnSeason = async (d1Client: D1Database, seasonId: number | null): Promise<LoadedDeliveries> => {
    if (seasonId === null) return {desired: []}
    const season = await fetchSeason(d1Client, seasonId)
    if (!season) return {desired: []}
    const now = new Date()
    const {deadlinesForSeason, isDinnerPast} = useSeason()
    const {getChefDeadlines} = useBooking()
    const deadlines = deadlinesForSeason(season, now)
    const notices = (season.dinnerEvents ?? [])
        .flatMap((dinner): DinnerNotice[] => {
            if (dinner.chefId === null || isClosedDinner(dinner.state) || isDinnerPast(dinner.date, now)) return []
            const chefDeadlines = getChefDeadlines(dinner, deadlines, now)
            const version = noticeVersion(chefDeadlines, now)
            return version === null ? [] : [{dinner, chefId: dinner.chefId, chefDeadlines, version}]
        })
    if (notices.length === 0) return {desired: []}
    const closestUser = findClosestUserInHousehold(await readPeople(d1Client, notices.map(({chefId}) => chefId)))
    return {
        desired: notices.flatMap((notice): DesiredOutgoing[] => {
            const {to, userId, notificationChannels} = closestUser(notice.chefId)
            if (to === null || userId === null) return []
            return [{
                subjectType: DeliverySubjectSchema.enum.DINNER_EVENT, subjectId: notice.dinner.id, version: notice.version,
                notification: NotificationKind.CHEF_DINNER_DEADLINES, userId, to, notificationChannels,
                values: valuesOf(notice, deadlines, now), correlationId: `dinner ${notice.dinner.id}`
            }]
        })
    }
}

/**
 * The chef deadlines notices of the active season's dinners as they stand, raised by the DAILY_MAINTENANCE job. The
 * delivery records keep each version from going twice; without a season it sends nothing
 */
export const sendChefDeadlines = async (
    d1Client: D1Database, channel: EmailChannel, seasonId: number | null, options: DeliveryOptions = {}
): Promise<DeliveryResult> =>
    bookingEmailsOff(CHEF_DEADLINES, options.dryRun) ? nothingSent() : deliverDesired(d1Client, channel, CHEF_DEADLINES, () => notificationsOnSeason(d1Client, seasonId), options)
