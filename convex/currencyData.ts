import { action } from "./_generated/server";
import { v } from "convex/values";
// @ts-ignore - world-countries doesn't have perfect TypeScript support
import countries from "world-countries";

interface CurrencyInfo {
  code: string;
  name: string;
  country: string;
  flag: string;
}

/**
 * Extract currency information from world-countries data
 */
function getCurrencyDataFromWorldCountries(): Record<string, CurrencyInfo> {
  const currencyMap: Record<string, CurrencyInfo> = {};

  countries.forEach((country: any) => {
    // Get the country's currencies
    const currencies = country.currencies || {};

    // Process each currency for this country
    Object.entries(currencies).forEach(([currencyCode, currencyData]: [string, any]) => {
      // Only add if we don't already have this currency or if this country is "more canonical"
      if (!currencyMap[currencyCode] || shouldReplaceCurrency(currencyMap[currencyCode], country)) {
        currencyMap[currencyCode] = {
          code: currencyCode,
          name: currencyData.name || currencyCode,
          country: country.name.common,
          flag: country.flag || "🏳️", // Default flag if not available
        };
      }
    });
  });

  return currencyMap;
}

/**
 * Determine if we should replace existing currency data with a new country's data
 * This helps pick the "main" country for currencies used by multiple countries
 */
function shouldReplaceCurrency(existing: CurrencyInfo, newCountry: any): boolean {
  const newCountryName = newCountry.name.common;

  // Preference rules for major currencies
  const currencyPreferences: Record<string, string[]> = {
    USD: ["United States"],
    EUR: ["Germany", "France", "Italy", "Spain"], // Major EU economies first
    GBP: ["United Kingdom"],
    JPY: ["Japan"],
    CHF: ["Switzerland"],
    CAD: ["Canada"],
    AUD: ["Australia"],
    CNY: ["China"],
    INR: ["India"],
    BRL: ["Brazil"],
    RUB: ["Russia"],
  };

  const preferences = currencyPreferences[existing.code];
  if (preferences) {
    return preferences.includes(newCountryName);
  }

  // For other currencies, prefer independent countries over territories
  return newCountry.independent === true;
}

/**
 * Get currency information by code
 */
export const getCurrencyInfo = action({
  args: {
    code: v.string()
  },
  returns: v.union(
    v.object({
      found: v.literal(true),
      data: v.object({
        code: v.string(),
        name: v.string(),
        country: v.string(),
        flag: v.string(),
      })
    }),
    v.object({
      found: v.literal(false),
      message: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const currencyCode = args.code.toUpperCase();
    const currencyData = getCurrencyDataFromWorldCountries();
    const currencyInfo = currencyData[currencyCode];

    if (currencyInfo) {
      return {
        found: true as const,
        data: currencyInfo
      };
    }

    return {
      found: false as const,
      message: `Currency code "${currencyCode}" not found in database. Please enter details manually.`
    };
  },
});

/**
 * Get all available currency codes for autocomplete
 */
export const getAvailableCurrencies = action({
  args: {},
  returns: v.array(v.object({
    code: v.string(),
    name: v.string(),
    country: v.string(),
    flag: v.string(),
  })),
  handler: async (ctx) => {
    const currencyData = getCurrencyDataFromWorldCountries();
    return Object.values(currencyData).sort((a, b) => a.code.localeCompare(b.code));
  },
});

/**
 * Search currencies by partial code or name
 */
export const searchCurrencies = action({
  args: {
    searchTerm: v.string()
  },
  returns: v.array(v.object({
    code: v.string(),
    name: v.string(),
    country: v.string(),
    flag: v.string(),
  })),
  handler: async (ctx, args) => {
    const term = args.searchTerm.toLowerCase();
    const currencyData = getCurrencyDataFromWorldCountries();

    return Object.values(currencyData)
      .filter(currency =>
        currency.code.toLowerCase().includes(term) ||
        currency.name.toLowerCase().includes(term) ||
        currency.country.toLowerCase().includes(term)
      )
      .sort((a, b) => a.code.localeCompare(b.code));
  },
});