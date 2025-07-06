/**
 * Currency denomination data using world-currencies package
 * Provides standard coin and banknote denominations for world currencies
 */

import worldCurrencies from 'world-currencies';

export interface DenominationData {
  value: number;
  isCoin: boolean;
}

export function getDenominationsForCurrency(currencyCode: string): DenominationData[] {
  try {
    const currencyData = worldCurrencies[currencyCode.toUpperCase()];
    if (!currencyData || !currencyData.units) return [];

    const denominations: DenominationData[] = [];
    const minorSymbol = currencyData.units.minor?.symbol;
    const majorValue = currencyData.units.minor?.majorValue;

    // Process all coins and banknotes in one go
    const processItems = (items: string[], isCoin: boolean) => {
      for (const item of items) {
        const numericPart = item.replace(/[^0-9.]/g, '');
        const value = parseFloat(numericPart);

        if (isNaN(value) || value <= 0) continue;

        // Only convert to major units if we have valid minor unit data
        let finalValue = value;
        if (minorSymbol &&
            item.includes(minorSymbol) &&
            typeof majorValue === 'number' &&
            majorValue > 0) {
          finalValue = value * majorValue;
        }

        if (finalValue > 0) {
          denominations.push({ value: finalValue, isCoin });
        }
      }
    };

    // Process coins
    if (currencyData.coins) {
      processItems([
        ...(currencyData.coins.frequent || []),
        ...(currencyData.coins.rare || [])
      ], true);
    }

    // Process banknotes
    if (currencyData.banknotes) {
      processItems([
        ...(currencyData.banknotes.frequent || []),
        ...(currencyData.banknotes.rare || [])
      ], false);
    }

    // Remove duplicates and sort by value
    const uniqueDenominations = denominations.filter((d, index, arr) =>
      arr.findIndex(item => item.value === d.value && item.isCoin === d.isCoin) === index
    );

    return uniqueDenominations.sort((a, b) => a.value - b.value);
  } catch (error) {
    console.warn(`Failed to get denominations for ${currencyCode}:`, error);
    return [];
  }
}