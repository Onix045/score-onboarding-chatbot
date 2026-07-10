import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useOnboardingController } from "./useOnboardingController";

describe("useOnboardingController", () => {
  it("starts inactive on the add-product step", () => {
    const { result } = renderHook(() => useOnboardingController());
    expect(result.current.active).toBe(false);
    expect(result.current.state.step).toBe("add-product");
  });

  it("start() activates the flow and resets any previous state", () => {
    const { result } = renderHook(() => useOnboardingController());

    act(() => {
      result.current.updateProductField("name", "Leftover text");
      result.current.start();
    });

    expect(result.current.active).toBe(true);
    expect(result.current.state.product.name).toBe("");
  });

  it("rejects an invalid product submission with a field error and stays on the same step", () => {
    const { result } = renderHook(() => useOnboardingController());

    act(() => {
      result.current.start();
      result.current.updateProductField("name", "");
      result.current.submitProduct();
    });

    expect(result.current.state.step).toBe("add-product");
    expect(result.current.state.error).toMatch(/product name/i);
  });

  it("advances to record-sale with a confirmed product on valid submission", () => {
    const { result } = renderHook(() => useOnboardingController());

    act(() => {
      result.current.start();
      result.current.updateProductField("name", "Blue Mug");
      result.current.updateProductField("quantity", "12");
      result.current.updateProductField("price", "4.5");
      result.current.submitProduct();
    });

    expect(result.current.state.step).toBe("record-sale");
    expect(result.current.state.confirmedProduct).toEqual({ name: "Blue Mug", quantity: 12, price: 4.5 });
    expect(result.current.state.error).toBeNull();
  });

  it("rejects a sale quantity greater than the available stock", () => {
    const { result } = renderHook(() => useOnboardingController());

    act(() => {
      result.current.start();
      result.current.updateProductField("name", "Blue Mug");
      result.current.updateProductField("quantity", "12");
      result.current.updateProductField("price", "4.5");
      result.current.submitProduct();
      result.current.updateSaleQuantity("13");
      result.current.submitSale();
    });

    expect(result.current.state.step).toBe("record-sale");
    expect(result.current.state.error).toMatch(/only added 12/i);
  });

  it("completes the flow and deducts the sold quantity from remaining stock", () => {
    const { result } = renderHook(() => useOnboardingController());

    act(() => {
      result.current.start();
      result.current.updateProductField("name", "Blue Mug");
      result.current.updateProductField("quantity", "12");
      result.current.updateProductField("price", "4.5");
      result.current.submitProduct();
      result.current.updateSaleQuantity("3");
      result.current.submitSale();
    });

    expect(result.current.state.step).toBe("complete");
    expect(result.current.state.soldQuantity).toBe(3);
    expect(result.current.state.confirmedProduct?.quantity).toBe(9);
  });

  it("back() returns to the previous step without losing the confirmed product", () => {
    const { result } = renderHook(() => useOnboardingController());

    act(() => {
      result.current.start();
      result.current.updateProductField("name", "Blue Mug");
      result.current.updateProductField("quantity", "12");
      result.current.updateProductField("price", "4.5");
      result.current.submitProduct();
      result.current.back();
    });

    expect(result.current.state.step).toBe("add-product");
    expect(result.current.state.confirmedProduct).toEqual({ name: "Blue Mug", quantity: 12, price: 4.5 });
  });

  it("restart() resets to the initial state without deactivating the flow", () => {
    const { result } = renderHook(() => useOnboardingController());

    act(() => {
      result.current.start();
      result.current.updateProductField("name", "Blue Mug");
      result.current.updateProductField("quantity", "12");
      result.current.updateProductField("price", "4.5");
      result.current.submitProduct();
      result.current.restart();
    });

    expect(result.current.active).toBe(true);
    expect(result.current.state.step).toBe("add-product");
    expect(result.current.state.confirmedProduct).toBeNull();
  });

  it("exit() deactivates the flow", () => {
    const { result } = renderHook(() => useOnboardingController());

    act(() => {
      result.current.start();
      result.current.exit();
    });

    expect(result.current.active).toBe(false);
  });
});
