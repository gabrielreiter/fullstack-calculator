package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCalculateSuccess(t *testing.T) {
	tests := []struct {
		name        string
		body        string
		contentType string
		want        float64
	}{
		{name: "add", body: `{"operation":"add","leftOperand":10,"rightOperand":2}`, want: 12},
		{name: "subtract", body: `{"operation":"subtract","leftOperand":10,"rightOperand":2}`, want: 8},
		{name: "multiply", body: `{"operation":"multiply","leftOperand":10,"rightOperand":2}`, want: 20},
		{name: "divide", body: `{"operation":"divide","leftOperand":10,"rightOperand":2}`, want: 5},
		{name: "zero operands", body: `{"operation":"add","leftOperand":0,"rightOperand":0}`, want: 0},
		{name: "negative decimals", body: `{"operation":"multiply","leftOperand":-2.5,"rightOperand":2}`, want: -5},
		{name: "charset parameter", body: `{"operation":"add","leftOperand":1,"rightOperand":2}`, contentType: "application/json; charset=utf-8", want: 3},
		{name: "trailing whitespace", body: "{\"operation\":\"add\",\"leftOperand\":1,\"rightOperand\":2}\n\t ", want: 3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, "/api/v1/calculate", strings.NewReader(tt.body))
			contentType := tt.contentType
			if contentType == "" {
				contentType = "application/json"
			}
			request.Header.Set("Content-Type", contentType)
			response := httptest.NewRecorder()
			NewHandler().ServeHTTP(response, request)
			if response.Code != http.StatusOK {
				t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
			}
			assertJSONContentType(t, response)
			var result struct {
				Result *float64 `json:"result"`
			}
			if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
				t.Fatal(err)
			}
			if result.Result == nil || *result.Result != tt.want {
				t.Errorf("body = %s, want result %v", response.Body.String(), tt.want)
			}
		})
	}
}

func TestCalculateErrors(t *testing.T) {
	validBody := `{"operation":"add","leftOperand":1,"rightOperand":2}`
	tests := []struct {
		name        string
		body        string
		contentType string
		wantStatus  int
		wantCode    string
	}{
		{name: "invalid JSON", body: `{`, wantStatus: 400, wantCode: "INVALID_JSON"},
		{name: "empty body", body: ``, wantStatus: 400, wantCode: "INVALID_JSON"},
		{name: "empty object", body: `{}`, wantStatus: 400, wantCode: "MISSING_FIELDS"},
		{name: "null body", body: `null`, wantStatus: 400, wantCode: "MISSING_FIELDS"},
		{name: "array body", body: `[]`, wantStatus: 400, wantCode: "INVALID_JSON"},
		{name: "scalar body", body: `1`, wantStatus: 400, wantCode: "INVALID_JSON"},
		{name: "missing operation", body: `{"leftOperand":1,"rightOperand":2}`, wantStatus: 400, wantCode: "MISSING_FIELDS"},
		{name: "null operation", body: `{"operation":null,"leftOperand":1,"rightOperand":2}`, wantStatus: 400, wantCode: "MISSING_FIELDS"},
		{name: "empty operation", body: `{"operation":"","leftOperand":1,"rightOperand":2}`, wantStatus: 400, wantCode: "MISSING_FIELDS"},
		{name: "missing left", body: `{"operation":"add","rightOperand":2}`, wantStatus: 400, wantCode: "MISSING_FIELDS"},
		{name: "missing right", body: `{"operation":"add","leftOperand":1}`, wantStatus: 400, wantCode: "MISSING_FIELDS"},
		{name: "null left", body: `{"operation":"add","leftOperand":null,"rightOperand":2}`, wantStatus: 400, wantCode: "MISSING_FIELDS"},
		{name: "null right", body: `{"operation":"add","leftOperand":1,"rightOperand":null}`, wantStatus: 400, wantCode: "MISSING_FIELDS"},
		{name: "string operand", body: `{"operation":"add","leftOperand":"1","rightOperand":2}`, wantStatus: 400, wantCode: "INVALID_JSON"},
		{name: "boolean operand", body: `{"operation":"add","leftOperand":true,"rightOperand":2}`, wantStatus: 400, wantCode: "INVALID_JSON"},
		{name: "number operation", body: `{"operation":1,"leftOperand":1,"rightOperand":2}`, wantStatus: 400, wantCode: "INVALID_JSON"},
		{name: "unrepresentable number", body: `{"operation":"add","leftOperand":1e400,"rightOperand":2}`, wantStatus: 400, wantCode: "INVALID_JSON"},
		{name: "unknown field", body: `{"operation":"add","leftOperand":1,"rightOperand":2,"extra":1}`, wantStatus: 400, wantCode: "INVALID_JSON"},
		{name: "second object", body: validBody + `{}`, wantStatus: 400, wantCode: "INVALID_JSON"},
		{name: "second null", body: validBody + `null`, wantStatus: 400, wantCode: "INVALID_JSON"},
		{name: "trailing garbage", body: validBody + `oops`, wantStatus: 400, wantCode: "INVALID_JSON"},
		{name: "unknown operation", body: `{"operation":"power","leftOperand":2,"rightOperand":3}`, wantStatus: 400, wantCode: "INVALID_OPERATION"},
		{name: "case sensitive operation", body: `{"operation":"ADD","leftOperand":2,"rightOperand":3}`, wantStatus: 400, wantCode: "INVALID_OPERATION"},
		{name: "division by zero", body: `{"operation":"divide","leftOperand":10,"rightOperand":0}`, wantStatus: 400, wantCode: "DIVISION_BY_ZERO"},
		{name: "division by negative zero", body: `{"operation":"divide","leftOperand":10,"rightOperand":-0}`, wantStatus: 400, wantCode: "DIVISION_BY_ZERO"},
		{name: "result overflow", body: `{"operation":"multiply","leftOperand":1e308,"rightOperand":2}`, wantStatus: 400, wantCode: "RESULT_OUT_OF_RANGE"},
		{name: "wrong content type", body: validBody, contentType: "text/plain", wantStatus: 415, wantCode: "UNSUPPORTED_MEDIA_TYPE"},
		{name: "malformed content type", body: validBody, contentType: "application/json; charset", wantStatus: 415, wantCode: "UNSUPPORTED_MEDIA_TYPE"},
		{name: "large body", body: strings.Repeat(" ", maxBodyBytes+1) + validBody, wantStatus: 413, wantCode: "BODY_TOO_LARGE"},
		{name: "large trailing body", body: validBody + strings.Repeat(" ", maxBodyBytes+1), wantStatus: 413, wantCode: "BODY_TOO_LARGE"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, "/api/v1/calculate", strings.NewReader(tt.body))
			contentType := tt.contentType
			if contentType == "" {
				contentType = "application/json"
			}
			request.Header.Set("Content-Type", contentType)
			response := httptest.NewRecorder()
			NewHandler().ServeHTTP(response, request)
			assertErrorResponse(t, response, tt.wantStatus, tt.wantCode)
			if tt.wantCode == "DIVISION_BY_ZERO" {
				var result errorResponse
				if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
					t.Fatal(err)
				}
				if result.Error.Message != "Division by zero is not allowed." {
					t.Errorf("unexpected division message: %q", result.Error.Message)
				}
			}
		})
	}
}

func TestRoutes(t *testing.T) {
	tests := []struct {
		name       string
		method     string
		path       string
		wantStatus int
		wantCode   string
		wantAllow  string
	}{
		{name: "health", method: http.MethodGet, path: "/health", wantStatus: 200},
		{name: "head health", method: http.MethodHead, path: "/health", wantStatus: 200},
		{name: "health wrong method", method: http.MethodPost, path: "/health", wantStatus: 405, wantCode: "METHOD_NOT_ALLOWED", wantAllow: "GET, HEAD"},
		{name: "calculate wrong method", method: http.MethodGet, path: "/api/v1/calculate", wantStatus: 405, wantCode: "METHOD_NOT_ALLOWED", wantAllow: "POST"},
		{name: "calculate delete", method: http.MethodDelete, path: "/api/v1/calculate", wantStatus: 405, wantCode: "METHOD_NOT_ALLOWED", wantAllow: "POST"},
		{name: "missing route", method: http.MethodGet, path: "/missing", wantStatus: 404, wantCode: "NOT_FOUND"},
		{name: "health trailing slash", method: http.MethodGet, path: "/health/", wantStatus: 404, wantCode: "NOT_FOUND"},
		{name: "calculate trailing slash", method: http.MethodPost, path: "/api/v1/calculate/", wantStatus: 404, wantCode: "NOT_FOUND"},
		{name: "missing content type", method: http.MethodPost, path: "/api/v1/calculate", wantStatus: 415, wantCode: "UNSUPPORTED_MEDIA_TYPE"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := httptest.NewRequest(tt.method, tt.path, nil)
			response := httptest.NewRecorder()
			NewHandler().ServeHTTP(response, request)
			if tt.wantCode != "" {
				assertErrorResponse(t, response, tt.wantStatus, tt.wantCode)
			} else {
				if response.Code != tt.wantStatus {
					t.Fatalf("status = %d, want %d", response.Code, tt.wantStatus)
				}
				assertJSONContentType(t, response)
				if tt.method == http.MethodHead {
					if response.Body.Len() != 0 {
						t.Error("HEAD response must not have a body")
					}
				} else {
					var result map[string]string
					if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
						t.Fatal(err)
					}
					if result["status"] != "ok" {
						t.Errorf("health body = %s", response.Body.String())
					}
				}
			}
			if got := response.Header().Get("Allow"); got != tt.wantAllow {
				t.Errorf("Allow = %q, want %q", got, tt.wantAllow)
			}
		})
	}
}

func assertJSONContentType(t *testing.T, response *httptest.ResponseRecorder) {
	t.Helper()
	if got := response.Header().Get("Content-Type"); got != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", got)
	}
}

func assertErrorResponse(t *testing.T, response *httptest.ResponseRecorder, wantStatus int, wantCode string) {
	t.Helper()
	if response.Code != wantStatus {
		t.Fatalf("status = %d, want %d; body = %s", response.Code, wantStatus, response.Body.String())
	}
	assertJSONContentType(t, response)
	var result errorResponse
	if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	if result.Error.Code != wantCode || result.Error.Message == "" {
		t.Errorf("error = %+v, want code %q and a non-empty message", result.Error, wantCode)
	}
}
