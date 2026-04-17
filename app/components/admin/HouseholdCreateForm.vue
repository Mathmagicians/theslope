<script setup lang="ts">
/**
 * HouseholdCreateForm - Inline create form for households at existing Heynabo addresses.
 *
 * Addresses are Heynabo-owned: the USelect only offers addresses that already exist,
 * so heynaboId + name are inherited from the selected prevOwner. Renders an empty state
 * when no addresses exist (e.g. before first Heynabo sync).
 */
import type {FormSubmitEvent, Form} from '@nuxt/ui'
import type {HouseholdDisplay, HouseholdCreateFormData} from '~/composables/useCoreValidation'

interface Props {
    existingHouseholds: HouseholdDisplay[]
}

const props = defineProps<Props>()

interface CreatePayload {
    pbsId: number
    address: string
    movedInDate: Date
    heynaboId: number
    name: string
    // Move-out dates to apply to existing prevOwners whose date changed or was null.
    prevOwnerMoveOutUpdates: {id: number, moveOutDate: Date}[]
}

const emit = defineEmits<{
    create: [payload: CreatePayload]
    cancel: []
}>()

const {BUTTONS, SIZES, COLOR, ICONS, COMPONENTS, TYPOGRAPHY} = useTheSlopeDesignSystem()
const {HouseholdCreateFormSchema} = useCoreValidation()

const formRef = useTemplateRef<Form<HouseholdCreateFormData>>('formRef')

// movedInDate uses `undefined` (not null) to align with UForm's Partial<schema> state type
const formState = reactive<{
    pbsId: number | undefined
    address: string
    movedInDate: Date | undefined
}>({
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
            label: `${address} · HN ${h.heynaboId}`,
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
    getResidencyStatus(s.movedInDate, s.moveOutDate ?? null) === 'moved-out'

// Admin overrides per prevOwner. Falls back to original moveOutDate or new movedInDate.
const prevOwnerDates = reactive<Record<number, Date | null>>({})

const effectiveDate = (s: HouseholdDisplay): Date | null =>
    s.id in prevOwnerDates ? prevOwnerDates[s.id]! : (s.moveOutDate ?? formState.movedInDate ?? null)

const prevOwnerConstraints = computed<Date[]>(() =>
    prevOwners.value.flatMap(s => {
        const d = effectiveDate(s)
        return d ? [d] : []
    })
)

const formSchema = computed(() => HouseholdCreateFormSchema(prevOwnerConstraints.value))

const validateForm = (state: Partial<HouseholdCreateFormData>) => {
    if (state.pbsId === undefined) return []
    const conflict = props.existingHouseholds.find(h => h.pbsId === state.pbsId)
    return conflict
        ? [{name: 'pbsId', message: `PBS ${conflict.pbsId} bruges af ${conflict.shortName}`}]
        : []
}

const handleSubmit = async (event: FormSubmitEvent<HouseholdCreateFormData>) => {
    const {pbsId, address, movedInDate} = event.data
    // Invariant: address came from USelect populated from props.existingHouseholds
    const prevOwner = props.existingHouseholds.find(h => h.address?.trim() === address.trim())!

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
            name: prevOwner.name,
            prevOwnerMoveOutUpdates
        })
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
        :color="COLOR.neutral"
        variant="soft"
        :avatar="{text: '🏠', size: SIZES.emptyStateAvatar}"
        :ui="COMPONENTS.emptyStateAlert"
    >
        <template #title>I mangler nogen huse at bo i, admin skal synkronisere først med Heynabo</template>
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
            variant="soft"
            :ui="{body: 'p-4 flex flex-col gap-4', footer: 'p-4'}"
        >
            <template #header>
                <div class="flex items-center gap-2">
                    <UIcon :name="ICONS.plusCircle" class="size-5 text-info" />
                    <h4 class="text-md font-semibold">Ny husstand</h4>
                </div>
            </template>

            <!-- Adresse -->
            <UFormField label="Adresse" name="address" required :size="SIZES.standard">
                <USelectMenu
                    v-model="formState.address"
                    :items="addressOptions"
                    value-key="value"
                    name="address"
                    placeholder="Vælg adresse..."
                    class="w-full"
                    :size="SIZES.standard"
                    data-testid="create-household-address"
                />
            </UFormField>

            <!-- New household: PBS + move-in date (primary focus, above prevOwners) -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UFormField label="PBS" name="pbsId" required :size="SIZES.standard">
                    <UInput
                        v-model.number="formState.pbsId"
                        name="pbsId"
                        type="number"
                        placeholder="F.eks. 12345"
                        :size="SIZES.standard"
                        data-testid="create-household-pbs"
                    />
                </UFormField>

                <UFormField label="Vælg en indflytningsdato" name="movedInDate" required>
                    <CalendarDatePicker
                        :model-value="formState.movedInDate ?? null"
                        name="movedInDate"
                        label=""
                        @update:model-value="(d) => { formState.movedInDate = d ?? undefined }"
                    />
                </UFormField>
            </div>

            <!-- Existing households at the same address (secondary, below new) -->
            <section v-if="prevOwners.length" class="flex flex-col gap-4 pt-2 border-t border-info-200">
                <h5 :class="TYPOGRAPHY.sectionSubheading">
                    {{ prevOwners.length === 1 ? 'Eksisterende husstand' : 'Eksisterende husstande' }} på adressen
                </h5>
                <div v-for="prevOwner in prevOwners" :key="prevOwner.id" class="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 md:items-center">
                    <span :class="TYPOGRAPHY.bodyTextMedium">
                        {{ prevOwner.shortName }} &middot; HN {{ prevOwner.heynaboId }} &middot; PBS {{ prevOwner.pbsId }}
                    </span>
                    <span v-if="isImmutable(prevOwner)" :class="TYPOGRAPHY.bodyTextMuted">
                        Fraflyttede {{ formatDate(prevOwner.moveOutDate!) }}
                    </span>
                    <UFormField v-else :label="`Sæt fraflytningsdato for ${prevOwner.shortName} · PBS ${prevOwner.pbsId}`" :size="SIZES.standard">
                        <CalendarDatePicker
                            :model-value="effectiveDate(prevOwner)"
                            :name="`prevOwner-moveout-${prevOwner.id}`"
                            label=""
                            @update:model-value="(d) => prevOwnerDates[prevOwner.id] = d"
                        />
                    </UFormField>
                </div>
            </section>

            <!-- Footer: action buttons -->
            <template #footer>
                <div class="flex flex-col-reverse md:flex-row md:justify-end gap-2">
                    <UButton
                        v-bind="BUTTONS.cancel"
                        :size="SIZES.standard"
                        data-testid="create-household-cancel"
                        @click="handleCancel"
                    >
                        Annuller
                    </UButton>
                    <UButton
                        v-bind="BUTTONS.save"
                        :size="SIZES.standard"
                        :loading="isSaving"
                        data-testid="create-household-submit"
                        @click="formRef?.submit()"
                    >
                        <template #leading>
                            <UIcon :name="ICONS.plusCircle" />
                        </template>
                        Opret husstand
                    </UButton>
                </div>
            </template>
        </UCard>
    </UForm>
</template>
