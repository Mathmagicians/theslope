<script setup lang="ts">
/**
 * HouseholdCard - Main household view with tabs
 *
 * Tabs:
 * - Tilmeldinger (Bookings) - Master-detail: Calendar + booking management
 * - Allergier (Allergies) - Family allergy management
 * - Økonomi (Economy) - Monthly cost breakdown
 *
 * UX: Master-detail pattern for Tilmeldinger tab
 * - Master (Calendar): 1/3 width on large screens, shows 1 month
 * - Detail (Booking panel): 2/3 width, shows selected day details
 */
import type {DateRange} from '~/types/dateTypes'

interface Inhabitant {
  id: number
  name: string
  lastName: string
}

interface Household {
  id: number
  name: string
  shortName: string
  inhabitants: Inhabitant[]
}

interface DinnerEvent {
  id: number
  date: Date
  cookingTeamId: number | null
}

interface Order {
  id: number
  dinnerEventId: number
  inhabitantId: number
}

interface Props {
  household: Household
  seasonDates: DateRange
  dinnerEvents: DinnerEvent[]
  orders: Order[]
  holidays?: DateRange[]
}

const props = defineProps<Props>()

// Tab management
const tabs = [
  {key: 'bookings', label: 'Tilmeldinger', icon: 'i-heroicons-calendar'},
  {key: 'allergies', label: 'Allergier', icon: 'i-heroicons-exclamation-triangle'},
  {key: 'economy', label: 'Økonomi', icon: 'i-heroicons-currency-dollar'},
  {key: 'members', label: 'Husstanden', icon: 'i-heroicons-users'},
  {key: 'settings', label: 'Indstillinger', icon: 'i-heroicons-cog-6-tooth'}
]

const activeTab = ref('bookings')

// Selected day for detail panel (null = show today or next event)
const selectedDate = ref<Date | null>(null)

// Mockup: Weekly preferences expanded/collapsed state
const preferencesExpanded = ref(false)

// Mockup: Calendar feed subscription (from old household/_id.vue)
const calendarFeed = ref(null)
const getCalendarFeedForUser = async (userName: string) => {
  console.info('getCalendarFeedForUser', userName)
  calendarFeed.value = await $fetch('/api/calendar/feed')
}

// Mockup: Determine inhabitant ticket type based on age (placeholder)
const getTicketTypeLabel = (inhabitant: Inhabitant): string => {
  // TODO: Calculate from birthDate when implemented
  return 'Voksen'
}
</script>

<template>
  <UCard>
    <!-- Header -->
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-home" class="text-2xl" />
        <h2 class="text-xl font-semibold">{{ household.name }}</h2>
      </div>
    </template>

    <!-- Tabs -->
    <UTabs v-model="activeTab" :items="tabs" class="mb-4">
      <template #content="{ item }">
        <!-- Tab 1: Tilmeldinger (Bookings) -->
        <div v-if="item.key === 'bookings'">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Master: Calendar (1/3 on large screens) -->
          <div class="lg:col-span-1">
            <h3 class="text-lg font-semibold mb-4">Kalender</h3>
            <HouseholdCalendarDisplay
              :season-dates="seasonDates"
              :household="household"
              :dinner-events="dinnerEvents"
              :orders="orders"
              :holidays="holidays"
            />

            <!-- Legend -->
            <div class="mt-4 space-y-2 text-sm">
              <div class="flex items-center gap-2">
                <span class="text-xs">●</span>
                <span>Tilmeldt</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs">◆</span>
                <span>Hold laver mad</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs">○</span>
                <span>Ikke tilmeldt</span>
              </div>
            </div>
          </div>

          <!-- Detail: Booking management (2/3 on large screens) -->
          <div class="lg:col-span-2 space-y-4">
            <h3 class="text-lg font-semibold">
              {{ selectedDate ? formatDate(selectedDate) : 'I dag' }}
            </h3>

            <div class="rounded-lg border p-4">
              <p class="text-muted">
                Vælg en dag i kalenderen for at administrere tilmeldinger
              </p>
              <!-- TODO: Booking management UI will go here -->
              <!-- - List of inhabitants with dropdowns -->
              <!-- - Quick actions (Tilmeld alle, Tag alle med, Afmeld) -->
              <!-- - Guest ticket button -->
              <!-- - Event details (cooking team, deadline, price) -->
            </div>

            <!-- Weekly Preferences Section -->
            <div class="border-t pt-4">
              <button
                class="flex items-center justify-between w-full text-left"
                @click="preferencesExpanded = !preferencesExpanded"
              >
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-cog-6-tooth" class="w-5 h-5" />
                  <span class="font-semibold">Ugentlige præferencer</span>
                </div>
                <UIcon
                  :name="preferencesExpanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                  class="w-5 h-5"
                />
              </button>

              <!-- Compact view (collapsed) -->
              <div v-if="!preferencesExpanded" class="mt-2 text-sm text-muted">
                <p>Mandag: Anna📍, Bob📍, Clara📍 • David⊘</p>
                <!-- TODO: Generate from actual preferences data -->
              </div>

              <!-- Expanded view -->
              <div v-else class="mt-4 space-y-4">
                <p class="text-sm text-muted">
                  Standard for hver ugedag (opdaterer automatisk fremtidige bookinger)
                </p>

                <div
                  v-for="inhabitant in household.inhabitants"
                  :key="inhabitant.id"
                  class="space-y-2"
                >
                  <div class="flex items-center gap-2">
                    <UIcon name="i-heroicons-user" class="w-4 h-4" />
                    <span class="font-medium">{{ inhabitant.name }}</span>
                  </div>

                  <!-- TODO: Wire up to actual inhabitant.dinnerPreferences when available -->
                  <WeekDayMapDinnerModeDisplay
                    :model-value="null"
                    compact
                    :name="`inhabitant-${inhabitant.id}-preferences`"
                    @update:model-value="(value) => console.log('Update preferences for', inhabitant.id, value)"
                  />
                </div>

                <UAlert
                  icon="i-heroicons-information-circle"
                  color="primary"
                  variant="soft"
                  title="Ændringer opdaterer fremtidige bookinger"
                />
              </div>
            </div>
          </div>
        </div>
        </div>

        <!-- Tab 2: Allergier (Allergies) -->
        <div v-else-if="item.key === 'allergies'" class="space-y-4">
          <h3 class="text-lg font-semibold">Familiens allergier og diætkrav</h3>
          <p class="text-muted">Allergi-administration kommer snart...</p>
          <!-- TODO: Allergy management UI -->
        </div>

        <!-- Tab 3: Økonomi (Economy) -->
        <div v-else-if="item.key === 'economy'" class="space-y-4">
          <h3 class="text-lg font-semibold">Oversigt over middagsomkostninger</h3>
          <p class="text-muted">Økonomioversigt kommer snart...</p>
          <!-- TODO: Cost breakdown UI -->
        </div>

        <!-- Tab 4: Husstanden (Members) - Mockup from old HouseholdView -->
        <div v-else-if="item.key === 'members'" class="space-y-4">
          <h3 class="text-lg font-semibold">Medlemmer af husstanden</h3>

          <div v-if="household.inhabitants && household.inhabitants.length > 0" class="space-y-4">
            <UCard
              v-for="inhabitant in household.inhabitants"
              :key="inhabitant.id"
            >
              <template #header>
                <div class="flex items-center gap-4">
                  <UAvatar
                    size="lg"
                    :alt="inhabitant.name"
                    icon="i-heroicons-user"
                  />
                  <div class="flex-1">
                    <p class="font-medium">{{ inhabitant.name }} {{ inhabitant.lastName }}</p>
                  </div>
                  <UBadge variant="soft" color="primary">
                    {{ getTicketTypeLabel(inhabitant) }}
                  </UBadge>
                </div>
              </template>

              <div class="space-y-4">
                <h4 class="text-sm font-semibold">Ugentlige madpræferencer</h4>
                <p class="text-sm text-muted">Angiv hvordan du foretrækker at spise middag hver dag</p>

                <!-- TODO: Wire up to actual inhabitant.dinnerPreferences when available -->
                <WeekDayMapDinnerModeDisplay
                  :model-value="null"
                  label=""
                  :name="`inhabitant-${inhabitant.id}-preferences`"
                  @update:model-value="(value) => console.log('Update preferences for', inhabitant.id, value)"
                />
              </div>
            </UCard>
          </div>

          <div v-else class="text-muted italic">
            Ingen medlemmer i husstanden
          </div>
        </div>

        <!-- Tab 5: Indstillinger (Settings) - Mockup from old household/_id -->
        <div v-else-if="item.key === 'settings'" class="space-y-6">
          <div>
            <h3 class="text-lg font-semibold mb-4">Kalenderabonnement</h3>
            <p class="text-muted mb-4">
              Abonner på familiens fællesspisningskalender i din foretrukne kalenderapp (Google Calendar, Apple Calendar, Outlook)
            </p>

            <UButton
              icon="i-heroicons-calendar"
              color="primary"
              @click="getCalendarFeedForUser(household.name)"
            >
              Hent kalender (.ical)
            </UButton>

            <div v-if="calendarFeed" class="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded">
              <p class="text-sm text-muted mb-2">Kalenderfeed genereret:</p>
              <a
                href="/api/calendar/feed"
                class="text-primary hover:underline text-sm"
                download="skraaningen-faellesspisning.ics"
              >
                Download skraaningen-faellesspisning.ics
              </a>
            </div>
          </div>

          <div class="border-t pt-6">
            <h3 class="text-lg font-semibold mb-4">Notifikationer</h3>
            <p class="text-muted">Notifikationsindstillinger kommer snart...</p>
            <!-- TODO: Notification preferences -->
          </div>

          <div class="border-t pt-6">
            <h3 class="text-lg font-semibold mb-4">Præferencer</h3>
            <p class="text-muted">Generelle præferencer kommer snart...</p>
            <!-- TODO: User preferences -->
          </div>
        </div>
      </template>
    </UTabs>
  </UCard>
</template>