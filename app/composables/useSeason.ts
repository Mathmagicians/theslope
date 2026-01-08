import type {DateRange, WeekDayMap} from '~/types/dateTypes'
import {WEEKDAYS} from '~/types/dateTypes'
import type {DateValue} from '@internationalized/date'
import {isSameDay, isWithinInterval} from "date-fns"
import {type Season, useSeasonValidation} from '~/composables/useSeasonValidation'
import {type DinnerEventCreate, type DinnerEventDisplay, type DinnerMode, type OrderCreateWithPrice, type OrderDisplay, type OrderAuditAction, OrderAuditAction as OrderAuditActionEnum, useBookingValidation} from '~/composables/useBookingValidation'
import type {CookingTeamDisplay as CookingTeam} from '~/composables/useCookingTeamValidation'
import {useTicketPriceValidation} from '~/composables/useTicketPriceValidation'
import {type HouseholdDisplay, type InhabitantDisplay, useCoreValidation} from '~/composables/useCoreValidation'
import {useTicket} from '~/composables/useTicket'
import { calculateDeadlineUrgency, computeAffinitiesForTeams, computeCookingDates, computeTeamAssignmentsForEvents,
    findFirstCookingDayInDates, getNextDinnerDate, getDinnerTimeRange, splitDinnerEvents, sortDinnerEventsByTemporal,
    isPast, isFuture, distanceToToday, canSeasonBeActive, getSeasonStatus, sortSeasonsByActivePriority,
    selectMostAppropriateActiveSeason, dateToWeekDay, isBeforeDeadline} from "~/utils/season"
import {getEachDayOfIntervalWithSelectedWeekdays, formatDate, calculateDayFromWeekNumber, formatDateRange, DATE_SETTINGS} from "~/utils/date"
import {chunkArray, pruneAndCreate} from '~/utils/batchUtils'

/**
 * Deadline urgency levels for dinner events
 * 0 = On track, 1 = Warning, 2 = Critical
 */
export type DeadlineUrgency = 0 | 1 | 2

/**
 * Season-configured deadline functions
 * Returned by deadlinesForSeason() - pass as prop to components needing deadline checks
 */
export type SeasonDeadlines = {
    canModifyOrders: (dinnerEventDate: Date) => boolean
    canEditDiningMode: (dinnerEventDate: Date) => boolean
    getOrderCancellationAction: (dinnerEventDate: Date) => {
        updates: { dinnerMode: DinnerMode, state: 'RELEASED', releasedAt: Date }
        auditAction: OrderAuditAction
    } | null
    isAnnounceMenuPastDeadline: (dinnerEventDate: Date) => boolean
}

/**
 * Preference update for batch inhabitant preference clipping
 */
export type PreferenceUpdate = { inhabitantId: number, dinnerPreferences: WeekDayMap<DinnerMode> }

/**
 * Temporal category for dinner events relative to current time
 */
export type TemporalCategory = 'next' | 'future' | 'past'

/**
 * Business logic for working with seasons
 */
export const useSeason = () => {
    // Get validation utilities (including createWeekDayMapFromSelection configured for Season)
    const {
        SeasonStatusSchema,
        holidaysSchema,
        SeasonSchema,
        serializeSeason,
        deserializeSeason,
        createWeekDayMapFromSelection
    } = useSeasonValidation()
    const SeasonStatus = SeasonStatusSchema.enum

    // Get DinnerState enum from booking validation
    const {DinnerStateSchema} = useBookingValidation()
    const DinnerState = DinnerStateSchema.enum

    // Get app configuration
    const appConfig = useAppConfig()
    const {theslope} = appConfig
    const {createTicketPrice, TicketTypeSchema} = useTicketPriceValidation()
    const TicketType = TicketTypeSchema.enum

    /**
     * Create a default season based on app configuration.
     * Returns empty holidays - component should calculate holidays reactively using getDefaultHolidays()
     */
    const getDefaultSeason = (): Season => {
        const thisYear = new Date().getFullYear()
        const dateRange = {
            start: calculateDayFromWeekNumber(0, theslope.defaultSeason.startWeek, thisYear),
            end: calculateDayFromWeekNumber(4, theslope.defaultSeason.endWeek, thisYear + 1)
        }

        const ticketPrices = theslope.defaultSeason.ticketPrices?.map(({
                                                                           ticketType,
                                                                           price,
                                                                           description,
                                                                           maximumAgeLimit
                                                                       }) => createTicketPrice(
                ticketType, price, undefined, description, maximumAgeLimit)) ??
            [createTicketPrice(TicketType.ADULT, 4000)]

        return {
            shortName: createSeasonName(dateRange),
            seasonDates: dateRange,
            isActive: false,
            cookingDays: createWeekDayMapFromSelection(theslope.defaultSeason.cookingDays, true, false),
            holidays: [], // Empty - component calculates reactively based on seasonDates
            ticketPrices: ticketPrices,
            ticketIsCancellableDaysBefore: theslope.defaultSeason.ticketIsCancellableDaysBefore,
            diningModeIsEditableMinutesBefore: theslope.defaultSeason.diningModeIsEditableMinutesBefore,
            consecutiveCookingDays: theslope.defaultSeason.consecutiveCookingDays ?? 1
        }
    }

    /**
     * Calculate default holidays for a given date range.
     * Returns only holidays (from app config) that fit within the date range.
     * Component should call this reactively when seasonDates changes.
     */
    const getDefaultHolidays = (seasonDates: DateRange): DateRange[] => {
        return selectWeekNumbersFromListThatFitInsideDateRange(
            seasonDates,
            theslope.defaultSeason.holidays
        )
    }

    /**
     * Create a season name from a date range
     */
    const createSeasonName = (range: DateRange | undefined): string =>
        formatDateRange(range, DATE_SETTINGS.SEASON_NAME_MASK)

    /**
     * Check if a date is within a season's active period
     */
    const isActive = (today: Date, start: Date, end: Date): boolean => {
        return isWithinInterval(today, {start, end})
    }

    /**
     * Merge a partial season with defaults
     */
    const coalesceSeason = (season?: Partial<Season> | null, defaultSeason: Season = getDefaultSeason()): Season => {
        // If season is falsy (null, undefined, etc.), just return the default season
        if (!season) return defaultSeason;

        return <Season>{
            ...defaultSeason,
            ...season,
            seasonDates: copyPartialDateRange(season.seasonDates ?? defaultSeason.seasonDates),
            cookingDays: {...(season.cookingDays ?? defaultSeason.cookingDays)},
            holidays: season.holidays?.map(copyPartialDateRange) ?? defaultSeason.holidays
        }
    }


    /**
     * Generate dinner event data for a season
     *
     * Interprets season configuration (dates, cooking days, holidays) to determine
     * which dates should have dinner events. Returns data structures ready for persistence.
     *
     * @param season - Season configuration (must be deserialized with Date objects)
     * @returns Array of DinnerEventCreate objects for each valid dinner date
     */
    const generateDinnerEventDataForSeason = (season: Season): DinnerEventCreate[] => {
        if (!SeasonSchema.safeParse(season).success) return []
        const cookingDates = computeCookingDates(
            season.cookingDays,
            season.seasonDates,
            season.holidays
        )
        const now = new Date()
        return cookingDates.map(date => ({
            date,
            menuTitle: '',
            menuDescription: null,
            menuPictureUrl: null,
            state: DinnerState.SCHEDULED,
            totalCost: 0,
            heynaboEventId: null,
            chefId: null,
            cookingTeamId: null,
            seasonId: season.id!,
            createdAt: now,
            updatedAt: now
        }))
    }

    const assignAffinitiesToTeams = (season: Season): CookingTeam[] => {
        // check inputs, and fail early
        if (!SeasonSchema.safeParse(season).success || !season.CookingTeams) return []
        const {
            CookingTeams: teams = [],
            dinnerEvents = [],
            consecutiveCookingDays,
            cookingDays,
            seasonDates
        } = season
        const dates = dinnerEvents.length > 0
            ? dinnerEvents.map(event => event.date)
            : getEachDayOfIntervalWithSelectedWeekdays(
                seasonDates.start,
                seasonDates.end,
                cookingDays
            )
        const first = findFirstCookingDayInDates(cookingDays, dates)
        if( !first ) return teams
        return computeAffinitiesForTeams(teams, cookingDays, consecutiveCookingDays, first)
    }

    const assignTeamsToEvents = (season: Season): DinnerEventDisplay[] => {
        // check inputs, and fail early
        if (!SeasonSchema.safeParse(season).success) return []
        const {
            dinnerEvents = [],
            CookingTeams: teams = [],
            consecutiveCookingDays,
            cookingDays,
            holidays = []
        } = season
        return computeTeamAssignmentsForEvents(teams, cookingDays, consecutiveCookingDays, dinnerEvents, holidays)
    }

    // Team assignment batching (D1 rate limit safe)
    // Update is lightweight: 2 params (dinnerEventId, cookingTeamId), batch of 50 is safe
    const TEAM_ASSIGNMENT_BATCH_SIZE = 50
    const chunkTeamAssignments = chunkArray<DinnerEventDisplay>(TEAM_ASSIGNMENT_BATCH_SIZE)

    // ========================================================================
    // PREFERENCE CLIPPING - Align inhabitant preferences to season cooking days
    // ========================================================================

    const {maskWeekDayMap} = useCoreValidation()
    const {DinnerModeSchema} = useBookingValidation()
    const DinnerMode = DinnerModeSchema.enum

    /**
     * Curried preference clipper factory.
     *
     * Given season cooking days, returns a function that:
     * - Takes inhabitants with optional preferences
     * - Returns PreferenceUpdate[] for only those needing updates
     *
     * Business rules:
     * - Cooking days: keep existing value or default to DINEIN
     * - Non-cooking days: always NONE
     *
     * @example
     * const clipper = createPreferenceClipper(season.cookingDays)
     * const updates = clipper(inhabitants)
     * const batches = chunkPreferenceUpdates(updates)
     */
    const createPreferenceClipper = (cookingDays: WeekDayMap<boolean>) => {
        const needsClipping = (prefs: WeekDayMap<DinnerMode> | null): boolean => {
            if (!prefs) return true
            return WEEKDAYS.some(day => !cookingDays[day] && prefs[day] !== DinnerMode.NONE)
        }

        // Return the curried function that processes inhabitants
        return <T extends { id: number, dinnerPreferences: WeekDayMap<DinnerMode> | null }>(
            inhabitants: T[]
        ): PreferenceUpdate[] =>
            inhabitants
                .filter(i => needsClipping(i.dinnerPreferences))
                .map(i => ({
                    inhabitantId: i.id,
                    dinnerPreferences: maskWeekDayMap(i.dinnerPreferences, cookingDays, DinnerMode.DINEIN, DinnerMode.NONE)
                }))
    }

    // Preference update batching (D1 rate limit safe)
    const PREFERENCE_BATCH_SIZE = 50
    const chunkPreferenceUpdates = chunkArray<PreferenceUpdate>(PREFERENCE_BATCH_SIZE)

    // ========================================================================
    // PRE-BOOKING SCAFFOLDING - Create/prune orders based on preferences
    // ========================================================================

    const {OrderStateSchema, OrderCreateWithPriceSchema, chunkOrderBatch} = useBookingValidation()
    const OrderState = OrderStateSchema.enum
    const {determineTicketType} = useTicket()

    /**
     * Configure pruneAndCreate for pre-bookings.
     * E = OrderDisplay (existing orders from DB, has id for deletion)
     * I = OrderCreateWithPrice (incoming orders from generator, no id)
     * Key: composite inhabitantId-dinnerEventId
     * Equal: same dinnerMode AND ticketPriceId (detects preference changes AND price category changes)
     *
     * Price category changes occur when:
     * - Birthdate added/changed (Heynabo import) → NULL→Date changes ticket type
     * - Birthday passed during season → CHILD→ADULT on specific dinner dates
     */
    const reconcilePreBookings = pruneAndCreate<OrderDisplay, OrderCreateWithPrice, string>(
        (order) => `${order.inhabitantId}-${order.dinnerEventId}`,
        (existing, incoming) =>
            existing.dinnerMode === incoming.dinnerMode &&
            existing.ticketPriceId === incoming.ticketPriceId
    )

    /**
     * Curried pre-booking generator factory.
     *
     * Given season config, returns function that generates desired pre-bookings
     * for a household's inhabitants based on their preferences.
     *
     * @param season - Season with ticketPrices, dinnerEvents, and deadline config
     * @param householdId - Household ID for order tracking
     * @param existingOrderKeys - Set of "inhabitantId-dinnerEventId" keys for existing orders
     *                            (used to generate RELEASED orders only when order exists)
     * @param excludedKeys - Set of "inhabitantId-dinnerEventId" keys to exclude
     *                       (typically user cancellations that should not be recreated)
     *
     * Note: Inhabitants without dinnerPreferences are skipped (no orders created)
     * @throws Error if no matching ticket price for inhabitant
     *
     * @example
     * const cancellations = await fetchUserCancellationKeys(d1, seasonId)
     * const existingKeys = new Set(existingOrders.map(o => `${o.inhabitantId}-${o.dinnerEventId}`))
     * const generateDesired = createPreBookingGenerator(season, householdId, existingKeys, cancellations)
     * const desired = generateDesired(inhabitants)
     * const result = reconcilePreBookings(existingOrders)(desired)
     */
    const createPreBookingGenerator = (
        season: Season,
        householdId: number,
        existingOrderKeys: Set<string>,
        excludedKeys: Set<string> = new Set()
    ) => {
        const { canModifyOrders } = deadlinesForSeason(season)
        const ticketPrices = season.ticketPrices
        const dinnerEvents = season.dinnerEvents ?? []

        // Build lookup: ticketType -> ticketPrice (with id)
        const ticketPriceByType = new Map(
            ticketPrices.filter(tp => tp.id).map(tp => [tp.ticketType, tp])
        )

        return (inhabitants: InhabitantDisplay[]): OrderCreateWithPrice[] =>
            inhabitants.flatMap(inhabitant => {
                // Skip inhabitants without preferences (no orders created)
                if (!inhabitant.dinnerPreferences) {
                    return []
                }
                const prefs = inhabitant.dinnerPreferences

                return dinnerEvents
                    .map(de => {
                        const weekDay = dateToWeekDay(de.date)
                        const preference = prefs[weekDay]

                        // Skip if user previously cancelled this booking
                        const key = `${inhabitant.id}-${de.id}`
                        if (excludedKeys.has(key)) return null

                        // NONE preference handling based on deadline and existing order
                        if (preference === DinnerMode.NONE) {
                            // Before deadline: no order needed (will delete if exists)
                            if (canModifyOrders(de.date)) return null
                            // After deadline: release only if order exists (can't charge for non-existent order)
                            if (!existingOrderKeys.has(key)) return null
                            // Generate RELEASED order (price for schema validation - existing order has frozen price)
                            const ticketType = determineTicketType(inhabitant.birthDate, ticketPrices, de.date)
                            const ticketPrice = ticketPriceByType.get(ticketType)
                            if (!ticketPrice?.id) {
                                throw new Error(`No ticket price for type ${ticketType} - cannot release order for ${inhabitant.name}`)
                            }
                            return OrderCreateWithPriceSchema.parse({
                                dinnerEventId: de.id,
                                inhabitantId: inhabitant.id,
                                householdId,
                                bookedByUserId: null,
                                ticketPriceId: ticketPrice.id,
                                priceAtBooking: ticketPrice.price,
                                dinnerMode: DinnerMode.NONE,
                                state: OrderState.RELEASED
                            })
                        }

                        // Determine ticket type based on age at dinner date
                        const ticketType = determineTicketType(inhabitant.birthDate, ticketPrices, de.date)
                        const ticketPrice = ticketPriceByType.get(ticketType)
                        if (!ticketPrice?.id) {
                            throw new Error(`No ticket price for type ${ticketType} - inhabitant ${inhabitant.name}`)
                        }

                        return OrderCreateWithPriceSchema.parse({
                            dinnerEventId: de.id,
                            inhabitantId: inhabitant.id,
                            householdId,
                            bookedByUserId: null,
                            ticketPriceId: ticketPrice.id,
                            priceAtBooking: ticketPrice.price,
                            dinnerMode: preference,
                            state: OrderState.BOOKED
                        })
                    })
                    .filter((o): o is OrderCreateWithPrice => o !== null)
            })
    }

    /**
     * Curried household order scaffolder factory.
     *
     * Given a season, returns a function that generates the reconciliation result
     * for a household - what orders to create, update, delete, or leave unchanged.
     * Uses the season's deadline configuration for before/after deadline behavior.
     *
     * @param season - Season with ticketPrices, dinnerEvents, and deadline config
     * @returns Function that takes household data and returns reconciliation result
     *
     * @example
     * const scaffolder = createHouseholdOrderScaffold(season)
     * const result = scaffolder(household, existingOrders, cancelledKeys)
     * // result.create = orders to insert
     * // result.delete = orders to remove (existing orders with id)
     * // result.idempotent = orders unchanged
     */
    const createHouseholdOrderScaffold = (season: Season) => (
        household: HouseholdDisplay,
        existingOrders: OrderDisplay[],
        cancelledKeys: Set<string> = new Set()
    ) => {
        const existingOrderKeys = new Set(
            existingOrders.map(o => `${o.inhabitantId}-${o.dinnerEventId}`)
        )
        const generator = createPreBookingGenerator(season, household.id, existingOrderKeys, cancelledKeys)
        const desiredOrders = generator(household.inhabitants)
        return reconcilePreBookings(existingOrders)(desiredOrders)
    }

    /**
     * Filter dinner events to those within the prebooking window (today → today + N days).
     * Pure function extracted for testability and reuse by scaffoldPrebookings.
     *
     * @param allDinnerEvents - All dinner events for a season
     * @returns Dinner events within the scaffoldable window (next dinner + future within window)
     */
    const getScaffoldableDinnerEvents = (allDinnerEvents: DinnerEventDisplay[]): DinnerEventDisplay[] => {
        if (allDinnerEvents.length === 0) return []

        const dinnerDates = allDinnerEvents.map(d => d.date)
        const nextDinnerRange = configuredGetNextDinnerDate(dinnerDates, getDefaultDinnerStartTime())
        const prebookingWindow = getPrebookingWindowDays()
        const {nextDinner, futureDinnerDates} = splitDinnerEvents(allDinnerEvents, nextDinnerRange, prebookingWindow)

        // Build set of all scaffoldable dates: nextDinner + futureDinnerDates
        const scaffoldableDates = [...futureDinnerDates]
        if (nextDinner) {
            scaffoldableDates.push(nextDinner.date)
        }
        const scaffoldableDateSet = new Set(scaffoldableDates.map(d => d.getTime()))
        return allDinnerEvents.filter(de => scaffoldableDateSet.has(de.date.getTime()))
    }

    const getHolidaysForSeason = (season: Season): Date[] =>getHolidayDatesFromDateRangeList(season.holidays)
    const getHolidayDatesFromDateRangeList = (ranges: DateRange[]): Date[] => eachDayOfManyIntervals(ranges)

    // ========================================================================
    // DINNER EVENT RECONCILIATION - ADR-015 idempotent pruneAndCreate
    // ========================================================================

    const toDateKey = (date: Date): string => formatDate(date, 'yyyy-MM-dd')

    const getDinnerEventDateKey = (event: DinnerEventDisplay | DinnerEventCreate): string =>
        toDateKey(event.date)

    const reconcileDinnerEvents = pruneAndCreate<DinnerEventDisplay, DinnerEventCreate, string>(
        getDinnerEventDateKey,
        (existing, incoming) => getDinnerEventDateKey(existing) === getDinnerEventDateKey(incoming)
    )

    /**
     * Compare schedule and return desired events if changed.
     * Computes cooking dates once and reuses for both check and generation.
     *
     * @returns null if no change, or desired DinnerEventCreate[] if schedule changed
     */
    const getScheduleChangeDesiredEvents = (
        oldSeason: Season,
        newSeason: Season
    ): DinnerEventCreate[] | null => {
        const oldKeys = computeCookingDates(oldSeason.cookingDays, oldSeason.seasonDates, oldSeason.holidays).map(toDateKey)
        const desiredEvents = generateDinnerEventDataForSeason(newSeason)
        const newKeys = desiredEvents.map(e => toDateKey(e.date))

        if (oldKeys.join(',') === newKeys.join(',')) return null
        return desiredEvents
    }

    /**
     * Get the default dinner start time (hour) from app configuration
     * @returns Hour (0-23) for dinner start time
     */
    const getDefaultDinnerStartTime = (): number => theslope.defaultDinnerStartTime

    /**
     * Get the prebooking window in days from app configuration
     * @returns Number of days for the rolling prebooking window
     */
    const getPrebookingWindowDays = (): number => theslope.prebookingWindowDays

    /**
     * Check if a calendar day is the next upcoming dinner event
     * @param day - Calendar day to check
     * @param nextDinner - Next dinner event (or null if none)
     * @returns True if the day matches the next dinner date
     */
    const isNextDinnerDate = (day: DateValue, nextDinner: { date: Date } | null): boolean => {
        if (!nextDinner) return false
        const dayAsDate = toDate(day)
        const nextDinnerDate = new Date(nextDinner.date)
        return isSameDay(dayAsDate, nextDinnerDate)
    }

    // Configure getNextDinnerDate with default 60 minute duration
    const configuredGetNextDinnerDate = getNextDinnerDate(60)

    /**
     * Get deadline functions configured for a specific season.
     * All deadline checks use the season's configured values.
     *
     * @param season - Season with deadline configuration
     * @returns Object with all deadline-related functions configured for this season
     */
    const deadlinesForSeason = (season: Pick<Season, 'ticketIsCancellableDaysBefore' | 'diningModeIsEditableMinutesBefore'>) => {
        const dinnerStartHour = getDefaultDinnerStartTime()

        const canModifyOrders = (dinnerEventDate: Date): boolean => {
            const dinnerStartTime = getDinnerTimeRange(dinnerEventDate, dinnerStartHour, 0).start
            return isBeforeDeadline(season.ticketIsCancellableDaysBefore, 0)(dinnerStartTime)
        }

        const canEditDiningMode = (dinnerEventDate: Date): boolean => {
            const dinnerStartTime = getDinnerTimeRange(dinnerEventDate, dinnerStartHour, 0).start
            return isBeforeDeadline(0, season.diningModeIsEditableMinutesBefore)(dinnerStartTime)
        }

        const getOrderCancellationAction = (dinnerEventDate: Date): {
            updates: { dinnerMode: DinnerMode, state: typeof OrderState.RELEASED, releasedAt: Date }
            auditAction: OrderAuditAction
        } | null => {
            if (canModifyOrders(dinnerEventDate)) {
                return null
            }
            return {
                updates: {
                    dinnerMode: DinnerMode.NONE,
                    state: OrderState.RELEASED,
                    releasedAt: new Date()
                },
                auditAction: OrderAuditActionEnum.USER_CANCELLED
            }
        }

        const isAnnounceMenuPastDeadline = (dinnerEventDate: Date): boolean => {
            const dinnerStartTime = getDinnerTimeRange(dinnerEventDate, dinnerStartHour, 0).start
            return !isBeforeDeadline(season.ticketIsCancellableDaysBefore, 0)(dinnerStartTime)
        }

        return {
            canModifyOrders,
            canEditDiningMode,
            getOrderCancellationAction,
            isAnnounceMenuPastDeadline
        }
    }

    /**
     * Check if a dinner event has started (is in the past)
     * Uses dinner start time, not end time - once dinner starts, no more booking changes
     * @param dinnerEventDate - Date of the dinner event
     * @returns True if dinner has started (past)
     */
    const isDinnerPast = (dinnerEventDate: Date): boolean => {
        const dinnerStartHour = getDefaultDinnerStartTime()
        const dinnerStartTime = getDinnerTimeRange(dinnerEventDate, dinnerStartHour, 0).start
        return !isBeforeDeadline(0, 0)(dinnerStartTime)
    }

    /**
     * Helper: Check if an inhabitant has an assignment on a team (optionally with specific role)
     * @param inhabitantId - ID of the inhabitant
     * @param team - Team to check
     * @param role - Optional role to match (if not provided, any role matches)
     * @returns True if inhabitant has matching assignment
     */
    const hasAssignment = (inhabitantId: number, team: CookingTeam, role?: string): boolean => {
        return team.assignments?.some((assignment) =>
            assignment.inhabitantId === inhabitantId && (!role || assignment.role === role)
        ) ?? false
    }

    /**
     * Get all cooking teams that an inhabitant is assigned to in a season
     * @param inhabitantId - ID of the inhabitant
     * @param season - Season containing cooking teams
     * @returns Array of teams the inhabitant is assigned to (empty if none)
     */
    const getTeamsForInhabitant = (inhabitantId: number, season: Season | null): CookingTeam[] => {
        if (!season) return []
        const teams = season.CookingTeams ?? []
        return teams.filter((team: CookingTeam) => hasAssignment(inhabitantId, team))
    }

    /**
     * Check if an inhabitant is on a specific team (any role)
     * @param inhabitantId - ID of the inhabitant to check
     * @param team - Cooking team with assignments
     * @returns True if inhabitant is assigned to this team in any role
     */
    const isOnTeam = (inhabitantId: number, team: CookingTeam | null): boolean => {
        if (!team) return false
        return hasAssignment(inhabitantId, team)
    }

    /**
     * Check if an inhabitant is a chef for a specific team
     * @param inhabitantId - ID of the inhabitant to check
     * @param team - Cooking team with assignments
     * @returns True if inhabitant is assigned as CHEF on this team
     */
    const isChefFor = (inhabitantId: number, team: CookingTeam | null): boolean => {
        if (!team) return false
        const {TeamRoleSchema} = useCookingTeamValidation()
        return hasAssignment(inhabitantId, team, TeamRoleSchema.enum.CHEF)
    }

    /**
     * Get cooking deadline thresholds from app.config.ts
     * DRY: Single source for warning/critical hours used by badges and calendar chips
     */
    const getCookingDeadlineThresholds = () => ({
        warning: theslope.cookingDeadlines.warningHours,
        critical: theslope.cookingDeadlines.criticalHours
    })

    /**
     * Calculate deadline urgency for cooking tasks using thresholds from app.config.ts
     * @param dinnerStartTime - The dinner event start time
     * @returns 0 (on track) | 1 (warning) | 2 (critical)
     */
    const getDeadlineUrgency = (dinnerStartTime: Date): DeadlineUrgency => {
        const { critical: criticalHours, warning: warningHours } = getCookingDeadlineThresholds()
        return calculateDeadlineUrgency(dinnerStartTime, criticalHours, warningHours)
    }

    /**
     * Get the billing cutoff day from app configuration
     * This is the day of month (1-31) when billing periods close for order imports
     * @returns Day of month for billing cutoff
     */
    const getBillingCutoffDay = (): number => theslope.billing.cutoffDay

    return {
        // Validation schemas
        SeasonStatusSchema,
        SeasonStatus,
        holidaysSchema,
        SeasonSchema,

        // Business logic
        getDefaultSeason,
        getDefaultHolidays,
        createSeasonName,
        isActive,
        coalesceSeason,
        serializeSeason,
        deserializeSeason,
        generateDinnerEventDataForSeason,
        assignAffinitiesToTeams,
        assignTeamsToEvents,
        chunkTeamAssignments,

        // Preference clipping (season activation)
        createPreferenceClipper,
        chunkPreferenceUpdates,

        // Pre-booking scaffolding (season activation)
        reconcilePreBookings,
        createPreBookingGenerator,
        createHouseholdOrderScaffold,
        getScaffoldableDinnerEvents,
        chunkOrderBatch,

        getHolidaysForSeason,
        getHolidayDatesFromDateRangeList,
        computeCookingDates,
        getDefaultDinnerStartTime,
        getPrebookingWindowDays,
        isNextDinnerDate,
        getDinnerTimeRange,
        getNextDinnerDate: configuredGetNextDinnerDate,
        splitDinnerEvents,
        sortDinnerEventsByTemporal,
        deadlinesForSeason,
        isDinnerPast,
        getTeamsForInhabitant,
        isOnTeam,
        isChefFor,
        getDeadlineUrgency,
        getCookingDeadlineThresholds,
        getBillingCutoffDay,

        // Active season management - pure functions
        isPast,
        isFuture,
        distanceToToday,
        canSeasonBeActive,
        getSeasonStatus,
        sortSeasonsByActivePriority,
        selectMostAppropriateActiveSeason,

        // Dinner event reconciliation (ADR-015)
        reconcileDinnerEvents,
        getScheduleChangeDesiredEvents
    }
}

