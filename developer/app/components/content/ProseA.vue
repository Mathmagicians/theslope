<script setup lang="ts">
import ProseABase from '@nuxt/ui/components/prose/A.vue'

defineOptions({inheritAttrs: false})

const props = defineProps<{href?: string, target?: string}>()

const REPO = 'https://github.com/Mathmagicians/theslope'
// A doc's relative link, resolved against docs/ in the repository
const repoPath = (relative: string) => {
  const out: string[] = []
  for (const segment of ['docs', ...relative.split('/')]) {
    if (segment === '..') out.pop()
    else if (segment && segment !== '.') out.push(segment)
  }
  return out.join('/') + (relative.endsWith('/') ? '/' : '')
}
// A folder opens as a tree, a file as a blob; a file named without its extension is a markdown file
const onGitHub = (path: string, hash: string) => path.endsWith('/')
  ? `${REPO}/tree/main/${path.replace(/\/$/, '')}`
  : `${REPO}/blob/main/${/\.[a-z0-9]+$/i.test(path) ? path : `${path}.md`}${hash}`
// The site carries the top-level docs at /docs/<name>, the name lowercased as Nuxt Content routes it; a link into
// the rest of the repository leads to it on GitHub
const href = computed(() => {
  const given = props.href ?? ''
  if (/^(#|[a-z][a-z0-9+.-]*:)/i.test(given)) return given
  const [path = '', fragment] = given.split('#')
  const hash = fragment ? `#${fragment}` : ''
  if (path.startsWith('/')) {
    const inSite = /^\/(docs(\/[^/]+)?|environments(\/.*)?)?\/?$/.test(path) && !/^\/docs\/(features|samples|screenshots)\/?$/.test(path)
    return inSite ? given : onGitHub(path.replace(/^\//, ''), hash)
  }
  const resolved = repoPath(path)
  return /^docs\/[^/]+(\.md)?$/.test(resolved) ? `/${resolved.replace(/\.md$/, '').toLowerCase()}${hash}` : onGitHub(resolved, hash)
})
const target = computed(() => href.value.startsWith('http') ? '_blank' : props.target)
</script>

<template>
  <ProseABase v-bind="$attrs" :href="href" :target="target"><slot /></ProseABase>
</template>
