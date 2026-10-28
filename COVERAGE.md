# Verification and coverage

Measured on October 27, 2026, on Windows/amd64 with Go 1.27.0, on the backend
feature branch. These are actual command results, not targets or estimates.

## Backend unit tests

Commands, run from `backend`:

```sh
go test ./... '-coverprofile=coverage.out'
go tool cover '-func=coverage.out'
go vet ./...
go build -o bin/calculator-api.exe ./cmd/api
```

Single quotes around the coverage flags keep their arguments intact in PowerShell
and also work in POSIX shells. An initial unquoted invocation passed the unit tests
but the subsequent coverage-summary command failed with `too many arguments`.
The quoted commands above were then executed successfully. The temporary profile
with the incorrect filename from that first attempt was removed.

| Package | Statement coverage | Result |
| --- | --- | --- |
| `internal/calculator` | 100.0% | Passed |
| `internal/http` | 92.7% | Passed |
| `cmd/api` | 0.0% | Builds; startup is not exercised by unit tests |
| **Total, including `cmd/api`** | **82.5%** | **Passed** |

The HTTP coverage gaps include defensive paths for non-finite domain operands
(not representable in JSON), an unexpected domain error, and a response write
failure. No injectable fake service or artificial tests were added just to reach
those paths. Tests cover all four operations, zero and negative operands,
floating-point decimals, division by zero, unknown operations, non-finite domain
input, overflow, malformed/oversized JSON, missing/null fields, wrong field types,
extra fields and JSON values, HTTP methods, content types, health, and missing routes.

`go vet ./...` and the executable build both completed successfully.
`gofmt` was applied to the Go sources. Coverage profiles and binaries are generated
locally and excluded from Git.

## Live API checks

The built executable was started at `127.0.0.1:8080` and stopped after these checks:

- The PowerShell `curl.exe` examples in the README were executed: health returned
  `200` with `{"status":"ok"}`; division of 10 by 2 returned `200` with `{"result":5}`;
  division by zero returned `400` with code `DIVISION_BY_ZERO`.
- Separate HTTP requests checked addition (12), subtraction (8), multiplication
  (20), and division (5), using operands 10 and 2. All matched the expected values.
- A request missing `rightOperand` returned `400` with code `MISSING_FIELDS`.

These live checks validate server startup but are not included in the unit-test
coverage percentages above. The POSIX curl variant was documented but was not
executed on this Windows machine.

## Pending scope

- Docker/Compose: deferred; not executed because local virtualization is unavailable.
- Gabriel's personal code review and final full-stack validation: pending.

## Frontend Verification

Measured on October 27, 2026, on `feature/frontend-calculator`, using Node.js
24.19.0, npm 11.17.0, and Vitest 5.0.5. From `frontend`:

```sh
npm ci
npm run test:coverage
npm run build
```

The frontend suite passed with **46 tests across 2 files**. Statement, function,
and line coverage were **100%**; branch coverage was **98.79%** (82 of 83 branches).
These figures include `App.tsx`, `Calculator.tsx`, and `calculatorApi.ts`.
The DOM bootstrap in `main.tsx`, test setup, tests, configuration, and styles
are excluded. The uncovered branch handles successful completion after a request
was cancelled; unmount cancellation is tested through the rejection path.

The suite verifies the four operation requests, zero/negative/decimal inputs,
required and invalid fields, division by zero, keyboard submission, loading and
duplicate-submit prevention, API errors and retry, stale-result clearing, reset
and focus, result formatting, response validation, network failures, timeouts,
and request cancellation. Component tests mock the API client; client tests mock
`fetch`. Browser integration checks below use the actual Go API.

The production build includes TypeScript checking and Vite asset generation.
The HTML report is available locally at `frontend/coverage/index.html` and the
machine-readable summary at `frontend/coverage/coverage-summary.json`.
Neither generated file is included in Git.

### Browser and Integration Checks

The React app was exercised against a separate Go instance on port 8081 through
Vite's proxy, without changing backend code or interfering with the developer's
debug session on port 8080. Browser checks covered:

- Addition (12), subtraction (8), multiplication (20), and division (5) with
  operands 10 and 2.
- Client-side division-by-zero feedback and a backend overflow error.
- Negative decimal input and Enter submission: -2.5 + 1.5 returned -1.
- Reset behavior, including returning focus to the first input.
- A friendly error after deliberately stopping the test API.
- Responsive layouts at widths 304, 320, 390, 768, and 1280 pixels. A narrow-screen
  overflow issue was corrected; subsequent checks found no horizontal overflow.

Embedded-browser hot reload became inconsistent after source formatting; an
explicit reload restored the page and validation continued. The compiled build
was then served with `npm run preview` at port 4173. A browser request for 24
divided by 6 returned 4 through the proxy and the actual Go service.

`npm ci` successfully reproduced the dependency installation from the lockfile.
The npm installation audit reported zero known vulnerabilities at verification time.

Backend regression tests were rerun during the frontend feature and passed with
the same per-package coverage as recorded above. Gabriel previously confirmed
manual backend checks and a passing backend unit-test run; frontend acceptance
remains pending.
