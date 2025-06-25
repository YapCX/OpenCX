// Validation constants for forms
export const VALIDATION_LIMITS = {
  PERCENTAGE_MIN: 0,
  PERCENTAGE_MAX: 100,
  PERCENTAGE_STEP: 0.01,
  CURRENCY_STEP: 0.01,
  CURRENCY_PRECISION_STEP: 0.0001,
  CURRENCY_MARKET_STEP: 0.000001,
  FEE_MIN: 0,
  USER_PERMISSION_STEP: 0.1,
} as const;

// Currency symbol mapping - could eventually come from backend
export const getCurrencySymbol = (currencyCode: string): string => {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CAD: "C$",
    AUD: "A$",
    CHF: "Fr",
    CNY: "¥",
  };
  return symbols[currencyCode] || currencyCode + " ";
};

// Format currency with proper symbol
export const formatCurrency = (amount: number, currencyCode: string): string => {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${amount.toFixed(2)}`;
};