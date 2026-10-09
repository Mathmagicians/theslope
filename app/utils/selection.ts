import type {ShallowRef} from 'vue'

/** Masks a gone id out of a page's selection getter, which keeps carrying every later URL to the store */
export const skipGoneId = (choice: ShallowRef<() => number | null>, goneId: number | null) => {
    const read = choice.value
    choice.value = () => {
        const id = read()
        return id === goneId ? null : id
    }
}
