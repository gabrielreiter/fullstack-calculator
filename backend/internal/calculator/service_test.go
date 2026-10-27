package calculator

import (
	"errors"
	"math"
	"testing"
)

func TestCalculate(t *testing.T) {
	tests := []struct {
		name      string
		operation string
		left      float64
		right     float64
		want      float64
		wantErr   error
	}{
		{name: "addition", operation: "add", left: 10, right: 2, want: 12},
		{name: "subtraction", operation: "subtract", left: 10, right: 2, want: 8},
		{name: "multiplication", operation: "multiply", left: 10, right: 2, want: 20},
		{name: "division", operation: "divide", left: 10, right: 2, want: 5},
		{name: "fractional result", operation: "divide", left: 1, right: 4, want: 0.25},
		{name: "negative operands", operation: "multiply", left: -3, right: 2, want: -6},
		{name: "zero is valid", operation: "add", left: 0, right: 0, want: 0},
		{name: "zero numerator", operation: "divide", left: 0, right: 3, want: 0},
		{name: "decimal precision", operation: "add", left: 0.1, right: 0.2, want: 0.3},
		{name: "division by zero", operation: "divide", left: 10, right: 0, wantErr: ErrDivisionByZero},
		{name: "division by negative zero", operation: "divide", left: 10, right: math.Copysign(0, -1), wantErr: ErrDivisionByZero},
		{name: "unknown operation", operation: "power", left: 2, right: 3, wantErr: ErrUnknownOperation},
		{name: "empty operation", operation: "", left: 2, right: 3, wantErr: ErrUnknownOperation},
		{name: "NaN operand", operation: "add", left: math.NaN(), right: 1, wantErr: ErrInvalidOperand},
		{name: "infinite left operand", operation: "add", left: math.Inf(1), right: 1, wantErr: ErrInvalidOperand},
		{name: "infinite right operand", operation: "add", left: 1, right: math.Inf(-1), wantErr: ErrInvalidOperand},
		{name: "addition overflow", operation: "add", left: math.MaxFloat64, right: math.MaxFloat64, wantErr: ErrResultOutOfRange},
		{name: "subtraction overflow", operation: "subtract", left: -math.MaxFloat64, right: math.MaxFloat64, wantErr: ErrResultOutOfRange},
		{name: "multiplication overflow", operation: "multiply", left: math.MaxFloat64, right: 2, wantErr: ErrResultOutOfRange},
		{name: "division overflow", operation: "divide", left: math.MaxFloat64, right: 0.5, wantErr: ErrResultOutOfRange},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calculate(tt.operation, tt.left, tt.right)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("Calculate() error = %v, want %v", err, tt.wantErr)
			}
			if err != nil {
				return
			}
			if math.Abs(got-tt.want) > 1e-12*math.Max(1, math.Abs(tt.want)) {
				t.Errorf("Calculate() = %v, want %v", got, tt.want)
			}
		})
	}
}
