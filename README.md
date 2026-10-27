# Fullstack Calculator

A calculator with a Go REST API and a planned React + TypeScript frontend.
The current branch implements the backend only. The frontend and Docker setup
are not implemented or validated yet.

## Requirements

- Go 1.27.0 or later (see `backend/go.mod`).
- Git.
- Node.js and npm will be needed for the frontend in a later feature.

The backend uses only the Go standard library; there are no external Go dependencies.

## Run locally

From the repository root:

```sh
cd backend
go run ./cmd/api
```

The API listens on `http://127.0.0.1:8080`. Stop it with Ctrl+C.
To change the address in PowerShell:

```powershell
$env:HTTP_ADDR = "127.0.0.1:8081"
go run ./cmd/api
```

On macOS/Linux, use `HTTP_ADDR=127.0.0.1:8081 go run ./cmd/api`.
Always run Go commands from `backend`, where `go.mod` is located.

## API

### Health

```http
GET /health
```

Response: `200 OK`, `{"status":"ok"}`. `HEAD /health` is also supported.

### Calculate

```http
POST /api/v1/calculate
Content-Type: application/json

{"operation":"divide","leftOperand":10,"rightOperand":2}
```

Response: `200 OK`, `{"result":5}`.

Supported operations: `add`, `subtract`, `multiply`, `divide` (case-sensitive).
Both operands are required JSON numbers; zero and negative numbers are valid.
Null values, numeric strings, unknown fields, and additional JSON values are rejected.
The request body limit is 1 MiB.

All application error responses use this shape:

```json
{
  "error": {
    "code": "DIVISION_BY_ZERO",
    "message": "Division by zero is not allowed."
  }
}
```

| HTTP status | Error code | Meaning |
| --- | --- | --- |
| 400 | `INVALID_JSON` | Malformed JSON, incorrect field types, numbers outside float64 range, unknown fields, or additional JSON values. |
| 400 | `MISSING_FIELDS` | A required field is absent or null, or operation is empty. |
| 400 | `INVALID_OPERATION` | Unsupported operation. |
| 400 | `DIVISION_BY_ZERO` | Division by positive or negative zero. |
| 400 | `INVALID_OPERAND` | Non-finite domain operand; standard JSON decoding rejects these before reaching the calculator. |
| 400 | `RESULT_OUT_OF_RANGE` | Arithmetic overflow would produce an infinite result. |
| 404 | `NOT_FOUND` | Unknown endpoint. |
| 405 | `METHOD_NOT_ALLOWED` | Unsupported method; see the `Allow` response header. |
| 413 | `BODY_TOO_LARGE` | Request body exceeds 1 MiB. |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Missing or unsupported `Content-Type`. |
| 500 | `INTERNAL_ERROR` | Unexpected internal calculation error; details are not exposed. |

### Examples

PowerShell (use `curl.exe` to avoid the Windows PowerShell `curl` alias):

```powershell
curl.exe -i http://127.0.0.1:8080/health
'{"operation":"divide","leftOperand":10,"rightOperand":2}' | curl.exe -i http://127.0.0.1:8080/api/v1/calculate -H 'Content-Type: application/json' --data-binary '@-'
'{"operation":"divide","leftOperand":10,"rightOperand":0}' | curl.exe -i http://127.0.0.1:8080/api/v1/calculate -H 'Content-Type: application/json' --data-binary '@-'
```

macOS/Linux:

```sh
curl -i http://127.0.0.1:8080/health
curl -i http://127.0.0.1:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"divide","leftOperand":10,"rightOperand":2}'
```

## Tests, coverage, and build

```sh
cd backend
go test ./... '-coverprofile=coverage.out'
go tool cover '-func=coverage.out'
go vet ./...
go build -o bin/calculator-api.exe ./cmd/api
```

On macOS/Linux, use `bin/calculator-api` for the build output instead of `.exe`.
Coverage measurements and verification details are recorded in [COVERAGE.md](COVERAGE.md).
Generated binaries and coverage files are excluded from Git.

## Design decisions

- `internal/calculator` owns arithmetic and domain errors and has no HTTP dependency.
- `internal/http` decodes and validates requests, maps domain errors to status codes,
  and serializes JSON. The package name is `httpapi` to distinguish it from `net/http`.
- `cmd/api` configures and starts the HTTP server with read, write, and idle timeouts.
- A plain function is sufficient for this stateless calculation service. There is
  no database, dependency injection framework, or unnecessary service interface.
- Operand pointers distinguish missing/null input from the valid value `0`.
- Native table-driven tests cover arithmetic and HTTP behavior. `httptest` exercises
  the real handler without requiring a running external server.
- `float64` matches JavaScript's number representation and the small calculator
  scope. Binary floating-point rounding (for example, `0.1 + 0.2`) is expected;
  this is not an exact-decimal financial calculator. Overflow is rejected;
  underflow follows normal float64 behavior and may round to zero.
- CORS is not enabled. The frontend feature should use a Vite development proxy
  to reach this API; a browser calling a different origin directly needs an
  explicitly configured allowed origin.

## Current limitations and next steps

- React UI, frontend tests, and frontend coverage are pending.
- Docker and Docker Compose are deferred because hardware virtualization is
  unavailable on the development machine. No Docker execution is claimed.
- Graceful shutdown and optional operations are possible future improvements.
- This is a local exercise, not an Internet-facing production service; TLS,
  authentication, and rate limiting are outside the current scope.

## AI assistance

AI assistance was used during setup and backend development. See [PROMPTS.md](PROMPTS.md)
for a chronological record of relevant requests, changes, and review status.
Gabriel's personal code review and the final delivery validation remain pending;
automated checks performed by the assistant are recorded separately.
