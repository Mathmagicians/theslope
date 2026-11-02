// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import AllergyManagersList from '~/components/allergy/AllergyManagersList.vue'
import UserListItem from '~/components/shared/UserListItem.vue'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {useCoreValidation} from '~/composables/useCoreValidation'
import {ALLERGY_WORDS} from '~/config/allergyWords'
import {mountWithTooltipProvider, registerEmptyStoreEndpoints, resetStores} from '~~/tests/component/testHelpers'

const SystemRole = useCoreValidation().SystemRoleSchema.enum

// Two managers live here; an account without an inhabitant holds the role as well
const managers = ['allergy-managers-anna', 'allergy-managers-bo'].map((salt, index) =>
    UserFactory.defaultUserWithInhabitant(salt, {id: index + 1, systemRoles: [SystemRole.ALLERGYMANAGER]}))
const accountWithoutInhabitant = {...UserFactory.defaultUserWithInhabitant('allergy-managers-account', {id: 3}), Inhabitant: null}

registerEmptyStoreEndpoints()
registerEndpoint(`/api/admin/users/by-role/${SystemRole.ALLERGYMANAGER}`, () => [...managers, accountWithoutInhabitant])

// The next test's resetStores drops the dataset a still-mounted list reads
enableAutoUnmount(afterEach)

beforeEach(() => {
    resetStores()
})

describe('AllergyManagersList', () => {
    it('lists the allergy managers who live here under the box\'s title, line and label', async () => {
        const wrapper = await mountWithTooltipProvider(AllergyManagersList, {isMd: true})

        await vi.waitFor(() => expect([wrapper.findComponent(UserListItem).props('inhabitants')].flat().map(inhabitant => inhabitant.name))
            .toEqual(managers.map(manager => manager.Inhabitant?.name)))
        expect(wrapper.text()).toContain(ALLERGY_WORDS.managers.title)
        expect(wrapper.text()).toContain(ALLERGY_WORDS.managers.message)
        expect(wrapper.findComponent(UserListItem).props('label')).toBe(ALLERGY_WORDS.managers.label)
    })
})
