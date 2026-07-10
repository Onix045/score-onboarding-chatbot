"use client";

import { useOnboardingController } from "@/hooks/useOnboardingController";
import { stepNumber, totalSteps } from "@/lib/onboarding/steps";

type OnboardingController = ReturnType<typeof useOnboardingController>;

interface OnboardingCardProps {
  onboarding: OnboardingController;
}

const FIELD_CLASS =
  "min-h-11 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800";
const LABEL_CLASS = "text-xs font-medium text-neutral-600 dark:text-neutral-300";
const PRIMARY_BUTTON_CLASS =
  "min-h-11 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";
const SECONDARY_BUTTON_CLASS =
  "min-h-11 rounded-lg border border-neutral-300 px-4 text-sm font-medium text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-600 dark:text-neutral-200";

function ProgressLabel({ step }: { step: "add-product" | "record-sale" }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
      Practice step {stepNumber(step)} of {totalSteps()}
    </p>
  );
}

export function OnboardingCard({ onboarding }: OnboardingCardProps) {
  const { state, exit, restart, updateProductField, updateSaleQuantity, submitProduct, submitSale, back } =
    onboarding;

  if (state.step === "add-product") {
    return (
      <div className="space-y-3 border-t border-neutral-200 p-4 dark:border-neutral-700">
        <ProgressLabel step="add-product" />
        <p className="text-sm text-neutral-700 dark:text-neutral-200">
          Let&apos;s add your first product. This is just practice — nothing here is saved to a real account.
        </p>

        <div className="space-y-2">
          <label className={LABEL_CLASS} htmlFor="onboarding-product-name">
            Product name
          </label>
          <input
            id="onboarding-product-name"
            className={FIELD_CLASS}
            placeholder="e.g. Blue Mug"
            value={state.product.name}
            onChange={(event) => updateProductField("name", event.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <label className={LABEL_CLASS} htmlFor="onboarding-product-quantity">
              How many do you have?
            </label>
            <input
              id="onboarding-product-quantity"
              className={FIELD_CLASS}
              inputMode="numeric"
              placeholder="e.g. 12"
              value={state.product.quantity}
              onChange={(event) => updateProductField("quantity", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className={LABEL_CLASS} htmlFor="onboarding-product-price">
              Price each
            </label>
            <input
              id="onboarding-product-price"
              className={FIELD_CLASS}
              inputMode="decimal"
              placeholder="e.g. 4.50"
              value={state.product.price}
              onChange={(event) => updateProductField("price", event.target.value)}
            />
          </div>
        </div>

        {state.error ? (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {state.error}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-2 pt-1">
          <button type="button" onClick={exit} className={SECONDARY_BUTTON_CLASS}>
            Cancel
          </button>
          <button type="button" onClick={submitProduct} className={PRIMARY_BUTTON_CLASS}>
            Add product
          </button>
        </div>
      </div>
    );
  }

  if (state.step === "record-sale" && state.confirmedProduct) {
    return (
      <div className="space-y-3 border-t border-neutral-200 p-4 dark:border-neutral-700">
        <ProgressLabel step="record-sale" />
        <p className="text-sm text-neutral-700 dark:text-neutral-200">
          Nice! You added <strong>{state.confirmedProduct.name}</strong> ({state.confirmedProduct.quantity} in
          stock at ${state.confirmedProduct.price.toFixed(2)}). Now let&apos;s practice recording a sale.
        </p>

        <div className="space-y-2">
          <label className={LABEL_CLASS} htmlFor="onboarding-sale-quantity">
            How many did you sell?
          </label>
          <input
            id="onboarding-sale-quantity"
            className={FIELD_CLASS}
            inputMode="numeric"
            placeholder="e.g. 3"
            value={state.sale.quantity}
            onChange={(event) => updateSaleQuantity(event.target.value)}
          />
        </div>

        {state.error ? (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {state.error}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-2 pt-1">
          <button type="button" onClick={back} className={SECONDARY_BUTTON_CLASS}>
            Back
          </button>
          <button type="button" onClick={submitSale} className={PRIMARY_BUTTON_CLASS}>
            Complete sale
          </button>
        </div>
      </div>
    );
  }

  if (state.step === "complete" && state.confirmedProduct && state.soldQuantity !== null) {
    return (
      <div className="space-y-3 border-t border-neutral-200 p-4 dark:border-neutral-700">
        <p className="text-sm text-neutral-700 dark:text-neutral-200">
          That&apos;s the whole flow! You added <strong>{state.confirmedProduct.name}</strong> and sold{" "}
          {state.soldQuantity}, leaving <strong>{state.confirmedProduct.quantity}</strong>{" "}
          in stock. In a real product, this kind of step would update inventory, but this demo does not save
          anything to a real account.
        </p>

        <div className="flex items-center justify-between gap-2 pt-1">
          <button type="button" onClick={exit} className={SECONDARY_BUTTON_CLASS}>
            Done, back to chat
          </button>
          <button type="button" onClick={restart} className={PRIMARY_BUTTON_CLASS}>
            Practice again
          </button>
        </div>
      </div>
    );
  }

  return null;
}
