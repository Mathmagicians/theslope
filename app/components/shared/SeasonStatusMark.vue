<script setup lang="ts">
/**
 * SeasonStatusMark - a season's status as a small disc beside its name
 *
 *   (green)  active        (yellow)  in progress, not activated
 *   (white, sprout)  upcoming        (grey)  ended
 *
 * The discs are SEASON_STATUS_GLYPHS; the selector and the season status display render this mark
 */
import type {SeasonStatusValue} from '~/utils/season'

const props = defineProps<{status: SeasonStatusValue}>()
const {COMPONENTS, SEASON_STATUS_GLYPHS} = useTheSlopeDesignSystem()
const glyph = computed(() => SEASON_STATUS_GLYPHS[props.status])
</script>

<template>
  <span :class="[COMPONENTS.seasonStatus.disc, glyph.disc]" data-testid="season-status-mark" :data-status="status">
    <UIcon v-if="glyph.icon" :name="glyph.icon" :class="[COMPONENTS.seasonStatus.discIcon, glyph.iconClass]" />
  </span>
</template>
