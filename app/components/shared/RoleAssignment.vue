<script setup lang="ts">
import type {DinnerEventDetail} from '~/composables/useBookingValidation'
import type {InhabitantDisplay} from '~/composables/useCoreValidation'
import {ROLE_LABELS, type TeamRole} from '~/composables/useCookingTeamValidation'

interface Props {
    dinnerEvent: DinnerEventDetail
    role: TeamRole
    swapWith?: InhabitantDisplay
}

interface Emits {
    'role-assigned': []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const {ICONS, SIZES, COMPONENTS} = useTheSlopeDesignSystem()
const heroPrimary = COMPONENTS.heroPanel.light.primaryButton
const planStore = usePlanStore()
const {isDinnerPast} = useSeason()

const triggerLabel = computed(() =>
    props.swapWith ? 'Byt' : `Bliv ${ROLE_LABELS[props.role].toLowerCase()}`
)

const isVolunteerable = computed(() => !isDinnerPast(props.dinnerEvent.date))

const isOpen = ref(false)

watch(() => props.dinnerEvent.id, () => { isOpen.value = false })

const handleSubmit = async ({theirs}: {ours: number, theirs?: number[]}) => {
    if (theirs !== undefined) return  // swap path lands in next iteration
    const result = await planStore.claimRoleForMe(props.dinnerEvent, props.role)
    if (result === null) return
    isOpen.value = false
    emit('role-assigned')
}

defineExpose({open: () => { if (isVolunteerable.value) isOpen.value = true }})
</script>

<template>
    <div v-if="isVolunteerable" class="role-assignment">
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
                    :swap-with="swapWith"
                    @submit="handleSubmit"
                    @cancel="isOpen = false"
                />
            </template>
        </UCollapsible>
    </div>
</template>
