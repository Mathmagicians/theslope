<!--
Allergy notes - ONE box on two surfaces: the catalog card footer (/admin/allergies) and
the poster (/admin/allergies/pdf). The text arrives as a prop, one note per line.

┌ footer ──────────────────────────────────────────┐
│ ⚠ Vigtige bemærkninger                           │
│  • Glutenfri boller findes i fryseren …          │
│  • Ved mælkeprodukter i brød …                   │
│  • Husk at give besked …                         │
└──────────────────────────────────────────────────┘

View face only. The pencil and the in-place UTextarea edit face arrive with the settings
package, when the text moves from the registry default into the `Setting` table.
No UTooltip - the poster page renders without a layout, so there is no UApp.
Margins belong to the mount point, not to this box.
-->
<script setup lang="ts">
const props = defineProps<{
  /** One note per line */
  notes: string
}>()

const {ALERTS, ICONS, TYPOGRAPHY} = useTheSlopeDesignSystem()
const {splitNotes} = useSetting()

const items = computed(() => splitNotes(props.notes))
</script>

<template>
  <UAlert
      v-if="items.length"
      v-bind="ALERTS.legend"
      :icon="ICONS.warning"
      data-testid="allergy-notes"
  >
    <template #description>
      <p :class="`${TYPOGRAPHY.sectionSubheading} mb-2`">Vigtige bemærkninger:</p>
      <ul :class="`list-disc list-inside space-y-1 ${TYPOGRAPHY.bodyTextSmall}`">
        <li v-for="note in items" :key="note" data-testid="allergy-notes-item">{{ note }}</li>
      </ul>
    </template>
  </UAlert>
</template>
