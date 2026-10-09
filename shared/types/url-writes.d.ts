// The URL writes of one tick and the navigation they produce (useUrlQueryWriter); a type-only module so the
// NuxtApp augmentation and the composable share it without the server project reaching into app code
import type {LocationQuery} from 'vue-router'

export type QueryWrite = (query: LocationQuery) => LocationQuery

export interface UrlWriteOptions {
  // Higher applies later and wins a key conflict; writes of one priority apply in arrival order
  priority?: number
  // One push in a batch makes the batch push
  replace?: boolean
  // A path change rides the same navigation as the query writes of its tick
  path?: string
}

export interface UrlWrite {
  apply: QueryWrite
  priority: number
  replace: boolean
  path?: string
  order: number
}

export interface UrlWriteBatch {
  writes: UrlWrite[]
  flush: Promise<void> | null
  // The navigation the previous batch produced; the next batch reads the query it committed
  last: Promise<void>
}
