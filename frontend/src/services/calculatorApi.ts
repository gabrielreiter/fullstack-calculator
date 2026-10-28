export type Operation = "add" | "subtract" | "multiply" | "divide";

export interface CalculationRequest {
  operation: Operation;
  leftOperand: number;
  rightOperand: number;
}

export class CalculatorApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "CalculatorApiError";
  }
}

const errorMessages: Record<string, string> = {
  DIVISION_BY_ZERO: "You can’t divide by zero. Try a different second number.",
  RESULT_OUT_OF_RANGE: "That result is too large. Try smaller numbers.",
  INVALID_OPERATION: "Choose one of the four available operations.",
  INVALID_OPERAND: "Enter two valid, finite numbers.",
  MISSING_FIELDS: "Enter both numbers and choose an operation.",
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function calculate(
  input: CalculationRequest,
  signal?: AbortSignal,
): Promise<number> {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(
    /\/+$/,
    "",
  );
  const timeoutSignal = AbortSignal.timeout(15_000);

  try {
    const response = await fetch(`${baseUrl}/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
    });

    // A proxy or unavailable server may return HTML or an empty body.
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const code =
        isObject(data) &&
        isObject(data.error) &&
        typeof data.error.code === "string"
          ? data.error.code
          : "REQUEST_FAILED";
      throw new CalculatorApiError(
        errorMessages[code] ||
          "We couldn’t complete that calculation. Please try again.",
        code,
      );
    }
    if (
      !isObject(data) ||
      typeof data.result !== "number" ||
      !Number.isFinite(data.result)
    ) {
      throw new CalculatorApiError(
        "We received an unexpected response. Please try again.",
        "INVALID_RESPONSE",
      );
    }
    return data.result;
  } catch (error) {
    if (signal?.aborted || error instanceof CalculatorApiError) throw error;
    if (timeoutSignal.aborted) {
      throw new CalculatorApiError(
        "That took longer than expected. Please try again.",
        "TIMEOUT",
      );
    }
    throw new CalculatorApiError(
      "Unable to connect. Check your connection and try again.",
      "NETWORK_ERROR",
    );
  }
}
