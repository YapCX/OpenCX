import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Currency formatting utility - database symbol required
export function formatCurrencyWithSymbol(amount: number, symbol: string) {
  return `${symbol}${amount.toFixed(2)}`;
}

// Currency formatting without symbol (for cases where database symbol not available)
export function formatCurrencyCodeOnly(amount: number, currencyCode: string) {
  return `${amount.toFixed(2)} ${currencyCode}`;
}

// Transaction type display utilities
export function getTransactionTypeDisplay(type: string) {
  switch (type) {
    case "cash_in": return "Cash In";
    case "cash_out": return "Cash Out";
    case "currency_buy": return "Currency Buy";
    case "currency_sell": return "Currency Sell";
    case "transfer": return "Transfer";
    case "adjustment": return "Adjustment";
    default: return type.replace("_", " ").toUpperCase();
  }
}

export function getTransactionTypeColor(type: string) {
  switch (type) {
    case "cash_in":
    case "currency_sell":
      return "bg-green-100 text-green-800";
    case "cash_out":
    case "currency_buy":
      return "bg-red-100 text-red-800";
    default:
      return "bg-blue-100 text-blue-800";
  }
}
