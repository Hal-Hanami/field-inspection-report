# field-inspection-report

A responsive web form for equipment inspections, and the list the office reads them in.
One screen is filled in on a phone at the equipment; the other is read on a desktop. They
are the same application and the same data, laid out for two very different moments.

The domain is fictional: the equipment types, the check items and the demo reports were
written for this repository from public knowledge, and describe no real site or
organization.

## Scope

Reports are held in memory. **Anything filed is lost on reload**, and every visitor starts
from the same demo data. There is no backend, no account, no approval workflow and no
photo upload. The repository interface in `src/data` is the seam where a real backend
would attach; nothing else in the code assumes the data is local. The full list of
non-goals is in [docs/DESIGN.md](docs/DESIGN.md).

## Run it

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # unit, component and repository-wide gates
npm run build      # type check and production bundle
```

## What is here

| Path | Holds |
|---|---|
| `src/domain` | types, validity rules and severity — plain TypeScript, no framework |
| `src/data` | the repository interface and the in-memory adapter behind it |
| `src/features/report-form` | the form screen: its hook, its components, its styles |
| `src/features/report-list` | the list screen, likewise |
| `src/app` | routing, the shared frame, and the one place that picks an adapter |
| `src/locales` | every Japanese string the UI shows, and the demo data |
| `docs/DESIGN.md` | the specification: invariants, with the reason for each |

Business rules live in `src/domain` and are run by both the form and the repository, so a
rule cannot be skipped by calling the data layer directly. Everything else depends on the
domain; the domain depends on nothing.

## Tests

`npm test` runs 64 tests. Alongside the usual unit and component tests, several of them
read the repository itself and fail on:

- an import that breaks the dependency rule
- a design section that no test enforces
- Japanese text outside `src/locales`
- a media query that undoes the phone layout, or a touch target under 44px

Component tests find elements the way a screen reader does — by role, label and accessible
name — so an accessible structure that breaks takes the suite with it.

## Stack

React 19, TypeScript, Vite, React Hook Form with Zod, Vitest and Testing Library, plain CSS
modules. No UI framework and no state-management library: with two screens and one shared
object, neither pays for itself.
