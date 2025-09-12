<script setup lang="ts">

const store = useUsersStore()
const {formattedUsers} = storeToRefs(store)
const {importing} = storeToRefs(store)
const {loadData, importHeynaboData} = store
loadData()

const columnStyle = '[text-orange-800 dark:text-orange-200 text-sm font-semibold]'

const userColumns = [
  {key: 'id', label: '#', class: columnStyle},
  {key: 'email', label: 'Mail', class: 'text-orange-800'},
  {key: 'phone', label: 'Telefon', class: 'text-orange-800'},
  {key: 'systemRole', label: 'Systemrolle', class: 'text-orange-800'},
  {key: 'updatedAt', label: 'Sidst opdateret', class: 'text-orange-800'}
]

const classForSystemRole = (role: string) => role=== 'ADMIN' ? 'bg-red-100 text-red-800 px-2 py-1 dark:ring-2 dark:ring-red-50 rounded-full text-sm'
    : 'bg-green-100 text-green-800 dark:border dark:border-green-100 px-2 py-1 rounded-full text-sm'
</script>


<template>
  <div data-test-id="admin-users"
      class="flex flex-col items-center">
    <h1>Brugere</h1>
    <UButton @click="importHeynaboData" :loading="importing" class="m-4 " color="red" size="lg" variant="soft"
             icon="i-pajamas-admin">
      Importer data fra Heynabo
    </UButton>
    <UDivider class="my-2 md:my-4"/>
    <!-- Show when users are loaded -->
    <div class="bg-white dark:bg-orange-900" >
      <UTable
          :rows="formattedUsers"
          :columns="userColumns"
          :empty-state="{ icon: 'i-mdi-human-meditation', label: 'Ingen brugere at vise ...' }"
          class="w-full"
          :ui="{
            divide: 'divide-orange-800 dark:divide-orange-100',
            tbody: 'divide-orange-200 dark:divide-orange-600',
            th: {color: 'text-orange-800 dark:text-orange-100'},
            td: {color: 'text-orange-700 dark:text-orange-200'}
          }"
      >
        <template #caption>
          <caption class="text-orange-800 dark:text-orange-100 uppercase">Brugere - importeret fra Heynabo</caption>
        </template>
        <template #phone-data="{ row }" class="items-center">
          <span v-if="row.phone" class="mx-1"><UIcon name="i-guidance-phone"/></span><a :href="'tel:'+row.phone">{{ row.phone }}</a>
        </template>
        <template #email-data="{ row }">
          <NuxtLink class="underline" :to="`mailto:${row.email}`">{{ row.email }}</NuxtLink>
        </template>
        <template #systemRole-data="{ row }">
          <span :class="[classForSystemRole(row.systemRole)]">{{ row.systemRole }}</span>
        </template>
        <template #updatedAt-data="{ row }">
          <span class="text-xs text-orange-300 dark:text-orange-600">for </span>
          <span class="text-sm mx-1">{{ row.updatedAt }}</span>
          <span class="text-xs text-orange-300 dark:text-orange-600"> siden</span>
        </template>
      </UTable>
    </div>

  </div>
</template>
