import type {OrderDisplay, OrderDetail, CreateOrdersRequest, DinnerEventDetail, DinnerEventUpdate, DailyMaintenanceResult, CreateOrdersResult, ScaffoldOrdersRequest, ScaffoldOrdersResponse, DesiredOrder, DinnerState, DinnerMode} from '~/composables/useBookingValidation'
import type {MonthlyBillingResponse, BillingPeriodSummaryDisplay, BillingPeriodSummaryDetail, TransactionDisplay} from '~/composables/useBillingValidation'
import {type ReleasedTicketCounts, resolveDesiredOrdersToBuckets} from '~/composables/useBooking'
import {useBilling} from '~/composables/useBilling'

export const useBookingsStore = defineStore("Bookings", () => {
    // DEPENDENCIES
    const {handleApiError} = useApiHandler()
    const {OrderDisplaySchema, DinnerStateSchema, DinnerEventDetailSchema, DailyMaintenanceResultSchema, ScaffoldOrdersResponseSchema} = useBookingValidation()
    const {formatScaffoldResult} = useBooking()
    const {formatDailyMaintenanceStats} = useMaintenance()
    const DinnerState = DinnerStateSchema.enum
    const requestFetch = useRequestFetch()

    const CTX = `${LOG_CTX} 🎟️ > BOOKINGS_STORE >`

    // ========================================
    // State - useFetch with status exposed internally
    // ========================================

    // Selected context for filtering orders
    const selectedDinnerEventIds = ref<number[]>([]) // Empty = all events
    const selectedInhabitantId = ref<number | null>(null)
    const selectedHouseholdId = ref<number | null>(null) // Explicit household (admin viewing another household)
    const includeProvenance = ref(false) // Only true for household booking view (shows "🔄 fra AR_1" on claimed tickets)

    // Fetch orders - reactive based on selected filters
    const buildOrdersQuery = () => {
        const params = new URLSearchParams()
        // Array of IDs: empty=all, otherwise filter
        selectedDinnerEventIds.value.forEach(id => params.append('dinnerEventIds', String(id)))
        if (selectedInhabitantId.value) params.append('inhabitantId', String(selectedInhabitantId.value))
        if (selectedHouseholdId.value) params.append('householdId', String(selectedHouseholdId.value))
        if (includeProvenance.value) params.append('includeProvenance', 'true')
        return params.toString()
    }

    const ordersKey = computed(() => `/api/order?${buildOrdersQuery()}`)

    // Only fetch when filters are explicitly set (prevents fetching ALL orders on init)
    const hasFilters = computed(() =>
        selectedDinnerEventIds.value.length > 0 || selectedInhabitantId.value !== null
    )

    const {
        data: orders, status: ordersStatus,
        error: ordersError, refresh: refreshOrders
    } = useAsyncData<OrderDisplay[]>(
        ordersKey,
        () => {
            // Skip fetch until filters are set (prevents initial "fetch all" on store init)
            if (!hasFilters.value) return Promise.resolve([])
            return requestFetch<OrderDisplay[]>(`/api/order?${buildOrdersQuery()}`, {
                onResponseError: ({response}) => { handleApiError(response._data, 'Kunne ikke hente bookinger') }
            })
        },
        {
            default: () => [],
            transform: (data: unknown[]) => {
                try {
                    return (data as Record<string, unknown>[]).map(order => OrderDisplaySchema.parse(order))
                } catch (e) {
                    handleApiError(e, 'parseOrders')
                    throw e
                }
            }
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
    const isBookingsStoreReady = computed(() => isOrdersInitialized.value)

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

    const loadOrdersForDinners = (dinnerEventIds: number | number[], withProvenance = false, householdId?: number) => {
        const ids = [dinnerEventIds].flat()
        selectedDinnerEventIds.value = ids
        selectedInhabitantId.value = null
        selectedHouseholdId.value = householdId ?? null
        includeProvenance.value = withProvenance
        console.info(CTX, `Loading orders for ${ids.length} dinner(s)${householdId ? ` (household ${householdId})` : ''}${withProvenance ? ' (with provenance)' : ''}`)
    }

    const loadOrdersForInhabitant = (inhabitantId: number, withProvenance = false) => {
        selectedInhabitantId.value = inhabitantId
        selectedDinnerEventIds.value = []
        includeProvenance.value = withProvenance
        console.info(CTX, `Loading orders for inhabitant: ${inhabitantId}${withProvenance ? ' (with provenance)' : ''}`)
    }

    // Internal order methods - only used by processAdminCorrection
    const createOrder = async (request: CreateOrdersRequest): Promise<CreateOrdersResult> => {
        try {
            const result = await $fetch<CreateOrdersResult>(`/api/order?adminBypass=${authStore.isAdmin}`, {
                method: 'PUT',
                body: request
            })
            console.info(CTX, `Created ${result.createdIds.length} order(s)`)
            await refreshOrders()
            return result
        } catch (e: unknown) {
            handleApiError(e, 'Kunne ikke oprette bestilling')
            throw e
        }
    }

    const deleteOrder = async (orderId: number): Promise<void> => {
        try {
            await $fetch(`/api/order/${orderId}?adminBypass=${authStore.isAdmin}`, {
                method: 'DELETE'
            })
            console.info(CTX, `Deleted order ${orderId}`)
            await refreshOrders()
        } catch (e: unknown) {
            handleApiError(e, 'Kunne ikke slette bestilling')
            throw e
        }
    }

    const updateOrder = async (orderId: number, orderData: { dinnerMode: DinnerMode }): Promise<OrderDisplay> => {
        try {
            const updatedOrder = await $fetch<OrderDisplay>(`/api/order/${orderId}?adminBypass=${authStore.isAdmin}`, {
                method: 'POST',
                body: orderData
            })
            console.info(CTX, `Updated order ${orderId}`)
            await refreshOrders()
            return updatedOrder
        } catch (e: unknown) {
            handleApiError(e, 'Kunne ikke opdatere bestilling')
            throw e
        }
    }

    const claimOrder = async (dinnerEventId: number, ticketPriceId: number, inhabitantId: number, isGuestTicket: boolean = false): Promise<OrderDetail> => {
        try {
            const claimedOrder = await $fetch<OrderDetail>('/api/order/claim', {
                method: 'POST',
                body: {dinnerEventId, ticketPriceId, inhabitantId, isGuestTicket}
            })
            console.info(CTX, `Claimed ticket (dinner=${dinnerEventId}, ticketPrice=${ticketPriceId}) for inhabitant ${inhabitantId}, guest=${isGuestTicket}`)
            await Promise.all([refreshOrders(), refreshReleasedCounts()])
            return claimedOrder
        } catch (e: unknown) {
            handleApiError(e, 'Kunne ikke overtage billet')
            throw e
        }
    }

    const fetchReleasedOrders = async (dinnerEventId: number): Promise<OrderDisplay[]> => {
        try {
            const released = await $fetch<OrderDisplay[]>('/api/order', {
                query: {dinnerEventIds: dinnerEventId, state: 'RELEASED', allHouseholds: true, sortBy: 'releasedAt'}
            })
            console.info(CTX, `Fetched ${released.length} released orders for dinner ${dinnerEventId}`)
            return released.map(order => OrderDisplaySchema.parse(order))
        } catch (e: unknown) {
            handleApiError(e, 'Kunne ikke hente ledige billetter')
            throw e
        }
    }

    // ========================================
    // Lock Status (reactive, watches planStore)
    // ========================================
    const {getLockedFutureDinnerIds, computeLockStatus} = useBooking()
    const {deadlinesForSeason, splitDinnerEvents} = useSeason()
    const planStore = usePlanStore()

    // Released counts fetch (internal)
    const releasedCountsDinnerIds = ref<number[]>([])
    const releasedCountsKey = computed(() => `released-counts-${releasedCountsDinnerIds.value.join('-') || 'none'}`)
    const {formatTicketCounts} = useBilling()

    const {data: releasedCounts, status: releasedCountsStatus, refresh: refreshReleasedCounts} = useAsyncData<Map<number, ReleasedTicketCounts>>(
        releasedCountsKey,
        async () => {
            if (releasedCountsDinnerIds.value.length === 0) return new Map()
            const params = new URLSearchParams()
            releasedCountsDinnerIds.value.forEach(id => params.append('dinnerEventIds', String(id)))
            params.append('state', 'RELEASED')
            params.append('allHouseholds', 'true')
            const released = await $fetch<OrderDisplay[]>(`/api/order?${params.toString()}`)
            // Group orders by dinnerEventId
            const grouped = Map.groupBy(released, o => o.dinnerEventId)
            const counts = new Map<number, ReleasedTicketCounts>()
            for (const [dinnerEventId, orders] of grouped) {
                counts.set(dinnerEventId, { total: orders.length, formatted: formatTicketCounts(orders) })
            }
            return counts
        },
        {default: () => new Map()}
    )

    // Watch season → compute locked IDs → fetch released counts
    watchEffect(() => {
        const season = planStore.selectedSeason
        if (!season?.dinnerEvents?.length) return

        const {nextDinner, futureDinners} = splitDinnerEvents(season.dinnerEvents)
        const deadlines = deadlinesForSeason(season)

        const lockedIds = getLockedFutureDinnerIds(nextDinner, futureDinners, deadlines)
        if (lockedIds.length > 0 && lockedIds.join(',') !== releasedCountsDinnerIds.value.join(',')) {
            releasedCountsDinnerIds.value = lockedIds
        }
    })

    // Exposed computed: lockStatus map for calendar display
    const lockStatus = computed(() => {
        const season = planStore.selectedSeason
        if (!season?.dinnerEvents) return new Map<number, ReleasedTicketCounts | null>()
        return computeLockStatus(season.dinnerEvents, deadlinesForSeason(season), releasedCounts.value)
    })

    const isReleasedCountsLoading = computed(() => releasedCountsStatus.value === 'pending')

    const isProcessingBookings = ref(false)

    /**
     * ADR-016: Internal scaffold endpoint call.
     */
    const _scaffoldOrders = async (request: ScaffoldOrdersRequest): Promise<ScaffoldOrdersResponse> => {
        const result = await $fetch<ScaffoldOrdersResponse>('/api/household/order/scaffold', {
            method: 'POST',
            body: request
        })
        await Promise.all([refreshOrders(), refreshReleasedCounts()])
        return ScaffoldOrdersResponseSchema.parse(result)
    }

    /**
     * ADR-016: Process bookings for a single dinner event.
     * Used by day view, power mode, and guest booking.
     */
    const processSingleEventBookings = async (
        householdId: number,
        dinnerEventId: number,
        orders: DesiredOrder[]
    ): Promise<ScaffoldOrdersResponse> => {
        isProcessingBookings.value = true
        try {
            const result = await _scaffoldOrders({ householdId, dinnerEventIds: [dinnerEventId], orders })
            console.info(CTX, `processSingleEventBookings: ${formatScaffoldResult(result.scaffoldResult, 'compact')}`)
            return result
        } catch (e: unknown) {
            handleApiError(e, 'Kunne ikke gemme bookinger')
            throw e
        } finally {
            isProcessingBookings.value = false
        }
    }

    /**
     * ADR-016: Process bookings for multiple dinner events.
     * Used by grid view (week/month).
     */
    const processMultipleEventsBookings = async (
        householdId: number,
        dinnerEventIds: number[],
        orders: DesiredOrder[]
    ): Promise<ScaffoldOrdersResponse> => {
        isProcessingBookings.value = true
        try {
            const result = await _scaffoldOrders({ householdId, dinnerEventIds, orders })
            console.info(CTX, `processMultipleEventsBookings: ${formatScaffoldResult(result.scaffoldResult, 'compact')}`)
            return result
        } catch (e: unknown) {
            handleApiError(e, 'Kunne ikke gemme bookinger')
            throw e
        } finally {
            isProcessingBookings.value = false
        }
    }

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
        } catch (e: unknown) {
            handleApiError(e, 'Kunne ikke rette bookinger')
            throw e
        } finally {
            isProcessingBookings.value = false
        }
    }

    // DINNER EVENT ACTIONS
    type DinnerUpdate = Partial<DinnerEventUpdate> & { allergenIds?: number[], state?: typeof DinnerState[keyof typeof DinnerState] }

    const fetchDinnerEventDetail = async (id: number): Promise<DinnerEventDetail | null> => {
        try {
            return await $fetch<DinnerEventDetail>(`/api/admin/dinner-event/${id}`)
        } catch (e: unknown) {
            handleApiError(e, 'Kunne ikke hente fællesspisning')
            throw e
        }
    }

    const isDinnerUpdating = ref(false)

    const updateDinner = async (id: number, updates: DinnerUpdate): Promise<DinnerEventDetail> => {
        const updated = await $fetch(`/api/chef/dinner/${id}`, { method: 'POST', body: updates })
        const parsed = DinnerEventDetailSchema.parse(updated)
        console.info(`${CTX} Updated dinner ${id}: ${Object.keys(updates).join(', ')} → state: ${parsed.state}`)
        return parsed
    }

    const withLoadingAndErrorHandler = <T extends unknown[]>(fn: (...args: T) => Promise<DinnerEventDetail>, msg: string) =>
        async (...args: T): Promise<DinnerEventDetail | null> => {
            isDinnerUpdating.value = true
            try { return await fn(...args) }
            catch (e: unknown) { handleApiError(e, msg); return null }
            finally { isDinnerUpdating.value = false }
        }

    const updateDinnerEventAllergens = withLoadingAndErrorHandler((id: number, allergenIds: number[]) => updateDinner(id, {allergenIds}), 'Kunne ikke gemme allergeninformation')
    const updateDinnerEventField = withLoadingAndErrorHandler((id: number, updates: Partial<DinnerEventUpdate>) => updateDinner(id, updates), 'Kunne ikke gemme ændringer til menuen')
    const announceDinner = withLoadingAndErrorHandler((id: number) => updateDinner(id, {state: DinnerState.ANNOUNCED}), 'Kunne ikke annoncere fællesspisningen')
    const cancelDinner = withLoadingAndErrorHandler((id: number) => updateDinner(id, {state: DinnerState.CANCELLED}), 'Kunne ikke aflyse fællesspisningen')
    const undoCancelDinner = withLoadingAndErrorHandler((id: number, targetState: DinnerState = DinnerState.SCHEDULED) => updateDinner(id, {state: targetState}), 'Kunne ikke annullere aflysningen')

    // ========================================
    // DAILY MAINTENANCE JOB (ADR-007)
    // ========================================
    const toast = useToast()

    const authStore = useAuthStore()

    const {
        data: dailyMaintenanceResult,
        status: dailyMaintenanceStatus,
        error: dailyMaintenanceError,
        execute: executeDailyMaintenance
    } = useAsyncData<DailyMaintenanceResult | null>(
        'bookings-store-daily-maintenance',
        () => $fetch<DailyMaintenanceResult>('/api/admin/maintenance/daily', {
            method: 'POST',
            query: { triggeredBy: `ADMIN:${authStore.email}` }
        }),
        {
            immediate: false,
            transform: (data) => data ? DailyMaintenanceResultSchema.parse(data) : null
        }
    )

    const isDailyMaintenanceRunning = computed(() => dailyMaintenanceStatus.value === 'pending')
    const hasDailyMaintenanceResult = computed(() => dailyMaintenanceStatus.value === 'success' && dailyMaintenanceResult.value !== null)
    const hasDailyMaintenanceError = computed(() => dailyMaintenanceStatus.value === 'error')

    const runDailyMaintenance = async () => {
        await executeDailyMaintenance()

        if (hasDailyMaintenanceError.value) {
            handleApiError(dailyMaintenanceError.value, 'Daglig vedligeholdelse fejlede')
        } else if (hasDailyMaintenanceResult.value) {
            const r = dailyMaintenanceResult.value!
            const stats = formatDailyMaintenanceStats(r)
            const description = stats.map(s => `${s.label}: ${s.value}`).join(', ')
            console.info(CTX, `Daily maintenance completed: ${description}`)
            toast.add({
                title: 'Daglig vedligeholdelse afsluttet',
                description,
                color: 'success'
            })
        }
    }

    // ========================================
    // BILLING PERIODS (ADR-007)
    // ========================================

    const {MonthlyBillingResponseSchema, TransactionDisplaySchema, BillingPeriodSummaryDisplaySchema, BillingPeriodSummaryDetailSchema} = useBillingValidation()

    const {
        data: billingPeriods, status: billingPeriodsStatus,
        error: billingPeriodsError, refresh: refreshBillingPeriods
    } = useFetch<BillingPeriodSummaryDisplay[]>(
        '/api/admin/billing/periods',
        {
            key: 'bookings-store-billing-periods',
            default: () => [],
            transform: (data: unknown[]) => (data as unknown[]).map(s => BillingPeriodSummaryDisplaySchema.parse(s))
        }
    )

    const isBillingPeriodsLoading = computed(() => billingPeriodsStatus.value === 'pending')
    const isBillingPeriodsErrored = computed(() => billingPeriodsStatus.value === 'error')
    const isBillingPeriodsInitialized = computed(() => billingPeriodsStatus.value === 'success')

    // Fetch billing period detail (on-demand for expanded view)
    const selectedBillingPeriodId = ref<number | null>(null)
    const selectedBillingPeriodKey = computed(() => `billing-period-${selectedBillingPeriodId.value || 'null'}`)

    const {
        data: selectedBillingPeriodDetail, status: selectedBillingPeriodStatus,
        error: selectedBillingPeriodError
    } = useAsyncData<BillingPeriodSummaryDetail | null>(
        selectedBillingPeriodKey,
        () => {
            if (!selectedBillingPeriodId.value) return Promise.resolve(null)
            return $fetch<BillingPeriodSummaryDetail>(`/api/admin/billing/periods/${selectedBillingPeriodId.value}`)
        },
        {
            default: () => null,
            transform: (data) => data ? BillingPeriodSummaryDetailSchema.parse(data) : null
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
    } = useFetch<TransactionDisplay[]>(
        '/api/admin/billing/current-period',
        {
            key: 'bookings-store-current-period',
            default: () => [],
            transform: (data: unknown[]) => (data as unknown[]).map(tx => TransactionDisplaySchema.parse(tx))
        }
    )

    const isCurrentPeriodLoading = computed(() => currentPeriodStatus.value === 'pending')
    const isCurrentPeriodErrored = computed(() => currentPeriodStatus.value === 'error')

    // Invoice transactions (lazy load on invoice expand)
    const selectedInvoiceId = ref<number | null>(null)
    const selectedInvoiceKey = computed(() => `invoice-transactions-${selectedInvoiceId.value || 'null'}`)

    const {
        data: selectedInvoiceTransactions, status: selectedInvoiceStatus
    } = useAsyncData<TransactionDisplay[]>(
        selectedInvoiceKey,
        () => {
            if (!selectedInvoiceId.value) return Promise.resolve([])
            return $fetch<TransactionDisplay[]>(`/api/admin/billing/invoices/${selectedInvoiceId.value}`)
        },
        {
            default: () => [],
            transform: (data: unknown[]) => (data as unknown[]).map(tx => TransactionDisplaySchema.parse(tx))
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

    const {
        data: monthlyBillingResult,
        status: monthlyBillingStatus,
        error: monthlyBillingError,
        execute: executeMonthlyBilling
    } = useAsyncData<MonthlyBillingResponse | null>(
        'bookings-store-monthly-billing',
        () => $fetch<MonthlyBillingResponse>('/api/admin/maintenance/monthly', {
            method: 'POST',
            query: { triggeredBy: `ADMIN:${authStore.email}` }
        }),
        {
            immediate: false,
            transform: (data) => data ? MonthlyBillingResponseSchema.parse(data) : null
        }
    )

    const isMonthlyBillingRunning = computed(() => monthlyBillingStatus.value === 'pending')
    const hasMonthlyBillingResult = computed(() => monthlyBillingStatus.value === 'success' && monthlyBillingResult.value !== null)
    const hasMonthlyBillingError = computed(() => monthlyBillingStatus.value === 'error')

    const {formatMonthlyBillingStats} = useMaintenance()

    const runMonthlyBilling = async () => {
        await executeMonthlyBilling()

        if (hasMonthlyBillingError.value) {
            handleApiError(monthlyBillingError.value, 'Månedlig fakturering fejlede')
        } else if (hasMonthlyBillingResult.value) {
            const results = monthlyBillingResult.value!.results
            const stats = formatMonthlyBillingStats(results)
            const description = stats.map(s => `${s.label}: ${s.value}`).join(', ')
            console.info(CTX, `Monthly billing completed: ${description}`)
            toast.add({
                title: 'Månedlig fakturering afsluttet',
                description,
                color: 'success'
            })
            // Refresh billing periods to show new data
            await refreshBillingPeriods()
        }
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
        loadOrdersForDinners,
        loadOrdersForInhabitant,
        claimOrder,
        fetchReleasedOrders,
        // Lock status (calendar display)
        lockStatus,
        isReleasedCountsLoading,
        isProcessingBookings,
        processSingleEventBookings,
        processMultipleEventsBookings,
        processAdminCorrection,

        // dinner event actions
        isDinnerUpdating,
        fetchDinnerEventDetail,
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
