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

// Format currency with symbol from database - no fallbacks
export const formatCurrencyFromMap = (amount: number, currencyCode: string, symbolMap: Record<string, string>): string => {
  const symbol = symbolMap[currencyCode];
  if (!symbol) {
    console.warn(`No symbol found in database for currency: ${currencyCode}`);
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
  return `${symbol}${amount.toFixed(2)}`;
};

// Format currency amount without symbol (when symbol is not available)
export const formatAmountOnly = (amount: number, currencyCode: string): string => {
  return `${amount.toFixed(2)} ${currencyCode}`;
};