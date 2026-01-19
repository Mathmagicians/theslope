<script setup lang="ts">
/**
 * ControlBadge - Control sum verification badge
 *
 * Shows robot happy (✓) when computed === expected, robot dead (✗) otherwise.
 * Used in economy views to verify billing/transaction sums match.
 */

interface Props {
    /** Computed sum (Σ transaction amounts) */
    computed: number
    /** Expected sum (stored total or invoice amount) */
    expected: number
    /** Show the amount value (default: true) */
    showAmount?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    showAmount: true
})

const {formatPrice} = useTicket()
const {ICONS, SIZES} = useTheSlopeDesignSystem()

const isValid = computed(() => props.computed === props.expected)
</script>

<template>
  <UBadge v-if="isValid" color="success" variant="subtle" :size="SIZES.small">
    <UIcon :name="ICONS.robotHappy" :class="SIZES.smallBadgeIcon"/>
    <span v-if="showAmount">{{ formatPrice(computed) }} kr</span>
  </UBadge>
  <UBadge v-else color="error" variant="subtle" :size="SIZES.small">
    <UIcon :name="ICONS.robotDead" :class="SIZES.smallBadgeIcon"/>
    <span v-if="showAmount">{{ formatPrice(computed) }} kr ≠ {{ formatPrice(expected) }} kr</span>
  </UBadge>
</template>
