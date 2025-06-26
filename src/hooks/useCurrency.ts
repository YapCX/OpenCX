import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { formatCurrencyFromMap, formatAmountOnly } from "../lib/validation";

// Hook to get all currency symbols from database
export const useCurrencySymbols = () => {
  const symbolMap = useQuery(api.currencies.getCurrencySymbols);

  return {
    symbolMap: symbolMap || {},
    isLoading: symbolMap === undefined,
    getCurrencySymbol: (currencyCode: string) => {
      return symbolMap?.[currencyCode] || null;
    },
    formatCurrency: (amount: number, currencyCode: string) => {
      if (!symbolMap) {
        return formatAmountOnly(amount, currencyCode);
      }
      return formatCurrencyFromMap(amount, currencyCode, symbolMap);
    }
  };
};

// Hook to get a specific currency symbol from database
export const useCurrencySymbol = (currencyCode: string) => {
  const symbol = useQuery(api.currencies.getCurrencySymbol, { currencyCode });

  return {
    symbol: symbol, // Can be null if not in database
    isLoading: symbol === undefined,
    hasSymbol: symbol !== null,
  };
};