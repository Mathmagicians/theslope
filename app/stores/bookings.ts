import type {OrderDisplay, OrderCreate, DinnerEventDetail, DinnerEventUpdate, DailyMaintenanceResult} from '~/composables/useBookingValidation'
import type {MonthlyBillingResponse, BillingPeriodSummaryDisplay, BillingPeriodSummaryDetail} from '~/composables/useBillingValidation'

export const useBookingsStore = defineStore("Bookings", () => {
    // DEPENDENCIES
    const {handleApiError} = useApiHandler()
    const {OrderDisplaySchema, DinnerStateSchema, DailyMaintenanceResultSchema} = useBookingValidation()
    const DinnerState = DinnerStateSchema.enum

    const CTX = `${LOG_CTX} 🎟️ > BOOKINGS_STORE >`

    // ========================================
    // State - useFetch with status exposed internally
    // ========================================

    // Selected context for filtering orders
    const selectedDinnerEventId = ref<number | null>(null)
    const selectedInhabitantId = ref<number | null>(null)

    // Fetch orders - reactive based on selected filters
    const ordersKey = computed(() => {
        const params = new URLSearchParams()
        if (selectedDinnerEventId.value) params.append('dinnerEventId', String(selectedDinnerEventId.value))
        if (selectedInhabitantId.value) params.append('inhabitantId', String(selectedInhabitantId.value))
        const queryString = params.toString()
        return `/api/order${queryString ? `?${queryString}` : ''}`
    })

    const {
        data: orders, status: ordersStatus,
        error: ordersError, refresh: refreshOrders
    } = useAsyncData<OrderDisplay[]>(
        ordersKey,
        () => {
            const params = new URLSearchParams()
            if (selectedDinnerEventId.value) params.append('dinnerEventId', String(selectedDinnerEventId.value))
            if (selectedInhabitantId.value) params.append('inhabitantId', String(selectedInhabitantId.value))
            const queryString = params.toString()
            return $fetch<OrderDisplay[]>(`/api/order${queryString ? `?${queryString}` : ''}`)
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

    const loadOrdersForDinner = (dinnerEventId: number) => {
        selectedDinnerEventId.value = dinnerEventId
        selectedInhabitantId.value = null
        console.info(CTX, `Loading orders for dinner event: ${dinnerEventId}`)
    }

    const loadOrdersForInhabitant = (inhabitantId: number) => {
        selectedInhabitantId.value = inhabitantId
        selectedDinnerEventId.value = null
        console.info(CTX, `Loading orders for inhabitant: ${inhabitantId}`)
    }

    const loadAllOrders = () => {
        selectedDinnerEventId.value = null
        selectedInhabitantId.value = null
        console.info(CTX, 'Loading all orders')
    }

    const createOrder = async (orderData: OrderCreate): Promise<OrderDisplay> => {
        try {
            const createdOrder = await $fetch<OrderDisplay>('/api/order', {
                method: 'PUT',
                body: orderData,
                headers: {'Content-Type': 'application/json'}
            })
            console.info(CTX, `Created order ${createdOrder.id}`)
            await refreshOrders()
            return createdOrder
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

    const initBookingsStore = (dinnerEventId?: number, inhabitantId?: number) => {
        console.info(CTX, 'initBookingsStore', {dinnerEventId, inhabitantId})
        if (dinnerEventId) {
            loadOrdersForDinner(dinnerEventId)
        } else if (inhabitantId) {
            loadOrdersForInhabitant(inhabitantId)
        }
    }

    // ========================================
    // DINNER EVENT ACTIONS
    // ========================================

    /**
     * Fetch dinner event detail with tickets/orders
     * Used by chef/dinner pages for component-local data
     */
    const fetchDinnerEventDetail = async (dinnerEventId: number): Promise<DinnerEventDetail | null> => {
        try {
            return await $fetch<DinnerEventDetail>(`/api/admin/dinner-event/${dinnerEventId}`)
        } catch (e: unknown) {
            handleApiError(e, 'Kunne ikke hente fællesspisning')
            throw e
        }
    }

    // Allergen update state (mutation operation - ADR-007)
    const allergenUpdateParams = ref<{dinnerEventId: number, allergenIds: number[]} | null>(null)
    const {
        status: allergenUpdateStatus,
        execute: executeAllergenUpdate
    } = useAsyncData(
        'bookings-store-update-allergens',
        async () => {
            if (!allergenUpdateParams.value) return null
            const {dinnerEventId, allergenIds} = allergenUpdateParams.value
            try {
                const updated = await $fetch<DinnerEventDetail>(`/api/chef/dinner/${dinnerEventId}/allergens`, {
                    method: 'POST',
                    body: {allergenIds},
                    headers: {'Content-Type': 'application/json'}
                })
                console.info(CTX, `Updated allergens for dinner event ${dinnerEventId} (${allergenIds.length} allergens)`)
                return updated
            } catch (e: unknown) {
                handleApiError(e, 'Kunne ikke gemme allergeninformation til menuen')
                throw e
            }
        },
        { immediate: false }
    )

    const isUpdatingAllergens = computed(() => allergenUpdateStatus.value === 'pending')

    const updateDinnerEventAllergens = async (dinnerEventId: number, allergenIds: number[]): Promise<void> => {
        allergenUpdateParams.value = {dinnerEventId, allergenIds}
        await executeAllergenUpdate()
    }

    // Dinner event field update state (mutation operation - ADR-007)
    const dinnerEventUpdateParams = ref<{dinnerEventId: number, updates: Partial<DinnerEventUpdate>} | null>(null)
    const {
        status: dinnerEventUpdateStatus,
        execute: executeDinnerEventUpdate
    } = useAsyncData(
        'bookings-store-update-dinner-event',
        async () => {
            if (!dinnerEventUpdateParams.value) return null
            const {dinnerEventId, updates} = dinnerEventUpdateParams.value
            try {
                const updated = await $fetch<DinnerEventDetail>(`/api/admin/dinner-event/${dinnerEventId}`, {
                    method: 'POST',
                    body: {id: dinnerEventId, ...updates},
                    headers: {'Content-Type': 'application/json'}
                })
                console.info(CTX, `Updated dinner event ${dinnerEventId}:`, Object.keys(updates).join(', '))
                return updated
            } catch (e: unknown) {
                handleApiError(e, 'Kunne ikke gemme ændringer til menuen')
                throw e
            }
        },
        { immediate: false }
    )

    const isUpdatingDinnerEvent = computed(() => dinnerEventUpdateStatus.value === 'pending')

    const updateDinnerEventField = async (dinnerEventId: number, updates: Partial<DinnerEventUpdate>): Promise<void> => {
        dinnerEventUpdateParams.value = {dinnerEventId, updates}
        await executeDinnerEventUpdate()
    }

    /**
     * Change dinner state via state transition endpoint (ADR-013)
     * Handles Heynabo event sync for ANNOUNCED/CANCELLED states
     */
    const changeDinnerState = async (dinnerEventId: number, targetState: typeof DinnerState[keyof typeof DinnerState]): Promise<DinnerEventDetail> => {
        try {
            const updated = await $fetch<DinnerEventDetail>(`/api/chef/dinner/${dinnerEventId}/${targetState}`, {
                method: 'POST'
            })
            console.info(CTX, `Changed dinner event ${dinnerEventId} to state ${targetState}`)
            return updated
        } catch (e: unknown) {
            const errorMessages = {
                [DinnerState.ANNOUNCED]: 'Kunne ikke annoncere fællesspisningen',
                [DinnerState.CANCELLED]: 'Kunne ikke aflyse fællesspisningen'
            } as const
            handleApiError(e, errorMessages[targetState as keyof typeof errorMessages] || 'Kunne ikke ændre fællesspisningens status')
            throw e
        }
    }

    // Convenience wrappers for common state transitions
    const announceDinner = (dinnerEventId: number) => changeDinnerState(dinnerEventId, DinnerState.ANNOUNCED)
    const cancelDinner = (dinnerEventId: number) => changeDinnerState(dinnerEventId, DinnerState.CANCELLED)

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
            console.info(CTX, `Daily maintenance completed: Consumed: ${r.consume.consumed}, Closed: ${r.close.closed}, Transactions: ${r.transact.created}`)
            toast.add({
                title: 'Daglig vedligeholdelse afsluttet',
                description: `Middage: ${r.consume.consumed}, Ordrer lukket: ${r.close.closed}, Transaktioner: ${r.transact.created}`,
                color: 'success'
            })
        }
    }

    // ========================================
    // MONTHLY BILLING JOB (ADR-007)
    // ========================================

    const {MonthlyBillingResponseSchema, BillingPeriodSummaryDisplaySchema, BillingPeriodSummaryDetailSchema} = useBillingValidation()

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

    const runMonthlyBilling = async () => {
        await executeMonthlyBilling()

        if (hasMonthlyBillingError.value) {
            handleApiError(monthlyBillingError.value, 'Månedlig fakturering fejlede')
        } else if (hasMonthlyBillingResult.value) {
            const r = monthlyBillingResult.value!.result
            console.info(CTX, `Monthly billing completed: Invoices: ${r.invoiceCount}, Transactions: ${r.transactionCount}`)
            toast.add({
                title: 'Månedlig fakturering afsluttet',
                description: `Fakturaer: ${r.invoiceCount}, Transaktioner: ${r.transactionCount}`,
                color: 'success'
            })
        }
    }

    // ========================================
    // BILLING PERIODS (ADR-007)
    // ========================================

    const {
        data: billingPeriods, status: billingPeriodsStatus,
        error: billingPeriodsError, refresh: refreshBillingPeriods
    } = useFetch<BillingPeriodSummaryDisplay[]>(
        '/api/admin/billing/periods',
        {
            key: 'bookings-store-billing-periods',
            default: () => [],
            transform: (data: unknown[]) => {
                return (data as Record<string, unknown>[]).map(p => BillingPeriodSummaryDisplaySchema.parse(p))
            }
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
            transform: (data: unknown) => data ? BillingPeriodSummaryDetailSchema.parse(data) : null
        }
    )

    const isBillingPeriodDetailLoading = computed(() => selectedBillingPeriodStatus.value === 'pending')

    const loadBillingPeriodDetail = (periodId: number) => {
        selectedBillingPeriodId.value = periodId
        console.info(CTX, `Loading billing period detail: ${periodId}`)
    }

    return {
        // state
        orders,
        selectedDinnerEventId,
        selectedInhabitantId,

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

        // dinner event state
        isUpdatingAllergens,
        isUpdatingDinnerEvent,

        // actions
        loadOrdersForDinner,
        loadOrdersForInhabitant,
        loadAllOrders,
        createOrder,
        deleteOrder,
        updateOrder,
        initBookingsStore,

        // dinner event actions
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
