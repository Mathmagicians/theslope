<script setup lang="ts">
/**
 * HouseholdCreateForm - Inline create form for households at existing Heynabo addresses.
 *
 * Addresses are Heynabo-owned: the USelect only offers addresses that already exist,
 * so heynaboId + name are inherited from the selected prevOwner. Renders an empty state
 * when no addresses exist (e.g. before first Heynabo sync).
 *
 * Visual check: /admin/households, the create form with an address that has households and with one that has none,
 * and the empty state, phone and desktop.
 */
import type {FormSubmitEvent, Form} from '@nuxt/ui'
import type {HouseholdDisplay, HouseholdCreateFormData, HouseholdCreate, HouseholdMoveOut} from '~/composables/useCoreValidation'
import {BUTTON_WORDS} from '~/config/buttonWords'
import {HOUSEHOLD_WORDS} from '~/config/householdWords'

interface Props {
    existingHouseholds: HouseholdDisplay[]
}

const props = defineProps<Props>()

// The create carries the move-outs of the prevOwners whose date changed or was null
const emit = defineEmits<{
    create: [household: HouseholdCreate, prevOwnerMoveOutUpdates: HouseholdMoveOut[]]
    cancel: []
}>()

const {BUTTONS, SIZES, COLOR, ICONS, ALERTS, TYPOGRAPHY, LAYOUTS, COMPONENTS} = useTheSlopeDesignSystem()
const {HouseholdCreateFormSchema} = useCoreValidation()
const now = useClock()
const WORDS = HOUSEHOLD_WORDS.createForm

const formRef = useTemplateRef<Form<HouseholdCreateFormData>>('formRef')

// pbsId and movedInDate start undefined (not null) to align with UForm's Partial<schema> state type
type CreateFormState = Omit<HouseholdCreateFormData, 'pbsId' | 'movedInDate'> & Partial<HouseholdCreateFormData>
const formState = reactive<CreateFormState>({
    pbsId: undefined,
    address: '',
    movedInDate: undefined
})

const isSaving = ref(false)

interface AddressOption {
    label: string     // e.g. "Skråningen 14 · HN 42"
    value: string     // address string (v-model key)
    heynaboId: number
}

const addressOptions = computed<AddressOption[]>(() => {
    const seen = new Map<string, AddressOption>()
    for (const h of props.existingHouseholds) {
        const address = h.address?.trim()
        if (!address || seen.has(address)) continue
        seen.set(address, {
            label: WORDS.addressOption(address, h.heynaboId),
            value: address,
            heynaboId: h.heynaboId
        })
    }
    return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label))
})

const prevOwners = computed((): HouseholdDisplay[] => {
    const trimmed = formState.address.trim().toLowerCase()
    if (!trimmed) return []
    return props.existingHouseholds.filter(h => h.address?.trim().toLowerCase() === trimmed)
})

const isImmutable = (s: HouseholdDisplay) =>
    getResidencyStatus(s.movedInDate, s.moveOutDate ?? null, now.value) === ResidencyStatus['moved-out']

// Admin overrides per prevOwner, a cleared date included. Falls back to original moveOutDate or new movedInDate.
const prevOwnerDates = reactive(new Map<number, Date | null>())

const effectiveDate = (s: HouseholdDisplay): Date | null =>
    prevOwnerDates.has(s.id) ? prevOwnerDates.get(s.id) ?? null : (s.moveOutDate ?? formState.movedInDate ?? null)

// A household that has moved out shows its date; one still living there gets a move-out field
const prevOwnerRows = computed(() => prevOwners.value.map(owner => ({
    owner,
    movedOutOn: isImmutable(owner) ? owner.moveOutDate ?? null : null
})))

const prevOwnerConstraints = computed<Date[]>(() =>
    prevOwners.value.flatMap(s => {
        const d = effectiveDate(s)
        return d ? [d] : []
    })
)

const formSchema = computed(() => HouseholdCreateFormSchema(prevOwnerConstraints.value))

// The form state carries the schema's input: pbsId arrives as `unknown` until coercion
const validateForm = (state: {pbsId?: unknown}) => {
    if (typeof state.pbsId !== 'number') return []
    const conflict = props.existingHouseholds.find(h => h.pbsId === state.pbsId)
    return conflict
        ? [{name: 'pbsId', message: WORDS.pbsTaken(conflict.pbsId, conflict.shortName)}]
        : []
}

const handleSubmit = async (event: FormSubmitEvent<HouseholdCreateFormData>) => {
    const {pbsId, address, movedInDate} = event.data
    // The address select offers only the addresses of props.existingHouseholds
    const prevOwner = props.existingHouseholds.find(h => h.address?.trim() === address.trim())
    if (!prevOwner) throw new Error(`No household at ${address}`)

    const prevOwnerMoveOutUpdates = prevOwners.value.flatMap(s => {
        if (isImmutable(s)) return []
        const current = effectiveDate(s) ?? movedInDate
        if (s.moveOutDate?.getTime() === current.getTime()) return []
        return [{id: s.id, moveOutDate: current}]
    })

    isSaving.value = true
    try {
        emit('create', {
            pbsId,
            address: address.trim(),
            movedInDate,
            heynaboId: prevOwner.heynaboId,
            name: prevOwner.name
        }, prevOwnerMoveOutUpdates)
    } finally {
        isSaving.value = false
    }
}

const handleCancel = () => emit('cancel')
</script>

<template>
    <!-- Empty state: no Heynabo addresses yet (first-run / not synced) -->
    <UAlert
        v-if="addressOptions.length === 0"
        v-bind="ALERTS.emptyState"
        :avatar="{text: '🏠', size: SIZES.emptyStateAvatar}"
    >
        <template #title>{{ WORDS.noAddresses }}</template>
    </UAlert>

    <UForm
        v-else
        ref="formRef"
        :state="formState"
        :schema="formSchema"
        :validate="validateForm"
        @submit="handleSubmit"
    >
        <UCard
            :color="COLOR.info"
            v-bind="COMPONENTS.addCard.card"
        >
            <template #header>
                <div :class="COMPONENTS.addCard.header">
                    <UIcon :name="ICONS.plusCircle" :class="COMPONENTS.addCard.headerIcon" />
                    <h4 :class="COMPONENTS.addCard.title">{{ WORDS.title }}</h4>
                </div>
            </template>

            <UFormField :label="WORDS.address.label" name="address" required :size="SIZES.standard">
                <USelectMenu
                    v-model="formState.address"
                    :items="addressOptions"
                    value-key="value"
                    name="address"
                    :placeholder="WORDS.address.placeholder"
                    :class="COMPONENTS.addCard.select"
                    :size="SIZES.standard"
                    data-testid="create-household-address"
                />
            </UFormField>

            <!-- New household: PBS + move-in date (primary focus, above prevOwners) -->
            <div :class="LAYOUTS.gridTwoCol">
                <UFormField :label="WORDS.pbs.label" name="pbsId" required :size="SIZES.standard">
                    <UInput
                        v-model.number="formState.pbsId"
                        name="pbsId"
                        type="number"
                        :placeholder="WORDS.pbs.placeholder"
                        :size="SIZES.standard"
                        data-testid="create-household-pbs"
                    />
                </UFormField>

                <UFormField :label="WORDS.movedIn" name="movedInDate" required>
                    <CalendarDatePicker
                        :model-value="formState.movedInDate ?? null"
                        name="movedInDate"
                        label=""
                        @update:model-value="(d) => { formState.movedInDate = d ?? undefined }"
                    />
                </UFormField>
            </div>

            <!-- Existing households at the same address (secondary, below new) -->
            <section v-if="prevOwners.length" :class="[COMPONENTS.householdCreateForm.prevOwners, LAYOUTS.sectionDivider]">
                <h5 :class="TYPOGRAPHY.sectionSubheading">{{ WORDS.prevOwners(prevOwners.length) }}</h5>
                <div v-for="{owner: prevOwner, movedOutOn} in prevOwnerRows" :key="prevOwner.id" :class="COMPONENTS.householdCreateForm.prevOwner">
                    <span :class="TYPOGRAPHY.bodyTextMedium">
                        {{ WORDS.prevOwner(prevOwner.shortName, prevOwner.heynaboId, prevOwner.pbsId) }}
                    </span>
                    <span v-if="movedOutOn" :class="TYPOGRAPHY.bodyTextMuted">
                        {{ WORDS.movedOut(formatDate(movedOutOn)) }}
                    </span>
                    <UFormField v-else :label="WORDS.setMoveOut(prevOwner.shortName, prevOwner.pbsId)" :size="SIZES.standard">
                        <CalendarDatePicker
                            :model-value="effectiveDate(prevOwner)"
                            :name="`prevOwner-moveout-${prevOwner.id}`"
                            label=""
                            @update:model-value="(d) => prevOwnerDates.set(prevOwner.id, d)"
                        />
                    </UFormField>
                </div>
            </section>

            <template #footer>
                <div :class="LAYOUTS.formButtonRow">
                    <UButton
                        v-bind="BUTTONS.cancel"
                        data-testid="create-household-cancel"
                        @click="handleCancel"
                    >
                        {{ BUTTON_WORDS.cancel }}
                    </UButton>
                    <UButton
                        v-bind="BUTTONS.save"
                        :loading="isSaving"
                        data-testid="create-household-submit"
                        @click="formRef?.submit()"
                    >
                        <template #leading>
                            <UIcon :name="ICONS.plusCircle" />
                        </template>
                        {{ WORDS.submit }}
                    </UButton>
                </div>
            </template>
        </UCard>
    </UForm>
</template>
