// @vitest-environment nuxt
import {describe, it, expect, beforeEach, vi} from 'vitest'
import {flushPromises} from '@vue/test-utils'
import {mockNuxtImport} from '@nuxt/test-utils/runtime'
import {useUrlQueryWriter} from '~/composables/useUrlQueryWriter'

const {mockNavigateTo, mockRouteData} = vi.hoisted(() => ({
  mockNavigateTo: vi.fn(),
  mockRouteData: {
    path: '/admin/teams',
    params: {} as Record<string, string | undefined>,
    query: {} as Record<string, string>,
    hash: ''
  }
}))
mockNuxtImport('navigateTo', () => mockNavigateTo)
mockNuxtImport('useRoute', () => () => mockRouteData)

describe('useUrlQueryWriter', () => {
  const setupQuery = (query: Record<string, string>) => {
    for (const key of Object.keys(mockRouteData.query)) Reflect.deleteProperty(mockRouteData.query, key)
    Object.assign(mockRouteData.query, query)
  }
  // The mocked navigation lands on the mocked route, as the router does
  const landNavigation = async ({path, query}: {path: string, query: Record<string, string>}) => {
    mockRouteData.path = path
    setupQuery(query)
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    mockNavigateTo.mockImplementation(landNavigation)
    mockRouteData.path = '/admin/teams'
    setupQuery({season: 'S1'})
    await flushPromises()
  })

  it('applies the writes of one tick onto the committed query in one navigation', async () => {
    const {write} = useUrlQueryWriter()

    const first = write(query => ({...query, mode: 'edit'}))
    const second = write(query => ({...query, team: '7'}))
    await Promise.all([first, second])

    expect(mockNavigateTo).toHaveBeenCalledTimes(1)
    expect(mockNavigateTo.mock.calls[0]![0]).toEqual({path: '/admin/teams', query: {season: 'S1', mode: 'edit', team: '7'}})
    expect(mockNavigateTo.mock.calls[0]![1]).toEqual({replace: true})
  })

  it('lets the higher priority win a key conflict regardless of arrival order', async () => {
    const {write} = useUrlQueryWriter()

    await Promise.all([
      write(query => ({...query, mode: 'view'}), {priority: 10}),
      write(query => ({...query, mode: 'edit'}))
    ])

    expect(mockNavigateTo.mock.calls[0]![0].query).toEqual({season: 'S1', mode: 'view'})
  })

  it('carries a path change on the same navigation as the query writes of its tick', async () => {
    const {write} = useUrlQueryWriter()

    await Promise.all([
      write(query => query, {path: '/admin/planning'}),
      write(query => ({...query, mode: 'create'}))
    ])

    expect(mockNavigateTo).toHaveBeenCalledTimes(1)
    expect(mockNavigateTo.mock.calls[0]![0]).toEqual({path: '/admin/planning', query: {season: 'S1', mode: 'create'}})
  })

  it('pushes history when one write of the batch asks for it', async () => {
    const {write} = useUrlQueryWriter()

    await Promise.all([
      write(query => ({...query, mode: 'edit'})),
      write(query => ({...query, team: '7'}), {replace: false})
    ])

    expect(mockNavigateTo.mock.calls[0]![1]).toEqual({replace: false})
  })

  it('reads the query a previous tick committed and survives a failed navigation', async () => {
    const {write} = useUrlQueryWriter()

    mockNavigateTo.mockImplementationOnce(async () => { throw new Error('navigation aborted') })
    await expect(write(query => ({...query, mode: 'edit'}))).rejects.toThrow('navigation aborted')

    await write(query => ({...query, team: '7'}))
    await write(query => ({...query, mode: 'view'}))

    expect(mockNavigateTo).toHaveBeenCalledTimes(3)
    expect(mockNavigateTo.mock.lastCall![0].query).toEqual({season: 'S1', team: '7', mode: 'view'})
  })
})
