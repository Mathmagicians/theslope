<script setup lang="ts">

// Get SystemRole enum from validation composable
const {SystemRoleSchema} = useUserValidation()
const SystemRole = SystemRoleSchema.enum

const store = useUsersStore()
const {formattedUsers} = storeToRefs(store)
const {importing} = storeToRefs(store)
const {loadData, importHeynaboData} = store
loadData()

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
  <UCard id="adminusers" data-test-id="admin-users"
              class="flex flex-col items-center text-secondary">
    <h1 class="text-pink-50">Brugere</h1>
    <UButton @click="importHeynaboData" :loading="importing" class="m-4 " color="info" size="lg" variant="soft"
             icon="i-pajamas-admin">
      Importer data fra Heynabo
    </UButton>
    <USeparator class="my-2 md:my-4"/>
    <!-- Show when users are loaded -->
    <UTable
        :data="formattedUsers"
        :columns="userColumns"
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
      </template>

      <template #updatedAt-cell="{ row }">
        {{ row.original.updatedAt }} siden
      </template>
    </UTable>
  </UCard>
</template>
