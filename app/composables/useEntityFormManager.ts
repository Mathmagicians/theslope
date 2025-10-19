import { ref, computed, onMounted, watch, type ComputedRef } from 'vue'
import { useRoute } from 'vue-router'
import { FORM_MODES, type FormMode } from '~/types/form'

/**
 * Generic form manager for entity CRUD operations
 * Handles form mode state, draft entity logic, and URL synchronization
 *
 * @template T - Entity type
 * @param options.getDefaultEntity - Function that returns a new default entity
 * @param options.selectedEntity - Computed ref to currently selected entity
 * @returns Form management utilities
 *
 * @example
 * const { formMode, currentModel, onModeChange } = useEntityFormManager({
 *   getDefaultEntity: () => ({ name: '', value: 0 }),
 *   selectedEntity: computed(() => store.selectedSeason)
 * })
 */
export function useEntityFormManager<T>(options: {
  getDefaultEntity: () => T
  selectedEntity: ComputedRef<T | null>
}) {
  const route = useRoute()

  // Initialize form mode from URL synchronously (SSR-safe, like parent page's activeTab)
  const getInitialMode = (): FormMode => {
    const modeFromQuery = route.query.mode as string | undefined
    if (modeFromQuery && Object.values(FORM_MODES).includes(modeFromQuery as FormMode)) {
      return modeFromQuery as FormMode
    }
    return FORM_MODES.VIEW
  }

  // UI state - form mode and draft entity
  const formMode = ref<FormMode>(getInitialMode())
  const draftEntity = ref<T | null>(null)

  /**
   * Current model - returns selected entity in VIEW mode, draft in CREATE/EDIT mode
   * Writable to allow form binding
   */
  const currentModel = computed({
    get: () => {
      if (formMode.value === FORM_MODES.VIEW) {
        return options.selectedEntity.value
      }
      return draftEntity.value
    },
    set: (value: T | null) => {
      draftEntity.value = value
    }
  })

  /**
   * Update URL query parameter to reflect current form mode
   * Uses navigateTo (Nuxt-native) instead of router.replace (vue-router)
   */
  const updateURLQueryFromMode = async (mode: FormMode) => {
    await navigateTo(
      {
        path: route.path,
        query: { ...route.query, mode }
      },
      { replace: true }
    )
  }

  /**
   * Handle form mode transitions
   * - CREATE: Initialize draft with default entity
   * - EDIT: Copy selected entity to draft
   * - VIEW: Clear draft, show selected entity
   */
  const onModeChange = async (mode: FormMode) => {
    switch (mode) {
      case FORM_MODES.CREATE:
        draftEntity.value = options.getDefaultEntity()
        break
      case FORM_MODES.EDIT:
        // Create independent copy to prevent mutation of selected entity
        // Handle arrays specially - object spread on arrays creates objects, not arrays
        if (!options.selectedEntity.value) {
          draftEntity.value = null
        } else if (Array.isArray(options.selectedEntity.value)) {
          draftEntity.value = [...options.selectedEntity.value] as T
        } else {
          draftEntity.value = { ...options.selectedEntity.value }
        }
        break
      case FORM_MODES.VIEW:
        draftEntity.value = null
        break
    }

    formMode.value = mode
    await updateURLQueryFromMode(mode)
  }

  /**
   * Initialize draft entity on mount based on initial mode
   * Mode is already set synchronously, but draft needs data from store (client-side only)
   */
  onMounted(() => {
    // Trigger side effects for initial mode (populate draftEntity if needed)
    if (formMode.value === FORM_MODES.CREATE) {
      draftEntity.value = options.getDefaultEntity()
    } else if (formMode.value === FORM_MODES.EDIT) {
      if (options.selectedEntity.value) {
        if (Array.isArray(options.selectedEntity.value)) {
          draftEntity.value = [...options.selectedEntity.value] as T
        } else {
          draftEntity.value = { ...options.selectedEntity.value }
        }
      }
    }
  })

  /**
   * Watch for formMode changes and update URL
   * This handles cases where formMode is updated via v-model without calling onModeChange
   */
  watch(formMode, async (newMode) => {
    if (route.query.mode !== newMode) {
      await updateURLQueryFromMode(newMode)
    }
  })

  /**
   * Watch for selectedEntity becoming available when in EDIT mode
   * Fixes race condition when navigating directly to ?mode=edit before store data loads
   * Only populates if draftEntity is still null (don't overwrite user edits)
   */
  watch(() => options.selectedEntity.value, (newEntity) => {
    if (formMode.value === FORM_MODES.EDIT && newEntity && !draftEntity.value) {
      if (Array.isArray(newEntity)) {
        draftEntity.value = [...newEntity] as T
      } else {
        draftEntity.value = { ...newEntity }
      }
    }
  })

  return {
    formMode,
    currentModel,
    onModeChange
  }
}