// @vitest-environment nuxt
import {describe, it, expect, beforeEach, vi} from 'vitest'
import {flushPromises} from '@vue/test-utils'
import {mockNuxtImport} from '@nuxt/test-utils/runtime'
import {useUrlQueryWriter} from '~/composables/useUrlQueryWriter'
import {FORM_MODES} from '~/types/form'

const {mockNavigateTo, mockRoute: mockRouteData, landNavigation, useRoute} = await vi.hoisted(async () =>
  (await import('~~/tests/component/hoistedMocks')).mockRouteAndNavigation({path: '/admin/teams'}))
mockNuxtImport('navigateTo', () => mockNavigateTo)
mockNuxtImport('useRoute', () => useRoute)

describe('useUrlQueryWriter', () => {
  const setupQuery = (query: Record<string, string>) => {
    for (const key of Object.keys(mockRouteData.query)) Reflect.deleteProperty(mockRouteData.query, key)
    Object.assign(mockRouteData.query, query)
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

    const first = write(query => ({...query, mode: FORM_MODES.EDIT}))
    const second = write(query => ({...query, team: '7'}))
    await Promise.all([first, second])

    expect(mockNavigateTo).toHaveBeenCalledTimes(1)
    expect(mockNavigateTo.mock.calls[0]![0]).toEqual({path: '/admin/teams', query: {season: 'S1', mode: FORM_MODES.EDIT, team: '7'}})
    expect(mockNavigateTo.mock.calls[0]![1]).toEqual({replace: true})
  })

  it('lets the higher priority win a key conflict regardless of arrival order', async () => {
    const {write} = useUrlQueryWriter()

    await Promise.all([
      write(query => ({...query, mode: FORM_MODES.VIEW}), {priority: 10}),
      write(query => ({...query, mode: FORM_MODES.EDIT}))
    ])

    expect(mockNavigateTo.mock.calls[0]![0].query).toEqual({season: 'S1', mode: FORM_MODES.VIEW})
  })

  it('carries a path change on the same navigation as the query writes of its tick', async () => {
    const {write} = useUrlQueryWriter()

    await Promise.all([
      write(query => query, {path: '/admin/planning'}),
      write(query => ({...query, mode: FORM_MODES.CREATE}))
    ])

    expect(mockNavigateTo).toHaveBeenCalledTimes(1)
    expect(mockNavigateTo.mock.calls[0]![0]).toEqual({path: '/admin/planning', query: {season: 'S1', mode: FORM_MODES.CREATE}})
  })

  it('pushes history when one write of the batch asks for it', async () => {
    const {write} = useUrlQueryWriter()

    await Promise.all([
      write(query => ({...query, mode: FORM_MODES.EDIT})),
      write(query => ({...query, team: '7'}), {replace: false})
    ])

    expect(mockNavigateTo.mock.calls[0]![1]).toEqual({replace: false})
  })

  it('reads the query a previous tick committed and survives a failed navigation', async () => {
    const {write} = useUrlQueryWriter()

    mockNavigateTo.mockImplementationOnce(async () => { throw new Error('navigation aborted') })
    await expect(write(query => ({...query, mode: FORM_MODES.EDIT}))).rejects.toThrow('navigation aborted')

    await write(query => ({...query, team: '7'}))
    await write(query => ({...query, mode: FORM_MODES.VIEW}))

    expect(mockNavigateTo).toHaveBeenCalledTimes(3)
    expect(mockNavigateTo.mock.lastCall![0].query).toEqual({season: 'S1', team: '7', mode: FORM_MODES.VIEW})
  })
})
