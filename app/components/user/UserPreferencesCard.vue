<!--
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ UserPreferencesCard - the member's own notification channels and appearance ("Mine indstillinger")    │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                      │
│ VIEW  (dashboard /login, under UserProfileCard)          EDIT  (after ✏️)                             │
│ ┌ Mine indstillinger                           [✏️] ┐    ┌ Mine indstillinger ───────────────────────┐ │
│ │ 🔔 Notifikationer  [📧 E-mail] [📱 SMS]          │    │ 🔔 Notifikationer                         │ │
│ │ 🎨 Farvevalg  Glade farver                       │    │    E-mail   anna@…            [———●] ON   │ │
│ │     [🇪🇺 EN 301 549 · Kontrast AA ✓]             │    │    SMS      +45 …             [●———] OFF  │ │
│ │ 🔤 Tekst           Normal                        │    │             (kræver telefonnummer …)      │ │
│ │                        [📨 Send testbesked]      │    │ 🎨 Farvevalg                              │ │
│ └──────────────────────────────────────────────────┘    │  (•) Glade farver                         │ │
│                                                         │      [🇪🇺 EN 301 549 · Kontrast AA ✓]      │ │
│   badges when a channel is on, "Ingen notifikationer"   │  ( ) Høj kontrast                         │ │
│   when none; Send testbesked disabled with no channel   │      [🇪🇺 EN 301 549 · Kontrast AAA ✓]     │ │
│                                                         │  ( ) Til farveblinde                      │ │
│   the contrast badge from PALETTES[key].level, the      │      [🇪🇺 EN 301 549 · Kontrast AA ✓]      │ │
│   👁 badge from PALETTES[key].colourSafe - in both      │      [👁 Nedsat farvesyn · Okabe–Ito ✓]   │ │
│   faces                                                 │ 🔤 Tekst    (•) Normal ( ) Stor ( ) Større │ │
│                                                         │                  [✕ Annuller]   [✓ Gem]   │ │
│                                                         └───────────────────────────────────────────┘ │
│                                                                                                      │
│ Phone width: the radios stack and the button row is LAYOUTS.formButtonRow (Annuller under Gem).       │
│                                                                                                      │
│ Used in:                                                                                             │
│ - Login.vue (dashboard, under UserProfileCard)                                                       │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
-->
<script setup lang="ts">
import {
  PALETTES,
  DEFAULT_APPEARANCE,
  useUserPreferenceValidation,
  type Appearance,
  type NotificationChannel,
  type Palette,
  type TextScale
} from '~/composables/useUserPreferenceValidation'

const authStore = useAuthStore()
const {TYPOGRAPHY, LAYOUTS, BUTTONS, COMPONENTS, ICONS, COLOR, SIZES} = useTheSlopeDesignSystem()
const {NotificationChannelSchema, PaletteSchema, TextScaleSchema} = useUserPreferenceValidation()

// Danish labels and the badge wording live here; the registry only knows what is verified (ADR-017)
const CHANNEL_LABELS: Record<NotificationChannel, {label: string, icon: string}> = {
  EMAIL: {label: 'E-mail', icon: ICONS.mail},
  SMS: {label: 'SMS', icon: ICONS.phone}
}
const PALETTE_LABELS: Record<Palette, string> = {
  default: 'Glade farver',
  'high-contrast': 'Høj kontrast',
  colorblind: 'Til farveblinde'
}
const TEXT_SCALE_LABELS: Record<TextScale, string> = {normal: 'Normal', large: 'Stor', larger: 'Større'}
// The contrast badge claims contrast only - not full conformance - and names no WCAG version
const LEVEL_BADGES: Record<'AA' | 'AAA', string> = {
  AA: '🇪🇺 EN 301 549 · Kontrast AA ✓',
  AAA: '🇪🇺 EN 301 549 · Kontrast AAA ✓'
}
const COLOUR_SAFE_BADGE = '👁 Nedsat farvesyn · Okabe–Ito ✓'

const channels = computed<NotificationChannel[]>(() => authStore.notificationChannels)
const appearance = computed<Appearance>(() => authStore.appearance)
const email = computed(() => authStore.user?.email ?? '')
const phone = computed(() => authStore.user?.phone ?? '')
const hasPhone = computed(() => phone.value.length > 0)

const isEditing = ref(false)
const isSaving = ref(false)
const isSendingTest = ref(false)
const draftChannels = ref<Set<NotificationChannel>>(new Set())
const draftAppearance = ref<Appearance>({...DEFAULT_APPEARANCE})

const paletteItems = computed(() => PaletteSchema.options.map(value => ({value, label: PALETTE_LABELS[value]})))
const textScaleItems = computed(() => TextScaleSchema.options.map(value => ({value, label: TEXT_SCALE_LABELS[value]})))

/** The badges a palette earns: its verified contrast level, and colour safety where it is verified */
const paletteBadges = (palette: Palette): string[] => {
  const {level, colourSafe} = PALETTES[palette]
  return [...(level ? [LEVEL_BADGES[level]] : []), ...(colourSafe ? [COLOUR_SAFE_BADGE] : [])]
}

/** SMS needs a number, and phone numbers come from Heynabo */
const isChannelAvailable = (channel: NotificationChannel) => channel !== 'SMS' || hasPhone.value
const channelTarget = (channel: NotificationChannel) => channel === 'SMS' ? phone.value : email.value

const startEditing = () => {
  draftChannels.value = new Set(channels.value)
  draftAppearance.value = {...appearance.value}
  isEditing.value = true
}

const cancelEditing = () => {
  isEditing.value = false
}

const toggleChannel = (channel: NotificationChannel, on: boolean) => {
  const next = new Set(draftChannels.value)
  if (on) next.add(channel)
  else next.delete(channel)
  draftChannels.value = next
}

const save = async () => {
  isSaving.value = true
  try {
    await authStore.savePreferences({
      notificationChannels: NotificationChannelSchema.options.filter(channel => draftChannels.value.has(channel)),
      appearance: draftAppearance.value
    })
    isEditing.value = false
  } catch {
    // The store reported it (toast + ADR-004 log); stay in edit so the draft is not lost
  } finally {
    isSaving.value = false
  }
}

const sendTest = async () => {
  isSendingTest.value = true
  try {
    await authStore.sendTestNotification()
  } catch {
    // The store reported it (toast + ADR-004 log)
  } finally {
    isSendingTest.value = false
  }
}
</script>

<template>
  <UCard v-if="authStore.user" data-testid="pref-card">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h3 :class="TYPOGRAPHY.cardTitle">Mine indstillinger</h3>
        <UButton
          v-if="!isEditing"
          v-bind="BUTTONS.edit"
          aria-label="Rediger"
          data-testid="pref-edit"
          @click="startEditing"
        />
      </div>
    </template>

    <!-- VIEW: what is saved right now -->
    <div v-if="!isEditing" class="space-y-3">
      <div class="flex items-start gap-2 flex-wrap">
        <UIcon :name="ICONS.notification" class="mt-1" />
        <span :class="TYPOGRAPHY.sectionSubheading">Notifikationer</span>
        <div class="flex items-center gap-2 flex-wrap">
          <UBadge
            v-for="channel in channels"
            :key="channel"
            :color="COLOR.primary"
            variant="subtle"
            :size="SIZES.small"
          >
            <UIcon :name="CHANNEL_LABELS[channel].icon" class="mr-1" />
            {{ CHANNEL_LABELS[channel].label }}
          </UBadge>
          <span v-if="channels.length === 0" :class="TYPOGRAPHY.bodyTextMuted">Ingen notifikationer</span>
        </div>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <UIcon :name="ICONS.palette" />
        <span :class="TYPOGRAPHY.sectionSubheading">Farvevalg</span>
        <span :class="TYPOGRAPHY.bodyText">{{ PALETTE_LABELS[appearance.palette] }}</span>
        <UBadge
          v-for="badge in paletteBadges(appearance.palette)"
          :key="badge"
          :color="COLOR.success"
          variant="subtle"
          :size="SIZES.small"
        >
          {{ badge }}
        </UBadge>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <UIcon :name="ICONS.textScale" />
        <span :class="TYPOGRAPHY.sectionSubheading">Tekst</span>
        <span :class="TYPOGRAPHY.bodyText">{{ TEXT_SCALE_LABELS[appearance.textScale] }}</span>
      </div>

      <div class="flex md:justify-end">
        <UButton
          v-bind="BUTTONS.secondaryAction"
          :color="COLOR.primary"
          :icon="ICONS.mail"
          :loading="isSendingTest"
          :disabled="channels.length === 0"
          data-testid="pref-send-test"
          @click="sendTest"
        >
          Send testbesked
        </UButton>
      </div>
    </div>

    <!-- EDIT: the draft, saved by Gem -->
    <div v-else class="space-y-5">
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <UIcon :name="ICONS.notification" />
          <span :class="TYPOGRAPHY.sectionSubheading">Notifikationer</span>
        </div>
        <div
          v-for="channel in NotificationChannelSchema.options"
          :key="channel"
          class="flex items-center justify-between gap-3"
        >
          <div class="flex items-center gap-2 min-w-0">
            <UIcon :name="CHANNEL_LABELS[channel].icon" />
            <span :class="TYPOGRAPHY.bodyText">{{ CHANNEL_LABELS[channel].label }}</span>
            <span :class="[TYPOGRAPHY.bodyTextMuted, 'truncate']">{{ channelTarget(channel) }}</span>
          </div>
          <USwitch
            v-bind="COMPONENTS.choiceGroup.single"
            :model-value="draftChannels.has(channel)"
            :disabled="!isChannelAvailable(channel)"
            :color="COLOR.primary"
            :size="SIZES.standard"
            :data-testid="`pref-channel-${channel}`"
            @update:model-value="(on: boolean) => toggleChannel(channel, on)"
          />
        </div>
        <p v-if="!hasPhone" :class="[TYPOGRAPHY.finePrint, 'pl-6']">
          SMS kræver telefonnummer i Heynabo
        </p>
      </div>

      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <UIcon :name="ICONS.palette" />
          <span :class="TYPOGRAPHY.sectionSubheading">Farvevalg</span>
        </div>
        <URadioGroup
          v-bind="COMPONENTS.choiceGroup.stacked"
          v-model="draftAppearance.palette"
          :items="paletteItems"
          value-key="value"
          :color="COLOR.primary"
          :size="SIZES.standard"
        >
          <template #label="{item}">
            <span :data-testid="`pref-palette-${item.value}`" class="flex items-center gap-2 flex-wrap">
              {{ item.label }}
              <UBadge
                v-for="badge in paletteBadges(item.value as Palette)"
                :key="badge"
                :color="COLOR.success"
                variant="subtle"
                :size="SIZES.small"
              >
                {{ badge }}
              </UBadge>
            </span>
          </template>
        </URadioGroup>
      </div>

      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <UIcon :name="ICONS.textScale" />
          <span :class="TYPOGRAPHY.sectionSubheading">Tekst</span>
        </div>
        <URadioGroup
          v-bind="COMPONENTS.choiceGroup.inline"
          v-model="draftAppearance.textScale"
          :items="textScaleItems"
          value-key="value"
          :color="COLOR.primary"
          :size="SIZES.standard"
        >
          <template #label="{item}">
            <span :data-testid="`pref-text-scale-${item.value}`">{{ item.label }}</span>
          </template>
        </URadioGroup>
      </div>

      <div :class="LAYOUTS.formButtonRow">
        <UButton
          v-bind="BUTTONS.cancel"
          :disabled="isSaving"
          data-testid="pref-cancel"
          @click="cancelEditing"
        >
          Annuller
        </UButton>
        <UButton
          v-bind="BUTTONS.save"
          :loading="isSaving"
          data-testid="pref-save"
          @click="save"
        >
          Gem
        </UButton>
      </div>
    </div>
  </UCard>
</template>
