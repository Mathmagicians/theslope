<script setup lang="ts">

// Get SystemRole enum from validation composable
const {SystemRoleSchema} = useUserValidation()
const SystemRole = SystemRoleSchema.enum

const store = useUsersStore()
const {isImportHeynaboLoading,  isUsersLoading, isUsersErrored, usersError } = storeToRefs(store)
const {importHeynaboData} = store

const formattedUsers = computed(() => users.value?.map((user) => {
  return {
    ...user,
    updatedAt: timeAgo(user.updatedAt)
  }
})) || []

const colorForSystemRole = (role: string) => {
  switch (role) {
    case SystemRole.ADMIN: return 'error'
    case SystemRole.ALLERGYMANAGER: return 'warning'
    default: return 'neutral'
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
  <UCard id="admin-users" data-test-id="admin-users"
              class="flex flex-col items-center text-secondary">
    <template #header>
      <h1 class="text-pink-50">🪪 Brugere</h1>
      <UButton @click="importHeynaboData" :loading="isImportHeynaboLoading" class="m-4 " color="info" size="lg" variant="soft"
               icon="i-pajamas-admin">
        Importer data fra Heynabo
      </UButton>
      <USeparator class="my-2 md:my-4"/>
    </template>

    <!-- Show when users are loaded -->
    <ViewError v-if="isUsersErrored" :error="usersError?.statusCode"
    :message="Kunne ikke loade brugerdata 🤖"/>
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
