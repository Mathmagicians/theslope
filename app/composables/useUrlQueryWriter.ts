import type {QueryWrite, UrlWriteOptions, UrlWriteBatch} from '~~/shared/types/url-writes'

export type {QueryWrite, UrlWriteOptions} from '~~/shared/types/url-writes'

/**
 * The one writer of the current page's URL. Every parameter, the form mode, the season and the tab go through
 * `write`, which collects the writes of a tick, applies them in priority order onto the committed query and
 * navigates once, so no writer ever navigates from another writer's stale snapshot.
 */
export const useUrlQueryWriter = () => {
  const nuxtApp = useNuxtApp()
  const route = useRoute()

  const scheduleFlush = (batch: UrlWriteBatch): Promise<void> => {
    const previous = batch.last
    const flush = nextTick().then(async () => {
      // The previous batch has landed first; its failure never blocks the writes behind it
      await previous.catch(() => undefined)
      const writes = [...batch.writes].sort((a, b) => a.priority - b.priority || a.order - b.order)
      batch.writes = []
      batch.flush = null
      const query = writes.reduce((current, {apply}) => apply(current), {...route.query})
      const target = writes.findLast(({path: next}) => next !== undefined)?.path ?? route.path
      await navigateTo({path: target, query}, {replace: writes.every(({replace: keepsHistory}) => keepsHistory)})
    })
    batch.flush = flush
    batch.last = flush
    return flush
  }

  const write = (apply: QueryWrite, {priority = 0, replace = true, path}: UrlWriteOptions = {}): Promise<void> => {
    const batch: UrlWriteBatch = nuxtApp._urlWrites ??= {writes: [], flush: null, last: Promise.resolve()}
    batch.writes.push({apply, priority, replace, path, order: batch.writes.length})
    return batch.flush ?? scheduleFlush(batch)
  }

  return {write}
}
