<!--
HouseholdListItem - a household's inhabitants
  compact: the faces (three before the overflow count) beside the name badges; the badges wrap, and from md they
           drop under the faces when the cell is narrow
  card:    the address, then one line per inhabitant

Visual check: /admin/households at 375px and desktop, a household with many inhabitants: the faces, then the name
badges wrapping inside the Beboere cell; the page does not scroll sideways.
-->
<script setup lang="ts">
import type {HouseholdDisplay} from '~/composables/useCoreValidation'

interface Props {
    household: HouseholdDisplay
    compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    compact: false
})

const {COLOR, TEXT, BG, SIZES, NOISE, ICONS, COMPONENTS, TYPOGRAPHY} = useTheSlopeDesignSystem()

const hasInhabitants = computed(() => props.household.inhabitants?.length > 0)
</script>

<template>
    <div v-if="compact" :class="COMPONENTS.householdListItem.compact">
        <UAvatarGroup :size="COMPONENTS.avatar.compact.size" :ui="{base: COMPONENTS.avatar.compact.fit}" :max="COMPONENTS.avatar.listItemMax">
            <UTooltip v-for="inhabitant in household.inhabitants" :key="inhabitant.id" :text="inhabitant.name">
                <UAvatar
                    :src="inhabitant.pictureUrl ?? undefined"
                    :alt="inhabitant.name"
                    :icon="ICONS.user"
                />
            </UTooltip>
        </UAvatarGroup>

        <div :class="COMPONENTS.householdListItem.names">
            <UBadge
                v-for="inhabitant in household.inhabitants"
                :key="inhabitant.id"
                :size="SIZES.md"
                :variant="NOISE.subtle"
                :color="COLOR.secondary"
            >
                {{ inhabitant.name }}
            </UBadge>
        </div>
    </div>

    <UCard v-else>
        <template #header>
            <h3 :class="TYPOGRAPHY.cardTitle">
                {{ household.address }}
            </h3>
        </template>

        <div v-if="hasInhabitants" :class="COMPONENTS.householdListItem.inhabitants">
            <div
                v-for="inhabitant in household.inhabitants"
                :key="inhabitant.id"
                :class="[COMPONENTS.householdListItem.inhabitant, BG.panelHover]"
            >
                <UIcon :name="ICONS.user" :class="TEXT.gray[400]" />
                <span>{{ inhabitant.name }}</span>
            </div>
        </div>

        <div v-else :class="[TEXT.muted, COMPONENTS.householdListItem.empty]">
            No inhabitants
        </div>
    </UCard>
</template>
