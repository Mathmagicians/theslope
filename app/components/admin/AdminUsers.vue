<!--
UX MOCKUP: /admin/users table

┌─────────────────────────────────┐
│ Søg efter navn… (search icon)   │
│ [(sort icon) Navn] (pager) 1    │
├───┬────┬─────────┬──────────────┼ - - - - - - - - - - - - - - - - - - - - - - -
│   │ #  │ Navn    │ Mail         │ Telefon    Systemroller  Sidst opdateret
│ › │ 12 │ Anna    │ anna@…       │ 12345678   [badge]       for 2 dage siden
│ ⌄ │ 13 │ Bo      │ bo@…         │ …          [badge]       …
│ ┌─────────────────────────────┐ │
│ │ UserProfileCard             │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
Every viewport shows all six columns beside the chevron column; on a phone the table scrolls sideways inside its card.
The chevron opens one row at a time, holding the user's UserProfileCard; on a phone the card keeps to the box in view while the columns scroll.
-->

<script setup lang="ts">
import {h, resolveComponent} from 'vue'
import {getPaginationRowModel} from '@tanstack/vue-table'
import {BUTTON_WORDS} from '~/config/buttonWords'
import {USER_WORDS} from '~/config/userWords'

interface Props {
  canEdit?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  canEdit: false
})

const UButton = resolveComponent('UButton')

const store = useUsersStore()
const {users, isUsersLoading, isUsersErrored, usersError} = storeToRefs(store)
store.loadUsers()

const {roleLabels} = useUserRolesUi()
const {COMPONENTS, ICONS, ALERTS, COLOR, TEXT, BG, NOISE, SIZES} = useTheSlopeDesignSystem()

const searchQuery = ref('')
const sortDescending = ref(false)

const filteredUsers = computed(() => {
  let result = users.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(user =>
      user.Inhabitant?.name?.toLowerCase().includes(query) ||
      user.Inhabitant?.lastName?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    )
  }

  // The users arrive sorted by name; descending reverses them
  if (sortDescending.value) {
    result = [...result].reverse()
  }

  return result
})

const formattedUsers = computed(() => filteredUsers.value.map(user => ({
  ...user,
  greeting: user.Inhabitant?.name || USER_WORDS.unknownUser
})))

type UserWithInhabitant = typeof users.value[number] & {
  Inhabitant: NonNullable<typeof users.value[number]['Inhabitant']>
}

const hasInhabitant = (user: typeof users.value[number] | undefined): user is UserWithInhabitant => !!user?.Inhabitant

const expandedUser = ref<UserWithInhabitant | null>(null)

const {expanded} = useExpandableRow({
  onExpand: (rowId) => {
    const user = findRowById(users.value, rowId)
    expandedUser.value = hasInhabitant(user) ? user : null
  },
  onCollapse: () => {
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
          color: COLOR.neutral,
          variant: NOISE.quiet,
          icon: row.getIsExpanded() ? ICONS.chevronDown : ICONS.chevronRight,
          square: true,
          'aria-label': row.getIsExpanded() ? BUTTON_WORDS.close : BUTTON_WORDS.openDetails,
          onClick: () => row.toggleExpanded()
        })
  },
  {accessorKey: 'id', header: '#'},
  {accessorKey: 'greeting', header: USER_WORDS.admin.columns.name},
  {accessorKey: 'email', header: USER_WORDS.admin.columns.email},
  {accessorKey: 'phone', header: USER_WORDS.admin.columns.phone},
  {accessorKey: 'systemRoles', header: USER_WORDS.admin.columns.systemRoles},
  {accessorKey: 'updatedAt', header: USER_WORDS.admin.columns.updatedAt},
]

// Table ref for pagination control
const table = useTemplateRef('table')

// Pagination - initial state, controlled via table API
const pagination = ref({
  pageIndex: 0,
  pageSize: 10
})
</script>


<template>
  <UCard
      id="admin-users" data-testid="admin-users"
      :class="COMPONENTS.adminUsers.card">
    <template #header>
      <div :class="COMPONENTS.adminUsers.header">
        <UAlert
            v-bind="ALERTS.info"
            :icon="ICONS.authorized"
            :title="USER_WORDS.admin.title"
            :description="USER_WORDS.admin.intro"
        />
      </div>
    </template>

    <div :class="COMPONENTS.adminUsers.toolbar">
      <TableSearchPagination
          v-model:search-query="searchQuery"
          v-model:sort-descending="sortDescending"
          :table="table"
          :pagination="pagination"
          :placeholder="USER_WORDS.admin.search"
          :sort-label="USER_WORDS.admin.columns.name"
          test-id="user-search"
      />
    </div>

    <ViewError
        v-if="isUsersErrored"
        :status-code="usersError?.statusCode" :cause="usersError"
        :message="USER_WORDS.admin.failed"
    />
    <UTable
        ref="table"
        v-model:expanded="expanded"
        v-model:pagination="pagination"
        :get-row-id="rowIdOf"
        :data="formattedUsers"
        :columns="userColumns"
        :loading="isUsersLoading"
        v-bind="COMPONENTS.adminUsers.loadingBar"
        :caption="USER_WORDS.admin.caption"
        :class="COMPONENTS.adminUsers.table"
        :ui="COMPONENTS.table.adminUsersUi"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel()
        }"
    >
      <template #systemRoles-cell="{ row }">
        <div v-if="row.original.systemRoles && row.original.systemRoles.length > 0" :class="COMPONENTS.adminUsers.roles">
          <UBadge
            v-for="role in row.original.systemRoles"
            :key="role"
            :color="roleLabels[role]?.color || COLOR.neutral"
            :variant="NOISE.soft"
            :size="SIZES.md"
          >
            <UIcon v-if="roleLabels[role]?.icon" :name="roleLabels[role].icon" :class="COMPONENTS.adminUsers.roleIcon" />
            {{ roleLabels[role]?.label || role }}
          </UBadge>
        </div>
        <span v-else>-</span>
      </template>

      <template #updatedAt-cell="{ row }">
        <NuxtTime v-if="row.original.updatedAt" :datetime="row.original.updatedAt" relative :locale="DATE_SETTINGS.localeString"/>
        <span v-else>?</span>
      </template>

      <template #loading>
        <div :class="COMPONENTS.table.loadingRow">
          <UIcon :name="ICONS.sync" :size="SIZES.smallIconSize" :class="COMPONENTS.table.loadingSpinner" />
          Henter brugere...
        </div>
      </template>

      <template #empty>Ingen brugere at vise ...</template>

      <!-- Expanded row content -->
      <template #expanded>
        <div :class="[COMPONENTS.adminUsers.detail, COMPONENTS.adminUsers.expandedPanel, BG.panel]">
          <UserProfileCard
            v-if="expandedUser"
            :user="expandedUser"
            :show-actions="false"
            :show-role-manager="props.canEdit"
          />
          <p v-else :class="TEXT.gray[500]">Ingen brugerdata tilgængelig</p>
        </div>
      </template>
    </UTable>
  </UCard>
</template>
