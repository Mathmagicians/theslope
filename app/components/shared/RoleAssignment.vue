<script setup lang="ts">
import type {DinnerEventDetail} from '~/composables/useBookingValidation'
import {ROLE_LABELS, type TeamRole} from '~/composables/useCookingTeamValidation'

interface Props {
    dinnerEvent: DinnerEventDetail
    role: TeamRole
}

interface Emits {
    'role-assigned': []
    'role-removed': []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const {ICONS, SIZES, COMPONENTS} = useTheSlopeDesignSystem()
const heroPrimary = COMPONENTS.heroPanel.light.primaryButton
const planStore = usePlanStore()
const authStore = useAuthStore()
const {isDinnerPast} = useSeason()

// volunteer: no chef. resign: I am the chef. swap: someone else is chef.
const mode = computed<'volunteer' | 'resign' | 'swap'>(() => {
    const chefId = props.dinnerEvent.chef?.id
    if (chefId == null) return 'volunteer'
    if (chefId === authStore.inhabitantId) return 'resign'
    return 'swap'
})

// Binary trigger: volunteer when vacant, change otherwise. Panel sub-branches by mode.
const triggerLabel = computed(() =>
    mode.value === 'volunteer'
        ? `Bliv ${ROLE_LABELS[props.role].toLowerCase()}`
        : 'Rediger chefkokketjans'
)

const isActionable = computed(() => !isDinnerPast(props.dinnerEvent.date))

const isOpen = ref(false)
watch(() => props.dinnerEvent.id, () => { isOpen.value = false })

const handleSubmit = async ({theirs}: {ours: number, theirs?: number[]}) => {
    if (theirs !== undefined) return  // swap path lands in next iteration
    const result = await planStore.claimRoleForMe(props.dinnerEvent, props.role)
    if (result === null) return
    isOpen.value = false
    emit('role-assigned')
}

const handleResign = async () => {
    const result = await planStore.resignRoleForMe(props.dinnerEvent, props.role)
    if (result === null) return
    isOpen.value = false
    emit('role-removed')
}

defineExpose({open: () => { if (isActionable.value) isOpen.value = true }})
</script>

<template>
    <div v-if="isActionable" class="role-assignment">
        <UButton
            :icon="ICONS.chef"
            :trailing-icon="ICONS.chevronDown"
            :size="SIZES.standard"
            :color="heroPrimary"
            variant="outline"
            :ui="{trailingIcon: isOpen ? 'rotate-180 transition-transform duration-200' : 'transition-transform duration-200'}"
            data-testid="role-assignment-trigger"
            @click="isOpen = !isOpen"
        >
            {{ triggerLabel }}
        </UButton>

        <UCollapsible v-model:open="isOpen" class="mt-3">
            <template #content>
                <RoleAssignmentForm
                    :dinner-event="dinnerEvent"
                    :role="role"
                    :mode="mode"
                    @submit="handleSubmit"
                    @resign="handleResign"
                    @cancel="isOpen = false"
                />
            </template>
        </UCollapsible>
    </div>
</template>
