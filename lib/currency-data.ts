/**
 * Currency data utilities using world-currencies and world-countries packages
 * Provides comprehensive currency information for auto-filling forms
 */

import * as worldCurrencies from 'world-currencies';
import worldCountries from 'world-countries';

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  country?: string;
  flag?: string;
}

/**
 * Find the best country for a currency code
 * Prioritizes independent countries and larger countries
 */
function findCountryForCurrency(currencyCode: string): { country: string; flag: string } | null {
  const countriesWithCurrency = worldCountries.filter(country =>
    country.currencies && Object.keys(country.currencies).includes(currencyCode)
  );

  if (countriesWithCurrency.length === 0) {
    return null;
  }

  // If only one country, use it
  if (countriesWithCurrency.length === 1) {
    const country = countriesWithCurrency[0];
    return {
      country: country.name.common,
      flag: country.flag
    };
  }

  // Multiple countries - pick the best one
  const bestCountry = countriesWithCurrency.sort((a, b) => {
    // Prioritize independent countries
    if (a.independent !== b.independent) {
      return b.independent ? 1 : -1;
    }
    // Then UN members
    if (a.unMember !== b.unMember) {
      return b.unMember ? 1 : -1;
    }
    // Then by area (larger countries first)
    return (b.area || 0) - (a.area || 0);
  })[0];

  return {
    country: bestCountry.name.common,
    flag: bestCountry.flag
  };
}

/**
 * Get currency information by code
 * Uses world-currencies for currency data and world-countries for country/flag data
 */
export function getCurrencyInfo(currencyCode: string): CurrencyInfo | null {
  const code = currencyCode.toUpperCase();
  const currencyData = worldCurrencies[code];

  if (!currencyData) {
    return null;
  }

  const countryData = findCountryForCurrency(code);

  return {
    code,
    name: currencyData.name,
    symbol: currencyData.units?.major?.symbol || code,
    country: countryData?.country,
    flag: countryData?.flag,
  };
}

/**
 * Get all available currencies as an array
 * Sorted alphabetically by currency code
 */
export const currencyData: CurrencyInfo[] = Object.keys(worldCurrencies)
  .map(code => getCurrencyInfo(code))
  .filter((currency): currency is CurrencyInfo => currency !== null)
  .sort((a, b) => a.code.localeCompare(b.code));