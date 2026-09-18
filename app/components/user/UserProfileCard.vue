<!--
┌─────────────────────────────────────────────────────────────────────────────┐
│ UserProfileCard - User profile with roles and contact info                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ DESKTOP:                                                                    │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ #header                                                                 │ │
│ │                                                                         │ │
│ │  [👤] Anna Hansen                  [⚙ ▾] [Heynabo →] [👋 Log ud →]     │ │
│ │       [🛡️ Admin] [💚 Allergichef]                                      │ │
│ │                                      ↑ own settings, current user only  │ │
│ │                                        aria-label "Indstillinger"       │ │
│ │  One outline shape: BUTTONS.settings + BUTTONS.secondaryAction          │ │
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
│ │  [⚙ ▾] [Heynabo →] [👋 Log ud →]         (wraps when the row is full)   │ │
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
│ - Login.vue (dashboard, showActions=true; owns `preferencesOpen` and        │
│   renders UserPreferencesCard under this card on `toggle-preferences`)      │
│ - AdminUsers.vue (expanded row, showActions=false)                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
-->
<script setup lang="ts">
import type {UserDetail, UserDisplay} from '~/composables/useCoreValidation'
import {FORM_MODES, type FormMode} from '~/types/form'

interface Props {
  user: UserDetail | UserDisplay
  showActions?: boolean
  showRoleManager?: boolean
  /** Whether the settings panel the parent renders under this card is open (ADR-006: no persistence) */
  preferencesOpen?: boolean
}

const emit = defineEmits<{'toggle-preferences': []}>()

const props = withDefaults(defineProps<Props>(), {
  showActions: false,
  showRoleManager: false,
  preferencesOpen: false
})

const {TYPOGRAPHY, SIZES, ICONS, IMG, BUTTONS, ALERTS, COLOR} = useTheSlopeDesignSystem()
const {roleLabels} = useUserRolesUi()
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
const householdPbsId = computed(() => hasHousehold(props.user) ? props.user.Inhabitant!.household.pbsId : null)
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

// =============================================================================
// Role Management (when showRoleManager=true)
// =============================================================================
const {SystemRoleSchema} = useCoreValidation()
const allRoles = Object.values(SystemRoleSchema.enum)

const usersStore = useUsersStore()
const roleFormMode = ref<FormMode>(FORM_MODES.VIEW)
const isSavingRoles = ref(false)
const draftRoles = ref<Set<string>>(new Set())

// ADMIN is HN-owned, read-only in this UI
const isRoleDisabled = (role: string) => role === 'ADMIN'

// Only admins can edit roles
const canEditRoles = computed(() => authStore.isAdmin)

const startEditingRoles = () => {
  if (!canEditRoles.value) return
  draftRoles.value = new Set(systemRoles.value)
  roleFormMode.value = FORM_MODES.EDIT
}

const cancelEditingRoles = () => {
  roleFormMode.value = FORM_MODES.VIEW
}

const toggleRole = (role: string) => {
  if (isRoleDisabled(role)) return
  if (draftRoles.value.has(role)) {
    draftRoles.value.delete(role)
  } else {
    draftRoles.value.add(role)
  }
}

const saveRoles = async () => {
  if (!props.user.id) return

  isSavingRoles.value = true
  try {
    await usersStore.updateUserRoles(props.user.id, Array.from(draftRoles.value))
    roleFormMode.value = FORM_MODES.VIEW
  } catch (error) {
    console.error('Failed to update roles:', error)
  } finally {
    isSavingRoles.value = false
  }
}

const isViewMode = computed(() => roleFormMode.value === FORM_MODES.VIEW)
const isEditMode = computed(() => roleFormMode.value === FORM_MODES.EDIT)
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

        <!-- Right: action buttons - one outline shape; they wrap on a phone, one row from md -->
        <div class="flex flex-wrap items-center gap-2 md:gap-4 md:flex-nowrap md:shrink-0 md:ml-auto">
          <!-- Own settings: reveals UserPreferencesCard under this card -->
          <UButton
            v-if="shouldShowActions"
            v-bind="{...BUTTONS.settings, ...BUTTONS.disclosure(preferencesOpen)}"
            aria-label="Indstillinger"
            data-testid="pref-toggle"
            @click="emit('toggle-preferences')"
          />

          <!-- Heynabo profile link -->
          <UButton
            v-if="heynaboProfileUrl"
            v-bind="BUTTONS.secondaryAction"
            :color="COLOR.primary"
            :to="heynaboProfileUrl"
            target="_blank"
            :avatar="{src: IMG.heynabo, alt: 'Heynabo'}"
            :trailing-icon="ICONS.arrowRight"
            data-testid="heynabo-profile-link"
          >
            Heynabo
          </UButton>

          <!-- Logout button -->
          <UButton
            v-if="shouldShowActions"
            v-bind="BUTTONS.secondaryAction"
            :color="COLOR.error"
            :leading-icon="ICONS.logout"
            :trailing-icon="ICONS.arrowRight"
            data-testid="logout-button"
            @click="handleLogout"
          >
            Log ud
          </UButton>
        </div>
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
      <div v-if="householdShortName && householdPbsId" class="flex items-center gap-2">
        <UIcon :name="ICONS.household" class="opacity-60" />
        <NuxtLink
          :to="getHouseholdUrl(householdShortName, householdPbsId)"
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

    <!-- Role Management Section (footer) -->
    <template v-if="showRoleManager" #footer>
      <!-- Header: Title + Edit/Save/Cancel buttons -->
      <div class="flex items-center justify-between mb-3">
        <span :class="TYPOGRAPHY.bodyTextMedium">Systemroller</span>

        <!-- View mode: Edit button (admin only) -->
        <UButton
          v-if="isViewMode && canEditRoles"
          :icon="ICONS.edit"
          :color="COLOR.neutral"
          variant="ghost"
          size="sm"
          data-testid="edit-roles-btn"
          @click="startEditingRoles"
        >
          Rediger
        </UButton>

        <!-- Edit mode: Save/Cancel buttons -->
        <div v-if="isEditMode" class="flex gap-2">
          <UButton
            :icon="ICONS.check"
            :color="COLOR.primary"
            variant="soft"
            size="sm"
            :loading="isSavingRoles"
            data-testid="save-roles-btn"
            @click="saveRoles"
          >
            Gem
          </UButton>
          <UButton
            :icon="ICONS.xMark"
            :color="COLOR.neutral"
            variant="ghost"
            size="sm"
            :disabled="isSavingRoles"
            data-testid="cancel-roles-btn"
            @click="cancelEditingRoles"
          >
            Annuller
          </UButton>
        </div>
      </div>

      <!-- View mode: Role badges -->
      <div v-if="isViewMode" class="flex flex-wrap gap-2">
        <UBadge
          v-for="role in visibleRoles"
          :key="role"
          :color="roleLabels[role]?.color || 'neutral'"
          variant="soft"
          size="md"
        >
          <UIcon :name="roleLabels[role]?.icon || 'i-heroicons-user'" class="mr-1" />
          {{ roleLabels[role]?.label || role }}
        </UBadge>
        <span v-if="visibleRoles.length === 0" :class="TYPOGRAPHY.bodyTextMuted">Ingen roller</span>
      </div>

      <!-- Edit mode: Role toggles -->
      <div v-if="isEditMode" class="space-y-3">
        <div
          v-for="role in allRoles"
          :key="role"
          class="flex items-center justify-between"
        >
          <div class="flex items-center gap-2">
            <UIcon
              :name="roleLabels[role]?.icon || 'i-heroicons-user'"
              :class="isRoleDisabled(role) ? 'opacity-40' : ''"
            />
            <span :class="[TYPOGRAPHY.bodyText, isRoleDisabled(role) ? 'opacity-40' : '']">
              {{ roleLabels[role]?.label || role }}
            </span>
            <span v-if="isRoleDisabled(role)" :class="TYPOGRAPHY.bodyTextMuted">(Heynabo)</span>
          </div>
          <USwitch
            :model-value="draftRoles.has(role)"
            :disabled="isRoleDisabled(role)"
            :data-testid="`role-toggle-${role}`"
            @update:model-value="toggleRole(role)"
          />
        </div>

        <!-- Info alert -->
        <UAlert
          v-bind="ALERTS.info"
          :icon="ICONS.authorize"
          title="Om systemroller"
        >
          <template #description>
            <ul class="list-disc list-inside space-y-1 mt-1">
              <li><strong>Admin</strong> - Synkroniseres fra Heynabo, kan ikke ændres her</li>
              <li><strong>Allergichef</strong> - Giver adgang til at administrere allergidata</li>
            </ul>
          </template>
        </UAlert>
      </div>
    </template>
  </UCard>
</template>
