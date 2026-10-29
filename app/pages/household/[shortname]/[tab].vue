<script setup lang="ts">
/**
 * Household Detail Page - Shows household booking interface with tabs
 *
 * URL: /household/[shortname]/[tab]
 * Example: /household/AR_1_st/bookings
 *
 * Displays:
 * - Bookings tab: Calendar + booking management
 * - Members tab: the household's dinner preferences
 * - Allergies tab: Family allergies
 * - Economy tab: Cost breakdown
 * - Settings tab: Settings
 */
import {HELP_TEXTS} from '~/config/help-texts'
import {HOUSEHOLD_WORDS} from '~/config/householdWords'

const { TYPOGRAPHY, ICONS, COMPONENTS, COLOR, ALERTS, NOISE } = useTheSlopeDesignSystem()
const now = useClock()

// The tab keys are the URL's last segment
const HOUSEHOLD_TAB = {
  bookings: 'bookings',
  members: 'members',
  allergies: 'allergies',
  economy: 'economy',
  settings: 'settings'
} as const

// `edits` marks a tab whose component declares canEdit and adminBypass; the others take neither
const tabs = [
  {
    key: HOUSEHOLD_TAB.bookings,
    label: HELP_TEXTS.household.bookings.title,
    icon: ICONS.calendar,
    component: 'HouseholdBookings',
    edits: true
  },
  {
    key: HOUSEHOLD_TAB.members,
    label: HELP_TEXTS.household.members.title,
    icon: ICONS.preferences,
    component: 'HouseholdCard',
    edits: true
  },
  {
    key: HOUSEHOLD_TAB.allergies,
    label: HELP_TEXTS.household.allergies.title,
    icon: ICONS.allergy,
    component: 'HouseholdAllergies',
    edits: true
  },
  {
    key: HOUSEHOLD_TAB.economy,
    label: HELP_TEXTS.household.economy.title,
    icon: ICONS.economy,
    component: 'HouseholdEconomy',
    edits: false
  },
  {
    key: HOUSEHOLD_TAB.settings,
    label: HELP_TEXTS.household.settings.title,
    icon: ICONS.settings,
    component: 'HouseholdSettings',
    edits: true
  }
]

const asyncComponents = Object.fromEntries(
    tabs.map(tab => [
      tab.key,
      defineAsyncComponent(() => import(`~/components/household/${tab.component}.vue`))
    ])
)

const route = useRoute()
const shortname = computed(() => route.params.shortname as string)

// Tab navigation with URL state
const {activeTab} = useTabNavigation({
  tabs: tabs.map(t => t.key),
  basePath: '/household',
  additionalParams: ['shortname']
})

const tabItems = tabs.map(tab => ({
  ...tab,
  value: tab.key
}))

const householdStore = useHouseholdsStore()
const {
  selectedHousehold, isSelectedHouseholdErrored, selectedHouseholdError,
  householdsError, isHouseholdsErrored, isHouseholdsStoreReady,
  households, isHouseholdsInitialized, myHousehold
} = storeToRefs(householdStore)

// PageHeader creates the store, so its datasets prefetch under PageHeader; the server render of a
// sibling waits only for its own prefetch
onServerPrefetch(() => householdStore.selectedHouseholdDataset)

// The store resolves the household the route names (ADR-006); the getter reads the raw route, since the
// ?pbs= sync below defaults to the household the store resolves
const parsePbs = (s: string) => {
  const n = parseInt(s, 10)
  return Number.isNaN(n) ? null : n
}
householdStore.selectHousehold(() => ({
  shortName: shortname.value,
  pbsId: typeof route.query.pbs === 'string' ? parsePbs(route.query.pbs) ?? undefined : undefined
}))

// The URL carries the resolved household's pbs
useQueryParam<number | null>('pbs', {
  deserialize: parsePbs,
  serialize: (v) => v ? String(v) : '',
  validate: (v) => v !== null && households.value.some(h => h.pbsId === v),
  defaultValue: () => households.value.find(h => h.id === householdStore.selectedHouseholdId)?.pbsId ?? myHousehold.value?.pbsId ?? null,
  syncWhen: () => isHouseholdsInitialized.value
})

// Access control: check if current user is member of this household
const authStore = useAuthStore()
const isMember = computed(() =>
  selectedHousehold.value ? authStore.isMemberOfHousehold(selectedHousehold.value.id) : false
)

// The override unlocks editing on a household the viewer does not belong to: an admin's on every tab, the allergy
// manager's on the allergies tab (ADR-004)
const overrideApplies = computed(() => authStore.isAdmin || (authStore.isAllergyManager && activeTab.value === HOUSEHOLD_TAB.allergies))
const adminOverrideArmed = ref(false)
const adminOverrideActive = computed(() => adminOverrideArmed.value && overrideApplies.value)
const showAdminOverride = computed(() => overrideApplies.value && !!selectedHousehold.value && !isMember.value)
const canEdit = computed(() => isMember.value || adminOverrideActive.value)
const editProps = computed(() => ({canEdit: canEdit.value, adminBypass: adminOverrideActive.value}))

// Household status ribbon
const ribbon = computed(() => {
  const h = selectedHousehold.value
  if (!h) return null
  const display = getResidencyDisplay(h.movedInDate, h.moveOutDate, now.value)
  if (!display) return null
  return { classes: getRibbonClasses(display.type), text: display.badgeText }
})

// Format household title: address + family name
const { formatHouseholdFamilyName } = useHousehold()
const householdAddress = computed(() => selectedHousehold.value?.address ?? '')
const householdFamilyName = computed(() =>
  selectedHousehold.value?.inhabitants
    ? formatHouseholdFamilyName(selectedHousehold.value.inhabitants)
    : null
)

useHead({
  title: `🏠 ${shortname.value}`,
  meta: [
    {
      name: "description",
      content: HOUSEHOLD_WORDS.page.description(shortname.value),
    },
  ],
})
</script>

<template>
  <div>
    <ViewError
v-if="isHouseholdsErrored" :error="householdsError?.statusCode"
               :message="HOUSEHOLD_WORDS.failed.households" :cause="householdsError"/>
    <ViewError
v-else-if="isSelectedHouseholdErrored" :error="selectedHouseholdError?.statusCode"
               :message="HOUSEHOLD_WORDS.failed.householdPage(shortname)" :cause="selectedHouseholdError"/>
    <Loader v-else-if="!isHouseholdsStoreReady" :text="`Henter husstanden ${shortname}`"/>
    <UCard v-else v-bind="COMPONENTS.householdPage.card">
      <!-- Household status ribbon -->
      <div
        v-if="ribbon"
        :class="ribbon.classes"
        data-testid="household-ribbon"
      >
        {{ ribbon.text }}
      </div>

      <template #header>
        <div :class="COMPONENTS.householdPage.header">
          <div :class="COMPONENTS.householdPage.title">
            <UIcon :name="ICONS.household" :class="COMPONENTS.householdPage.titleIcon"/>
            <h2 :class="TYPOGRAPHY.cardTitle">{{ householdAddress }}</h2>
            <span v-if="householdFamilyName" :class="TYPOGRAPHY.bodyTextMuted">· {{ householdFamilyName }}</span>
          </div>

          <!-- Visitor banner: non-member, admin override NOT active -->
          <UAlert
            v-if="!isMember && !adminOverrideActive"
            v-bind="{...ALERTS.info, ...ALERTS.withActions}"
            data-testid="visitor-banner"
            :icon="ICONS.viewOnly"
            :title="HOUSEHOLD_WORDS.page.visitor.title"
            :description="HOUSEHOLD_WORDS.page.visitor.description"
          >
            <template v-if="showAdminOverride" #actions>
              <DangerButton
                data-testid="admin-override-btn"
                :label="HOUSEHOLD_WORDS.page.visitor.override"
                :confirm-label="HOUSEHOLD_WORDS.page.visitor.confirmOverride"
                :icon="ICONS.authorize"
                :initial-color="COLOR.info"
                :initial-variant="NOISE.subtle"
                @confirm="adminOverrideArmed = true"
              />
            </template>
          </UAlert>

          <!-- Admin override active banner -->
          <UAlert
            v-if="adminOverrideActive"
            v-bind="{...ALERTS.warning, ...ALERTS.withActions}"
            data-testid="admin-override-active"
            :icon="ICONS.authorize"
            :title="HOUSEHOLD_WORDS.page.override.title"
          >
            <template #actions>
              <UButton
                data-testid="admin-override-exit"
                :color="COLOR.neutral"
                :variant="NOISE.quiet"
                :icon="ICONS.xMark"
                @click="adminOverrideArmed = false"
              >
                {{ HOUSEHOLD_WORDS.page.override.exit }}
              </UButton>
            </template>
          </UAlert>
        </div>
      </template>
      <UTabs
          v-model="activeTab"
          v-bind="COMPONENTS.householdPage.tabs"
          :items="tabItems"
          :color="COLOR.primary"
      >
        <template #content="{ item }">
          <component :is="asyncComponents[item.value]" :household="selectedHousehold" v-bind="item.edits ? editProps : {}"/>
        </template>
      </UTabs>
    </UCard>
  </div>
</template>
