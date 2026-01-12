import type {OrderDisplay, OrderDetail, CreateOrdersRequest, DinnerEventDetail, DinnerEventUpdate, DailyMaintenanceResult, CreateOrdersResult, ScaffoldOrdersRequest, ScaffoldOrdersResponse, DesiredOrder} from '~/composables/useBookingValidation'
import type {MonthlyBillingResponse, BillingPeriodSummaryDisplay, BillingPeriodSummaryDetail} from '~/composables/useBillingValidation'

export const useBookingsStore = defineStore("Bookings", () => {
    // DEPENDENCIES
    const {handleApiError} = useApiHandler()
    const {OrderDisplaySchema, DinnerStateSchema, DailyMaintenanceResultSchema, ScaffoldOrdersResponseSchema} = useBookingValidation()
    const {formatDailyMaintenanceStats} = useMaintenance()
    const DinnerState = DinnerStateSchema.enum

    const CTX = `${LOG_CTX} 🎟️ > BOOKINGS_STORE >`

    // ========================================
    // State - useFetch with status exposed internally
    // ========================================

    // Selected context for filtering orders
    const selectedDinnerEventIds = ref<number[]>([]) // Empty = all events
    const selectedInhabitantId = ref<number | null>(null)
    const includeProvenance = ref(false) // Only true for household booking view (shows "🔄 fra AR_1" on claimed tickets)

    // Fetch orders - reactive based on selected filters
    const buildOrdersQuery = () => {
        const params = new URLSearchParams()
        // Array of IDs: empty=all, otherwise filter
        selectedDinnerEventIds.value.forEach(id => params.append('dinnerEventIds', String(id)))
        if (selectedInhabitantId.value) params.append('inhabitantId', String(selectedInhabitantId.value))
        if (includeProvenance.value) params.append('includeProvenance', 'true')
        return params.toString()
    }

    const ordersKey = computed(() => `/api/order?${buildOrdersQuery()}`)

    const {
        data: orders, status: ordersStatus,
        error: ordersError, refresh: refreshOrders
    } = useAsyncData<OrderDisplay[]>(
        ordersKey,
        () => $fetch<OrderDisplay[]>(`/api/order?${buildOrdersQuery()}`),
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

    const loadOrdersForDinners = (dinnerEventIds: number | number[], withProvenance = false) => {
        const ids = [dinnerEventIds].flat()
        selectedDinnerEventIds.value = ids
        selectedInhabitantId.value = null
        includeProvenance.value = withProvenance
        console.info(CTX, `Loading orders for ${ids.length} dinner(s)${withProvenance ? ' (with provenance)' : ''}`)
    }

    const loadOrdersForInhabitant = (inhabitantId: number, withProvenance = false) => {
        selectedInhabitantId.value = inhabitantId
        selectedDinnerEventIds.value = []
        includeProvenance.value = withProvenance
        console.info(CTX, `Loading orders for inhabitant: ${inhabitantId}${withProvenance ? ' (with provenance)' : ''}`)
    }

    const loadAllOrders = (withProvenance = false) => {
        selectedDinnerEventIds.value = []
        selectedInhabitantId.value = null
        includeProvenance.value = withProvenance
        console.info(CTX, `Loading all orders${withProvenance ? ' (with provenance)' : ''}`)
    }

    const createOrder = async (request: CreateOrdersRequest): Promise<CreateOrdersResult> => {
        try {
            const result = await $fetch<CreateOrdersResult>('/api/order', {
                method: 'PUT',
                body: request,
                headers: {'Content-Type': 'application/json'}
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
            await $fetch(`/api/order/${orderId}`, {
                method: 'DELETE'
            })
            console.info(CTX, `Deleted order ${orderId}`)
            await refreshOrders()
        } catch (e: unknown) {
            handleApiError(e, 'Kunne ikke slette bestilling')
            throw e
        }
    }

    const updateOrder = async (orderId: number, orderData: Partial<OrderCreate>): Promise<OrderDisplay> => {
        try {
            const updatedOrder = await $fetch<OrderDisplay>(`/api/order/${orderId}`, {
                method: 'POST',
                body: orderData,
                headers: {'Content-Type': 'application/json'}
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
            await refreshOrders()
            return claimedOrder
        } catch (e: unknown) {
            handleApiError(e, 'Kunne ikke overtage billet')
            throw e
        }
    }

    const fetchReleasedOrders = async (dinnerEventId: number): Promise<OrderDisplay[]> => {
        try {
            const released = await $fetch<OrderDisplay[]>('/api/order', {
                query: {dinnerEventId, state: 'RELEASED', allHouseholds: true, sortBy: 'releasedAt'}
            })
            console.info(CTX, `Fetched ${released.length} released orders for dinner ${dinnerEventId}`)
            return released.map(order => OrderDisplaySchema.parse(order))
        } catch (e: unknown) {
            handleApiError(e, 'Kunne ikke hente ledige billetter')
            throw e
        }
    }

    const isProcessingBookings = ref(false)

    /**
     * ADR-016: Internal scaffold endpoint call.
     */
    const _scaffoldOrders = async (request: ScaffoldOrdersRequest): Promise<ScaffoldOrdersResponse> => {
        const result = await $fetch<ScaffoldOrdersResponse>('/api/household/order/scaffold', {
            method: 'POST',
            body: request
        })
        await refreshOrders()
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
            console.info(CTX, `processSingleEventBookings: created=${result.scaffoldResult.created}, deleted=${result.scaffoldResult.deleted}, released=${result.scaffoldResult.released}`)
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
            console.info(CTX, `processMultipleEventsBookings: created=${result.scaffoldResult.created}, deleted=${result.scaffoldResult.deleted}, released=${result.scaffoldResult.released}`)
            return result
        } catch (e: unknown) {
            handleApiError(e, 'Kunne ikke gemme bookinger')
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
        const updated = await $fetch<DinnerEventDetail>(`/api/chef/dinner/${id}`, { method: 'POST', body: updates })
        console.info(CTX, `Updated dinner ${id}:`, Object.keys(updates).join(', '))
        return updated
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

    const {MonthlyBillingResponseSchema, deserializeBillingPeriodDisplay, deserializeBillingPeriodDetail} = useBillingValidation()

    const {
        data: billingPeriods, status: billingPeriodsStatus,
        error: billingPeriodsError, refresh: refreshBillingPeriods
    } = useFetch<BillingPeriodSummaryDisplay[]>(
        '/api/admin/billing/periods',
        {
            key: 'bookings-store-billing-periods',
            default: () => [],
            transform: (data: unknown[]) => (data as unknown[]).map(deserializeBillingPeriodDisplay)
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
            transform: deserializeBillingPeriodDetail
        }
    )

    const isBillingPeriodDetailLoading = computed(() => selectedBillingPeriodStatus.value === 'pending')

    const loadBillingPeriodDetail = (periodId: number) => {
        selectedBillingPeriodId.value = periodId
        console.info(CTX, `Loading billing period detail: ${periodId}`)
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
        loadAllOrders,
        createOrder,
        deleteOrder,
        updateOrder,
        claimOrder,
        fetchReleasedOrders,
        isProcessingBookings,
        processSingleEventBookings,
        processMultipleEventsBookings,

        // dinner event actions
        isDinnerUpdating,
        fetchDinnerEventDetail,
        updateDinnerEventField,
        updateDinnerEventAllergens,
        announceDinner,
        cancelDinner,

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
        loadBillingPeriodDetail
    }
})
