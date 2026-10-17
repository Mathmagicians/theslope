import type {ShallowRef} from 'vue'

/**
 * Masks a gone id out of a page's selection getter, which keeps carrying every later URL to the store;
 * `resolve` maps a choice that is not an id (a shortName) to the id it names
 */
export const skipGoneId = <T>(
    choice: ShallowRef<() => T | null>,
    goneId: number | null,
    resolve: (chosen: T | null) => number | null = chosen => chosen as number | null
) => {
    const read = choice.value
    choice.value = () => {
        const chosen = read()
        return resolve(chosen) === goneId ? null : chosen
    }
}
