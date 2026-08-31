// @vitest-environment nuxt
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, computed, effectScope, nextTick, type EffectScope } from 'vue'
import { useEntityFormManager } from '~/composables/useEntityFormManager'
import { FORM_MODES } from '~/types/form'

// Mock navigateTo and useRoute (Nuxt auto-imports)
// Note: In Nuxt test environment, these need proper app context to work
// Navigation behavior is fully tested in E2E tests
const mockNavigateTo = vi.fn()
vi.stubGlobal('navigateTo', mockNavigateTo)

const mockRoute = {
  path: '/admin/planning',
  query: {},
  hash: ''
}

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute
}))

// Mock entity types for testing
interface TestEntity {
  id?: number
  name: string
  value: number
}

describe('useEntityFormManager', () => {
  const defaultEntity: TestEntity = { name: 'Default', value: 0 }
  const existingEntity: TestEntity = { id: 1, name: 'Existing', value: 42 }

  let selectedEntity: ReturnType<typeof ref<TestEntity | null>>
  let getDefaultEntity: () => TestEntity
  // Scope composable watchers so they're cleaned up after each test
  let scope: EffectScope

  beforeEach(() => {
    vi.clearAllMocks()
    selectedEntity = ref<TestEntity | null>(existingEntity)
    getDefaultEntity = vi.fn(() => ({ ...defaultEntity }))
    scope = effectScope()
  })

  afterEach(() => {
    scope.stop()
  })

  // Helper: run useEntityFormManager inside the effect scope so watchers are cleaned up
  const createFormManager = (overrides?: { selectedEntity?: ReturnType<typeof computed<TestEntity | null>> }) => {
    return scope.run(() => useEntityFormManager({
      getDefaultEntity,
      selectedEntity: overrides?.selectedEntity ?? computed(() => selectedEntity.value)
    }))!
  }

  describe('Form Mode State Management', () => {
    it('should initialize with VIEW mode', () => {
      const { formMode } = createFormManager()
      expect(formMode.value).toBe(FORM_MODES.VIEW)
    })

    it('should change to CREATE mode and set draft to default entity', async () => {
      const { formMode, currentModel, onModeChange } = createFormManager()

      await onModeChange(FORM_MODES.CREATE)

      expect(formMode.value).toBe(FORM_MODES.CREATE)
      expect(currentModel.value).toEqual(defaultEntity)
      expect(getDefaultEntity).toHaveBeenCalled()
    })

    it('should change to EDIT mode and copy selected entity to draft', async () => {
      const { formMode, currentModel, onModeChange } = createFormManager()

      await onModeChange(FORM_MODES.EDIT)

      expect(formMode.value).toBe(FORM_MODES.EDIT)
      expect(currentModel.value).toEqual(existingEntity)
      // Verify it's a copy, not the same reference
      expect(currentModel.value).not.toBe(existingEntity)
    })

    it('should change to VIEW mode and clear draft entity', async () => {
      const { formMode, currentModel, onModeChange } = createFormManager()

      // First go to CREATE mode
      await onModeChange(FORM_MODES.CREATE)
      expect(currentModel.value).toEqual(defaultEntity)

      // Then go to VIEW mode
      await onModeChange(FORM_MODES.VIEW)

      expect(formMode.value).toBe(FORM_MODES.VIEW)
      expect(currentModel.value).toEqual(existingEntity) // Back to selected entity
    })
  })

  describe('Draft Entity State Transitions', () => {
    it('should handle null selected entity in EDIT mode', async () => {
      selectedEntity.value = null

      const { currentModel, onModeChange } = createFormManager()

      await onModeChange(FORM_MODES.EDIT)

      expect(currentModel.value).toBeNull()
    })

    it('should maintain draft changes when switching between CREATE and VIEW modes', async () => {
      const { currentModel, onModeChange } = createFormManager()

      // Create mode
      await onModeChange(FORM_MODES.CREATE)

      // Modify draft
      currentModel.value = { name: 'Modified', value: 99 }

      // Switch to VIEW
      await onModeChange(FORM_MODES.VIEW)
      expect(currentModel.value).toEqual(existingEntity)

      // Switch back to CREATE - should get fresh default, not modified draft
      await onModeChange(FORM_MODES.CREATE)
      expect(currentModel.value).toEqual(defaultEntity)
    })

    it('should create independent copy in EDIT mode to prevent mutation of selected entity', async () => {
      const { currentModel, onModeChange } = createFormManager()

      await onModeChange(FORM_MODES.EDIT)

      // Modify the draft
      if (currentModel.value) {
        currentModel.value.name = 'Modified in Draft'
      }

      // Selected entity should remain unchanged
      expect(selectedEntity.value?.name).toBe('Existing')
    })
  })

  describe('currentModel Computed Property', () => {
    it('should return selected entity when in VIEW mode', () => {
      const { currentModel } = createFormManager()

      expect(currentModel.value).toEqual(existingEntity)
      expect(currentModel.value).toBe(selectedEntity.value)
    })

    it('should return draft entity when in CREATE mode', async () => {
      const { currentModel, onModeChange } = createFormManager()

      await onModeChange(FORM_MODES.CREATE)

      expect(currentModel.value).toEqual(defaultEntity)
      expect(currentModel.value).not.toBe(selectedEntity.value)
    })

    it('should return draft entity when in EDIT mode', async () => {
      const { currentModel, onModeChange } = createFormManager()

      await onModeChange(FORM_MODES.EDIT)

      expect(currentModel.value).toEqual(existingEntity)
      expect(currentModel.value).not.toBe(selectedEntity.value) // Copy, not reference
    })

    it('should allow setting draft entity value', async () => {
      const { currentModel, onModeChange } = createFormManager()

      await onModeChange(FORM_MODES.CREATE)

      const newEntity: TestEntity = { name: 'New', value: 123 }
      currentModel.value = newEntity

      expect(currentModel.value).toEqual(newEntity)
    })
  })

  // Note: URL navigation behavior is tested in E2E tests
  // The navigateTo function requires full Nuxt app context to work properly

  describe('Edge Cases', () => {
    it('should handle selectedEntity changing while in VIEW mode', () => {
      const { currentModel } = createFormManager()

      expect(currentModel.value).toEqual(existingEntity)

      // Change selected entity
      const newEntity: TestEntity = { id: 2, name: 'New Selected', value: 777 }
      selectedEntity.value = newEntity

      // currentModel should reflect the new selected entity
      expect(currentModel.value).toEqual(newEntity)
    })

    it('should not affect draft when selectedEntity changes in EDIT mode', async () => {
      const { currentModel, onModeChange } = createFormManager()

      await onModeChange(FORM_MODES.EDIT)
      const draftCopy = { ...currentModel.value! }

      // Change selected entity
      selectedEntity.value = { id: 2, name: 'New Selected', value: 777 }

      // Draft should remain the same (it's a copy from when we entered EDIT mode)
      expect(currentModel.value).toEqual(draftCopy)
    })
  })
  describe('Direct formMode set (FormModeSelector v-model path)', () => {
    // FormModeSelector writes formMode via v-model without calling onModeChange.
    // The composable must apply the same draft side effects (regression: #62 removed
    // the fullPath page-key remount that masked the missing draft init).
    it.each([
      [FORM_MODES.EDIT, () => existingEntity],
      [FORM_MODES.CREATE, () => defaultEntity]
    ])('should initialize draft when formMode is set directly to %s', async (mode, expected) => {
      const { formMode, currentModel } = createFormManager()

      formMode.value = mode
      await nextTick()

      expect(currentModel.value).toEqual(expected())
    })

    it('should clear draft when formMode is set directly back to VIEW', async () => {
      const { formMode, currentModel } = createFormManager()

      formMode.value = FORM_MODES.EDIT
      await nextTick()
      currentModel.value = { name: 'Dirty', value: 7 }

      formMode.value = FORM_MODES.VIEW
      await nextTick()

      expect(currentModel.value).toEqual(existingEntity)

      formMode.value = FORM_MODES.EDIT
      await nextTick()
      expect(currentModel.value).toEqual(existingEntity) // fresh copy, not dirty draft
    })

    it('should not mutate selected entity when editing draft after direct EDIT set', async () => {
      const { formMode, currentModel } = createFormManager()

      formMode.value = FORM_MODES.EDIT
      await nextTick()

      currentModel.value = { ...(currentModel.value as TestEntity), name: 'Changed' }
      expect(selectedEntity.value).toEqual(existingEntity)
    })
  })

})