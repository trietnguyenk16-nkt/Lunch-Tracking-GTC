export const DEFAULT_CURRENCY = "USD";
export const MINOR_UNITS_PER_MAJOR = 100;

export type Money = Readonly<{
  amountMinor: number;
  currency: string;
}>;

function assertSafeMinorUnits(amountMinor: number): void {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new Error("Money amount must be a safe integer number of minor units");
  }
}

function normalizeCurrency(currency: string): string {
  const normalized = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new Error("Currency must be a three-letter ISO-style code");
  }
  return normalized;
}

export function money(amountMinor: number, currency = DEFAULT_CURRENCY): Money {
  assertSafeMinorUnits(amountMinor);
  return Object.freeze({
    amountMinor,
    currency: normalizeCurrency(currency),
  });
}

export function parseMoney(value: string | number, currency = DEFAULT_CURRENCY): Money {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new Error("Numeric money input must already be an integer number of minor units");
    }
    return money(value, currency);
  }

  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Money must be a non-negative decimal with at most two fractional digits");
  }

  const [majorPart, fractionalPart = ""] = normalized.split(".");
  const amountMinor = Number(majorPart) * MINOR_UNITS_PER_MAJOR + Number(fractionalPart.padEnd(2, "0"));
  return money(amountMinor, currency);
}

export function formatMoney(value: Money): string {
  return `${(value.amountMinor / MINOR_UNITS_PER_MAJOR).toFixed(2)} ${value.currency}`;
}

export function allocateEqualShares(total: Money, participantIds: readonly string[]): readonly Money[] {
  if (participantIds.length === 0) {
    throw new Error("At least one participant is required");
  }
  const uniqueIds = new Set(participantIds);
  if (uniqueIds.size !== participantIds.length) {
    throw new Error("Participants must be unique");
  }
  if (total.amountMinor <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  const base = Math.floor(total.amountMinor / participantIds.length);
  const remainder = total.amountMinor % participantIds.length;
  return participantIds.map((_, index) => money(base + (index < remainder ? 1 : 0), total.currency));
}
