# Technical Prompt Log

This document summarizes the technical prompts and context used for AI-assisted
development, in chronological order. Entries are faithful summaries rather than
verbatim transcripts.

## 1. Initial Technical Specification

**Context supplied:** The challenge specification defines a full-stack calculator
with a React frontend, preferably using TypeScript, and a REST backend, preferably
using Go. Required operations are addition, subtraction, multiplication, and
division, with input validation and consistent JSON errors. Deliverables include
unit tests in both layers, measured coverage, setup and API documentation, and a
record of AI assistance. Docker support is optional.

The suggested design separates arithmetic logic from HTTP handling and frontend
API access from UI state. The proposed endpoints are `GET /health` and
`POST /api/v1/calculate`, with `operation`, `leftOperand`, and `rightOperand` as
request fields. The implementation should remain simple, testable, and free of
unnecessary dependencies.

**Objective:** Establish the implementation requirements and architectural baseline.

**Application:** This specification guided the backend structure, API contract,
error handling, and test cases described below.

## 2. Backend Implementation

**Prompt summary:** Implement the backend according to the supplied technical
specification, including the arithmetic service, REST API, validation, and tests.

**Objective:** Implement the backend against the supplied technical specification.

**AI contribution:** Generated the Go arithmetic service, REST handlers, server
entry point, table-driven unit tests, and supporting documentation. The backend
uses only the standard library and includes:

- The four required operations and explicit domain errors.
- Validation for missing or null operands, malformed JSON, unsupported operations,
  division by zero, and numeric overflow.
- Consistent JSON responses, a request-body size limit, and HTTP server timeouts.
- Tests for arithmetic behavior, HTTP status codes, response bodies, and invalid
  requests.

**Verification:** The assistant ran `gofmt`, unit tests, coverage measurement,
`go vet`, an executable build, and live API checks. Measured results and remaining
scope are documented in `COVERAGE.md`.

**Developer validation:** Gabriel subsequently confirmed successful manual backend
checks and a passing unit-test run, as recorded in entry 6.

## 3. Architecture and Go Code Walkthrough

**Prompt summary:** Explain the project files, how calls flow through the backend,
and the Go syntax and structure used in the implementation.

**Objective:** Understand the generated code and the responsibilities of each layer.

**AI contribution:** Traced a calculation request from server initialization through
routing, JSON decoding, domain calculation, error mapping, and response encoding.
The explanation covered package boundaries, exported identifiers, JSON struct tags,
pointer operands, multiple return values, explicit error handling, and table-driven
tests, with comparisons to C# concepts.

## 4. Backend Debugging Configuration

**Prompt summary:** Configure VS Code to debug the backend and inspect its execution.

**AI contribution:** Added launch configurations for the API and calculator tests.
The API configuration pauses on entry to support stepping through initialization.
Both configurations use workspace-relative paths.

**Verification:** The launch configuration was parsed successfully and its target
paths were checked. Debug binaries were built, and Delve reached breakpoints in
`main` and `Calculate` through command-line sessions. Gabriel subsequently confirmed
that he could debug the API in VS Code.

## 5. Connection Timeout Investigation During Debugging

**Prompt summary:** Investigate whether intermittent connection errors while
stepping through calculation requests are caused by short server timeouts.

**Objective:** Distinguish HTTP connection behavior during debugger pauses from
arithmetic or request-handling failures.

**AI contribution:** Inspected the server configuration and identified the
ten-second read and write timeouts as a likely explanation. Explained that elapsed
time continues during breakpoint pauses, so a response deadline can expire before
execution resumes. Recommended debug-specific timeout settings or debugging the
calculator tests without an HTTP connection. No timeout change was implemented.

## 6. Test Execution and Developer Verification

**Prompt summary:** Explain how to run the backend unit tests.

**Objective:** Reproduce automated checks locally and inspect individual test cases.

**AI contribution:** Provided commands for running all backend tests or individual
packages, generating coverage reports, and inspecting coverage in a browser.
Also explained how to debug the calculator tests independently of a running API.

**Developer feedback:** Gabriel performed manual backend checks and reported no
issues. He also confirmed that the unit tests passed in his environment.
Coverage figures in `COVERAGE.md` reflect the previously recorded measurements
performed by the assistant.

## 7. React Frontend and API Integration

**Prompt summary:** Implement a React frontend that calls the existing API and
applies UX/UI practices to improve the user experience, starting from the `dev`
branch with a separate feature branch.

**Objective:** Complete the full-stack calculation flow with a clear, accessible,
and responsive interface.

**AI contribution:** Implemented React with TypeScript and Vite, a typed API client,
and a development/preview proxy to the Go API. The interface includes operation
selection, labeled number inputs, keyboard submission, inline validation,
loading and retry states, an announced result region, and reset behavior.
Editing inputs clears stale results, pending requests prevent duplicate
submissions, and unmounting cancels the active request. The UI uses CSS and
system fonts without a component framework or external visual assets.

**Verification:** Added component and API-client tests using Vitest and React
Testing Library. Verification results, production build checks, real API
integration checks, and responsive-browser checks are recorded in `COVERAGE.md`.

**Developer review:** Frontend review and acceptance by Gabriel remain pending.
