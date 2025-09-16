<script setup lang="ts">
import type {TabsItem} from '@nuxt/ui'

const route = useRoute()
const router = useRouter()

const items: TabsItem[] = [
  {
    label: 'Account',
    value: 'account'
  },
  {
    label: 'Password',
    value: 'password'
  }
]

const selectedTab = ref(route.hash.slice(1) || 'account')

const active = computed({
  get() {
    return selectedTab.value
  },
  set(tab) {
    selectedTab.value = tab
    console.log('AdminTester2 > active > setting tab:', {tab})
    router.replace({
      path: route.path,
      query: route.query,
      hash: '#' + tab
    })
  }
})


</script>

<template>
 <div>
   <!-- Invisible scroll anchor -->
   <a :id="active" class="absolute w-0 h-0 opacity-0 pointer-events-none" href="#"></a>
   <UTabs v-model="active" :content="false" :items="items" class="w-full"/>
 </div>
</template>
