// Package calculator implements arithmetic independently of HTTP.
package calculator

import (
	"errors"
	"math"
)

var (
	ErrUnknownOperation = errors.New("operation must be add, subtract, multiply, or divide")
	ErrDivisionByZero   = errors.New("division by zero is not allowed")
	ErrInvalidOperand   = errors.New("operands must be finite numbers")
	ErrResultOutOfRange = errors.New("result is outside the supported numeric range")
)

// Calculate applies one operation to two finite float64 operands.
// It returns an error instead of a non-finite result, which JSON cannot represent.
func Calculate(operation string, left, right float64) (float64, error) {
	if !isFinite(left) || !isFinite(right) {
		return 0, ErrInvalidOperand
	}

	var result float64
	switch operation {
	case "add":
		result = left + right
	case "subtract":
		result = left - right
	case "multiply":
		result = left * right
	case "divide":
		if right == 0 {
			return 0, ErrDivisionByZero
		}
		result = left / right
	default:
		return 0, ErrUnknownOperation
	}

	if !isFinite(result) {
		return 0, ErrResultOutOfRange
	}
	return result, nil
}

func isFinite(value float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0)
}
