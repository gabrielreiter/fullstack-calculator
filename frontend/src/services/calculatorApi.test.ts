import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculate,
  CalculatorApiError,
  type CalculationRequest,
} from "./calculatorApi";

const input: CalculationRequest = {
  operation: "divide",
  leftOperand: 10,
  rightOperand: 2,
};
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("calculator API client", () => {
  it("posts JSON to the calculation endpoint and returns the server result", async () => {
    fetchMock.mockResolvedValue(Response.json({ result: 5 }));
    await expect(calculate(input)).resolves.toBe(5);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/calculate",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("uses the configured API base URL without duplicate trailing slashes", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "/custom/api///");
    fetchMock.mockResolvedValue(Response.json({ result: 5 }));
    await calculate(input);
    expect(fetchMock).toHaveBeenCalledWith(
      "/custom/api/calculate",
      expect.any(Object),
    );
  });

  it("accepts zero as a valid result", async () => {
    fetchMock.mockResolvedValue(Response.json({ result: 0 }));
    await expect(calculate(input)).resolves.toBe(0);
  });

  it.each([
    [
      "DIVISION_BY_ZERO",
      "You can’t divide by zero. Try a different second number.",
    ],
    ["RESULT_OUT_OF_RANGE", "That result is too large. Try smaller numbers."],
    ["INVALID_OPERATION", "Choose one of the four available operations."],
    ["INVALID_OPERAND", "Enter two valid, finite numbers."],
    ["MISSING_FIELDS", "Enter both numbers and choose an operation."],
  ])("maps %s to an actionable user message", async (code, message) => {
    fetchMock.mockResolvedValue(
      Response.json(
        { error: { code, message: "API detail" } },
        { status: 400 },
      ),
    );
    await expect(calculate(input)).rejects.toMatchObject({
      name: "CalculatorApiError",
      code,
      message,
    });
  });

  it("handles unknown API errors without exposing internal messages", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { error: { code: "INTERNAL_ERROR", message: "Internal details" } },
        { status: 500 },
      ),
    );
    await expect(calculate(input)).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      message: "We couldn’t complete that calculation. Please try again.",
    });
  });

  it("handles non-JSON errors from a proxy", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>unavailable</html>", { status: 502 }),
    );
    await expect(calculate(input)).rejects.toMatchObject({
      code: "REQUEST_FAILED",
    });
  });

  it.each([null, {}, { result: "5" }, { result: null }, [], { result: true }])(
    "rejects an invalid success response: %j",
    async (body) => {
      fetchMock.mockResolvedValue(Response.json(body));
      await expect(calculate(input)).rejects.toMatchObject({
        code: "INVALID_RESPONSE",
      });
    },
  );

  it("rejects a non-finite server result", async () => {
    fetchMock.mockResolvedValue(new Response('{"result":1e400}'));
    await expect(calculate(input)).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });

  it("rejects a non-JSON success response", async () => {
    fetchMock.mockResolvedValue(new Response("not JSON"));
    await expect(calculate(input)).rejects.toBeInstanceOf(CalculatorApiError);
  });

  it("provides a useful connection failure message", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(calculate(input)).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      message: "Unable to connect. Check your connection and try again.",
    });
  });

  it("reports requests that time out", async () => {
    const timeout = new AbortController();
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeout.signal);
    fetchMock.mockImplementation(async () => {
      timeout.abort();
      throw new DOMException("Request timed out", "TimeoutError");
    });
    await expect(calculate(input)).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("preserves cancellation requested by the caller", async () => {
    const controller = new AbortController();
    const abortError = new DOMException("Cancelled", "AbortError");
    fetchMock.mockImplementation(async () => {
      controller.abort();
      throw abortError;
    });
    await expect(calculate(input, controller.signal)).rejects.toBe(abortError);
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });
});
