import {describe, it, expect, vi} from 'vitest'
import {nextTick} from 'vue'
import {useExpandableRow} from '~/composables/useExpandableRow'

// A table's open row, keyed by the row id UTable's getRowId gives: a row keeps its open state when rows come in above it
describe('useExpandableRow', () => {
    // Two rows of the day view: the household's power row and the add-guest row
    const POWER = 'power-mode'
    const ADD_GUEST = 'guest-add'

    const setup = () => {
        const onExpand = vi.fn<(rowId: string) => void>()
        const onCollapse = vi.fn<() => void>()
        const rows = useExpandableRow({onExpand, onCollapse})
        // What the table writes through v-model:expanded: a toggle adds the row's id, or drops it
        const write = async (state: Record<string, boolean>) => {
            rows.expanded.value = state
            await nextTick()
        }
        const openRows = () => Object.keys(rows.expanded.value).filter(rowId => rows.expanded.value[rowId])
        return {...rows, onExpand, onCollapse, write, openRows}
    }

    it('WHEN a row opens THEN it is the open row by its id, and onExpand receives the id', async () => {
        const {write, openRows, expandedRowId, onExpand} = setup()

        await write({[ADD_GUEST]: true})

        expect(openRows()).toEqual([ADD_GUEST])
        expect(expandedRowId.value).toBe(ADD_GUEST)
        expect(onExpand).toHaveBeenCalledExactlyOnceWith(ADD_GUEST)
    })

    it('GIVEN an open row WHEN a second row opens THEN the first closes and onExpand receives the second', async () => {
        const {write, openRows, expandedRowId, onExpand} = setup()
        await write({[POWER]: true})

        await write({[POWER]: true, [ADD_GUEST]: true})

        expect(openRows()).toEqual([ADD_GUEST])
        expect(expandedRowId.value).toBe(ADD_GUEST)
        expect(onExpand).toHaveBeenLastCalledWith(ADD_GUEST)
    })

    it('GIVEN an open row WHEN it closes THEN no row is open and onCollapse runs', async () => {
        const {write, openRows, expandedRowId, onCollapse} = setup()
        await write({[ADD_GUEST]: true})

        await write({})

        expect(openRows()).toEqual([])
        expect(expandedRowId.value).toBeNull()
        expect(onCollapse).toHaveBeenCalledOnce()
    })
})
