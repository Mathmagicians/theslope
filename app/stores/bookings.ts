import type {OrderDisplay, OrderDetail, CreateOrdersRequest, DinnerEventDetail, DinnerEventUpdate, DailyMaintenanceResult, CreateOrdersResult, ScaffoldOrdersRequest, ScaffoldOrdersResponse, DesiredOrder, DinnerState, DinnerMode} from '~/composables/useBookingValidation'
import type {MonthlyBillingResponse} from '~/composables/useBillingValidation'
import {type ReleasedTicketCounts, resolveDesiredOrdersToBuckets} from '~/composables/useBooking'
import {useBilling} from '~/composables/useBilling'

export const useBookingsStore = defineStore("Bookings", () => {
    // DEPENDENCIES
    const {storeAsyncData, apiRequest, handleApiError} = useApiHandler()
    const {OrderDisplaySchema, OrderDetailSchema, DinnerStateSchema, DinnerEventDetailSchema, DailyMaintenanceResultSchema, ScaffoldOrdersResponseSchema} = useBookingValidation()
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
    type OrdersFilter = {dinnerEventIds: number[], householdId?: number | null, includeProvenance?: boolean}
    const ordersFilter = shallowRef<() => OrdersFilter>(() => ({dinnerEventIds: []}))

    const ordersQuery = computed(() => {
        const {dinnerEventIds, householdId, includeProvenance} = ordersFilter.value()
        const params = new URLSearchParams()
        dinnerEventIds.forEach(id => params.append('dinnerEventIds', String(id)))
        if (householdId) params.append('householdId', String(householdId))
        if (includeProvenance) params.append('includeProvenance', 'true')
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

    // ========================================
    // Computed - Public API (derived from status)
    // ========================================
    const isOrdersLoading = computed(() => ordersStatus.value === 'pending')
    const isOrdersErrored = computed(() => ordersStatus.value === 'error')
    const isOrdersInitialized = computed(() => ordersStatus.value === 'success')
    const isNoOrders = computed(() => isOrdersInitialized.value && orders.value.length === 0)

    // Convenience computed for components - true when store is fully initialized and ready to use
    const isBookingsStoreReady = computed(() => !hasFilters.value || isOrdersInitialized.value)

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

    // Internal order methods - only used by processAdminCorrection
    const createOrder = async (request: CreateOrdersRequest): Promise<CreateOrdersResult> => {
        const result = await apiRequest<CreateOrdersResult>(`/api/order?adminBypass=${authStore.isAdmin}`, {
            method: 'PUT',
            body: request,
            action: 'Kunne ikke oprette bestilling'
        })
        console.info(CTX, `Created ${result.createdIds.length} order(s)`)
        await refreshOrders()
        return result
    }

    const deleteOrder = async (orderId: number): Promise<void> => {
        await apiRequest(`/api/order/${orderId}?adminBypass=${authStore.isAdmin}`, {
            method: 'DELETE',
            action: 'Kunne ikke slette bestilling'
        })
        console.info(CTX, `Deleted order ${orderId}`)
        await refreshOrders()
    }

    const updateOrder = async (orderId: number, orderData: { dinnerMode: DinnerMode }): Promise<OrderDisplay> => {
        const updatedOrder = await apiRequest<OrderDisplay>(`/api/order/${orderId}?adminBypass=${authStore.isAdmin}`, {
            method: 'POST',
            body: orderData,
            action: 'Kunne ikke opdatere bestilling'
        })
        console.info(CTX, `Updated order ${orderId}`)
        await refreshOrders()
        return updatedOrder
    }

    const claimOrder = async (dinnerEventId: number, ticketPriceId: number, inhabitantId: number, isGuestTicket: boolean = false): Promise<OrderDetail> => {
        const claimedOrder = await apiRequest<OrderDetail>('/api/order/claim', {
            method: 'POST',
            body: {dinnerEventId, ticketPriceId, inhabitantId, isGuestTicket},
            action: 'Kunne ikke overtage billet'
        })
        console.info(CTX, `Claimed ticket (dinner=${dinnerEventId}, ticketPrice=${ticketPriceId}) for inhabitant ${inhabitantId}, guest=${isGuestTicket}`)
        await Promise.all([refreshOrders(), refreshReleasedCounts()])
        return claimedOrder
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

    const fetchReleasedOrders = async (dinnerEventId: number): Promise<OrderDisplay[]> => {
        const released = await apiRequest('/api/order', {
            query: {dinnerEventIds: dinnerEventId, state: 'RELEASED', allHouseholds: true, sortBy: 'releasedAt'},
            schema: OrderDisplaySchema.array(),
            action: 'Kunne ikke hente ledige billetter'
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
                const grouped = Map.groupBy(released, o => o.dinnerEventId)
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
                action: 'Kunne ikke gemme bookinger'
            })
            await Promise.all([refreshOrders(), refreshReleasedCounts()])
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
     * Admin-only: Process order corrections bypassing deadlines.
     * Uses individual order endpoints (PUT, POST, DELETE) with adminBypass.
     * Reuses resolveDesiredOrdersToBuckets with always-true predicates (admin bypasses deadlines).
     * Returns ScaffoldResult for consistent formatting with formatScaffoldResult.
     *
     * @param guestBookerInhabitantId - For guest tickets, use this inhabitant (from target household) instead of the one in orders
     */
    const processAdminCorrection = async (
        householdId: number,
        dinnerEventId: number,
        dinnerEventDate: Date,
        orders: DesiredOrder[],
        existingOrders: OrderDisplay[],
        guestBookerInhabitantId?: number
    ): Promise<ScaffoldResult> => {
        const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()

        const emptyResult: ScaffoldResult = {
            seasonId: null, created: 0, deleted: 0, released: 0, claimed: 0,
            claimRejected: 0, priceUpdated: 0, modeUpdated: 0, unchanged: 0, households: 0, errored: 0
        }

        // Fail fast: admin access required
        if (!authStore.isAdmin) {
            handleApiError(new Error('Admin access required'), 'Kun administratorer kan rette bookinger')
            return emptyResult
        }

        const bookedByUserId = authStore.user?.id
        if (!bookedByUserId) {
            handleApiError(new Error('User ID required'), 'Bruger-ID mangler')
            return emptyResult
        }

        isProcessingBookings.value = true
        try {
            // Admin bypasses deadlines: always-true predicates → DELETE instead of RELEASE
            const dinnerEventById = new Map([[dinnerEventId, { date: dinnerEventDate }]])
            const buckets = resolveDesiredOrdersToBuckets(
                orders,
                existingOrders,
                dinnerEventById,
                () => true,  // canModifyOrders: admin bypasses
                () => true,  // canEditDiningMode: admin bypasses
                DinnerModeSchema.enum,
                OrderStateSchema.enum
            )

            // Execute creates
            if (buckets.create.length > 0) {
                await createOrder({
                    householdId,
                    dinnerEventId,
                    orders: buckets.create.map(o => ({
                        // For guest tickets, use the provided booker from target household
                        inhabitantId: o.isGuestTicket ? guestBookerInhabitantId! : o.inhabitantId,
                        ticketPriceId: o.ticketPriceId,
                        dinnerMode: o.dinnerMode,
                        bookedByUserId,
                        isGuestTicket: o.isGuestTicket
                    }))
                })
            }

            // Execute deletes
            for (const order of buckets.delete) {
                await deleteOrder(order.orderId!)
            }

            // Execute updates
            for (const order of buckets.update) {
                await updateOrder(order.orderId!, { dinnerMode: order.dinnerMode })
            }

            const result: ScaffoldResult = {
                ...emptyResult,
                created: buckets.create.length,
                deleted: buckets.delete.length,
                modeUpdated: buckets.update.length,
                unchanged: buckets.idempotent.length,
                households: 1
            }
            console.info(CTX, `processAdminCorrection: ${formatScaffoldResult(result, 'compact')}`)
            return result
        } finally {
            isProcessingBookings.value = false
        }
    }

    // DINNER EVENT ACTIONS
    type DinnerUpdate = Partial<DinnerEventUpdate> & { allergenIds?: number[], state?: typeof DinnerState[keyof typeof DinnerState] }

    const selectedDinnerEventId = ref<number | null>(null)
    const selectedDinnerEventKey = computed(() => `dinner-event-detail-${selectedDinnerEventId.value || 'null'}`)

    const {
        data: selectedDinnerEventDetail,
        status: selectedDinnerEventStatus,
        error: selectedDinnerEventError,
        refresh: refreshSelectedDinnerEventDetail
    } = storeAsyncData(
        selectedDinnerEventKey,
        () => `/api/admin/dinner-event/${selectedDinnerEventId.value}`,
        {
            schema: DinnerEventDetailSchema.nullable(),
            default: () => null,
            enabled: () => !!selectedDinnerEventId.value,
            errorMessage: 'Kunne ikke hente fællesspisning'
        }
    )

    const isSelectedDinnerEventLoading = computed(() => selectedDinnerEventStatus.value === 'pending')
    const isSelectedDinnerEventErrored = computed(() => selectedDinnerEventStatus.value === 'error')
    const isSelectedDinnerEventInitialized = computed(() => selectedDinnerEventStatus.value === 'success')

    const loadDinnerEventDetail = (id: number | null) => {
        selectedDinnerEventId.value = id
        if (id) console.info(`${CTX} Loading dinner event detail: ${id}`)
    }

    const isDinnerUpdating = ref(false)

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
                        color: 'error'
                    })
                }
            },
            schema: DinnerEventDetailSchema,
            action
        })
        console.info(`${CTX} Updated dinner ${id}: ${Object.keys(updates).join(', ')} → state: ${parsed.state}`)
        if (selectedDinnerEventId.value === id) await refreshSelectedDinnerEventDetail()
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
    const announceDinner = withLoading((id: number) => updateDinner(id, {state: DinnerState.ANNOUNCED}, 'Kunne ikke annoncere fællesspisningen'))
    const cancelDinner = withLoading((id: number) => updateDinner(id, {state: DinnerState.CANCELLED}, 'Kunne ikke aflyse fællesspisningen'))
    const undoCancelDinner = withLoading((id: number, targetState: DinnerState = DinnerState.SCHEDULED) => updateDinner(id, {state: targetState}, 'Kunne ikke annullere aflysningen'))

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
            color: 'success'
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
                action: 'Daglig vedligeholdelse fejlede'
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
            color: 'success'
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

    const {
        data: billingPeriods, status: billingPeriodsStatus,
        error: billingPeriodsError, refresh: refreshBillingPeriods
    } = storeAsyncData('bookings-store-billing-periods', '/api/admin/billing/periods', {
        schema: BillingPeriodSummaryDisplaySchema.array(),
        default: () => []
    })

    const isBillingPeriodsLoading = computed(() => billingPeriodsStatus.value === 'pending')
    const isBillingPeriodsErrored = computed(() => billingPeriodsStatus.value === 'error')
    const isBillingPeriodsInitialized = computed(() => billingPeriodsStatus.value === 'success')

    // Fetch billing period detail (on-demand for expanded view)
    const selectedBillingPeriodId = ref<number | null>(null)
    const selectedBillingPeriodKey = computed(() => `billing-period-${selectedBillingPeriodId.value || 'null'}`)

    const {
        data: selectedBillingPeriodDetail, status: selectedBillingPeriodStatus,
        error: selectedBillingPeriodError
    } = storeAsyncData(
        selectedBillingPeriodKey,
        () => `/api/admin/billing/periods/${selectedBillingPeriodId.value}`,
        {
            schema: BillingPeriodSummaryDetailSchema.nullable(),
            default: () => null,
            enabled: () => !!selectedBillingPeriodId.value
        }
    )

    const isBillingPeriodDetailLoading = computed(() => selectedBillingPeriodStatus.value === 'pending')

    const loadBillingPeriodDetail = (periodId: number) => {
        selectedBillingPeriodId.value = periodId
        console.info(CTX, `Loading billing period detail: ${periodId}`)
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

    // Invoice transactions (lazy load on invoice expand)
    const selectedInvoiceId = ref<number | null>(null)
    const selectedInvoiceKey = computed(() => `invoice-transactions-${selectedInvoiceId.value || 'null'}`)

    const {
        data: selectedInvoiceTransactions, status: selectedInvoiceStatus
    } = storeAsyncData(
        selectedInvoiceKey,
        () => `/api/admin/billing/invoices/${selectedInvoiceId.value}`,
        {
            schema: TransactionDisplaySchema.array(),
            default: () => [],
            enabled: () => !!selectedInvoiceId.value
        }
    )

    const isInvoiceTransactionsLoading = computed(() => selectedInvoiceStatus.value === 'pending')

    const loadInvoiceTransactions = (invoiceId: number) => {
        selectedInvoiceId.value = invoiceId
        console.info(CTX, `Loading invoice transactions: ${invoiceId}`)
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
                action: 'Månedlig fakturering fejlede'
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
            color: 'success'
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
        claimOrder,
        fetchOrderDetail,
        fetchReleasedOrders,
        // Lock status (calendar display)
        lockStatus,
        isReleasedCountsLoading,
        isProcessingBookings,
        processSingleEventBookings,
        processMultipleEventsBookings,
        processAdminCorrection,

        // dinner event detail (reactive-key, store-owned per ADR-007)
        selectedDinnerEventDetail,
        selectedDinnerEventError,
        isSelectedDinnerEventLoading,
        isSelectedDinnerEventErrored,
        isSelectedDinnerEventInitialized,
        loadDinnerEventDetail,
        refreshSelectedDinnerEventDetail,

        // dinner event actions
        isDinnerUpdating,
        updateDinnerEventField,
        updateDinnerEventAllergens,
        announceDinner,
        cancelDinner,
        undoCancelDinner,

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
        loadBillingPeriodDetail,

        // current period (virtual billing period)
        currentPeriodTransactions,
        currentPeriodError,
        isCurrentPeriodLoading,
        isCurrentPeriodErrored,
        refreshCurrentPeriodTransactions,

        // invoice transactions (lazy load)
        selectedInvoiceTransactions,
        isInvoiceTransactionsLoading,
        loadInvoiceTransactions
    }
})
