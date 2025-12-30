<script setup lang="ts">
import {h, resolveComponent} from 'vue'

const UButton = resolveComponent('UButton')

const store = useUsersStore()
const {users, isUsersLoading, isUsersErrored, usersError} = storeToRefs(store)

// Use existing role badge definitions
const {roleLabels} = useUserRoles()
const {COMPONENTS, ICONS} = useTheSlopeDesignSystem()

const formattedUsers = computed(() => users.value?.map((user) => {
  return {
    ...user,
    greeting: user.Inhabitant?.name || 'Ukendt bruger',
    updatedAt: user.updatedAt ? formatRelativeTime(user.updatedAt!) : '?'
  }
})) || []

// Track expanded rows
const expanded = ref<Record<number, boolean>>({})

// Type guard to ensure user has required Inhabitant data
type UserWithInhabitant = typeof users.value[number] & {
  Inhabitant: NonNullable<typeof users.value[number]['Inhabitant']>
}

function hasInhabitant(user: typeof users.value[number] | null | undefined): user is UserWithInhabitant {
  return !!user?.Inhabitant
}

// Track the currently expanded user via ref (set by watcher)
const expandedUser = ref<UserWithInhabitant | null>(null)

// Watch for row expansion to track expanded user and enforce single expansion
watch(expanded, (newExpanded, oldExpanded) => {
  const expandedKeys = Object.keys(newExpanded).filter(key => newExpanded[Number(key)])

  if (expandedKeys.length > 1) {
    // More than one row expanded - close all except the most recently opened
    const newlyExpandedKey = expandedKeys.find(key => !oldExpanded[Number(key)])
    if (newlyExpandedKey) {
      Object.keys(expanded.value).forEach(key => {
        if (key !== newlyExpandedKey) {
          expanded.value[Number(key)] = false
        }
      })

      // Set expanded user for the newly expanded row
      const rowIndex = Number(newlyExpandedKey)
      const formattedUser = formattedUsers.value[rowIndex]
      if (formattedUser) {
        const originalUser = users.value.find(u => u.id === formattedUser.id)
        expandedUser.value = hasInhabitant(originalUser) ? originalUser : null
      }
    }
  } else if (expandedKeys.length === 1) {
    // Exactly one row expanded - set expanded user
    const rowIndex = Number(expandedKeys[0])
    const formattedUser = formattedUsers.value[rowIndex]
    if (formattedUser) {
      const originalUser = users.value.find(u => u.id === formattedUser.id)
      expandedUser.value = hasInhabitant(originalUser) ? originalUser : null
    }
  } else {
    // No rows expanded - clear expanded user
    expandedUser.value = null
  }
})

// Table columns - row type comes from UTable (TanStack Table)
interface TableRow {
  getIsExpanded: () => boolean
  toggleExpanded: () => void
  original: typeof formattedUsers.value[number]
}

const userColumns = [
  {
    id: 'expand',
    cell: ({row}: {row: TableRow}) =>
        h(UButton, {
          color: 'neutral',
          variant: 'ghost',
          icon: row.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight,
          square: true,
          'aria-label': row.getIsExpanded() ? 'Luk' : 'Åbn detaljer',
          onClick: () => row.toggleExpanded()
        })
  },
  {accessorKey: 'id', header: '#'},
  {accessorKey: 'greeting', header: 'Navn'},
  {accessorKey: 'email', header: 'Mail'},
  {accessorKey: 'phone', header: 'Telefon'},
  {accessorKey: 'systemRoles', header: 'Systemroller'},
  {accessorKey: 'updatedAt', header: 'Sidst opdateret'},
]

</script>


<template>
  <UCard
      id="admin-users" data-testid="admin-users"
      class="flex flex-col items-center text-secondary">
    <template #header>
      <UAlert
          title=" Brugere"
          description="Her kan du se de brugere, som vi har importeret fra Heynabo. Du kan også se, hvilke systemroller brugerne har. Brug System-fanen til at køre Heynabo import."
          icon="i-hugeicons-authorized"
          variant="outline"
      />
    </template>

    <!-- Show when users are loaded -->
    <ViewError
        v-if="isUsersErrored"
        :status-code="usersError?.statusCode" :cause="usersError"
        message="Kunne ikke loade bruger data 🤖"
    />
    <UTable
        v-model:expanded="expanded"
        :data="formattedUsers"
        :columns="userColumns"
        :loading="isUsersLoading"
        loading-color="secondary" loading-animation="carousel"
        empty="Ingen brugere at vise ..."
        caption="Brugere - importeret fra Heynabo"
        class="w-full"
        :ui="COMPONENTS.table.ui"
    >
      <template #systemRoles-cell="{ row }">
        <div v-if="row.original.systemRoles && row.original.systemRoles.length > 0" class="flex gap-1 flex-wrap">
          <UBadge
            v-for="role in row.original.systemRoles"
            :key="role"
            :color="roleLabels[role]?.color || 'neutral'"
            variant="soft"
            size="md"
          >
            <UIcon v-if="roleLabels[role]?.icon" :name="roleLabels[role].icon" class="mr-1" />
            {{ roleLabels[role]?.label || role }}
          </UBadge>
        </div>
        <span v-else>-</span>
      </template>

      <template #updatedAt-cell="{ row }">
        {{ row.original.updatedAt }} siden
      </template>

      <!-- Expanded row content -->
      <template #expanded>
        <div class="p-4 bg-neutral-50 dark:bg-neutral-900">
          <UserProfileCard
            v-if="expandedUser"
            :user="expandedUser"
            :show-actions="false"
          />
          <p v-else class="text-gray-500">Ingen brugerdata tilgængelig</p>
        </div>
      </template>
    </UTable>
  </UCard>
</template>
