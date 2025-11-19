<script setup lang="ts">

// Get SystemRole enum from validation composable
const {SystemRoleSchema} = useCoreValidation()
const SystemRole = SystemRoleSchema.enum

const store = useUsersStore()
const {isImportHeynaboLoading, users, isUsersLoading, isUsersErrored, usersError} = storeToRefs(store)
const {importHeynaboData} = store

const formattedUsers = computed(() => users.value?.map((user) => {
  return {
    ...user,
    updatedAt: user.updatedAt ? formatRelativeTime(user.updatedAt!) : '?'
  }
})) || []

const colorForSystemRole = (role: string) => {
  switch (role) {
    case SystemRole.ADMIN:
      return 'error'
    case SystemRole.ALLERGYMANAGER:
      return 'warning'
    default:
      return 'neutral'
  }
}

const userColumns = [
  {accessorKey: 'id', header: '#'},
  {accessorKey: 'email', header: 'Mail'},
  {accessorKey: 'phone', header: 'Telefon'},
  {accessorKey: 'systemRoles', header: 'Systemroller'},
  {accessorKey: 'updatedAt', header: 'Sidst opdateret'},
]

</script>


<template>
  <UCard
id="admin-users" data-test-id="admin-users"
         class="flex flex-col items-center text-secondary">
    <template #header>
      <UAlert
          title=" Brugere"
          description="Her kan du se de brugere, som vi har importeret fra Heynabo. Du kan også se, hvilke systemroller brugerne har."
          icon="i-hugeicons-authorized"
          variant="outline"
          :actions="[
      {
        label: 'Importer data fra Heynabo',
        size: 'lg',
        variant: 'soft',
        color: 'info',
        icon: 'i-pajamas-admin',
        loading: isImportHeynaboLoading,
        onClick: importHeynaboData
      }    ]"/>
    </template>

    <!-- Show when users are loaded -->
   <ViewError
v-if="isUsersErrored"
               :status-code="usersError?.statusCode" :cause="usersError"
               message="Kunne ikke loade bruger data 🤖"
    />
    <UTable
        :data="formattedUsers"
        :columns="userColumns"
        :loading="isUsersLoading"
        loading-color="secondary" loading-animation="carousel"
        empty="Ingen brugere at vise ..."
        caption="Brugere - importeret fra Heynabo"
        class="w-full"
    >
      <template #systemRoles-cell="{ row }">
        <div v-if="row.original.systemRoles && row.original.systemRoles.length > 0" class="flex gap-1 flex-wrap">
          <UBadge
              v-for="role in row.original.systemRoles"
              :key="role"
              :color="colorForSystemRole(role)"
              variant="soft"
              size="md"
          >
            {{ role === SystemRole.ALLERGYMANAGER ? 'ALLERGIER' : role }}
          </UBadge>
        </div>
        <span v-else>-</span>
      </template>

      <template #updatedAt-cell="{ row }">
        {{ row.original.updatedAt }} siden
      </template>
    </UTable>
  </UCard>
</template>
