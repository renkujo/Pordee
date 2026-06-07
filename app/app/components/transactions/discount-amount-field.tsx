import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { fmtNumber } from "~/lib/format/number";
import { usePordeeTranslation } from "~/lib/i18n/provider";

interface DiscountAmountFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hasDiscountInput: boolean;
  hasValidDiscount: boolean;
  netAmount: number;
}

export const DiscountAmountField = ({
  value,
  onChange,
  error,
  hasDiscountInput,
  hasValidDiscount,
  netAmount,
}: DiscountAmountFieldProps) => {
  const t = usePordeeTranslation();

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="discountAmount">{t("transaction.discount.label")}</Label>
      <Input
        id="discountAmount"
        name="discountAmount"
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="0"
        aria-describedby="discount-hint"
      />
      {error ? <p className="text-coral-strong text-sm">{t(error)}</p> : null}
      {hasDiscountInput && hasValidDiscount ? (
        <p id="discount-hint" className="text-muted text-sm">
          {t("transaction.discount.netAmount", {
            amount: fmtNumber(netAmount),
          })}
        </p>
      ) : null}
      {hasDiscountInput && !hasValidDiscount ? (
        <p id="discount-hint" className="text-coral-strong text-sm">
          {t("transaction.discount.error.tooHigh")}
        </p>
      ) : null}
    </div>
  );
};
