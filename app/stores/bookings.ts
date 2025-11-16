import {type OrderDisplay, type OrderCreate} from '~/composables/useBookingValidation'

export const useBookingsStore = defineStore("Bookings", () => {
    // DEPENDENCIES
    const {handleApiError} = useApiHandler()
    const {OrderDisplaySchema} = useBookingValidation()

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
            transform: (data: any[]) => {
                try {
                    return data.map(order => OrderDisplaySchema.parse(order))
                } catch (e) {
                    console.error('🎟️ > BOOKINGS_STORE > Error parsing orders:', e)
                    console.error('🎟️ > BOOKINGS_STORE > Raw data:', data)
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
        console.info(`🎟️ > BOOKINGS_STORE > Loading orders for dinner event: ${dinnerEventId}`)
    }

    const loadOrdersForInhabitant = (inhabitantId: number) => {
        selectedInhabitantId.value = inhabitantId
        selectedDinnerEventId.value = null
        console.info(`🎟️ > BOOKINGS_STORE > Loading orders for inhabitant: ${inhabitantId}`)
    }

    const loadAllOrders = () => {
        selectedDinnerEventId.value = null
        selectedInhabitantId.value = null
        console.info(`🎟️ > BOOKINGS_STORE > Loading all orders`)
    }

    const createOrder = async (orderData: OrderCreate): Promise<OrderDisplay> => {
        try {
            const createdOrder = await $fetch<OrderDisplay>('/api/order', {
                method: 'PUT',
                body: orderData,
                headers: {'Content-Type': 'application/json'}
            })
            console.info(`🎟️ > BOOKINGS_STORE > Created order ${createdOrder.id}`)
            await refreshOrders()
            return createdOrder
        } catch (e: any) {
            handleApiError(e, 'createOrder')
            throw e
        }
    }

    const deleteOrder = async (orderId: number): Promise<void> => {
        try {
            await $fetch(`/api/order/${orderId}`, {
                method: 'DELETE'
            })
            console.info(`🎟️ > BOOKINGS_STORE > Deleted order ${orderId}`)
            await refreshOrders()
        } catch (e: any) {
            handleApiError(e, 'deleteOrder')
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
            console.info(`🎟️ > BOOKINGS_STORE > Updated order ${orderId}`)
            await refreshOrders()
            return updatedOrder
        } catch (e: any) {
            handleApiError(e, 'updateOrder')
            throw e
        }
    }

    const initBookingsStore = (dinnerEventId?: number, inhabitantId?: number) => {
        console.info('🎟️ > BOOKINGS_STORE > initBookingsStore', {dinnerEventId, inhabitantId})
        if (dinnerEventId) {
            loadOrdersForDinner(dinnerEventId)
        } else if (inhabitantId) {
            loadOrdersForInhabitant(inhabitantId)
        }
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

        // actions
        loadOrdersForDinner,
        loadOrdersForInhabitant,
        loadAllOrders,
        createOrder,
        deleteOrder,
        updateOrder,
        initBookingsStore
    }
})