<script setup lang="ts">
import type {DinnerEventDetail} from '~/composables/useBookingValidation'
import {ROLE_LABELS, type TeamRole} from '~/composables/useCookingTeamValidation'
import {useCookingTeam} from '~/composables/useCookingTeam'

type RoleAssignmentMode = 'volunteer' | 'resign' | 'swap'

interface Props {
    dinnerEvent: DinnerEventDetail
    role: TeamRole
    mode: RoleAssignmentMode
}

interface Emits {
    submit: [{ours: number, theirs?: number[]}]
    resign: []
    cancel: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const {ICONS, BUTTONS, TYPOGRAPHY, LAYOUTS} = useTheSlopeDesignSystem()
const {getTeamShortName} = useCookingTeam()
const planStore = usePlanStore()

const formattedDate = computed(() => formatDate(props.dinnerEvent.date))
const teamShortName = computed(() =>
    props.dinnerEvent.cookingTeam ? getTeamShortName(props.dinnerEvent.cookingTeam.name) : null
)
const roleLabel = computed(() => ROLE_LABELS[props.role].toLowerCase())

const isSwap = computed(() => props.mode === 'swap')
const commitTrailingIcon = computed(() => isSwap.value ? ICONS.claim : ICONS.plusCircle)
const commitLabel = computed(() => isSwap.value
    ? `Ja tak, jeg overtager ${roleLabel.value}-tjansen`
    : `Ja tak, jeg bliver ${roleLabel.value}`)

const handleSubmit = () => {
    emit('submit', {
        ours: props.dinnerEvent.id,
        theirs: isSwap.value ? [] : undefined
    })
}
</script>

<template>
    <UCard color="primary" variant="soft">
        <template #header>
            <div class="flex items-center gap-2">
                <UIcon :name="ICONS.chef" />
                <h4 :class="TYPOGRAPHY.cardTitle">
                    <template v-if="mode === 'volunteer'">Fællesspisning søger {{ roleLabel }}!</template>
                    <template v-else-if="mode === 'resign'">Meld afbud som {{ roleLabel }}</template>
                    <template v-else>Byt tjans med {{ dinnerEvent.chef?.name }} for middagen {{ formattedDate }}</template>
                </h4>
            </div>
        </template>

        <p :class="TYPOGRAPHY.bodyTextMuted">
            <template v-if="mode === 'volunteer'">
                Du tager {{ roleLabel }}-tjansen for fællesspisning den {{ formattedDate }}<template v-if="teamShortName">, sammen med {{ teamShortName }}</template>.
            </template>
            <template v-else-if="mode === 'resign'">
                Du melder afbud som {{ roleLabel }}. Tjansen bliver ledig igen, og din menu slettes.
            </template>
            <template v-else>
                Bytte tjanser funktionalitet kommer senere.
            </template>
        </p>

        <template #footer>
            <div :class="LAYOUTS.formButtonRow">
                <UButton
                    v-bind="BUTTONS.cancel"
                    data-testid="role-assignment-cancel"
                    @click="emit('cancel')"
                >
                    Annuller
                </UButton>
                <DangerButton
                    v-if="mode === 'resign'"
                    label="Meld afbud"
                    confirm-label="Tryk igen for at melde afbud"
                    :loading="planStore.isRoleUpdating"
                    data-testid="role-assignment-resign"
                    @confirm="emit('resign')"
                />
                <UButton
                    v-else
                    v-bind="BUTTONS.save"
                    :icon="ICONS.chef"
                    :trailing-icon="commitTrailingIcon"
                    :loading="planStore.isRoleUpdating"
                    :disabled="isSwap"
                    data-testid="role-assignment-save"
                    @click="handleSubmit"
                >
                    {{ commitLabel }}
                </UButton>
            </div>
        </template>
    </UCard>
</template>
