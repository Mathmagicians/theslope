<!--
Allergy notes - ONE box on two surfaces: the catalog card header (/admin/allergies) and
the poster (/admin/allergies/pdf). The text arrives as a prop, one note per line; the
parent owns where it comes from and what happens on save.

┌ view face ───────────────────────────────────────┐
│ ⚠ Vigtige bemærkninger                     [✏️] │  ← pencil only when canEdit
│  • Glutenfri boller findes i fryseren …          │
│  • Ved mælkeprodukter i brød …                   │
│  • Husk at give besked …                         │
└──────────────────────────────────────────────────┘

┌ edit face (in place) ────────────────────────────┐
│ ⚠ Vigtige bemærkninger                           │
│ Én bemærkning per linje                          │
│ ┌ UTextarea rows=5 ────────────────────────────┐ │
│ └──────────────────────────────────────────────┘ │
│                            [✕ Annuller] [✓ Gem] │
└──────────────────────────────────────────────────┘

No UTooltip - the poster page renders without a layout, so there is no UApp.
Margins belong to the mount point, not to this box.
-->
<script setup lang="ts">
const props = withDefaults(defineProps<{
  /** One note per line */
  notes: string
  /** ADMIN or ALLERGYMANAGER - the pencil renders only for them */
  canEdit?: boolean
  /** The parent is writing the text; the editor stays open until it resolves */
  isSaving?: boolean
}>(), {
  canEdit: false,
  isSaving: false
})

const emit = defineEmits<{
  save: [notes: string]
}>()

const {ALERTS, ICONS, BUTTONS, LAYOUTS, TYPOGRAPHY} = useTheSlopeDesignSystem()
const {splitNotes} = useSettingValidation()

const items = computed(() => splitNotes(props.notes))

const isEditing = ref(false)
const draft = ref(props.notes)

// A save from elsewhere (another admin, a refetch) reaches an idle box only
watch(() => props.notes, notes => {
  if (!isEditing.value) draft.value = notes
})

// The parent reports its round trip; the editor closes when the write resolves
watch(() => props.isSaving, (saving, wasSaving) => {
  if (wasSaving && !saving) isEditing.value = false
})

const startEdit = () => {
  draft.value = props.notes
  isEditing.value = true
}

const cancelEdit = () => {
  draft.value = props.notes
  isEditing.value = false
}

const save = async () => {
  emit('save', draft.value.trim())
  await nextTick()
  // A parent that does not report saving has nothing to wait for
  if (!props.isSaving) isEditing.value = false
}
</script>

<template>
  <UAlert
      v-if="items.length || isEditing"
      v-bind="{...ALERTS.legend, ...ALERTS.withActions}"
      :icon="ICONS.warning"
      data-testid="allergy-notes"
  >
    <template #description>
      <p :class="`${TYPOGRAPHY.sectionSubheading} mb-2`">Vigtige bemærkninger:</p>

      <div v-if="isEditing">
        <UTextarea
            v-model="draft"
            :rows="5"
            class="w-full"
            data-testid="allergy-notes-textarea"
        />
        <p :class="`${TYPOGRAPHY.finePrint} mt-1`">Én bemærkning per linje</p>
        <div :class="[LAYOUTS.formButtonRow, 'mt-2']">
          <UButton
              v-bind="BUTTONS.cancel"
              data-testid="cancel-allergy-notes"
              @click="cancelEdit"
          >
            Annuller
          </UButton>
          <UButton
              v-bind="BUTTONS.save"
              :loading="props.isSaving"
              data-testid="save-allergy-notes"
              @click="save"
          >
            Gem
          </UButton>
        </div>
      </div>

      <ul v-else :class="`list-disc list-inside space-y-1 ${TYPOGRAPHY.bodyTextSmall}`">
        <!-- A note list is positional: the same sentence may appear twice, so the index is the key -->
        <li v-for="(note, index) in items" :key="index" data-testid="allergy-notes-item">{{ note }}</li>
      </ul>
    </template>

    <template v-if="props.canEdit && !isEditing" #actions>
      <UButton
          v-bind="BUTTONS.edit"
          aria-label="Rediger bemærkninger"
          data-testid="edit-allergy-notes"
          @click="startEdit"
      />
    </template>
  </UAlert>
</template>
