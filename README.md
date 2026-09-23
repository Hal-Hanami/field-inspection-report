# field-inspection-report

A responsive web form for equipment inspections, the list the office reads them in, and
the API and database behind them. One screen is filled in on a phone at the equipment; the
other is read on a desktop. They are the same application and the same data, laid out for
two very different moments.

The domain is fictional: the equipment types, the check items and the demo reports were
written for this repository from public knowledge, and describe no real site or
organization.

## Scope

- **Web** (`src/`): React and TypeScript. The form, the list, and each report's detail.
- **Server** (`api/`): Python, FastAPI and PostgreSQL. It validates every draft itself,
  assigns ids, files a retried submission once, and pages the list.
- **Public demo**: a static build of the web on the in-memory adapter, with no server.
  **Anything filed there is lost on reload**, and every visitor starts from the same demo
  data. The screens are identical on both adapters; `src/main.tsx` picks one.

Not built: accounts, an approval workflow, photo upload, offline capture, dashboards, and
a public deployment of the server. The full specification, with a reason for each rule,
is [docs/DESIGN.md](docs/DESIGN.md).

## Run it

Needs Node.js, Docker and [uv](https://docs.astral.sh/uv/). From the repository root:

```sh
npm install
npm run db          # PostgreSQL on localhost:55432
npm run api:setup   # Python environment, schema, demo data (once)
npm run api         # the API on :8000 — leave it running
npm run dev         # in a second terminal: http://localhost:5173/field-inspection-report/
```

`npm run dev` always talks to the API, so what is filed is in PostgreSQL and survives a
reload. If the API is not running, the screens say they cannot load rather than falling
back to anything. `npm run dev:demo` runs the web alone on the in-memory adapter, the way
the public demo does: nothing filed there survives a reload.

## Tests

```sh
npm test                    # web: unit, component and repository-wide gates
cd api && uv run pytest     # server: against the PostgreSQL started above
```

Alongside the usual tests, several read the repository itself and fail on:

- a validity rule that the form and the server disagree on — both suites run the cases in
  [`contracts/validation-cases.json`](contracts/validation-cases.json)
- web types that no longer match the server's OpenAPI document
- a design section that no test enforces
- an import that breaks the dependency rule, in the web or in the server
- Japanese text outside `src/locales`
- a media query that undoes the phone layout, or a touch target under 44px

The server's tests build their database by running every migration from empty, and check
that the migrated schema is the one the code queries. Component tests find elements the
way a screen reader does — by role, label and accessible name — so an accessible structure
that breaks takes the suite with it.

## What is here

| Path | Holds |
|---|---|
| `src/domain` | types, validity rules and severity — plain TypeScript, no framework |
| `src/data` | the repository interface, its in-memory and HTTP adapters, the generated wire types |
| `src/features/*` | one directory per screen: its hook, its components, its styles |
| `src/app` | routing, the shared frame |
| `src/locales` | every Japanese string the UI shows, and the demo data |
| `api/app/domain` | the same rules on the server — plain Python, no framework |
| `api/app/repository` | the storage interface and its PostgreSQL adapter |
| `api/app/http` | FastAPI routes, wire schemas, problem responses |
| `api/migrations` | Alembic revisions, the only author of the schema |
| `contracts` | validation cases both test suites run |
| `docs/DESIGN.md` | the specification: invariants, with the reason for each |

On both sides, business rules depend on nothing and everything else depends on them. The
server is the authority on validity; the web keeps a copy so that a person sees every
mistake before a round trip, and the shared cases keep the copy honest.

## How it was built

The specification, the code and the tests were written in collaboration with AI
assistants: Claude Code for the design document, the implementation and the tests, and
Claude Design for the visual design. The author set the direction and made the calls —
the scope, a Python server as the authority on validity with the web keeping a checked
copy, the fixes to adopt — reviewed the changes, and used the running application by hand,
which is how some of the defects fixed in the history were found.

The safeguards in this repository are what the code is held to regardless of who wrote a
line: the design sections every test cites, the validation cases both suites run, and the
CI gates listed above.

## Stack

Web: React 19, TypeScript, Vite, React Hook Form with Zod, Vitest and Testing Library,
plain CSS modules. Server: Python 3.13, FastAPI, Pydantic, SQLAlchemy Core, Alembic,
PostgreSQL 17, pytest, Ruff and Pyright in strict mode.
