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
  type Palette
} from '~/composables/useUserPreferenceValidation'
import {USER_WORDS} from '~/config/userWords'

const authStore = useAuthStore()
const {TYPOGRAPHY, LAYOUTS, BUTTONS, COMPONENTS, ICONS, COLOR, SIZES, NOISE} = useTheSlopeDesignSystem()
const {NotificationChannelSchema, PaletteSchema, TextScaleSchema} = useUserPreferenceValidation()
const Channel = NotificationChannelSchema.enum
const WORDS = USER_WORDS.preferences
const CHANNEL_ICONS: Record<NotificationChannel, string> = {
  [Channel.EMAIL]: ICONS.mail,
  [Channel.SMS]: ICONS.phone
}

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

const paletteItems = computed(() => PaletteSchema.options.map(value => ({value, label: WORDS.palettes[value]})))
const textScaleItems = computed(() => TextScaleSchema.options.map(value => ({value, label: WORDS.textScales[value]})))

/** The badges a palette earns: its verified contrast level, and colour safety where it is verified */
const paletteBadges = (palette: Palette): string[] => {
  const {level, colourSafe} = PALETTES[palette]
  return [...(level ? [WORDS.levelBadges[level]] : []), ...(colourSafe ? [WORDS.colourSafeBadge] : [])]
}

/** SMS needs a number, and phone numbers come from Heynabo */
const isChannelAvailable = (channel: NotificationChannel) => channel !== Channel.SMS || hasPhone.value
const channelTarget = (channel: NotificationChannel) => channel === Channel.SMS ? phone.value : email.value

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
      <div :class="COMPONENTS.userPreferencesCard.header">
        <h3 :class="TYPOGRAPHY.cardTitle">{{ WORDS.title }}</h3>
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
    <div v-if="!isEditing" :class="COMPONENTS.userPreferencesCard.view">
      <div :class="COMPONENTS.userPreferencesCard.notificationRow">
        <UIcon :name="ICONS.notification" :class="COMPONENTS.userPreferencesCard.notificationIcon" />
        <span :class="TYPOGRAPHY.sectionSubheading">{{ WORDS.notifications }}</span>
        <div :class="COMPONENTS.userPreferencesCard.line">
          <UBadge
            v-for="channel in channels"
            :key="channel"
            :color="COLOR.primary"
            :variant="NOISE.subtle"
            :size="SIZES.small"
          >
            <UIcon :name="CHANNEL_ICONS[channel]" :class="COMPONENTS.userPreferencesCard.badgeIcon" />
            {{ WORDS.channels[channel] }}
          </UBadge>
          <span v-if="channels.length === 0" :class="TYPOGRAPHY.bodyTextMuted">Ingen notifikationer</span>
        </div>
      </div>

      <div :class="COMPONENTS.userPreferencesCard.line">
        <UIcon :name="ICONS.palette" />
        <span :class="TYPOGRAPHY.sectionSubheading">{{ WORDS.palette }}</span>
        <span :class="TYPOGRAPHY.bodyText">{{ WORDS.palettes[appearance.palette] }}</span>
        <UBadge
          v-for="badge in paletteBadges(appearance.palette)"
          :key="badge"
          :color="COLOR.success"
          :variant="NOISE.subtle"
          :size="SIZES.small"
        >
          {{ badge }}
        </UBadge>
      </div>

      <div :class="COMPONENTS.userPreferencesCard.line">
        <UIcon :name="ICONS.textScale" />
        <span :class="TYPOGRAPHY.sectionSubheading">{{ WORDS.textScale }}</span>
        <span :class="TYPOGRAPHY.bodyText">{{ WORDS.textScales[appearance.textScale] }}</span>
      </div>

      <div :class="COMPONENTS.userPreferencesCard.sendTestRow">
        <UButton
          v-bind="BUTTONS.secondaryAction"
          :color="COLOR.primary"
          :icon="ICONS.mail"
          :loading="isSendingTest"
          :disabled="channels.length === 0"
          data-testid="pref-send-test"
          @click="sendTest"
        >
          {{ WORDS.sendTest }}
        </UButton>
      </div>
    </div>

    <!-- EDIT: the draft, saved by Gem -->
    <div v-else :class="COMPONENTS.userPreferencesCard.edit">
      <div :class="COMPONENTS.userPreferencesCard.section">
        <div :class="COMPONENTS.userPreferencesCard.sectionHeading">
          <UIcon :name="ICONS.notification" />
          <span :class="TYPOGRAPHY.sectionSubheading">{{ WORDS.notifications }}</span>
        </div>
        <div
          v-for="channel in NotificationChannelSchema.options"
          :key="channel"
          :class="COMPONENTS.userPreferencesCard.channelRow"
        >
          <div :class="COMPONENTS.userPreferencesCard.channelLabel">
            <UIcon :name="CHANNEL_ICONS[channel]" />
            <span :class="TYPOGRAPHY.bodyText">{{ WORDS.channels[channel] }}</span>
            <span :class="COMPONENTS.userPreferencesCard.channelTarget">{{ channelTarget(channel) }}</span>
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
        <p v-if="!hasPhone" :class="COMPONENTS.userPreferencesCard.smsHint">
          {{ WORDS.smsNeedsPhone }}
        </p>
      </div>

      <div :class="COMPONENTS.userPreferencesCard.section">
        <div :class="COMPONENTS.userPreferencesCard.sectionHeading">
          <UIcon :name="ICONS.palette" />
          <span :class="TYPOGRAPHY.sectionSubheading">{{ WORDS.palette }}</span>
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
            <span :data-testid="`pref-palette-${item.value}`" :class="COMPONENTS.userPreferencesCard.line">
              {{ item.label }}
              <UBadge
                v-for="badge in paletteBadges(item.value)"
                :key="badge"
                :color="COLOR.success"
                :variant="NOISE.subtle"
                :size="SIZES.small"
              >
                {{ badge }}
              </UBadge>
            </span>
          </template>
        </URadioGroup>
      </div>

      <div :class="COMPONENTS.userPreferencesCard.section">
        <div :class="COMPONENTS.userPreferencesCard.sectionHeading">
          <UIcon :name="ICONS.textScale" />
          <span :class="TYPOGRAPHY.sectionSubheading">{{ WORDS.textScale }}</span>
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
