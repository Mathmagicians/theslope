import { ref, watch } from 'vue'

/**
 * useExpandableRow - Single-row expansion state for TanStack Table (UTable)
 *
 * Enforces that only one row can be expanded at a time.
 * Used with UTable's v-model:expanded binding.
 *
 * @param options.onExpand - Called when a row is expanded, receives row index
 * @param options.onCollapse - Called when all rows are collapsed
 *
 * @example
 * ```ts
 * const { expanded, expandedRowIndex } = useExpandableRow({
 *   onExpand: (rowIndex) => {
 *     const entity = tableData.value[rowIndex]
 *     draftState.value = entity.someField
 *   },
 *   onCollapse: () => {
 *     draftState.value = null
 *   }
 * })
 *
 * // In template:
 * <UTable v-model:expanded="expanded" ... />
 * ```
 */
export const useExpandableRow = (options?: {
  onExpand?: (rowIndex: number) => void
  onCollapse?: () => void
}) => {
  const expanded = ref<Record<number, boolean>>({})
  const expandedRowIndex = ref<number | null>(null)

  watch(expanded, (newExpanded, oldExpanded) => {
    const expandedKeys = Object.keys(newExpanded).filter(key => newExpanded[Number(key)])

    if (expandedKeys.length > 1) {
      // More than one row expanded - close all except the most recently opened
      const newlyExpandedKey = expandedKeys.find(key => !oldExpanded[Number(key)])
      if (newlyExpandedKey) {
        Object.keys(expanded.value).forEach(key => {
          if (key !== newlyExpandedKey) {
            expanded.value[Number(key)] = false
          }
        })
        expandedRowIndex.value = Number(newlyExpandedKey)
        options?.onExpand?.(Number(newlyExpandedKey))
      }
    } else if (expandedKeys.length === 1) {
      // Exactly one row expanded
      const rowIndex = Number(expandedKeys[0])
      if (expandedRowIndex.value !== rowIndex) {
        expandedRowIndex.value = rowIndex
        options?.onExpand?.(rowIndex)
      }
    } else {
      // No rows expanded
      if (expandedRowIndex.value !== null) {
        expandedRowIndex.value = null
        options?.onCollapse?.()
      }
    }
  })

  return {
    expanded,
    expandedRowIndex
  }
}
