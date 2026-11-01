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

Visual check: /login signed in (the member's own card) and /admin/users (an expanded row with the role manager in view
and edit), phone and desktop.
-->
<script setup lang="ts">
import type {SystemRole, UserDetail, UserDisplay} from '~/composables/useCoreValidation'
import {ROLE_OWNERSHIP, RoleOwner} from '~/composables/useUserRoles'
import {FORM_MODES, type FormMode} from '~/types/form'
import {BUTTON_WORDS} from '~/config/buttonWords'
import {USER_WORDS} from '~/config/userWords'

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

const {TYPOGRAPHY, SIZES, ICONS, IMG, BUTTONS, ALERTS, COLOR, NOISE, LAYOUTS, COMPONENTS} = useTheSlopeDesignSystem()
const {roleLabels} = useUserRolesUi()
const heynaboUserUrl = getUserUrl(useRuntimeConfig().public.HEY_NABO_API)
const authStore = useAuthStore()
const {SystemRoleSchema, UserDetailSchema} = useCoreValidation()

const inhabitant = computed(() => props.user.Inhabitant)
const email = computed(() => props.user.email)
const phone = computed(() => props.user.phone || null)
const systemRoles = computed(() => props.user.systemRoles || [])
// A display user's inhabitant carries no household: the detail schema tells the two apart
const household = computed(() => UserDetailSchema.shape.Inhabitant.safeParse(props.user.Inhabitant).data?.household ?? null)
const heynaboProfileUrl = computed(() => inhabitant.value ? heynaboUserUrl(inhabitant.value.heynaboId) : null)

const visibleRoles = computed(() =>
  systemRoles.value.filter(role => roleLabels[role] !== undefined)
)

const isCurrentUser = computed(() => authStore.user?.id === props.user.id)
const shouldShowActions = computed(() => props.showActions && isCurrentUser.value)

const handleLogout = () => {
  authStore.clear()
}

const allRoles = Object.values(SystemRoleSchema.enum)

const usersStore = useUsersStore()
const roleFormMode = ref<FormMode>(FORM_MODES.VIEW)
const isSavingRoles = ref(false)
const draftRoles = ref<Set<SystemRole>>(new Set())

// The import writes a role Heynabo owns, so it is read-only here
const isRoleDisabled = (role: SystemRole) => ROLE_OWNERSHIP[role] === RoleOwner.HN

const canEditRoles = computed(() => authStore.isAdmin)

const startEditingRoles = () => {
  if (!canEditRoles.value) return
  draftRoles.value = new Set(systemRoles.value)
  roleFormMode.value = FORM_MODES.EDIT
}

const cancelEditingRoles = () => {
  roleFormMode.value = FORM_MODES.VIEW
}

const toggleRole = (role: SystemRole) => {
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
    <template #header>
      <div :class="COMPONENTS.userProfileCard.header">
        <UserListItem
          v-if="inhabitant"
          :inhabitants="inhabitant"
          :size="SIZES.large"
          use-full-name
          :link-to-profile="false"
        >
          <template #badge>
            <div v-if="visibleRoles.length > 0" :class="COMPONENTS.userProfileCard.roleBadges">
              <UBadge
                v-for="role in visibleRoles"
                :key="role"
                :color="roleLabels[role]?.color || COLOR.neutral"
                :variant="NOISE.subtle"
                :size="SIZES.small"
              >
                <UIcon :name="roleLabels[role]?.icon || ICONS.user" :class="COMPONENTS.adminUsers.roleIcon" />
                {{ roleLabels[role]?.label || role }}
              </UBadge>
            </div>
          </template>
        </UserListItem>

        <!-- The action buttons: one outline shape; they wrap on a phone, one row from md -->
        <div :class="COMPONENTS.userProfileCard.actions">
          <!-- Own settings: reveals UserPreferencesCard under this card -->
          <UButton
            v-if="shouldShowActions"
            v-bind="{...BUTTONS.settings, ...BUTTONS.flipOpen(preferencesOpen)}"
            :aria-label="USER_WORDS.profile.settings"
            data-testid="pref-toggle"
            @click="emit('toggle-preferences')"
          />

          <UButton
            v-if="heynaboProfileUrl"
            v-bind="BUTTONS.secondaryAction"
            :color="COLOR.primary"
            :to="heynaboProfileUrl"
            target="_blank"
            :avatar="{src: IMG.heynabo, alt: BUTTON_WORDS.heynabo.name}"
            :trailing-icon="ICONS.arrowRight"
            data-testid="heynabo-profile-link"
          >
            {{ BUTTON_WORDS.heynabo.name }}
          </UButton>

          <UButton
            v-if="shouldShowActions"
            v-bind="BUTTONS.secondaryAction"
            :color="COLOR.error"
            :leading-icon="ICONS.logout"
            :trailing-icon="ICONS.arrowRight"
            data-testid="logout-button"
            @click="handleLogout"
          >
            {{ USER_WORDS.profile.logout }}
          </UButton>
        </div>
      </div>
    </template>

    <div :class="COMPONENTS.householdSettings.facts">
      <div :class="COMPONENTS.householdSettings.fact">
        <UIcon :name="ICONS.mail" :class="COMPONENTS.householdSettings.factIcon" />
        <span :class="TYPOGRAPHY.bodyTextMuted">{{ email }}</span>
      </div>

      <div v-if="phone" :class="COMPONENTS.householdSettings.fact">
        <UIcon :name="ICONS.phone" :class="COMPONENTS.householdSettings.factIcon" />
        <span :class="TYPOGRAPHY.bodyTextMuted">{{ phone }}</span>
      </div>

      <div v-if="household?.shortName && household.pbsId" :class="COMPONENTS.householdSettings.fact">
        <UIcon :name="ICONS.household" :class="COMPONENTS.householdSettings.factIcon" />
        <NuxtLink
          :to="getHouseholdUrl(household.shortName, household.pbsId)"
          :class="[TYPOGRAPHY.bodyTextMuted, COMPONENTS.userProfileCard.householdLink]"
        >
          {{ household.shortName }}
        </NuxtLink>
        <template v-if="household.address">
          <span :class="TYPOGRAPHY.bodyTextMuted">·</span>
          <span :class="TYPOGRAPHY.bodyTextMuted">{{ household.address }}</span>
        </template>
      </div>

    </div>

    <template v-if="showRoleManager" #footer>
      <div :class="COMPONENTS.userProfileCard.rolesHeader">
        <span :class="TYPOGRAPHY.bodyTextMedium">{{ USER_WORDS.profile.roles.title }}</span>

        <UButton
          v-if="isViewMode && canEditRoles"
          :icon="ICONS.edit"
          :color="COLOR.neutral"
          :variant="NOISE.quiet"
          :size="SIZES.sm"
          data-testid="edit-roles-btn"
          @click="startEditingRoles"
        >
          {{ BUTTON_WORDS.edit }}
        </UButton>

        <div v-if="isEditMode" :class="LAYOUTS.formButtonRow">
          <UButton
            v-bind="BUTTONS.cancel"
            :disabled="isSavingRoles"
            data-testid="cancel-roles-btn"
            @click="cancelEditingRoles"
          >
            {{ BUTTON_WORDS.cancel }}
          </UButton>
          <UButton
            v-bind="BUTTONS.save"
            :loading="isSavingRoles"
            data-testid="save-roles-btn"
            @click="saveRoles"
          >
            {{ BUTTON_WORDS.save }}
          </UButton>
        </div>
      </div>

      <div v-if="isViewMode" :class="COMPONENTS.userProfileCard.roleBadges">
        <UBadge
          v-for="role in visibleRoles"
          :key="role"
          :color="roleLabels[role]?.color || COLOR.neutral"
          :variant="NOISE.soft"
          :size="SIZES.md"
        >
          <UIcon :name="roleLabels[role]?.icon || ICONS.user" :class="COMPONENTS.adminUsers.roleIcon" />
          {{ roleLabels[role]?.label || role }}
        </UBadge>
        <span v-if="visibleRoles.length === 0" :class="TYPOGRAPHY.bodyTextMuted">Ingen roller</span>
      </div>

      <div v-if="isEditMode" :class="COMPONENTS.userProfileCard.roleToggles">
        <div
          v-for="role in allRoles"
          :key="role"
          :class="COMPONENTS.userProfileCard.roleToggle"
        >
          <div :class="COMPONENTS.userProfileCard.roleLabel">
            <UIcon
              :name="roleLabels[role]?.icon || ICONS.user"
              :class="isRoleDisabled(role) ? COMPONENTS.userProfileCard.roleDisabled : ''"
            />
            <span :class="[TYPOGRAPHY.bodyText, isRoleDisabled(role) ? COMPONENTS.userProfileCard.roleDisabled : '']">
              {{ roleLabels[role]?.label || role }}
            </span>
            <span v-if="isRoleDisabled(role)" :class="TYPOGRAPHY.bodyTextMuted">{{ USER_WORDS.profile.roles.heynaboOwned }}</span>
          </div>
          <USwitch
            :model-value="draftRoles.has(role)"
            :disabled="isRoleDisabled(role)"
            :data-testid="`role-toggle-${role}`"
            @update:model-value="toggleRole(role)"
          />
        </div>

        <UAlert
          v-bind="ALERTS.info"
          :icon="ICONS.authorize"
          :title="USER_WORDS.profile.roles.helpTitle"
        >
          <template #description>
            <ul :class="COMPONENTS.userProfileCard.roleNotes">
              <li v-for="role in allRoles" :key="role"><strong>{{ roleLabels[role]?.label }}</strong> - {{ USER_WORDS.profile.roles.help[role] }}</li>
            </ul>
          </template>
        </UAlert>
      </div>
    </template>
  </UCard>
</template>
