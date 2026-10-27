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

- Frontend implementation, tests, coverage, and production build: not implemented.
- Docker/Compose: deferred; not executed because local virtualization is unavailable.
- Gabriel's personal code review and final full-stack validation: pending.
