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

/**
 * Get the appropriate step value for a currency based on its smallest denomination
 * This is a non-hook version for use in validation contexts
 */
export const getCurrencyStepForValidation = (currencyCode: string): number => {
  // Default step values for common currencies
  const defaultSteps: Record<string, number> = {
    'JPY': 1,      // Japanese Yen - no decimal places
    'KRW': 1,      // Korean Won - no decimal places
    'VND': 1,      // Vietnamese Dong - no decimal places
    'IDR': 1,      // Indonesian Rupiah - no decimal places
    'CLP': 1,      // Chilean Peso - no decimal places
    'CAD': 0.05,   // Canadian Dollar - no pennies since 2013
    'AUD': 0.05,   // Australian Dollar - no 1c or 2c coins
    'NZD': 0.10,   // New Zealand Dollar - no 5c coins
    'CHF': 0.05,   // Swiss Franc - smallest is 5 centimes
    'SEK': 1,      // Swedish Krona - no öre coins in circulation
    'NOK': 1,      // Norwegian Krone - no øre coins in circulation
    'DKK': 0.50,   // Danish Krone - smallest is 50 øre
  };

  return defaultSteps[currencyCode] || VALIDATION_LIMITS.CURRENCY_STEP;
};

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