<script setup lang="ts">
/**
 * DinnerTicket - Compact ticket stub display (VIEW ONLY)
 *
 * Edit controls are in the expanded row (DinnerBookingForm)
 *
 * Row 1 is three slots of fixed width, so every card in a table aligns:
 *
 *           special            type                        how you eat
 * ┃  [  ][  ][  ]  [VOKSEN · 55kr]                [mode] Spisesal   ░░[tk]░░┃  normal
 * ┃  [rl][  ][  ]  [VOKSEN · 55kr]                [mode] Ingen      ░░[tk]░░┃  released        rl red, edge red
 * ┃  [cl][  ][al]  [VOKSEN · 55kr]                [mode] Spisesal   ░░[tk]░░┃  claimed, allergic   cl violet, al amber
 * ┃                fra Hansen                                        ░░░░░░░░┃
 * ┃  [cl][gu][al]  [BARN · 35kr · 2 Gæster]       [mode] Spisesal   ░░[tk]░░┃  claimed guest, allergic   gu + al green
 * ┃  [wl][  ][  ]  [VOKSEN · 55kr]                (mode) Spisesal   ░░[tk]░░┃  queued   wl toned, edge neutral, (mode) the wish ghosted
 * ┃  [  ][  ][  ]  [BARN · 17kr]                  [remove]          ░░[tk]░░┃  a season's ticket price (TicketPriceListEditor)
 * ┃                Under 12 år · Barn                                ░░░░░░░░┃
 *
 * special = ticket.special: three ticket.cell (state | guest | allergy), an empty cell keeps its width
 *   [rl] ICONS.released, [cl] ICONS.claim, [wl] ICONS.waitlist at ticket.stateIcon[state]
 *   [gu] ICONS.userPlus, [al] ICONS.allergy at ticket.infoIcon[ticketConfig.color]
 * type = the badge (ticket.badge) in the ticket type's colour
 * how you eat = ticket.modeSlot: DinnerModeSelector in view mode, right-aligned; a queued ticket shows the wished mode as
 *   its ghost (COMPONENTS.waitlist)
 *   or the caller's control through the end slot (a ticket price's remove button)
 * row 2 = ticket.subRow, starting under the badge: the household a claimed ticket came from, or a ticket price's note
 * [tk] = ICONS.ticketSolid at ticket.watermarkIcon
 *
 * Two hues per card: the state colour paints the edge (ticket.face[state]) and the state glyph, the type colour
 * paints the badge and the guest and allergy glyphs. A queued ticket's edge takes the waiting list's neutral
 * (ORDER_STATE_COLORS.queued); its hourglass takes the toned ink
 * Mode labels: Spisesal | Sen | Takeaway | Ingen
 */
import type {DinnerMode} from '~/composables/useBookingValidation'
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'
import type {TicketPresentation} from '~/composables/useBookingUi'
import type {NuxtUIColor, TicketTypeColor} from '~/composables/useTheSlopeDesignSystem'

interface Props {
  ticketConfig: TicketPresentation | null
  price: number
  dinnerMode?: DinnerMode
  isReleased?: boolean
  isClaimed?: boolean
  guestCount?: number // undefined = not guest, 1+ = guest ticket(s)
  ticketCount?: number // DEBUG: total orders for inhabitant (shown if > 1)
  consensus?: boolean // Power mode: true=all agree, false=mixed, undefined=not power mode
  allergies?: AllergyTypeDisplay[] // The eater's allergy types; the card shows the glyph only
  provenanceHousehold?: string // Source household if claimed
  isQueued?: boolean // On the waiting list: dinnerMode is the wish, not a booking
  note?: string // A ticket price: its age limit and description
}

const props = withDefaults(defineProps<Props>(), {
  dinnerMode: undefined,
  isReleased: false,
  isClaimed: false,
  guestCount: undefined,
  ticketCount: undefined,
  consensus: undefined,
  allergies: () => [],
  provenanceHousehold: undefined,
  isQueued: false,
  note: undefined
})

const isGuest = computed(() => props.guestCount !== undefined)

const {COMPONENTS, ICONS, SIZES, NOISE, getTicketState} = useTheSlopeDesignSystem()
const {formatPrice} = useTicket()
const ticket = COMPONENTS.ticket

const ticketState = computed(() => getTicketState(props.isReleased, props.isClaimed, props.isQueued))

const STATE_GLYPHS = {released: ICONS.released, claimed: ICONS.claim, queued: ICONS.waitlist} as const satisfies Record<keyof typeof ticket.stateIcon, string>
const stateGlyph = computed(() => {
  const state = ticketState.value
  return state === 'normal' ? null : {name: STATE_GLYPHS[state], class: ticket.stateIcon[state]}
})

const hasAllergies = computed(() => props.allergies.length > 0)

// The guest and allergy glyphs take the type badge's colour; power mode's badge colour has no info glyph
const isTicketTypeColor = (color: NuxtUIColor): color is TicketTypeColor => color in ticket.infoIcon
const infoIconClass = computed(() => {
  const color = props.ticketConfig?.color
  return color && isTicketTypeColor(color) ? ticket.infoIcon[color] : undefined
})

// Combined badge text: "VOKSEN · 55kr" or "BARN · 35kr · 2 Gæster" or "Powermode!" (no price for power mode)
// DEBUG: Shows "#3" if ticketCount > 1 (duplicate orders)
const badgeText = computed(() => {
  const parts = [props.ticketConfig?.label ?? '']
  if (props.consensus === undefined) parts.push(`${formatPrice(props.price)} kr`) // Only show price for regular tickets
  if (isGuest.value) {
    parts.push(props.guestCount === 1 ? 'Gæst' : `${props.guestCount} Gæster`)
  }
  if (props.ticketCount && props.ticketCount > 1) {
    parts.push(`#${props.ticketCount}`)
  }
  return parts.join(' · ')
})
</script>

<template>
  <div :class="ticket.face[ticketState]">
    <!-- Watermark - sized to look like the ticket border -->
    <div :class="ticket.watermark">
      <UIcon :name="ICONS.ticketSolid" :class="ticket.watermarkIcon" />
    </div>

    <!-- Ticket content -->
    <div :class="ticket.content">
      <!-- ROW 1: [special: state | guest | allergy] [type badge] ... [how you eat] -->
      <div :class="ticket.row">
        <div :class="ticket.special">
          <div :class="ticket.cell" data-testid="ticket-state-cell">
            <UIcon v-if="stateGlyph" :name="stateGlyph.name" :class="stateGlyph.class" />
          </div>
          <div :class="ticket.cell" data-testid="ticket-guest-cell">
            <UIcon v-if="isGuest" :name="ICONS.userPlus" :class="infoIconClass" />
          </div>
          <div :class="ticket.cell" data-testid="ticket-allergy-cell">
            <UIcon
              v-if="hasAllergies"
              :name="ICONS.allergy"
              :class="infoIconClass"
              data-testid="ticket-allergy-icon"
            />
          </div>
        </div>

        <!-- Combined badge: Type · Price · Gæst(er) -->
        <UBadge
          v-if="ticketConfig"
          :color="ticketConfig.color"
          :variant="NOISE.loud"
          :size="SIZES.small"
          :class="ticket.badge"
        >
          {{ badgeText }}
        </UBadge>

        <!-- How you eat: DinnerModeSelector in VIEW mode -->
        <div :class="ticket.modeSlot" data-testid="ticket-mode-slot">
          <slot name="end">
            <DinnerModeSelector
              v-if="dinnerMode"
              :model-value="dinnerMode"
              :consensus="consensus"
              :ghost="isQueued"
              show-label
            />
          </slot>
        </div>
      </div>

      <!-- ROW 2 (optional): provenance household or a ticket price's note, under the badge -->
      <div v-if="provenanceHousehold || note" :class="ticket.subRow">
        <span v-if="provenanceHousehold" :class="ticket.provenance">
          fra {{ provenanceHousehold }}
        </span>
        <span v-if="note" :class="ticket.note">{{ note }}</span>
      </div>
    </div>
  </div>
</template>
