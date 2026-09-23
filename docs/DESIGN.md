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

In scope: the report form, the report list, a report's detail, the validation rules, an
HTTP API with a PostgreSQL store (§7), and an in-memory data source for the static demo.

Out of scope, deliberately: authentication and roles, an approval workflow, photo upload,
offline capture, aggregation dashboards, printing, and hosting the API in public. The
public demo is a static site on the in-memory adapter: **anything filed there is lost on
reload**. The repository port (§3.2) is the one seam between the screens and where data
lives, so the same screens run on either adapter.

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
| `inspectedAt` | `string` | wall-clock date-time, `YYYY-MM-DDTHH:mm`, no zone |
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

`inspectedAt` carries no timezone: it is what the control on the device produced, read in
the zone of whoever is looking. Everyone using this application is in one zone, and a
stored offset would be a promise about crossing zones that nothing here keeps. It follows
that the clock it is compared against (§2.4) must be read in the same zone — a comparison
written with a fixed offset holds in one timezone and fails in another.

### §1.2 Identifiers

`equipmentId` matches `^[A-Z]{2}-[0-9]{4}$` (`TR-0142`). The digits are ASCII: a regex `\d`
matches full-width digits in some languages and not in others, and the two sides of §7.3
must agree. Input is trimmed and upper-cased
before validation, because a phone keyboard offers lower case first and rejecting `tr-0142`
would be rejecting a correct answer typed the convenient way.

`id` matches `^RPT-[0-9]{4,}$` and is assigned by the repository, never by the form. The client
does not invent identifiers it cannot keep unique. Four digits is the minimum width, not a
limit: report 10000 is still a valid report.

### §1.3 Severity

A report's severity is the worst result among its checks, ordered `ok < caution < abnormal`.
Severity is derived on read, never stored: a stored copy can disagree with the checks it
summarizes. The server includes the derived value in its responses for clients that do not
carry the rule; the web derives its own, and §7.3 holds both derivations to the same answers.

## §2 Validity rules

A draft is valid when all of the following hold. The server is the authority (§7.2); the
web keeps a copy in `src/domain` so that a person sees every mistake without a round trip,
and so the static demo can run with no server. Two copies of a rule drift unless something
holds them together, and that is §7.3. Within the web, the one copy is used by both the form
and the repository — a rule enforced only in the UI is a rule that a second caller can skip.

"Characters" means UTF-16 code units, which is what a browser's `maxlength` counts; a
limit the text box allows and the server rejects is a limit nobody can meet. "Trimming"
removes the white space of ECMAScript `String.prototype.trim` and nothing else.

- **§2.1** Every check item in §1.1 has a result. A missing item is a validation error, not
  an implied `ok`; "not looked at" and "looked at, fine" are different facts.
- **§2.2** When severity is `abnormal` (§1.3), `remarks` is required and holds at least 5
  characters after trimming. An abnormal finding with no description cannot be acted on by
  the office.
- **§2.3** `remarks` holds at most 200 characters. The field is a hand-off note, not an
  incident report.
- **§2.4** `inspectedAt` is required, has exactly the form `YYYY-MM-DDTHH:mm`, names a real
  calendar moment (no 30 February), and is not in the future. A lenient date parser accepts
  `2026/09/22` in one language and rejects it in another, and rolls 30 February over to
  March; the format is the one the device's date-time control produces. The
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
  data/        InspectionRepository (port) + in-memory and HTTP adapters (§3.4)
    api/         types generated from the server's OpenAPI document (§7.4)
  features/
    report-form/   form screen: components + useReportForm
    report-list/   list screen: components + useReports
    report-detail/ one report: components + useReport
  app/         routing, repository provider, layout
  locales/     Japanese UI strings and seed data (§6)
```

- **§3.1** Files under `src/domain` import no framework: not `react`, `react-dom`,
  `react-router-dom`, `react-hook-form`, nor anything from `src/features`, `src/app` or
  `src/data`. This is what makes the rules testable without rendering, and re-usable from a
  future server.
- **§3.2** `InspectionRepository` is the only port to the outside: `list()`, `get(id)` and
  `save(draft, { idempotencyKey })`, all asynchronous, plus `persistent`, which says whether
  a saved report outlives a reload. `get` resolves to `null` for an unknown id rather than
  throwing, because "no such report" is an answer, not a failure. `save` re-validates its
  input (§2) and rejects an invalid draft with the failing fields, so a rule that only the
  server knows still reaches the field it concerns.
- **§3.3** Screens get the repository from React context, provided once in `src/app`.
  Components under `src/features/*/components` do not import from `src/data`; a component
  that reaches for a data source cannot be rendered in a test or a future story without it.
- **§3.4** Two adapters implement the port. The in-memory one is seeded from
  `src/locales/seed.ja.json`, assigns `id` and `submittedAt` on save, and backs the static
  demo and the component tests. The HTTP one talks to the server (§7). `src/main.tsx` picks
  one: HTTP when `VITE_API_BASE_URL` is set, memory otherwise. The honesty note in the UI
  follows `persistent`, so it never claims a backend the build does not have, or denies one
  it does.
- **§3.5** State that belongs to a screen lives in that screen's hook (`useReports`,
  `useReportForm`); components receive values and callbacks as props and render. There is no
  global state container, because the only shared object is the repository (§3.3).

## §4 Screens, routing, responsiveness

- **§4.1** Routes: `/reports` lists reports, `/reports/new` files one, `/reports/:id` shows
  one, any other path redirects to `/reports`. Screens are addressable, so a phone can open
  the form directly and a report can be linked to.
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

- **§4.6** The list links each report id to its detail, and the detail shows the result of
  every check item, each with its label and shape (§4.5). The list shows a report's
  severity, which says *that* something is abnormal; only the detail says *which* item, and
  the office should not have to infer it from the remarks. An unknown id says so on the
  page rather than redirecting, so a mistyped link is noticed.

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

## §7 Server

The server lives in `api/`: Python, FastAPI, SQLAlchemy and PostgreSQL, managed with `uv`.
It answers under `/api` and serves no pages; the web is a separate static build that calls
it. Dependencies point inward here as they do in the web (§3):

```
api/app/
  domain/      rules, severity, normalization — no FastAPI, no SQLAlchemy
  repository/  ReportRepository (Protocol) + the PostgreSQL adapter
  http/        FastAPI routes: HTTP to domain and back, nothing else
  settings.py  configuration from the environment
api/migrations/  Alembic revisions
contracts/       validation cases both test suites run (§7.3)
```

- **§7.1** Modules under `api/app/domain` import neither `fastapi` nor `sqlalchemy`, nor
  anything from `app.repository` or `app.http`. The rules are then testable without a
  database or a request, which is what lets §7.3 run them case by case.
- **§7.2** The server validates every draft against §2 itself; nothing a client checked is
  trusted. A rejected draft is answered `422` with every failing field at once (§2.7), each
  as a field path and a message key from `ja.json`. The server holds keys, never sentences,
  so §6.1 holds for it too.
- **§7.3** `contracts/validation-cases.json` lists drafts, a wall-clock "now", and the
  outcome each must produce: the failing fields with their keys, or the normalized draft,
  plus the severity of a set of checks. The web suite and the server suite both run every
  case. A rule changed on one side only fails the other side's suite, before it can reach
  a person as a form that passes and a server that refuses.
- **§7.4** `api/openapi.json` is generated from the server and committed, and
  `src/data/api/schema.ts` is generated from it. CI regenerates both and fails on a
  difference, so the web cannot compile against a shape the server no longer has.
- **§7.5** Report ids come from a database sequence, formatted `RPT-` and at least four
  digits (§1.2). Two reports filed at the same moment cannot receive the same id, which a
  "highest id plus one" read cannot promise.
- **§7.6** Creating a report requires an `Idempotency-Key` header, which the form generates
  once per draft. A repeated key with the same draft returns the report already created,
  so a retry after a lost response on a weak mobile signal does not file the inspection
  twice; the same key with a different draft is `409`. A rejected draft (§7.2) records no
  key, so correcting it and submitting again is not a conflict.
- **§7.7** Check results are stored one row per item, keyed by report and item, and a report
  is written together with all of its checks in one transaction. Enumerated values and
  lengths are `CHECK` constraints as well as domain rules. Severity is not a column (§1.3).
  Rows per item, rather than a document per report, let "which item fails most" be a query.
- **§7.8** `inspected_at` is a timestamp without zone (§1.1). The server compares it with its
  clock read in `APP_TIME_ZONE`, the zone its users are in; the clock is passed into the
  domain, as in the web (§2.4). `submitted_at` is an instant, with zone, set by the server.
- **§7.9** The list is ordered by `inspectedAt`, newest first, then by id, and is paged with
  a cursor: `limit` (default 50, at most 200) and the `nextCursor` the previous page
  returned. A cursor, unlike an offset, does not skip or repeat reports when one is filed
  while someone is paging.
- **§7.10** Errors are `application/problem+json` (RFC 9457): `404` for an unknown report,
  `409` for an idempotency conflict, `422` for an invalid draft with its field errors, and
  `400` for a request the API cannot read at all.
- **§7.11** The schema changes only through migrations. The server's tests build their
  database by running every migration from empty, so a test cannot pass against a schema
  that a deployed database would not have.

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
| `ruff`, `pyright` strict, `pytest` on PostgreSQL | the same, for the server |
| shared validation cases (§7.3) | a rule that the form and the server disagree on |
| regenerated OpenAPI document and web types (§7.4) | a web built against a stale API |

The no-CJK and design-reference scans, and the shared cases, run as tests as well as CI
steps, so they fail locally before a push.
