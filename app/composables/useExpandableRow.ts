import { ref, watch } from 'vue'

/**
 * useExpandableRow - Single-row expansion state for TanStack Table (UTable), keyed by the row id UTable's `getRowId`
 * gives: a row keeps its open state when rows come in above it
 *
 * Enforces that only one row can be expanded at a time.
 * Used with UTable's v-model:expanded binding.
 *
 * @param options.onExpand - Called when a row is expanded, receives the row's id
 * @param options.onCollapse - Called when all rows are collapsed
 *
 * @example
 * ```ts
 * const { expanded, expandedRowId } = useExpandableRow({
 *   onExpand: (rowId) => {
 *     const entity = tableData.value.find(row => row.id === rowId)
 *     draftState.value = entity?.someField ?? null
 *   },
 *   onCollapse: () => {
 *     draftState.value = null
 *   }
 * })
 *
 * // In template:
 * <UTable v-model:expanded="expanded" :get-row-id="row => String(row.id)" ... />
 * ```
 */
export const useExpandableRow = (options?: {
  onExpand?: (rowId: string) => void
  onCollapse?: () => void
}) => {
  const expanded = ref<Record<string, boolean>>({})
  const expandedRowId = ref<string | null>(null)

  watch(expanded, (newExpanded, oldExpanded) => {
    const expandedKeys = Object.keys(newExpanded).filter(key => newExpanded[key])

    if (expandedKeys.length > 1) {
      // More than one row expanded - close all except the most recently opened
      const newlyExpandedKey = expandedKeys.find(key => !oldExpanded[key])
      if (newlyExpandedKey) {
        Object.keys(expanded.value).forEach(key => {
          if (key !== newlyExpandedKey) {
            expanded.value[key] = false
          }
        })
        expandedRowId.value = newlyExpandedKey
        options?.onExpand?.(newlyExpandedKey)
      }
    } else if (expandedKeys.length === 1) {
      const rowId = expandedKeys[0]!
      if (expandedRowId.value !== rowId) {
        expandedRowId.value = rowId
        options?.onExpand?.(rowId)
      }
    } else if (expandedRowId.value !== null) {
      expandedRowId.value = null
      options?.onCollapse?.()
    }
  })

  return {
    expanded,
    expandedRowId
  }
}
