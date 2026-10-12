import type {OrderDisplay, OrderDetail, DinnerEventDetail, DinnerEventUpdate, DailyMaintenanceResult, ScaffoldOrdersRequest, ScaffoldOrdersResponse, DesiredOrder, DinnerState, TicketChangesResponse} from '~/composables/useBookingValidation'
import type {MonthlyBillingResponse, Expense, ExpenseCreate} from '~/composables/useBillingValidation'
import type {WaitlistAssignmentResult, TicketWaitlistDisplay, WaitlistEntryWithPosition, WaitlistQueueSummary} from '~/composables/useWaitlistValidation'
import {useWaitlist} from '~/composables/useWaitlist'
import type {ReleasedTicketCounts} from '~/composables/useBooking'
import {useBilling} from '~/composables/useBilling'
import {isSameDay} from 'date-fns'

export const useBookingsStore = defineStore("Bookings", () => {
    // DEPENDENCIES
    const {storeAsyncData, apiRequest} = useApiHandler()
    const {OrderDisplaySchema, OrderDetailSchema, DinnerStateSchema, DinnerEventDetailSchema, DailyMaintenanceResultSchema, ScaffoldOrdersResponseSchema, TicketChangesResponseSchema} = useBookingValidation()
    const {formatScaffoldResult} = useBooking()
    const {formatDailyMaintenanceStats} = useMaintenance()
    const DinnerState = DinnerStateSchema.enum
    const toast = useToast()

    const CTX = `${LOG_CTX} 🎟️ > BOOKINGS_STORE >`
    const planStore = usePlanStore()
    const householdsStore = useHouseholdsStore()

    // ========================================
    // State (ADR-007)
    // ========================================

    // Keys of datasets that read the season or household selection stay constant: the selection
    // resolves after its upstream loads, mid-render on the server

    // The page names the orders it shows; a getter keeps them in step with its selection
    type OrdersFilter = {dinnerEventIds: number[], householdId?: number | null, includeProvenance?: boolean, allHouseholds?: boolean}
    const ordersFilter = shallowRef<() => OrdersFilter>(() => ({dinnerEventIds: []}))

    const ordersQuery = computed(() => {
        const {dinnerEventIds, householdId, includeProvenance, allHouseholds} = ordersFilter.value()
        const params = new URLSearchParams()
        dinnerEventIds.forEach(id => params.append('dinnerEventIds', String(id)))
        if (householdId) params.append('householdId', String(householdId))
        if (includeProvenance) params.append('includeProvenance', 'true')
        if (allHouseholds) params.append('allHouseholds', 'true')
        return params.toString()
    })

    // An unfiltered request returns every order of the household
    const hasFilters = computed(() => ordersFilter.value().dinnerEventIds.length > 0)

    const {
        data: orders, status: ordersStatus,
        error: ordersError, refresh: refreshOrders
    } = storeAsyncData(
        'bookings-store-orders',
        () => `/api/order?${ordersQuery.value}`,
        {
            schema: OrderDisplaySchema.array(),
            default: () => [],
            enabled: hasFilters,
            dependsOn: [planStore.selectedSeasonDataset],
            errorMessage: 'Kunne ikke hente bookinger'
        }
    )

    // The queues of the dinners the page shows, every household's entries in queue order; the rows, the positions,
    // the queue size and the portion need derive from them
    const {TicketWaitlistDisplaySchema, WaitlistAssignmentResultSchema} = useWaitlistValidation()
    const {inQueueOrder, positionOf, portionNeed, portionsOfEntryFor} = useWaitlist()

    const {
        data: waitlistEntries, status: waitlistEntriesStatus,
        refresh: refreshWaitlistEntries
    } = storeAsyncData(
        'bookings-store-waitlist-entries',
        () => {
            const params = new URLSearchParams()
            ordersFilter.value().dinnerEventIds.forEach(id => params.append('dinnerEventIds', String(id)))
            return `/api/order/waitlist?${params.toString()}`
        },
        {
            schema: TicketWaitlistDisplaySchema.array(),
            default: () => [],
            enabled: hasFilters,
            dependsOn: [planStore.selectedSeasonDataset],
            errorMessage: 'Kunne ikke hente ventelisten'
        }
    )

    const waitlistOf = (dinnerEventId: number): TicketWaitlistDisplay[] =>
        inQueueOrder(waitlistEntries.value.filter(entry => entry.dinnerEventId === dinnerEventId))

    // The household the page names, else the selected one: its entries with their place in their dinner's queue
    const waitlistHouseholdId = computed(() => ordersFilter.value().householdId ?? householdsStore.selectedHouseholdId)
    const householdWaitlist = computed((): WaitlistEntryWithPosition[] => waitlistEntries.value
        .filter(entry => entry.order.householdId === waitlistHouseholdId.value)
        .map(entry => ({...entry, position: positionOf(waitlistOf(entry.dinnerEventId), entry.id) ?? 1})))

    // The queue on the dinner on view: its size and its portion need (the chef card, the kitchen box)
    const selectedDinnerWaitlist = computed((): WaitlistQueueSummary | null => {
        const dinnerEventId = selectedDinnerEventId.value
        if (!dinnerEventId) return null
        const queue = waitlistOf(dinnerEventId)
        return {dinnerEventId, entries: queue.length, portions: portionNeed(queue, portionsOfEntryFor(planStore.selectedSeason?.ticketPrices ?? []))}
    })

    // ========================================
    // Computed - Public API (derived from status)
    // ========================================
    const isOrdersLoading = computed(() => ordersStatus.value === 'pending')
    const isOrdersErrored = computed(() => ordersStatus.value === 'error')
    const isOrdersInitialized = computed(() => ordersStatus.value === 'success')
    const isNoOrders = computed(() => isOrdersInitialized.value && orders.value.length === 0)

    const isWaitlistEntriesLoading = computed(() => waitlistEntriesStatus.value === 'pending')
    const isWaitlistEntriesErrored = computed(() => waitlistEntriesStatus.value === 'error')
    const isWaitlistEntriesInitialized = computed(() => waitlistEntriesStatus.value === 'success')

    // Convenience computed for components - true when store is fully initialized and ready to use
    const isBookingsStoreReady = computed(() => !hasFilters.value || (isOrdersInitialized.value && isWaitlistEntriesInitialized.value))

    // Business logic computeds
    const totalOrdersCount = computed(() => orders.value.length)

    const ordersByTicketType = computed(() => {
        const byType: Record<string, number> = {}
        orders.value.forEach(order => {
            if (order.ticketType) {
                byType[order.ticketType] = (byType[order.ticketType] || 0) + 1
            }
        })
        return byType
    })

    // ========================================
    // Actions
    // ========================================

    const loadOrdersForDinners = (filter: MaybeRefOrGetter<OrdersFilter>) => {
        ordersFilter.value = () => toValue(filter)
        console.info(CTX, `Loading orders for ${toValue(filter).dinnerEventIds.length} dinner(s)`)
    }

    // Upcoming orders of the selected season with their dinner context. The page names the scope:
    // every household or the selected one; nothing is requested until a page asks
    const upcomingOrdersForAllHouseholds = ref<boolean | null>(null)

    const {
        data: upcomingOrders, status: upcomingOrdersStatus,
        refresh: refreshUpcomingOrders
    } = storeAsyncData(
        'bookings-store-upcoming-orders',
        () => {
            const params = new URLSearchParams()
            params.append('upcomingForSeason', String(planStore.selectedSeasonId))
            if (upcomingOrdersForAllHouseholds.value) params.append('allHouseholds', 'true')
            else params.append('householdId', String(householdsStore.selectedHouseholdId))
            params.append('includeDinnerContext', 'true')
            return `/api/order?${params.toString()}`
        },
        {
            schema: OrderDisplaySchema.array(),
            default: () => [],
            enabled: () => upcomingOrdersForAllHouseholds.value !== null && !!planStore.selectedSeasonId
                && (upcomingOrdersForAllHouseholds.value || !!householdsStore.selectedHouseholdId),
            dependsOn: [planStore.selectedSeasonDataset, householdsStore.selectedHouseholdDataset]
        }
    )

    const isUpcomingOrdersLoading = computed(() => upcomingOrdersStatus.value === 'pending')

    const loadUpcomingOrders = (allHouseholds: boolean) => {
        upcomingOrdersForAllHouseholds.value = allHouseholds
    }

    // Order detail with its audit history - no store state, a component keeps one per expanded row
    const fetchOrderDetail = (orderId: number): Promise<OrderDetail> =>
        apiRequest(`/api/order/${orderId}`, {schema: OrderDetailSchema, action: 'fetchOrderDetail'})

    // The chef's Billetændringer: the dinner's ticket changes newest first, from `since` when given
    const fetchTicketChanges = (dinnerEventId: number, since?: Date): Promise<TicketChangesResponse> =>
        apiRequest(`/api/chef/dinner/${dinnerEventId}/order-history`, {
            query: since ? {since: since.toISOString()} : {},
            schema: TicketChangesResponseSchema,
            action: 'fetchTicketChanges',
            errorMessage: 'Kunne ikke hente billetændringer'
        })

    const fetchReleasedOrders = async (dinnerEventId: number): Promise<OrderDisplay[]> => {
        const released = await apiRequest('/api/order', {
            query: {dinnerEventIds: dinnerEventId, state: 'RELEASED', allHouseholds: true, sortBy: 'releasedAt'},
            schema: OrderDisplaySchema.array(),
            action: 'fetchReleasedOrders', errorMessage: 'Kunne ikke hente ledige billetter'
        })
        console.info(CTX, `Fetched ${released.length} released orders for dinner ${dinnerEventId}`)
        return released
    }

    // ========================================
    // Lock Status (reactive, watches planStore)
    // ========================================
    const {getLockedFutureDinnerIds, computeLockStatus} = useBooking()
    const {deadlinesForSeason, splitDinnerEvents} = useSeason()
    // The selected season's future dinners past their booking deadline
    const lockedDinnerIds = computed(() => {
        const season = planStore.selectedSeason
        if (!season?.dinnerEvents?.length) return []
        const {nextDinner, futureDinners} = splitDinnerEvents(season.dinnerEvents)
        return getLockedFutureDinnerIds(nextDinner, futureDinners, deadlinesForSeason(season))
    })
    const {formatTicketCounts} = useBilling()

    const {data: releasedCounts, status: releasedCountsStatus, refresh: refreshReleasedCounts} = storeAsyncData(
        'bookings-store-released-counts',
        () => {
            const params = new URLSearchParams()
            lockedDinnerIds.value.forEach(id => params.append('dinnerEventIds', String(id)))
            params.append('state', 'RELEASED')
            params.append('allHouseholds', 'true')
            return `/api/order?${params.toString()}`
        },
        {
            // Group orders by dinnerEventId
            schema: OrderDisplaySchema.array().transform(released => {
                const grouped = groupBy<OrderDisplay, number>(o => o.dinnerEventId)(released)
                const counts = new Map<number, ReleasedTicketCounts>()
                for (const [dinnerEventId, orders] of grouped) {
                    counts.set(dinnerEventId, { total: orders.length, formatted: formatTicketCounts(orders) })
                }
                return counts
            }),
            default: () => new Map<number, ReleasedTicketCounts>(),
            enabled: () => lockedDinnerIds.value.length > 0,
            dependsOn: [planStore.selectedSeasonDataset]
        }
    )

    // Exposed computed: lockStatus map for calendar display
    const lockStatus = computed(() => {
        const season = planStore.selectedSeason
        if (!season?.dinnerEvents) return new Map<number, ReleasedTicketCounts | null>()
        return computeLockStatus(season.dinnerEvents, deadlinesForSeason(season), releasedCounts.value)
    })

    const isReleasedCountsLoading = computed(() => releasedCountsStatus.value === 'pending')

    const isProcessingBookings = ref(false)

    // A scaffold result toast: the title names the view, the suffix the dinner (guest bookings)
    type ScaffoldToast = {title: string, suffix?: string}
    const describeScaffoldResult = (scaffoldResult: ScaffoldResult, suffix = '') =>
        `${formatScaffoldResult(scaffoldResult, 'past')}${suffix}`

    /**
     * ADR-016: Scaffold endpoint call shared by the single- and multi-event entry points;
     * with a toast given, the result is reported in it.
     */
    const processBookings = async (
        request: ScaffoldOrdersRequest,
        adminBypass: boolean,
        report: ScaffoldToast | undefined,
        label: string
    ): Promise<ScaffoldOrdersResponse> => {
        isProcessingBookings.value = true
        try {
            const result = await apiRequest('/api/household/order/scaffold', {
                method: 'POST',
                body: request,
                query: {adminBypass},
                schema: ScaffoldOrdersResponseSchema,
                action: 'processBookings', errorMessage: 'Kunne ikke gemme bookinger'
            })
            await Promise.all([refreshOrders(), refreshReleasedCounts(), refreshWaitlistEntries()])
            console.info(CTX, `${label}: ${formatScaffoldResult(result.scaffoldResult, 'compact')}`)
            if (report) toast.add({
                title: report.title,
                description: describeScaffoldResult(result.scaffoldResult, report.suffix),
                color: result.scaffoldResult.errored > 0 ? COLOR.error : COLOR.success
            })
            return result
        } finally {
            isProcessingBookings.value = false
        }
    }

    /**
     * ADR-016: Process bookings for a single dinner event.
     * Used by day view, power mode, and guest booking.
     */
    const processSingleEventBookings = (
        householdId: number,
        dinnerEventId: number,
        orders: DesiredOrder[],
        adminBypass = false,
        report?: ScaffoldToast
    ): Promise<ScaffoldOrdersResponse> =>
        processBookings({householdId, dinnerEventIds: [dinnerEventId], orders}, adminBypass, report, 'processSingleEventBookings')

    /**
     * ADR-016: Process bookings for multiple dinner events.
     * Used by grid view (week/month).
     */
    const processMultipleEventsBookings = (
        householdId: number,
        dinnerEventIds: number[],
        orders: DesiredOrder[],
        adminBypass = false,
        report?: ScaffoldToast
    ): Promise<ScaffoldOrdersResponse> =>
        processBookings({householdId, dinnerEventIds, orders}, adminBypass, report, 'processMultipleEventsBookings')

    /**
     * Admin correction of a household's bookings on one dinner: the scaffold with adminBypass lifts the deadlines
     * (NONE deletes, a mode change lands after the deadline). Returns the ScaffoldResult; the caller toasts it.
     *
     * @param guestBookerInhabitantId - A new guest ticket books on this inhabitant of the target household
     */
    const processAdminCorrection = async (
        householdId: number,
        dinnerEventId: number,
        orders: DesiredOrder[],
        guestBookerInhabitantId?: number
    ): Promise<ScaffoldResult> => {
        const corrected = orders.map(order => order.isGuestTicket && !order.orderId && guestBookerInhabitantId
            ? {...order, inhabitantId: guestBookerInhabitantId}
            : order)
        const {scaffoldResult} = await processBookings({householdId, dinnerEventIds: [dinnerEventId], orders: corrected}, true, undefined, 'processAdminCorrection')
        return scaffoldResult
    }

    // DINNER EVENT ACTIONS
    type DinnerUpdate = Partial<DinnerEventUpdate> & { allergenIds?: number[], state?: typeof DinnerState[keyof typeof DinnerState] }

    // The page names the date it shows; the dinner on that date resolves from the selected season
    const dinnerDate = shallowRef<() => Date | null>(() => null)
    const selectedDinnerEventId = computed(() => {
        const date = dinnerDate.value()
        if (!date) return null
        return planStore.selectedSeason?.dinnerEvents?.find(dinner => isSameDay(dinner.date, date))?.id ?? null
    })

    const {
        data: selectedDinnerEventDetail,
        status: selectedDinnerEventStatus,
        error: selectedDinnerEventError,
        refresh: refreshSelectedDinnerEventDetail
    } = storeAsyncData(
        'bookings-store-selected-dinner-event',
        () => `/api/admin/dinner-event/${selectedDinnerEventId.value}`,
        {
            schema: DinnerEventDetailSchema.nullable(),
            default: () => null,
            enabled: () => !!selectedDinnerEventId.value,
            dependsOn: [planStore.selectedSeasonDataset],
            errorMessage: 'Kunne ikke hente fællesspisning',
            notFound: {
                recover: () => {
                    dinnerDate.value = () => null
                },
                retries: 0,
                toast: 'Kan ikke finde middagen',
                message: () => {
                    const {emoji, text} = getRandomEmptyMessage('dinnerGone')
                    return `${emoji} ${text}`
                }
            }
        }
    )

    const isSelectedDinnerEventLoading = computed(() => selectedDinnerEventStatus.value === 'pending')
    const isSelectedDinnerEventErrored = computed(() => selectedDinnerEventStatus.value === 'error')
    const isSelectedDinnerEventInitialized = computed(() => selectedDinnerEventStatus.value === 'success')

    const selectDinnerDate = (date: MaybeRefOrGetter<Date | null>) => {
        dinnerDate.value = () => toValue(date)
    }

    const isDinnerUpdating = ref(false)

    // A mutation of the dinner on view re-reads its detail; another dinner's mutation leaves the view alone
    const refreshDinnerIfSelected = async (dinnerEventId: number) => {
        if (selectedDinnerEventId.value === dinnerEventId) await refreshSelectedDinnerEventDetail()
    }

    const updateDinner = async (id: number, updates: DinnerUpdate, action: string): Promise<DinnerEventDetail> => {
        const parsed = await apiRequest(`/api/chef/dinner/${id}`, {
            method: 'POST',
            body: updates,
            onResponse: ({response}) => {
                if (response.status === 207) {
                    const base = 'Din ændring er gemt, men Heynabo havde et problem. Vi har forsøgt at fikse det, tjek om det ser rigtig ud i Heynabo.'
                    const description = response._data?.heynaboEventId
                        ? base
                        : `${base} Tryk på Publicer knappen igen`
                    toast.add({
                        title: 'Heynabo-synkronisering',
                        description,
                        color: COLOR.error
                    })
                }
            },
            schema: DinnerEventDetailSchema,
            action
        })
        console.info(`${CTX} Updated dinner ${id}: ${Object.keys(updates).join(', ')} → state: ${parsed.state}`)
        await refreshDinnerIfSelected(id)
        return parsed
    }

    // Resolves null on failure; the request has already toasted it
    const withLoading = <T extends unknown[], R>(fn: (...args: T) => Promise<R>) =>
        async (...args: T): Promise<R | null> => {
            isDinnerUpdating.value = true
            try { return await fn(...args) }
            catch { return null }
            finally { isDinnerUpdating.value = false }
        }

    const updateDinnerEventAllergens = withLoading((id: number, allergenIds: number[]) => updateDinner(id, {allergenIds}, 'Kunne ikke gemme allergeninformation'))
    // The chef's grocery lines: the API answers the line, the dinner detail re-reads for its computed cost
    const {ExpenseSchema} = useBillingValidation()
    const {formatPrice} = useTicket()
    const expensesUrl = (dinnerEventId: number) => `/api/chef/dinner/${dinnerEventId}/expenses`
    const addExpense = withLoading(async (dinnerEventId: number, line: ExpenseCreate): Promise<Expense> => {
        const expense = await apiRequest(expensesUrl(dinnerEventId), {
            method: 'PUT', body: line, schema: ExpenseSchema, action: 'addExpense', errorMessage: 'Kunne ikke gemme indkøbet'
        })
        await refreshDinnerIfSelected(dinnerEventId)
        toast.add({title: 'Indkøb gemt', description: `${expense.description}: ${formatPrice(expense.amount)} kr`, color: COLOR.success})
        return expense
    })
    const removeExpense = withLoading(async (dinnerEventId: number, expenseId: number): Promise<Expense> => {
        const removed = await apiRequest(`${expensesUrl(dinnerEventId)}/${expenseId}`, {
            method: 'DELETE', schema: ExpenseSchema, action: 'removeExpense', errorMessage: 'Kunne ikke slette indkøbet'
        })
        await refreshDinnerIfSelected(dinnerEventId)
        toast.add({title: 'Indkøb slettet', description: removed.description, color: COLOR.success})
        return removed
    })

    const announceDinner = withLoading((id: number) => updateDinner(id, {state: DinnerState.ANNOUNCED}, 'Kunne ikke annoncere fællesspisningen'))
    const cancelDinner = withLoading((id: number) => updateDinner(id, {state: DinnerState.CANCELLED}, 'Kunne ikke aflyse fællesspisningen'))
    const undoCancelDinner = withLoading((id: number, targetState: DinnerState = DinnerState.SCHEDULED) => updateDinner(id, {state: targetState}, 'Kunne ikke annullere aflysningen'))

    // ========================================
    // WAITING LIST (ADR-007)
    // ========================================

    // The release places the first entries that fit as orders: the dinner's tickets and the queue both change
    const releasePortions = withLoading(async (dinnerEventId: number, portions: number): Promise<WaitlistAssignmentResult> => {
        const result = await apiRequest(`/api/chef/dinner/${dinnerEventId}/release-portions`, {
            method: 'POST', body: {portions}, schema: WaitlistAssignmentResultSchema,
            action: 'releasePortions', errorMessage: 'Kunne ikke frigive portionerne'
        })
        console.info(CTX, `Released ${portions} portions on dinner ${dinnerEventId}: ${result.assigned.length} assigned, ${result.waiting} waiting`)
        await Promise.all([refreshWaitlistEntries(), refreshOrders(), refreshDinnerIfSelected(dinnerEventId)])
        toast.add({
            title: 'Portioner frigivet',
            description: `${result.assigned.length} fik billet, ${result.waiting} venter stadig`,
            color: COLOR.success,
            icon: ICONS.waitlist
        })
        return result
    })

    /**
     * Update dinner menu fields with implicit chef auto-claim.
     * If the dinner has no chef and the caller has an Inhabitant, the chef role is
     * claimed first; then menu fields are saved. Returns `{dinner, wasAutoClaimed}`
     * so the caller can adjust toast copy ("Menu gemt — du er nu chefkok…" vs plain "Menu gemt").
     */
    const {TeamRoleSchema} = useCookingTeamValidation()
    const {tryAutoClaim, formatRoleClaimedTitle} = useCookingTeam()

    const performAutoClaim = withLoading(
        (id: number, currentChefId: number | null) => tryAutoClaim(
            currentChefId,
            authStore.inhabitantId,
            () => planStore.assignRoleToDinner(id, authStore.inhabitantId!, TeamRoleSchema.enum.CHEF)
        )
    )

    const saveMenuFields = withLoading(
        (id: number, updates: Partial<DinnerEventUpdate>) => updateDinner(id, updates, 'Kunne ikke gemme ændringer til menuen')
    )

    const updateDinnerEventField = async (
        id: number,
        updates: Partial<DinnerEventUpdate>,
        currentChefId: number | null
    ): Promise<{dinner: DinnerEventDetail, wasAutoClaimed: boolean} | null> => {
        const wasAutoClaimed = await performAutoClaim(id, currentChefId)
        if (wasAutoClaimed === null) return null
        const dinner = await saveMenuFields(id, updates)
        if (dinner === null) return null

        toast.add({
            title: wasAutoClaimed
                ? `Menu gemt — ${formatRoleClaimedTitle(dinner, TeamRoleSchema.enum.CHEF)}`
                : 'Menu gemt',
            description: `"${dinner.menuTitle}" er nu opdateret`,
            color: COLOR.success
        })

        return {dinner, wasAutoClaimed}
    }

    // ========================================
    // DAILY MAINTENANCE JOB (ADR-007)
    // ========================================
    const authStore = useAuthStore()

    const dailyMaintenanceResult = ref<DailyMaintenanceResult | null>(null)
    const dailyMaintenanceError = ref<Error | null>(null)
    const isDailyMaintenanceRunning = ref(false)
    const hasDailyMaintenanceResult = computed(() => !isDailyMaintenanceRunning.value && dailyMaintenanceError.value === null && dailyMaintenanceResult.value !== null)
    const hasDailyMaintenanceError = computed(() => dailyMaintenanceError.value !== null)

    const runDailyMaintenance = async () => {
        isDailyMaintenanceRunning.value = true
        dailyMaintenanceError.value = null
        try {
            dailyMaintenanceResult.value = await apiRequest('/api/admin/maintenance/daily', {
                method: 'POST',
                query: { triggeredBy: `ADMIN:${authStore.email}` },
                schema: DailyMaintenanceResultSchema,
                action: 'runDailyMaintenance', errorMessage: 'Daglig vedligeholdelse fejlede'
            })
        } catch (error) {
            dailyMaintenanceResult.value = null
            dailyMaintenanceError.value = error as Error
            return
        } finally {
            isDailyMaintenanceRunning.value = false
        }

        const stats = formatDailyMaintenanceStats(dailyMaintenanceResult.value)
        const description = stats.map(s => `${s.label}: ${s.value}`).join(', ')
        console.info(CTX, `Daily maintenance completed: ${description}`)
        // Maintenance closes orders and creates transactions server-side.
        await Promise.all([refreshOrders(), refreshCurrentPeriodTransactions()])
        toast.add({
            title: 'Daglig vedligeholdelse afsluttet',
            description,
            color: COLOR.success
        })
    }

    // ========================================
    // BILLING PERIODS (ADR-007)
    // ========================================

    const {MonthlyBillingResponseSchema, TransactionDisplaySchema, BillingPeriodSummaryDisplaySchema, BillingPeriodSummaryDetailSchema, HouseholdBillingResponseSchema} = useBillingValidation()

    // The selected household's billing: the current period and its past invoices. Only the economy
    // page shows it, so nothing is requested until a page asks
    const isHouseholdBillingRequested = ref(false)

    const {
        data: householdBilling, status: householdBillingStatus,
        error: householdBillingError
    } = storeAsyncData(
        'bookings-store-household-billing',
        () => `/api/billing?householdId=${householdsStore.selectedHouseholdId}`,
        {
            schema: HouseholdBillingResponseSchema.nullable(),
            default: () => null,
            enabled: () => isHouseholdBillingRequested.value && !!householdsStore.selectedHouseholdId,
            dependsOn: [householdsStore.selectedHouseholdDataset]
        }
    )

    const isHouseholdBillingLoading = computed(() => householdBillingStatus.value === 'pending')
    const isHouseholdBillingErrored = computed(() => householdBillingStatus.value === 'error')

    const loadHouseholdBilling = () => {
        isHouseholdBillingRequested.value = true
    }

    const billingPeriodsDataset = storeAsyncData('bookings-store-billing-periods', '/api/admin/billing/periods', {
        schema: BillingPeriodSummaryDisplaySchema.array(),
        default: () => []
    })
    const {
        data: billingPeriods, status: billingPeriodsStatus,
        error: billingPeriodsError, refresh: refreshBillingPeriods
    } = billingPeriodsDataset

    const isBillingPeriodsLoading = computed(() => billingPeriodsStatus.value === 'pending')
    const isBillingPeriodsErrored = computed(() => billingPeriodsStatus.value === 'error')
    const isBillingPeriodsInitialized = computed(() => billingPeriodsStatus.value === 'success')

    // The page names the billing period its URL carries; an id outside the list selects none
    const billingPeriodChoice = shallowRef<() => number | null>(() => null)
    const selectedBillingPeriodId = computed(() => {
        const id = billingPeriodChoice.value()
        return billingPeriods.value.find(period => period.id === id)?.id ?? null
    })

    const selectedBillingPeriodDataset = storeAsyncData(
        'bookings-store-selected-billing-period',
        () => `/api/admin/billing/periods/${selectedBillingPeriodId.value}`,
        {
            schema: BillingPeriodSummaryDetailSchema.nullable(),
            default: () => null,
            enabled: () => !!selectedBillingPeriodId.value,
            dependsOn: [billingPeriodsDataset],
            errorMessage: 'Kan ikke finde faktureringsperioden',
            notFound: {
                recover: async () => {
                    skipGoneId(billingPeriodChoice, selectedBillingPeriodId.value)
                    await refreshBillingPeriods()
                },
                toast: 'Kan ikke finde faktureringsperioden'
            }
        }
    )
    const {
        data: selectedBillingPeriodDetail, status: selectedBillingPeriodStatus,
        error: selectedBillingPeriodError, refresh: refreshSelectedBillingPeriod
    } = selectedBillingPeriodDataset

    const isBillingPeriodDetailLoading = computed(() => selectedBillingPeriodStatus.value === 'pending')

    const selectBillingPeriod = (choice: MaybeRefOrGetter<number | null>) => {
        billingPeriodChoice.value = () => toValue(choice)
    }

    // Current period transactions (for "virtual" billing period in admin economy)
    const {
        data: currentPeriodTransactions, status: currentPeriodStatus,
        error: currentPeriodError, refresh: refreshCurrentPeriodTransactions
    } = storeAsyncData('bookings-store-current-period', '/api/admin/billing/current-period', {
        schema: TransactionDisplaySchema.array(),
        default: () => []
    })

    const isCurrentPeriodLoading = computed(() => currentPeriodStatus.value === 'pending')
    const isCurrentPeriodErrored = computed(() => currentPeriodStatus.value === 'error')

    // The page names the invoice its URL carries; it resolves against the selected period's invoices
    const invoiceChoice = shallowRef<() => number | null>(() => null)
    const selectedInvoiceId = computed(() => {
        const id = invoiceChoice.value()
        return selectedBillingPeriodDetail.value?.invoices.find(invoice => invoice.id === id)?.id ?? null
    })

    const {
        data: selectedInvoiceTransactions, status: selectedInvoiceStatus
    } = storeAsyncData(
        'bookings-store-selected-invoice',
        () => `/api/admin/billing/invoices/${selectedInvoiceId.value}`,
        {
            schema: TransactionDisplaySchema.array(),
            default: () => [],
            enabled: () => !!selectedInvoiceId.value,
            dependsOn: [selectedBillingPeriodDataset],
            errorMessage: 'Kan ikke finde fakturaen',
            notFound: {
                recover: async () => {
                    skipGoneId(invoiceChoice, selectedInvoiceId.value)
                    await refreshSelectedBillingPeriod()
                },
                toast: 'Kan ikke finde fakturaen'
            }
        }
    )

    const isInvoiceTransactionsLoading = computed(() => selectedInvoiceStatus.value === 'pending')

    const selectInvoice = (choice: MaybeRefOrGetter<number | null>) => {
        invoiceChoice.value = () => toValue(choice)
    }

    // ========================================
    // MONTHLY BILLING JOB (ADR-007)
    // ========================================

    const monthlyBillingResult = ref<MonthlyBillingResponse | null>(null)
    const monthlyBillingError = ref<Error | null>(null)
    const isMonthlyBillingRunning = ref(false)
    const hasMonthlyBillingResult = computed(() => !isMonthlyBillingRunning.value && monthlyBillingError.value === null && monthlyBillingResult.value !== null)
    const hasMonthlyBillingError = computed(() => monthlyBillingError.value !== null)

    const {formatMonthlyBillingStats} = useMaintenance()

    const runMonthlyBilling = async () => {
        isMonthlyBillingRunning.value = true
        monthlyBillingError.value = null
        try {
            monthlyBillingResult.value = await apiRequest('/api/admin/maintenance/monthly', {
                method: 'POST',
                query: { triggeredBy: `ADMIN:${authStore.email}` },
                schema: MonthlyBillingResponseSchema,
                action: 'runMonthlyBilling', errorMessage: 'Månedlig fakturering fejlede'
            })
        } catch (error) {
            monthlyBillingResult.value = null
            monthlyBillingError.value = error as Error
            return
        } finally {
            isMonthlyBillingRunning.value = false
        }

        const stats = formatMonthlyBillingStats(monthlyBillingResult.value)
        const description = stats.map(s => `${s.label}: ${s.value}`).join(', ')
        console.info(CTX, `Monthly billing completed: ${description}`)
        // Billing moves transactions out of the unbilled current period into invoiced periods.
        await Promise.all([refreshBillingPeriods(), refreshCurrentPeriodTransactions()])
        toast.add({
            title: 'Månedlig fakturering afsluttet',
            description,
            color: COLOR.success
        })
    }

    return {
        // state
        orders,

        // computed state
        isOrdersLoading,
        isOrdersErrored,
        isOrdersInitialized,
        isNoOrders,
        ordersError,
        isBookingsStoreReady,

        // business logic computed
        totalOrdersCount,
        ordersByTicketType,

        // actions
        refreshOrders,
        loadOrdersForDinners,
        // upcoming orders (economy views)
        upcomingOrders,
        isUpcomingOrdersLoading,
        loadUpcomingOrders,
        refreshUpcomingOrders,
        fetchOrderDetail,
        fetchTicketChanges,
        fetchReleasedOrders,
        // Lock status (calendar display)
        lockStatus,
        isReleasedCountsLoading,
        isProcessingBookings,
        processSingleEventBookings,
        processMultipleEventsBookings,
        processAdminCorrection,

        // dinner event detail (store-owned per ADR-007)
        selectedDinnerEventId,
        selectedDinnerEventDetail,
        selectedDinnerEventError,
        isSelectedDinnerEventLoading,
        isSelectedDinnerEventErrored,
        isSelectedDinnerEventInitialized,
        selectDinnerDate,
        refreshSelectedDinnerEventDetail,

        // dinner event actions
        isDinnerUpdating,
        updateDinnerEventField,
        updateDinnerEventAllergens,
        announceDinner,
        cancelDinner,
        undoCancelDinner,
        addExpense,
        removeExpense,

        // waiting list: the queues of the dinners on view, the household's places, the queue on the dinner on view, release
        waitlistEntries,
        householdWaitlist,
        selectedDinnerWaitlist,
        isWaitlistEntriesLoading,
        isWaitlistEntriesErrored,
        isWaitlistEntriesInitialized,
        releasePortions,

        // daily maintenance
        dailyMaintenanceResult,
        dailyMaintenanceError,
        isDailyMaintenanceRunning,
        hasDailyMaintenanceResult,
        hasDailyMaintenanceError,
        runDailyMaintenance,

        // monthly billing
        monthlyBillingResult,
        monthlyBillingError,
        isMonthlyBillingRunning,
        hasMonthlyBillingResult,
        hasMonthlyBillingError,
        runMonthlyBilling,

        // household billing (household economy)
        householdBilling,
        householdBillingError,
        isHouseholdBillingLoading,
        isHouseholdBillingErrored,
        loadHouseholdBilling,

        // billing periods
        billingPeriods,
        billingPeriodsError,
        isBillingPeriodsLoading,
        isBillingPeriodsErrored,
        isBillingPeriodsInitialized,
        refreshBillingPeriods,
        selectedBillingPeriodDetail,
        selectedBillingPeriodError,
        isBillingPeriodDetailLoading,
        selectedBillingPeriodId,
        selectBillingPeriod,

        // current period (virtual billing period)
        currentPeriodTransactions,
        currentPeriodError,
        isCurrentPeriodLoading,
        isCurrentPeriodErrored,
        refreshCurrentPeriodTransactions,

        // invoice transactions (lazy load)
        selectedInvoiceTransactions,
        isInvoiceTransactionsLoading,
        selectedInvoiceId,
        selectInvoice
    }
})
