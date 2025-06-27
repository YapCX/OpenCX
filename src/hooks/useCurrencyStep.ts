import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Default step values for common currencies when no denominations exist in database
 * Based on real-world currency usage and smallest circulating denominations
 */
const DEFAULT_CURRENCY_STEPS: Record<string, number> = {
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

/**
 * Custom hook to get the correct step value for currency inputs
 * **ALWAYS** uses database as single source of truth for denominations
 */
export const useCurrencyStep = (currencyCode: string) => {
  // ONLY query database - never external library
  const denominations = useQuery(
    api.denominations.list,
    currencyCode ? { currencyCode } : "skip"
  );

  // Calculate the smallest denomination step from DATABASE ONLY
  const getSmallestDenominationStep = (currencyCode: string) => {
    if (!denominations || denominations.length === 0) {
      // Fallback to default step if NO denominations in database
      return DEFAULT_CURRENCY_STEPS[currencyCode] || 0.01;
    }

    // Find the smallest value denomination FROM DATABASE
    const smallestValue = Math.min(...denominations.map(d => d.value));
    return smallestValue;
  };

  const step = getSmallestDenominationStep(currencyCode);
  const isLoading = denominations === undefined;

  return {
    step,
    isLoading,
    hasDenominations: denominations && denominations.length > 0,
    denominationsCount: denominations?.length || 0,
    // Helper to format step as string for input components
    stepString: step.toString(),
  };
};

/**
 * Utility function to get currency step without React hooks
 * Useful for static contexts or calculations
 */
export const getCurrencyStepValue = (currencyCode: string, denominations?: Array<{value: number}>) => {
  if (denominations && denominations.length > 0) {
    return Math.min(...denominations.map(d => d.value));
  }

  return DEFAULT_CURRENCY_STEPS[currencyCode] || 0.01;
};