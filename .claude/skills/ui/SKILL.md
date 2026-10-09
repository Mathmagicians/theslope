---
name: ui
description: Use when writing or changing anything rendered - a .vue file, a design-system token, a Nuxt UI binding, a Tailwind class, a legend / alert / button / table / calendar pattern. Encodes ADR-018 (the design system owns every shared UI value), Nuxt UI and Nuxt conventions, Tailwind through tokens only, the contrast and architecture gates, and the DRY extraction rules, so UI work lands on the first review.
---

# UI work

Pages use Nuxt UI components; every shared UI value comes from `useTheSlopeDesignSystem` (ADR-018). A component binds a token and
passes domain props. Read `docs/ui.md` before the first edit; it names every token and the visual check a change requires.

## The contract

- **No styles in a `.vue`.** No `<style>` block, no raw utility class - sizing, spacing, flex, grid, rounding, shadows, colour,
  typography, animation, transitions, transforms. Every `class` and `:class` binds a token (`COMPONENTS.legend.entry`,
  `TYPOGRAPHY.finePrint`, `dayCircleClasses(...)`). Sole exemption: the print CSS in `app/pages/admin/allergies/pdf.vue`.
- **Every Nuxt UI prop that carries a design value binds a token**: `:color="COLOR.primary"`, `:size="SIZES.md"`,
  `v-bind="ALERTS.warning"`, `v-bind="BUTTONS.edit"`, `:icon="ICONS.edit"`. A literal `color="neutral"` or `size="md"` is a breach.
- **A token holds one rendered value**, light and dark together. Two values are two tokens, named by where they are used
  (`SIZES.lockChip` beside `SIZES.md`). Merging two values is a design decision the user takes from a visual proposal.
- **Layout responds inside tokens** with `md:` classes; `isMd` (provided by `app/layouts/default.vue`) sets prop values.
- A Nuxt UI component family gets a token, and an architecture rule under `tests/component/architecture/`, before its first use.

## True to Nuxt UI

- The pattern is a Nuxt UI component, bound to its kind: a panel, legend or empty state is `<UAlert v-bind="ALERTS.<kind>">`,
  a marker on a day is `UChip`, a team sample is `UBadge`, a table's empty state is its `#empty` slot, a calendar spreads
  `COMPONENTS.calendarGrid`, a panel that opens below a button spreads `BUTTONS.flipOpen(isOpen)`. A `div` with padding, a border
  and a grid is never the answer when the family exists.
- Reuse the surface that already renders the pattern (`DinnerModeLegend` is the "Forklaring" panel: a calendar legend binds
  the same `ALERTS.legend` and the same `COMPONENTS.legend.entries`). Look for the pattern before drawing a new one:
  `grep -rn "ALERTS\.\|BUTTONS\.\|COMPONENTS\." app/components`.
- The `ui` prop is set only through a token (`COMPONENTS.table.ui`, `COMPONENTS.calendarGrid.ui`), never inline.
- Nuxt UI v4 slot names (`#empty`, `#description`, `#day`, `#legend`); `#empty-state` is the v2 name and fails the rule.
- Attributes fall through where the component sends them: `UChip` passes `data-testid` to its slot content, not to the
  indicator. Put a test-id where it will land, and reach a part the component owns through its `data-slot` name in the spec.

## True to Nuxt

- Components, composables and utils are auto-imported; never import them by path. Types defined in an SFC are exported from
  a plain `<script lang="ts">` block above `<script setup>` and imported by path where needed.
- `defineProps` with `withDefaults`, `defineModel` for two-way state, `defineEmits` typed; arrow functions, no semicolons.
- Presentation (icons, labels, badge factories, store-aware predicates) lives in `use<Domain>Ui`, the design system or the
  component - never in a composable the server imports (ADR-017).

## Tailwind through the design system

- Utilities live in tokens. Keyframes and colour scales live in `app/assets/css/main.css` under `@theme`; an animation reaches a
  component as a token carrying the `animate-<name>` class plus `motion-reduce:animate-none`.
- Colour comes from the design-system families only (`COLOR`, `TEXT`, `BG`, `BORDER`, `RING`, the calendar palettes). A Tailwind
  palette shade (`gray-500`) or a Nuxt UI semantic utility (`text-muted`, `bg-elevated`) is a breach in a `.vue` and in a token:
  the contrast gate measures only what the design system owns.
- **The contrast gate** (`tests/component/architecture/designSystemContrast.unit.spec.ts`) walks the design system, measures every
  text-on-surface and boundary pair at the palette's level (AA for the base, AAA for the preset) and checks the generated palette
  files against the inventory. A new colour-bearing token is measured on every surface the day it lands. Fix the token, never the
  threshold; `PRESET_FINDINGS` holds no tolerated miss. When the inventory changes, `make palettes` regenerates
  `app/assets/css/palettes/*.css`, and the user commits the result.

## DRY

- One component per pattern. The extraction rule: a one-liner is never a component; an alert plus a button is not a component;
  a template that owns behaviour, state or a multi-element layout is. Shared logic that is a single expression lives once in a
  util or a token.
- A design-system deviation found in a file the package touches is fixed in the same package, on sight: a raw class, a
  literal size, variant, colour or icon, a hand-rolled panel. It is a broken window, never a finding to report or a
  decision to ask for. Only a deviation whose fix changes a rendered value is reported, with the token that replaces it.
- Extracting a value or a pattern sweeps every occurrence in the same change - every `.vue` site and every design-system
  class string. A partial sweep is a violation, not progress. The `dry` skill's Step 3 is the procedure: derive the grep from
  the abstraction's own body and search the whole tree.
- Token sweeps are value-preserving: compare the set of classes each template renders before and after. A site whose rendered
  classes differ from the token's is stopped on and presented as a decision; the user's default for a meaningless delta is to
  converge on the token.
- Test-ids are a contract. A rename ships with an old → new table and the specs that follow it.

## Forms

A form in this app has one shape; a form that departs from it is a broken window.

- **`<UForm :schema :state>`** with the domain's create or update schema from the validation composable; no hand-rolled
  validation, no casting. The draft is typed `z.input<typeof Schema>` so defaulted fields may start unset, and the
  schema fills them on submit.
- **Every field is a `<UFormField name="…">`** whose `name` is the schema path, so every schema message, cross-field
  rules included, has a field to show in. A picker component that wraps a field passes the `name` through.
- **Defaults come from the domain, never from "now"**: a period defaults to the season's dates, a percentage to its
  schema default (100), a weekday map to the season's cooking days through the existing weekday picker with
  `hide-restricted`.
- **Shared field groups are shared components** (`TeamRoleFields` for role and allocation, `WeekDayMapDisplay` for
  weekdays, `CalendarDateRangePicker` for a period); a second copy of a field group is an extraction, not a paste.
- **Buttons bind `BUTTONS.save` and `BUTTONS.cancel`**, the footer binds `LAYOUTS.formButtonRow`, the stack binds its
  form token; a literal `variant`, `size`, `color` or `icon` on a form button is a breach, and so is a class string.
- **The form emits; the store acts.** The form emits its parsed draft and `cancel`; the page or card calls the store
  action, which parses the response through its schema, refreshes and toasts once. A component never toasts a store
  action's result and never calls the API.
- **An inline form opens below its trigger** through `BUTTONS.flipOpen(isOpen)` with `aria-expanded`, and closes on
  submit or cancel.
- **The spec** mounts the real form: submit emits the schema's shape with its defaults, cancel emits nothing else, an
  invalid draft blocks the emit and shows the field message, and a shared field group's glyphs follow the selection.

## Gates before "done"

1. The architecture suite is green: `npx vitest run tests/component/architecture/` (usage rules, contrast, colour vision).
2. The component spec renders the real component and asserts usage and behaviour, never a token's value (`docs/testing.md`).
3. `docs/ui.md` names every new token and pattern; `docs/adr-compliance-frontend.md` carries the component's row.
4. `npm run pre:all` is clean.
5. A visual check table: route and state → viewport (phone 375px, desktop) → design-system element → what to expect.
6. Comments follow the `code-comments` skill: the non-obvious why, no history, no task references.

## Checklist

- [ ] Every `class`, `:class`, `color`, `size`, `icon`, `ui` binds a token
- [ ] The Nuxt UI family that owns the pattern renders it, through its kind
- [ ] The existing surface for the pattern is reused or extended, not copied
- [ ] Every old occurrence of what was extracted is gone, in `app/` and in the design system
- [ ] New colours pass the contrast gate on every surface; palettes regenerated when the inventory changed
- [ ] Architecture rule added for a new component family
- [ ] `docs/ui.md`, compliance row, visual check table, `pre:all`
