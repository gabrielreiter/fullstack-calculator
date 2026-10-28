import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  calculate,
  CalculatorApiError,
  type Operation,
} from "../services/calculatorApi";

const operations: { value: Operation; label: string; symbol: string }[] = [
  { value: "add", label: "Add", symbol: "+" },
  { value: "subtract", label: "Subtract", symbol: "−" },
  { value: "multiply", label: "Multiply", symbol: "×" },
  { value: "divide", label: "Divide", symbol: "÷" },
];

type FieldErrors = { left?: string; right?: string };
type Result = { value: number; expression: string };

// Accept decimal/scientific notation, but not JS-only forms such as hexadecimal.
function parseOperand(value: string): number | null {
  const text = value.trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text))
    return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function formatResult(value: number): string {
  const magnitude = Math.abs(value);
  return new Intl.NumberFormat("en-US", {
    maximumSignificantDigits: 15,
    notation:
      magnitude >= 1e12 || (magnitude > 0 && magnitude < 1e-6)
        ? "scientific"
        : "standard",
  }).format(value);
}

export default function Calculator() {
  const [operation, setOperation] = useState<Operation>("add");
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const leftInput = useRef<HTMLInputElement>(null);
  const rightInput = useRef<HTMLInputElement>(null);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => () => activeRequest.current?.abort(), []);

  function invalidateResult() {
    setResult(null);
    setApiError("");
    setErrors({});
  }

  function reset() {
    setLeft("");
    setRight("");
    setOperation("add");
    invalidateResult();
    leftInput.current?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeRequest.current) return;
    const leftNumber = parseOperand(left);
    const rightNumber = parseOperand(right);
    const nextErrors: FieldErrors = {};

    if (!left.trim()) nextErrors.left = "Enter the first number.";
    else if (leftNumber === null)
      nextErrors.left = "Use a valid number, like 12.5 or -3.";
    if (!right.trim()) nextErrors.right = "Enter the second number.";
    else if (rightNumber === null)
      nextErrors.right = "Use a valid number, like 12.5 or -3.";
    else if (operation === "divide" && rightNumber === 0)
      nextErrors.right = "Use a number other than zero for division.";

    setErrors(nextErrors);
    setApiError("");
    setResult(null);
    if (
      nextErrors.left ||
      nextErrors.right ||
      leftNumber === null ||
      rightNumber === null
    ) {
      (nextErrors.left ? leftInput : rightInput).current?.focus();
      return;
    }

    const controller = new AbortController();
    activeRequest.current = controller;
    setIsLoading(true);
    try {
      const value = await calculate(
        { operation, leftOperand: leftNumber, rightOperand: rightNumber },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        const symbol = operations.find(
          (item) => item.value === operation,
        )!.symbol;
        setResult({
          value,
          expression: `${left.trim()} ${symbol} ${right.trim()}`,
        });
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setApiError(
          error instanceof CalculatorApiError
            ? error.message
            : "Something went wrong. Please try again.",
        );
      }
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
      activeRequest.current = null;
    }
  }

  return (
    <section
      className="calculator-card"
      id="calculator"
      tabIndex={-1}
      aria-labelledby="calculator-title"
    >
      <div className="card-header">
        <div>
          <p className="eyebrow">A FRESH PERSPECTIVE</p>
          <h2 id="calculator-title">Let’s work it out.</h2>
        </div>
        <button
          type="button"
          className="reset-button"
          onClick={reset}
          disabled={isLoading}
        >
          <span aria-hidden="true">↺</span> Clear
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <fieldset className="operation-fieldset" disabled={isLoading}>
          <legend>
            <span className="step-number">01</span> Choose an operation
          </legend>
          <div className="operation-grid">
            {operations.map((item) => (
              <label className="operation-option" key={item.value}>
                <input
                  type="radio"
                  name="operation"
                  value={item.value}
                  checked={operation === item.value}
                  onChange={() => {
                    setOperation(item.value);
                    invalidateResult();
                  }}
                />
                <span className="operation-tile">
                  <span className="operation-symbol" aria-hidden="true">
                    {item.symbol}
                  </span>
                  <span>{item.label}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="numbers-fieldset" disabled={isLoading}>
          <legend>
            <span className="step-number">02</span> Enter your numbers
          </legend>
          <div className="operand-grid">
            <div className="input-group">
              <label htmlFor="left-operand">First number</label>
              <input
                id="left-operand"
                ref={leftInput}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                placeholder="e.g. 24"
                value={left}
                onChange={(event) => {
                  setLeft(event.target.value);
                  invalidateResult();
                }}
                aria-invalid={Boolean(errors.left)}
                aria-describedby={
                  errors.left ? "number-hint left-error" : "number-hint"
                }
              />
              {errors.left && (
                <p className="field-error" id="left-error">
                  {errors.left}
                </p>
              )}
            </div>
            <div className="input-group">
              <label htmlFor="right-operand">Second number</label>
              <input
                id="right-operand"
                ref={rightInput}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                placeholder="e.g. 6"
                value={right}
                onChange={(event) => {
                  setRight(event.target.value);
                  invalidateResult();
                }}
                aria-invalid={Boolean(errors.right)}
                aria-describedby={
                  errors.right ? "number-hint right-error" : "number-hint"
                }
              />
              {errors.right && (
                <p className="field-error" id="right-error">
                  {errors.right}
                </p>
              )}
            </div>
          </div>
          <p className="input-hint" id="number-hint">
            Decimals and negative numbers welcome. Use a dot for decimals.
          </p>
        </fieldset>

        {apiError && (
          <div className="api-error" role="alert">
            <strong>Let’s try that again.</strong>
            <span>{apiError}</span>
          </div>
        )}

        <button className="calculate-button" type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <span className="spinner" aria-hidden="true" /> Calculating…
            </>
          ) : (
            <>
              Calculate <span aria-hidden="true">↗</span>
            </>
          )}
        </button>
      </form>

      <div
        className={`result-panel${result ? " has-result" : ""}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {isLoading ? (
          <>
            <span className="result-label">WORKING ON IT</span>
            <p className="empty-title">Finding your answer…</p>
            <p className="result-caption">Just a moment.</p>
          </>
        ) : result ? (
          <>
            <span className="result-label">YOUR RESULT</span>
            <p className="expression">{result.expression} =</p>
            <span className="result-value">{formatResult(result.value)}</span>
          </>
        ) : (
          <>
            <span className="result-label">A LITTLE SPACE FOR THE ANSWER</span>
            <p className="empty-title">Ready when you are.</p>
            <p className="result-caption">
              Your result will appear right here.
            </p>
          </>
        )}
        <span className="result-decoration" aria-hidden="true">
          =
        </span>
      </div>
    </section>
  );
}
