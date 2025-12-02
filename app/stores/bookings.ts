import type {OrderDisplay, OrderCreate, DinnerEventDetail, DinnerEventUpdate} from '~/composables/useBookingValidation'

export const useBookingsStore = defineStore("Bookings", () => {
    // DEPENDENCIES
    const {handleApiError} = useApiHandler()
    const {OrderDisplaySchema, DinnerStateSchema} = useBookingValidation()
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
            return $fetch(`/api/order${queryString ? `?${queryString}` : ''}`)
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
            byType[order.ticketType] = (byType[order.ticketType] || 0) + 1
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
                [DinnerState.ANNOUNCED]: 'Kunne ikke annoncere menuen til beboerne',
                [DinnerState.CANCELLED]: 'Kunne ikke aflyse fællesspisningen'
            } as const
            handleApiError(e, errorMessages[targetState as keyof typeof errorMessages] || 'Kunne ikke ændre fællesspisningens status')
            throw e
        }
    }

    // Convenience wrappers for common state transitions
    const announceDinner = (dinnerEventId: number) => changeDinnerState(dinnerEventId, DinnerState.ANNOUNCED)
    const cancelDinner = (dinnerEventId: number) => changeDinnerState(dinnerEventId, DinnerState.CANCELLED)

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
        cancelDinner
    }
})