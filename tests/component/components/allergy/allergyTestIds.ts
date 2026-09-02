// data-testid contract of the allergy catalog UI, shared by every spec that drives it
// (AdminAllergies, AllergyDetailPanel, AllergyTypeCard, AllergenMultiSelector)
export const ALLERGY_TEST_IDS = {
    // AllergyTypeCard form
    form: 'allergy-type-form',
    save: 'save-allergy-type',
    cancel: 'cancel-allergy-type',
    ageBadge: 'inhabitant-age-badge',
    // AllergyDetailPanel actions
    edit: 'edit-allergy-type',
    delete: 'delete-allergy-type',
    deleteConfirm: 'delete-allergy-type-confirm',
    cancelDelete: 'cancel-delete-allergy-type',
    confirmDelete: 'confirm-delete-allergy-type',
    // AdminAllergies toolbar
    create: 'create-allergy-type',
    compare: 'multiselect-toggle',
    sort: 'sort-by-count',
    // AllergenMultiSelector
    summaryBar: 'compare-summary-bar',
    // AllergyCatalogTable rows
    row: (allergyTypeId: number) => `allergy-row-${allergyTypeId}`
} as const
