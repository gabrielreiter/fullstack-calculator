# Fullstack Calculator

A full-stack calculator built with React, TypeScript, and Go. The frontend sends
calculation requests to a REST API, which validates the operands and performs
addition, subtraction, multiplication, and division.

The interface supports keyboard interaction, responsive layouts, inline
validation, loading feedback, and accessible result announcements.

## Architecture

```text
React interface → HTTP client → Go REST API → Arithmetic service
```

The HTTP layer and arithmetic logic are separate, allowing domain rules to be
tested independently of transport concerns. The frontend similarly separates
form state and presentation from request serialization and response handling.

```text
backend/
  cmd/api/                 HTTP server entry point
  internal/calculator/     Arithmetic rules and domain tests
  internal/http/           JSON handlers, routes, and HTTP tests
frontend/
  src/App.tsx              Page composition
  src/components/          Calculator form, state, and component tests
  src/services/            Typed API client and request/response tests
  src/styles.css           Responsive styling and interaction states
README.md                  Setup, API usage, and design decisions
COVERAGE.md                Measured coverage and verification details
PROMPTS.md                 Technical AI-assistance record
```

The backend uses Go's standard library. The frontend uses React and TypeScript
with Vite; its tests use Vitest, React Testing Library, and jsdom.

## Requirements

- Go 1.27.0 or later (see `backend/go.mod`).
- Git.
- Node.js 22.12 or later and npm.

The verified toolchain versions are recorded in [COVERAGE.md](COVERAGE.md).

## Run locally

Open two terminals at the repository root. In the first, start the API:

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

In the second terminal, install the frontend dependencies and start Vite:

```sh
cd frontend
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. Choose an operation, enter two numbers, and click
**Calculate** or press Enter from a number field. **Clear** resets the form and
returns focus to the first number. Decimal input uses a dot; negative numbers
and scientific notation are accepted.

Vite forwards `/api` requests to `http://127.0.0.1:8080`, so no permissive CORS
configuration is needed. Stop either process with Ctrl+C in its terminal.

### Frontend configuration

Defaults work without an environment file. To customize them, copy
`frontend/.env.example` to `frontend/.env.local` and edit:

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api/v1` | Browser-facing API base path, excluding `/calculate`. |
| `API_PROXY_TARGET` | `http://127.0.0.1:8080` | Target used by the Vite development/preview proxy. |

If the API uses another port, update `API_PROXY_TARGET` to match `HTTP_ADDR`.
Restart Vite after environment changes. `VITE_` variables are public build-time
configuration, not a place for secrets. An absolute cross-origin API URL requires
an explicit CORS policy on that API; the default relative path avoids this.

### Production build and local preview

```sh
cd frontend
npm run build
npm run preview
```

With the API running, open `http://127.0.0.1:4173`. Preview also uses the API proxy.
The build output is `frontend/dist`. Vite preview is for local verification, not
production hosting. A deployment must serve the static files and route `/api`
to the Go service, or configure an API origin with the appropriate CORS policy.

### Container support

Docker packaging is optional and is not included in this version. Both services
run directly with the commands above.

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

Frontend commands, from `frontend`:

```sh
npm test
npm run test:coverage
npm run typecheck
npm run build
```

`npm run test:watch` reruns tests during development. The HTML coverage report is
generated at `frontend/coverage/index.html`. Component tests mock the API client;
API-client tests mock `fetch` to verify serialization, responses, cancellation,
timeouts, and connection failures. Real API integration is verified separately.

### Verification results

The automated suites, backend static analysis, TypeScript checking, and production
builds completed successfully. Browser integration checks covered the four
operations, invalid input, API errors, keyboard submission, and mobile layouts.
Manual backend and frontend checks were also completed by the developer.

| Measurement | Recorded result |
| --- | --- |
| Backend statement coverage, including the server entry point | 82.5% |
| Frontend tests | 46 passing |
| Frontend statement and line coverage | 100% |
| Frontend branch coverage | 98.79% |

The covered files, exclusions, commands, and verification scope are documented
in [COVERAGE.md](COVERAGE.md).

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
- `float64` matches JavaScript's number representation. Arithmetic follows binary
  floating-point semantics, including rounding for values such as `0.1 + 0.2`.
  Overflow is rejected; underflow follows normal float64 behavior and may round
  to zero.
- React state stays inside `Calculator`; no global state library is necessary.
  `services/calculatorApi.ts` owns HTTP communication and response validation.
- The UI provides labeled inputs, native radio-button keyboard interaction,
  visible focus styles, a skip link, inline errors, and an `aria-live` result
  region. Invalid submissions focus the first field needing attention.
- Loading disables form controls and duplicate submissions. Editing an operand
  or operation clears the previous answer so it cannot be mistaken for a result
  of the new input. Failed requests preserve inputs for retry.
- Client-side checks improve feedback; backend validation remains authoritative.
  Calculations are never performed locally in place of an API request.
- Results are displayed with up to 15 significant digits and scientific notation
  for large or very small values. Display formatting does not change the API result.
- Fetch requests have a 15-second deadline and are cancelled on component unmount.
  Long debugger pauses can exceed client or server timeouts; debug calculator
  tests to inspect the arithmetic without an HTTP deadline.
- Vite proxies development and preview API traffic to Go. Backend CORS stays
  disabled. The interface uses system fonts and CSS, without external images,
  font downloads, or a visual component framework.

## Scope and possible extensions

This version implements the four required operations with a stateless API and
a single-page interface. Persistence, authentication, and additional services
are outside the calculator's scope.

Possible extensions include the optional operations (exponentiation, square root,
and percentage), Docker Compose packaging, and graceful server shutdown.

## AI assistance

AI tools assisted with implementation, testing, documentation, and code
explanations. [PROMPTS.md](PROMPTS.md) contains chronological summaries of the
relevant technical requests and resulting contributions. Automated verification
details and measured coverage are available in [COVERAGE.md](COVERAGE.md).
