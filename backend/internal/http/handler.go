// Package httpapi translates JSON HTTP requests into calculator operations.
package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"mime"
	"net/http"

	"fullstack-calculator/backend/internal/calculator"
)

const maxBodyBytes = 1 << 20 // 1 MiB

type calculateRequest struct {
	Operation string `json:"operation"`
	// Pointers distinguish a missing or null operand from the valid number zero.
	LeftOperand  *float64 `json:"leftOperand"`
	RightOperand *float64 `json:"rightOperand"`
}

type calculateResponse struct {
	Result float64 `json:"result"`
}

type apiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type errorResponse struct {
	Error apiError `json:"error"`
}

// NewHandler returns the API routes. It does not open a network listener.
func NewHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", health)
	mux.HandleFunc("/api/v1/calculate", calculate)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Endpoint not found.")
	})
	return mux
}

func health(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.Header().Set("Allow", "GET, HEAD")
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Use GET for this endpoint.")
		return
	}
	if r.Method == http.MethodHead {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		return
	}
	writeJSON(w, http.StatusOK, struct {
		Status string `json:"status"`
	}{Status: "ok"})
}

func calculate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", "POST")
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Use POST for this endpoint.")
		return
	}
	mediaType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || mediaType != "application/json" {
		writeError(w, http.StatusUnsupportedMediaType, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json.")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	var request calculateRequest
	if err := decoder.Decode(&request); err != nil {
		writeDecodeError(w, err)
		return
	}
	// A second JSON value or trailing garbage is not a valid single request.
	if err := decoder.Decode(new(any)); err != io.EOF {
		writeDecodeError(w, err)
		return
	}
	if request.Operation == "" || request.LeftOperand == nil || request.RightOperand == nil {
		writeError(w, http.StatusBadRequest, "MISSING_FIELDS", "operation, leftOperand, and rightOperand are required and must not be null.")
		return
	}

	result, err := calculator.Calculate(request.Operation, *request.LeftOperand, *request.RightOperand)
	switch {
	case errors.Is(err, calculator.ErrUnknownOperation):
		writeError(w, http.StatusBadRequest, "INVALID_OPERATION", "Operation must be add, subtract, multiply, or divide.")
	case errors.Is(err, calculator.ErrDivisionByZero):
		writeError(w, http.StatusBadRequest, "DIVISION_BY_ZERO", "Division by zero is not allowed.")
	case errors.Is(err, calculator.ErrInvalidOperand):
		writeError(w, http.StatusBadRequest, "INVALID_OPERAND", "Operands must be finite numbers.")
	case errors.Is(err, calculator.ErrResultOutOfRange):
		writeError(w, http.StatusBadRequest, "RESULT_OUT_OF_RANGE", "Result is outside the supported numeric range.")
	case err != nil:
		log.Printf("calculate: %v", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Unable to complete the calculation.")
	default:
		writeJSON(w, http.StatusOK, calculateResponse{Result: result})
	}
}

func writeDecodeError(w http.ResponseWriter, err error) {
	var sizeError *http.MaxBytesError
	if errors.As(err, &sizeError) {
		writeError(w, http.StatusRequestEntityTooLarge, "BODY_TOO_LARGE", "Request body must not exceed 1 MiB.")
		return
	}
	writeError(w, http.StatusBadRequest, "INVALID_JSON", "Body must be one JSON object with numeric operands and no unknown fields.")
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, errorResponse{Error: apiError{Code: code, Message: message}})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("write response: %v", err)
	}
}
