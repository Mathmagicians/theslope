import type {FormMode} from "~/types/form";
import {FORM_MODES} from "~/types/form";

/**
 * Form mode validation utilities
 */

export const isFormMode = (mode: string): boolean => {
  return Object.values(FORM_MODES).includes(mode as FormMode)
}

export const toFormMode = (mode: string): FormMode|undefined => {
  if(isFormMode(mode)) return mode as FormMode
  return undefined
}
