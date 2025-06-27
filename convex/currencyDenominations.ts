/**
 * Currency denomination data using world-currencies package
 * Provides standard coin and banknote denominations for world currencies
 */

import * as worldCurrencies from 'world-currencies';

export interface DenominationData {
  value: number;
  isCoin: boolean;
}

/**
 * Parse denomination string to numeric value
 * Examples: "$1" -> 1, "5¢" -> 0.05, "€20" -> 20, "1p" -> 0.01
 */
function parseDenominationValue(denomination: string, majorValue: number): number {
  // Remove currency symbols and extract numeric part
  const numericPart = denomination.replace(/[^0-9.]/g, '');
  const value = parseFloat(numericPart);

  if (isNaN(value)) return 0;

  // Check if it's a minor unit (cents, pence, etc.)
  if (denomination.includes('¢') || denomination.includes('c') || denomination.includes('p')) {
    return value * majorValue;
  }

  return value;
}

/**
 * Convert world-currencies data to our denomination format
 */
function convertCurrencyData(currencyData: any): DenominationData[] {
  if (!currencyData || !currencyData.units) return [];

  const denominations: DenominationData[] = [];
  const majorValue = currencyData.units.minor?.majorValue || 0.01;

  // Process coins (frequent and rare)
  if (currencyData.coins) {
    const allCoins = [
      ...(currencyData.coins.frequent || []),
      ...(currencyData.coins.rare || [])
    ];

    for (const coin of allCoins) {
      const value = parseDenominationValue(coin, majorValue);
      if (value > 0) {
        denominations.push({ value, isCoin: true });
      }
    }
  }

  // Process banknotes (frequent and rare)
  if (currencyData.banknotes) {
    const allBanknotes = [
      ...(currencyData.banknotes.frequent || []),
      ...(currencyData.banknotes.rare || [])
    ];

    for (const banknote of allBanknotes) {
      const value = parseDenominationValue(banknote, majorValue);
      if (value > 0) {
        denominations.push({ value, isCoin: false });
      }
    }
  }

  // Sort by value and remove duplicates
  return denominations
    .filter((d, index, arr) =>
      arr.findIndex(item => item.value === d.value && item.isCoin === d.isCoin) === index
    )
    .sort((a, b) => a.value - b.value);
}

/**
 * Get denominations for a currency code
 */
export function getDenominationsForCurrency(currencyCode: string): DenominationData[] {
  try {
    const currencyData = (worldCurrencies as any)[currencyCode.toUpperCase()];
    return convertCurrencyData(currencyData);
  } catch (error) {
    console.warn(`Failed to get denominations for ${currencyCode}:`, error);
    return [];
  }
}

/**
 * Check if denominations are available for a currency
 */
export function hasDenominations(currencyCode: string): boolean {
  try {
    const currencyData = (worldCurrencies as any)[currencyCode.toUpperCase()];
    return !!(currencyData && (currencyData.coins || currencyData.banknotes));
  } catch (error) {
    return false;
  }
}

/**
 * Get all supported currency codes with denominations
 */
export function getSupportedCurrencies(): string[] {
  try {
    return Object.keys(worldCurrencies as any).filter(code => {
      const currencyData = (worldCurrencies as any)[code];
      return currencyData && (currencyData.coins || currencyData.banknotes);
    });
  } catch (error) {
    console.warn('Failed to get supported currencies:', error);
    return [];
  }
}

/**
 * Get currency information including name and units
 */
export function getCurrencyInfo(currencyCode: string) {
  try {
    const currencyData = (worldCurrencies as any)[currencyCode.toUpperCase()];
    if (!currencyData) return null;

    return {
      name: currencyData.name,
      code: currencyData.iso?.code || currencyCode.toUpperCase(),
      symbol: currencyData.units?.major?.symbol || currencyCode,
      minorUnit: currencyData.units?.minor?.name || 'cent',
      minorSymbol: currencyData.units?.minor?.symbol || 'c',
      majorValue: currencyData.units?.minor?.majorValue || 0.01
    };
  } catch (error) {
    console.warn(`Failed to get currency info for ${currencyCode}:`, error);
    return null;
  }
}