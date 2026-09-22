# DESIGN — field inspection report

Specification for this application: the invariants it must hold, and why they exist.
Sections carry an id (`§1.2`). Tests cite ids in their names, and CI fails when an id is
cited by no test (see *Quality gates*). Measured numbers do not belong here.

## Purpose

Field staff inspect distribution equipment on site and file a report from a phone.
Back-office staff read the filed reports on a desktop. Today that flow is paper and
spreadsheets: the same report is written once on site, typed again at the office, and
aggregated by hand. This application is the single form and the single list that replace
those steps.

The two roles want opposite things from the same data. On site: one hand, small screen,
few taps, no lookup tables to memorize. At the office: many reports at once, sorted,
scannable, with the serious ones visible without opening each. One responsive UI serves
both; nothing here is a separate "mobile app".

## Scope and non-goals

In scope: the report form, the report list, validation rules, a mock data source.

Out of scope, deliberately: server and database, authentication and roles, an approval
workflow, photo upload, offline capture, aggregation dashboards, and printing. Data lives
in memory: **anything filed is lost on reload**. The repository port (§3.2) is the seam
where a real backend would attach; nothing else in the code assumes the data is local.

The domain is fictional. Equipment types, check items and seed reports were written for
this application from public knowledge of distribution equipment; they describe no real
site, organization or incident.

## §1 Domain model

### §1.1 Report

A report records one inspection of one piece of equipment.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | assigned by the repository on save, format per §1.2 |
| `equipmentId` | `string` | identifier written on the equipment, format per §1.2 |
| `equipmentType` | `EquipmentType` | `transformer` \| `pole` \| `switchgear` \| `insulator` \| `meter` |
| `inspectedAt` | `string` | local date-time, `YYYY-MM-DDTHH:mm` |
| `inspectorName` | `string` | who inspected |
| `checks` | `Record<CheckItem, CheckResult>` | every item, no gaps (§2.1) |
| `remarks` | `string` | free text, may be empty unless §2.2 applies |
| `submittedAt` | `string` | ISO-8601 instant, assigned by the repository on save |

`CheckItem` is `appearance` \| `abnormalSound` \| `temperature` \| `corrosion` \|
`surroundings`. `CheckResult` is `ok` \| `caution` \| `abnormal`.

The check items are the same for every equipment type. Per-type item sets are the obvious
next step and are left out: they add a configuration model without exercising anything the
UI does not already show.

`checks` is a record keyed by check item rather than an array of `{item, result}` pairs,
so that "every item has a result" is a property of the type rather than a rule to police.

### §1.2 Identifiers

`equipmentId` matches `^[A-Z]{2}-\d{4}$` (`TR-0142`). Input is trimmed and upper-cased
before validation, because a phone keyboard offers lower case first and rejecting `tr-0142`
would be rejecting a correct answer typed the convenient way.

`id` matches `^RPT-\d{4}$` and is assigned by the repository, never by the form. The client
does not invent identifiers it cannot keep unique.

### §1.3 Severity

A report's severity is the worst result among its checks, ordered `ok < caution < abnormal`.
Severity is derived on read, never stored: a stored copy can disagree with the checks it
summarizes.

## §2 Validity rules

A draft is valid when all of the following hold. They are expressed once, as a schema in
`src/domain`, and used by both the form and the repository — a rule enforced only in the UI
is a rule that a second caller can skip.

- **§2.1** Every check item in §1.1 has a result. A missing item is a validation error, not
  an implied `ok`; "not looked at" and "looked at, fine" are different facts.
- **§2.2** When severity is `abnormal` (§1.3), `remarks` is required and holds at least 5
  characters after trimming. An abnormal finding with no description cannot be acted on by
  the office.
- **§2.3** `remarks` holds at most 200 characters. The field is a hand-off note, not an
  incident report.
- **§2.4** `inspectedAt` is required, parses as a date-time, and is not in the future. The
  current time is passed into the domain by the caller; the domain never reads the clock,
  so tests state the time rather than mock it.
- **§2.5** `inspectorName` is required and holds at most 32 characters after trimming.
- **§2.6** `equipmentId` is required and matches §1.2 after normalization.
- **§2.7** Validation reports every failing field at once. A form that reveals one error per
  submit costs a round trip per mistake, and on site that is a round trip in the rain.

## §3 Architecture

Dependencies point inward: `domain` knows nothing about React, routing, or where data comes
from; `features` know the domain and the port, never a concrete adapter.

```
src/
  domain/      types, schema, rules, severity — pure TypeScript
  data/        InspectionRepository (port) + in-memory adapter (§3.4)
  features/
    report-form/   form screen: components + useReportForm
    report-list/   list screen: components + useReports
  app/         routing, repository provider, layout
  locales/     Japanese UI strings and seed data (§6)
```

- **§3.1** Files under `src/domain` import no framework: not `react`, `react-dom`,
  `react-router-dom`, `react-hook-form`, nor anything from `src/features`, `src/app` or
  `src/data`. This is what makes the rules testable without rendering, and re-usable from a
  future server.
- **§3.2** `InspectionRepository` is the only port to the outside:
  `list(): Promise<InspectionReport[]>` and `save(draft): Promise<InspectionReport>`.
  Both are asynchronous although today's adapter is local, so that replacing it with HTTP
  changes one file and no call site. `save` re-validates its input (§2) and rejects an
  invalid draft.
- **§3.3** Screens get the repository from React context, provided once in `src/app`.
  Components under `src/features/*/components` do not import from `src/data`; a component
  that reaches for a data source cannot be rendered in a test or a future story without it.
- **§3.4** The shipped adapter keeps reports in memory, seeded from `src/locales/seed.ja.json`,
  and assigns `id` and `submittedAt` on save. It is not a cache and has no persistence: the
  honesty note in the UI says so where a user can read it.
- **§3.5** State that belongs to a screen lives in that screen's hook (`useReports`,
  `useReportForm`); components receive values and callbacks as props and render. There is no
  global state container, because the only shared object is the repository (§3.3).

## §4 Screens, routing, responsiveness

- **§4.1** Routes: `/reports` lists reports, `/reports/new` files one, any other path
  redirects to `/reports`. Screens are addressable, so a phone can open the form directly.
- **§4.2** A successful save returns to `/reports` and confirms which report was filed. The
  list is ordered by `inspectedAt`, newest first, so the report just filed is visible at the
  top without searching for it.
- **§4.3** The list is one semantic `<table>` at every width. Below 768px CSS restacks each
  row into a card; no JavaScript measures the viewport. One DOM means the office and the
  field read the same content, and it means no layout state to test.
- **§4.4** CSS is mobile-first: base rules target the narrow viewport and `@media (min-width:
  768px)` adds the desktop layout. Rules are never written for the desktop and then undone
  for the phone.
- **§4.5** Severity is shown with a text label and a shape, never colour alone. Colour fails
  for colour-blind readers and fails again on a phone screen in sunlight, which is exactly
  where this screen is used.

## §5 Accessibility

The office side is a data table used all day, the field side is a form used with gloves.
Both are keyboard- and screen-reader-operable, and both are tested through roles and labels
rather than CSS classes — so the tests fail when the accessible structure breaks.

- **§5.1** Every control has a programmatically associated `<label>`. Required controls carry
  `aria-required`. Related radio inputs are grouped in a `<fieldset>` with a `<legend>`.
- **§5.2** An invalid control carries `aria-invalid` and `aria-describedby` pointing at the
  element holding its message.
- **§5.3** Submitting an invalid form renders a summary with `role="alert"` and moves focus to
  the first invalid control. On a phone the failing field is otherwise off-screen.
- **§5.4** Interactive controls are at least 44px tall, the size a gloved thumb can hit.

## §6 Language and leak guard

- **§6.1** Every string a user reads lives in `src/locales/*.ja.json`. No other tracked file
  contains CJK characters — not code, comments, documentation, or commit messages. Code and
  docs are English so that the repository is readable by anyone, and the single-directory
  rule means one scan covers everything human-readable.
- **§6.2** `t()` is typed against the key set of `ja.json`: a key that does not exist is a
  type error, and a rendered `undefined` is impossible.
- **§6.3** Seed reports live in `src/locales/seed.ja.json` for the same reason, and are
  validated against the domain schema (§2) when loaded, so demo data cannot drift from the
  rules the form enforces.

## Quality gates

CI runs these on every push; each corresponds to a way this repository has been able to go
wrong.

| Gate | What it prevents |
|---|---|
| `tsc -b` with `strict` | types that only look right |
| `oxlint` incl. rules-of-hooks and jsx-a11y | hook misuse; inaccessible markup |
| `vitest run --coverage` with a floor per metric | untested modules, where defects hide |
| `npm run build` | a repository that is green but does not ship |
| no-CJK scan (§6.1), exempting `src/locales/` | private context leaking into a public repo |
| design-reference scan | a section here that no test enforces — a promise nobody keeps |

The last two run as tests as well as CI steps, so they fail locally before a push.
