import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import {
  calculate,
  CalculatorApiError,
  type Operation,
} from "../services/calculatorApi";
import Calculator from "./Calculator";

vi.mock("../services/calculatorApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/calculatorApi")>()),
  calculate: vi.fn(),
}));

const calculateMock = vi.mocked(calculate);

beforeEach(() => {
  calculateMock.mockReset();
  calculateMock.mockResolvedValue(5);
});

async function enterNumbers(left = "10", right = "2") {
  const user = userEvent.setup();
  await user.type(screen.getByRole("textbox", { name: "First number" }), left);
  await user.type(
    screen.getByRole("textbox", { name: "Second number" }),
    right,
  );
  return user;
}

describe("calculator experience", () => {
  it("renders the page, labeled controls, and an empty result state", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Everyday math.",
    );
    expect(
      screen.getByRole("link", { name: "Skip to calculator" }),
    ).toHaveAttribute("href", "#calculator");
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(screen.getByRole("radio", { name: "Add" })).toBeChecked();
    expect(screen.getByRole("textbox", { name: "First number" })).toBeEnabled();
    expect(
      screen.getByRole("textbox", { name: "Second number" }),
    ).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent("Ready when you are.");
  });

  it.each<[string, Operation, number]>([
    ["Add", "add", 12],
    ["Subtract", "subtract", 8],
    ["Multiply", "multiply", 20],
    ["Divide", "divide", 5],
  ])(
    "sends the %s operation to the API and displays its result",
    async (label, operation, result) => {
      calculateMock.mockResolvedValue(result);
      render(<Calculator />);
      const user = await enterNumbers();
      await user.click(screen.getByRole("radio", { name: label }));
      await user.click(screen.getByRole("button", { name: "Calculate" }));
      expect(calculateMock).toHaveBeenCalledWith(
        { operation, leftOperand: 10, rightOperand: 2 },
        expect.any(AbortSignal),
      );
      expect(
        await within(screen.getByRole("status")).findByText(String(result)),
      ).toBeVisible();
    },
  );

  it("validates required fields and focuses the first invalid field", async () => {
    render(<Calculator />);
    await userEvent.click(screen.getByRole("button", { name: "Calculate" }));
    expect(screen.getByText("Enter the first number.")).toBeVisible();
    expect(screen.getByText("Enter the second number.")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "First number" })).toHaveFocus();
    expect(
      screen.getByRole("textbox", { name: "First number" }),
    ).toHaveAttribute("aria-invalid", "true");
    expect(calculateMock).not.toHaveBeenCalled();
  });

  it("focuses the second number when only that field is missing", async () => {
    render(<Calculator />);
    const user = userEvent.setup();
    await user.type(
      screen.getByRole("textbox", { name: "First number" }),
      "10",
    );
    await user.click(screen.getByRole("button", { name: "Calculate" }));
    expect(
      screen.getByRole("textbox", { name: "Second number" }),
    ).toHaveFocus();
    expect(calculateMock).not.toHaveBeenCalled();
  });

  it.each(["abc", "1e400", "0x10", "12,5", "Infinity"])(
    "rejects invalid numeric input %s",
    async (value) => {
      render(<Calculator />);
      const user = await enterNumbers(value, "2");
      await user.click(screen.getByRole("button", { name: "Calculate" }));
      expect(
        screen.getByText("Use a valid number, like 12.5 or -3."),
      ).toBeVisible();
      expect(calculateMock).not.toHaveBeenCalled();
    },
  );

  it("validates an invalid second number", async () => {
    render(<Calculator />);
    const user = await enterNumbers("10", "invalid");
    await user.click(screen.getByRole("button", { name: "Calculate" }));
    expect(
      screen.getByRole("textbox", { name: "Second number" }),
    ).toHaveAttribute("aria-invalid", "true");
    expect(calculateMock).not.toHaveBeenCalled();
  });

  it.each(["0", "-0"])(
    "prevents division by %s without making a request",
    async (value) => {
      render(<Calculator />);
      const user = await enterNumbers("10", value);
      await user.click(screen.getByRole("radio", { name: "Divide" }));
      await user.click(screen.getByRole("button", { name: "Calculate" }));
      expect(
        screen.getByText("Use a number other than zero for division."),
      ).toBeVisible();
      expect(calculateMock).not.toHaveBeenCalled();
    },
  );

  it("accepts zero and negative decimals and submits with Enter", async () => {
    calculateMock.mockResolvedValue(0);
    render(<Calculator />);
    const user = await enterNumbers("0", "-2.5");
    await user.click(screen.getByRole("radio", { name: "Multiply" }));
    await user.click(screen.getByRole("textbox", { name: "Second number" }));
    await user.keyboard("{Enter}");
    expect(calculateMock).toHaveBeenCalledWith(
      { operation: "multiply", leftOperand: 0, rightOperand: -2.5 },
      expect.any(AbortSignal),
    );
    expect(
      await within(screen.getByRole("status")).findByText("0"),
    ).toBeVisible();
  });

  it("shows loading, locks the form, and prevents duplicate submissions", async () => {
    let finish!: (value: number) => void;
    calculateMock.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    render(<Calculator />);
    const user = await enterNumbers();
    await user.click(screen.getByRole("button", { name: "Calculate" }));
    expect(screen.getByRole("button", { name: "Calculating…" })).toBeDisabled();
    expect(
      screen.getByRole("textbox", { name: "First number" }),
    ).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Divide" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Finding your answer…",
    );
    fireEvent.submit(
      screen.getByRole("button", { name: "Calculating…" }).closest("form")!,
    );
    expect(calculateMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish(5);
    });
    expect(screen.getByRole("button", { name: "Calculate" })).toBeEnabled();
  });

  it("announces API errors and lets the user retry", async () => {
    calculateMock.mockRejectedValueOnce(
      new CalculatorApiError(
        "That result is too large. Try smaller numbers.",
        "RESULT_OUT_OF_RANGE",
      ),
    );
    render(<Calculator />);
    const user = await enterNumbers();
    await user.click(screen.getByRole("button", { name: "Calculate" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That result is too large.",
    );
    expect(screen.getByRole("textbox", { name: "First number" })).toHaveValue(
      "10",
    );
    await user.click(screen.getByRole("button", { name: "Calculate" }));
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
    expect(
      await within(screen.getByRole("status")).findByText("5"),
    ).toBeVisible();
  });

  it("handles unexpected failures without showing technical details", async () => {
    calculateMock.mockRejectedValue(new Error("Internal stack trace"));
    render(<Calculator />);
    const user = await enterNumbers();
    await user.click(screen.getByRole("button", { name: "Calculate" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
    expect(screen.queryByText("Internal stack trace")).not.toBeInTheDocument();
  });

  it("clears a stale result when numbers or the operation change", async () => {
    render(<Calculator />);
    const user = await enterNumbers();
    await user.click(screen.getByRole("button", { name: "Calculate" }));
    await within(screen.getByRole("status")).findByText("5");
    await user.type(screen.getByRole("textbox", { name: "First number" }), "1");
    expect(screen.getByRole("status")).toHaveTextContent("Ready when you are.");
    await user.click(screen.getByRole("button", { name: "Calculate" }));
    await within(screen.getByRole("status")).findByText("5");
    await user.click(screen.getByRole("radio", { name: "Subtract" }));
    expect(screen.getByRole("status")).toHaveTextContent("Ready when you are.");
  });

  it("resets values, operation, and result, then focuses the first field", async () => {
    render(<Calculator />);
    const user = await enterNumbers();
    await user.click(screen.getByRole("radio", { name: "Divide" }));
    await user.click(screen.getByRole("button", { name: "Calculate" }));
    await within(screen.getByRole("status")).findByText("5");
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByRole("textbox", { name: "First number" })).toHaveValue(
      "",
    );
    expect(screen.getByRole("textbox", { name: "Second number" })).toHaveValue(
      "",
    );
    expect(screen.getByRole("radio", { name: "Add" })).toBeChecked();
    expect(screen.getByRole("textbox", { name: "First number" })).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("Ready when you are.");
  });

  it.each([
    [1e20, "1E20"],
    [1e-8, "1E-8"],
    [0.30000000000000004, "0.3"],
  ])(
    "formats server result %s for readable display",
    async (value, expected) => {
      calculateMock.mockResolvedValue(value as number);
      render(<Calculator />);
      const user = await enterNumbers();
      await user.click(screen.getByRole("button", { name: "Calculate" }));
      expect(
        await within(screen.getByRole("status")).findByText(String(expected)),
      ).toBeVisible();
    },
  );

  it("aborts the active request when the component is unmounted", async () => {
    calculateMock.mockImplementation(
      (_input, signal) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Cancelled", "AbortError")),
            { once: true },
          );
        }),
    );
    const view = render(<Calculator />);
    const user = await enterNumbers();
    await user.click(screen.getByRole("button", { name: "Calculate" }));
    const signal = calculateMock.mock.calls[0][1]!;
    await act(async () => {
      view.unmount();
    });
    expect(signal.aborted).toBe(true);
  });
});
