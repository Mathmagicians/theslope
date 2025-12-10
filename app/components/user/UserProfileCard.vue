<!--
┌─────────────────────────────────────────────────────────────────────────────┐
│ UserProfileCard - User profile with roles and contact info                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ DESKTOP:                                                                    │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ #header                                                                 │ │
│ │                                                                         │ │
│ │  [👤] Anna Hansen                        [Heynabo →] [👋 Log ud →]     │ │
│ │       [🛡️ Admin] [💚 Allergichef]                                      │ │
│ │                                                                         │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ #default                                                                │ │
│ │                                                                         │ │
│ │  📧 anna@heynabo.dk                                                    │ │
│ │  📱 +45 12345678                                                       │ │
│ │  🏠 Lejlighed 42                                                       │ │
│ │     Fælledvej 12, 2.th                                                 │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ MOBILE:                                                                     │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ #header                                                                 │ │
│ │                                                                         │ │
│ │  [👤] Anna Hansen                                                      │ │
│ │       [🛡️ Admin] [💚 Allergichef]                                      │ │
│ │                                                                         │ │
│ │  [Heynabo →] [👋 Log ud →]                                             │ │
│ │                                                                         │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ #default                                                                │ │
│ │                                                                         │ │
│ │  📧 anna@heynabo.dk                                                    │ │
│ │  📱 +45 12345678                                                       │ │
│ │  🏠 Lejlighed 42                                                       │ │
│ │     Fælledvej 12, 2.th                                                 │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ Used in:                                                                    │
│ - Login.vue (dashboard, showActions=true)                                   │
│ - AdminUsers.vue (expanded row, showActions=false)                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
-->
<script setup lang="ts">
import type {UserDetail, UserDisplay} from '~/composables/useCoreValidation'

interface Props {
  user: UserDetail | UserDisplay
  showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showActions: false
})

const {TYPOGRAPHY, SIZES, ICONS, IMG, COMPONENTS} = useTheSlopeDesignSystem()
const {roleLabels} = useUserRoles()
const {getUserUrl} = useHeynabo()
const authStore = useAuthStore()

// Type guard to check if user has full detail with household
const hasHousehold = (user: UserDetail | UserDisplay): user is UserDetail =>
  user.Inhabitant !== null && 'household' in (user.Inhabitant || {})

// Extract user data from nested structure
const inhabitant = computed(() => props.user.Inhabitant)
const email = computed(() => props.user.email)
const phone = computed(() => props.user.phone || null)
const systemRoles = computed(() => props.user.systemRoles || [])
const householdShortName = computed(() => hasHousehold(props.user) ? props.user.Inhabitant!.household.shortName : null)
const householdAddress = computed(() => hasHousehold(props.user) ? props.user.Inhabitant!.household.address : null)
const heynaboProfileUrl = computed(() => inhabitant.value ? getUserUrl(inhabitant.value.heynaboId) : null)

// Get visible roles using roleLabels from composable
const visibleRoles = computed(() =>
  systemRoles.value.filter(role => roleLabels[role] !== undefined)
)

// Check if this is the logged-in user
const isCurrentUser = computed(() => {
  return authStore.user?.id === props.user.id
})

// Only show actions if it's the current user
const shouldShowActions = computed(() => {
  return props.showActions && isCurrentUser.value
})

const handleLogout = () => {
  authStore.clear()
}
</script>

<template>
  <UCard>
    <!-- Header: User info + buttons -->
    <template #header>
      <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <!-- Left: UserListItem with role badges in slot -->
        <UserListItem
          v-if="inhabitant"
          :inhabitants="inhabitant"
          :size="SIZES.large"
          use-full-name
          :link-to-profile="false"
        >
          <template #badge>
            <div v-if="visibleRoles.length > 0" class="flex flex-wrap gap-2">
              <UBadge
                v-for="role in visibleRoles"
                :key="role"
                :color="roleLabels[role]?.color || 'neutral'"
                variant="subtle"
                :size="SIZES.small"
              >
                <UIcon :name="roleLabels[role]?.icon || 'i-heroicons-user'" class="mr-1" />
                {{ roleLabels[role]?.label || role }}
              </UBadge>
            </div>
          </template>
        </UserListItem>

        <!-- Right: Action buttons -->
        <UFieldGroup  :size="SIZES.standard" class="gap-2 md:gap-4 md:justify-end">
          <!-- Heynabo profile link -->
          <UButton
            v-if="heynaboProfileUrl"
            :to="heynaboProfileUrl"
            target="_blank"
            name="heynabo-profile-link"
            :color="COMPONENTS.cardAction.neutral.color"
            :variant="COMPONENTS.cardAction.neutral.variant"
            :avatar="{src: IMG.heynabo, alt: 'Heynabo'}"
            :trailing-icon="ICONS.arrowRight"
          >
            Heynabo
          </UButton>

          <!-- Logout button -->
          <UButton
              v-if="shouldShowActions"
            name="logout-button"
            :leading-icon="ICONS.logout"
            :trailing-icon="ICONS.arrowRight"
            :color="COMPONENTS.cardAction.destructive.color"
            :variant="COMPONENTS.cardAction.destructive.variant"
            @click="handleLogout"
          >
            Log ud
          </UButton>
        </UFieldGroup>
      </div>
    </template>

    <!-- Body: Contact info -->
    <div class="space-y-2">
      <!-- Email -->
      <div class="flex items-center gap-2">
        <UIcon :name="ICONS.mail" class="opacity-60" />
        <span :class="TYPOGRAPHY.bodyTextMuted">{{ email }}</span>
      </div>

      <!-- Phone -->
      <div v-if="phone" class="flex items-center gap-2">
        <UIcon :name="ICONS.phone" class="opacity-60" />
        <span :class="TYPOGRAPHY.bodyTextMuted">{{ phone }}</span>
      </div>

      <!-- Household -->
      <div v-if="householdShortName" class="flex items-center gap-2">
        <UIcon :name="ICONS.household" class="opacity-60" />
        <NuxtLink
          :to="`/household/${encodeURIComponent(householdShortName)}`"
          :class="[TYPOGRAPHY.bodyTextMuted, 'underline hover:no-underline hover:text-primary transition-colors']"
        >
          {{ householdShortName }}
        </NuxtLink>
        <template v-if="householdAddress">
          <span :class="TYPOGRAPHY.bodyTextMuted">·</span>
          <span :class="TYPOGRAPHY.bodyTextMuted">{{ householdAddress }}</span>
        </template>
      </div>
    </div>
  </UCard>
</template>
