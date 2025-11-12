import type {FormMode} from "~/types/form";
import {FORM_MODES} from "~/types/form";

export const isFormMode = (mode: string): boolean => {
  return Object.values(FORM_MODES).includes(mode as FormMode)
}
export const toFormMode = (mode: string): FormMode|undefined => {
  if(isFormMode(mode)) return mode as FormMode
  return undefined
}

// Shared styling for UFieldGroup containers (used in WeekDayMapDinnerModeDisplay and HouseholdCard)
export const FIELD_GROUP_CLASSES = 'p-0 md:p-1.5 rounded-none md:rounded-lg border border-default bg-neutral gap-0 md:gap-1'

// Shared styling for weekday preference display (header and rows)
export const WEEKDAY_FIELD_GROUP_CLASSES = `${FIELD_GROUP_CLASSES} min-w-16 md:min-w-32`
export const WEEKDAY_BADGE_CONTENT_SIZE = 'size-4 md:size-8'
