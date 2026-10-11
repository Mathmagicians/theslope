<script setup lang="ts">
/**
 * VatAmount - one amount in both units: the ex moms figure in the row's weight, the inkl. moms half in fine print.
 *
 *   1.425 / 1.781 kr              <- gross 178100 øre
 *   +115 / +143 kr (check icon)   <- balance: its sign, red with the exclamation icon below zero
 *
 * The stored figure is gross; the ex moms half is derived with the kitchen's VAT rate.
 */
const props = withDefaults(defineProps<{
  gross: number
  balance?: boolean
}>(), {
  balance: false
})

const {COMPONENTS, ICONS} = useTheSlopeDesignSystem()
const {formatPrice} = useTicket()
const {convertVat} = useOrder()
const appConfig = useAppConfig()
const vatPercent = appConfig.theslope?.kitchen?.vatPercent ?? 25

const exVat = computed(() => convertVat(props.gross, vatPercent, true))
const negative = computed(() => props.balance && props.gross < 0)
const sign = computed(() => props.balance ? (props.gross < 0 ? '-' : '+') : '')
const figure = (ore: number) => `${sign.value}${formatPrice(Math.abs(ore))}`
</script>

<template>
  <span :class="[COMPONENTS.vatAmount.root, negative ? COMPONENTS.vatAmount.over : '']" data-testid="vat-amount">
    <span data-testid="vat-amount-ex">{{ figure(exVat) }}</span>
    <span :class="COMPONENTS.vatAmount.incl" data-testid="vat-amount-incl">/ {{ figure(gross) }} kr</span>
    <UIcon
      v-if="balance"
      :name="negative ? ICONS.exclamationCircle : ICONS.check"
      :class="[COMPONENTS.vatAmount.icon, negative ? COMPONENTS.vatAmount.iconOver : COMPONENTS.vatAmount.iconOk]"
      :data-testid="negative ? 'vat-amount-over' : 'vat-amount-ok'"
    />
  </span>
</template>
