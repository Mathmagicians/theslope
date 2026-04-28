<script setup lang="ts">
/**
 * RoleAssignment — generic per-role assignment component
 *
 * Mounted next to a portrait. Three render branches based on `currentHolder`
 * vs the logged-in user's inhabitantId:
 *
 *   Vacant (currentHolder == null)
 *     → portrait slot + trigger UButton ("Bliv {role}", chef-hat + plus-circle)
 *     → click trigger → inline panel expands below with claim form (Phase 2 content)
 *
 *   Self (currentHolder.id === me)
 *     → portrait slot only. No button. No panel. (You already hold this role.)
 *
 *   Other (currentHolder.id !== me)
 *     → portrait slot + trigger UButton ("Byt", chef-hat + swap-arrows)
 *     → click trigger → SAME inline panel expands below with swap form (Phase 3 content)
 *
 * Single panel-expansion pattern in both interactive branches → DRY by construction:
 * cook / junior swaps in the next iteration use the same component, no changes.
 *
 * DangerButton inside the panel uses its existing 2-phase confirm — no API extension.
 *
 * Compliance:
 *  - ADR-001: types/enums imported from validation composables
 *  - ADR-007: store-mediated API call (planStore.assignRoleToDinner)
 *  - ADR-010: domain types throughout
 */
import type {DinnerEventDetail} from '~/composables/useBookingValidation'
import type {InhabitantDisplay} from '~/composables/useCoreValidation'
import {ROLE_LABELS, type TeamRole} from '~/composables/useCookingTeamValidation'

interface Props {
    dinnerEvent: DinnerEventDetail
    role: TeamRole
    currentHolder?: InhabitantDisplay | null
}

const props = withDefaults(defineProps<Props>(), {
    currentHolder: null
})

const emit = defineEmits<{
    'role-assigned': []
}>()

const {ICONS, SIZES, COMPONENTS} = useTheSlopeDesignSystem()
const planStore = usePlanStore()
const authStore = useAuthStore()

// ========== Identity ==========
const currentUserInhabitantId = computed(() => authStore.user?.Inhabitant?.id ?? null)

const branch = computed<'vacant' | 'self' | 'other'>(() => {
    if (!props.currentHolder) return 'vacant'
    if (currentUserInhabitantId.value !== null && props.currentHolder.id === currentUserInhabitantId.value) return 'self'
    return 'other'
})

// ========== Trigger button labels & icons ==========
const triggerLabel = computed(() => {
    if (branch.value === 'vacant') return `Bliv ${ROLE_LABELS[props.role].toLowerCase()}`
    if (branch.value === 'other') return 'Byt'
    return ''
})

// Use design-system Heroicons-style icon path for the button's :icon prop.
// `ROLE_ICONS` are emoji strings (used as text content elsewhere, not as :icon).
// For chef this iteration we use ICONS.chef. When cook/junior mounts come,
// add equivalent role-specific Heroicons to the design system or use a slot.
const triggerLeadingIcon = ICONS.chef
const triggerTrailingIcon = computed(() =>
    branch.value === 'vacant' ? ICONS.plusCircle : ICONS.claim
)

// ========== Panel state ==========
const isPanelOpen = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const isSubmitting = ref(false)

const openPanel = () => {
    if (branch.value === 'self') return
    isPanelOpen.value = true
}

const closePanel = () => {
    isPanelOpen.value = false
}

// ========== Click-outside handler ==========
const handleClickOutside = (event: MouseEvent) => {
    if (!isPanelOpen.value) return
    if (rootRef.value && !rootRef.value.contains(event.target as Node)) {
        closePanel()
    }
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
})

// ========== Vacant claim flow (Phase 2) ==========
const handleClaim = async () => {
    if (currentUserInhabitantId.value === null) return
    isSubmitting.value = true
    try {
        // assignRoleToDinner uses the dinner event id in the URL — the endpoint
        // looks up the dinner's cookingTeamId server-side and writes both
        // DinnerEvent.chefId and the CookingTeamAssignment in one call.
        await planStore.assignRoleToDinner(
            props.dinnerEvent.id,
            currentUserInhabitantId.value,
            props.role
        )
        emit('role-assigned')
        closePanel()
    } finally {
        isSubmitting.value = false
    }
}

// ========== Phase 3 placeholder (other-chef swap) ==========
// The "other" panel content lands in Phase 3. For now, the panel just shows
// the trigger row was reached — a Fortryd lets the user back out cleanly.
</script>

<template>
    <div ref="rootRef" class="role-assignment">
        <div class="flex items-center justify-between gap-3">
            <slot />
            <UButton
                v-if="branch !== 'self'"
                :icon="triggerLeadingIcon"
                :trailing-icon="triggerTrailingIcon"
                :size="SIZES.standard"
                color="neutral"
                variant="outline"
                data-testid="role-assignment-trigger"
                @click="openPanel"
            >
                {{ triggerLabel }}
            </UButton>
        </div>

        <Transition name="role-assignment-panel">
            <div
                v-if="isPanelOpen"
                :class="`p-4 md:p-6 mt-3 ${COMPONENTS?.heroPanel?.light?.container ?? 'bg-neutral-50 dark:bg-neutral-900'} rounded-md space-y-4`"
                data-testid="role-assignment-panel"
            >
                <!-- Vacant content (Phase 2) -->
                <template v-if="branch === 'vacant'">
                    <div class="text-base font-medium">
                        {{ `Bliv ${ROLE_LABELS[role].toLowerCase()}?` }}
                    </div>
                    <p class="text-sm text-neutral-600 dark:text-neutral-300">
                        Du tager {{ ROLE_LABELS[role].toLowerCase() }}-tjansen for denne middag.
                    </p>
                    <div class="flex items-center justify-between gap-2">
                        <DangerButton
                            :label="`Bliv ${ROLE_LABELS[role].toLowerCase()}`"
                            :confirm-label="`Tryk igen for at bekræfte ${ROLE_LABELS[role].toLowerCase()}-tjansen`"
                            :loading="isSubmitting"
                            :icon="triggerLeadingIcon"
                            initial-color="primary"
                            @confirm="handleClaim"
                        />
                        <UButton
                            color="neutral"
                            variant="ghost"
                            :size="SIZES.standard"
                            data-testid="role-assignment-fortryd"
                            @click="closePanel"
                        >
                            Fortryd
                        </UButton>
                    </div>
                </template>

                <!-- Other-chef swap content (Phase 3 will fill in checkboxes, menu radios, etc.) -->
                <template v-else>
                    <div class="text-base font-medium">
                        Byt med {{ currentHolder?.name }}
                    </div>
                    <p class="text-sm text-neutral-600 dark:text-neutral-300">
                        Swap-flow kommer i næste fase.
                    </p>
                    <div class="flex justify-end">
                        <UButton
                            color="neutral"
                            variant="ghost"
                            :size="SIZES.standard"
                            data-testid="role-assignment-fortryd"
                            @click="closePanel"
                        >
                            Fortryd
                        </UButton>
                    </div>
                </template>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.role-assignment-panel-enter-active,
.role-assignment-panel-leave-active {
    transition: opacity 150ms ease, transform 150ms ease;
}

.role-assignment-panel-enter-from,
.role-assignment-panel-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}
</style>
