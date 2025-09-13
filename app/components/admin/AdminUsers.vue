<script setup lang="ts">

const store = useUsersStore()
const {formattedUsers} = storeToRefs(store)
const {importing} = storeToRefs(store)
const {loadData, importHeynaboData} = store
loadData()
const UBadge = resolveComponent('UBadge')
const classForSystemRole = (role: string) => role === 'ADMIN' ? 'red' : 'green'

/*
    cell: ({row}) => {
      const color = classForSystemRole(row.getValue('systemRole'))
      return h(UBadge,
          {class: 'capitalize', variant: 'subtle', color},
          () => row.getValue('systemRole')
      )
    }
 */

const userColumns = [
  {accessorKey: 'id', header: '#'},
  {accessorKey: 'email', header: 'Mail'},
  {accessorKey: 'phone', header: 'Telefon'},
  {
    accessorKey: 'systemRole',
    header: 'Systemrolle'
  },
  {accessorKey: 'updatedAt', header: 'Sidst opdateret', cell: ({ row }) => `for #${row.getValue('updatedAt')} siden`},
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
    </UTable>
  </UCard>
</template>
