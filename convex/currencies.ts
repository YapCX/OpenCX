import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { DEFAULT_BASE_CURRENCY, DEFAULT_DISCOUNT_PERCENT, DEFAULT_MARKUP_PERCENT } from "./settings";
import { getDenominationsForCurrency } from "../lib/currency-denominations";

async function requireAuth(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  return identity.subject;
}

export const list = query({
  args: { searchTerm: v.optional(v.string()) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    let currencies = await ctx.db.query("currencies").collect();

    if (args.searchTerm) {
      const term = args.searchTerm.toLowerCase();
      currencies = currencies.filter(currency =>
        currency.code.toLowerCase().includes(term) ||
        currency.name.toLowerCase().includes(term) ||
        currency.country.toLowerCase().includes(term)
      );
    }

    return currencies;
  },
});

export const create = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    country: v.string(),
    flag: v.string(),
    symbol: v.string(),
    marketRate: v.number(),
    discountPercent: v.optional(v.number()),
    markupPercent: v.optional(v.number()),
    buyRate: v.number(),
    sellRate: v.number(),
    manualBuyRate: v.boolean(),
    manualSellRate: v.boolean(),
  },
  returns: v.id("currencies"),
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const upperCode = args.code.toUpperCase();

    // Check if currency code already exists
    const existingCurrency = await ctx.db
      .query("currencies")
      .withIndex("by_code", (q) => q.eq("code", upperCode))
      .first();

    if (existingCurrency) {
      throw new Error(`Currency with code ${upperCode} already exists`);
    }

    // Get default values if not provided
    const discountPercent: number = args.discountPercent ??
      Number(await ctx.runQuery(api.settings.getSetting, { key: "default_discount_percent" })) ?? DEFAULT_DISCOUNT_PERCENT;
    const markupPercent: number = args.markupPercent ??
      Number(await ctx.runQuery(api.settings.getSetting, { key: "default_markup_percent" })) ?? DEFAULT_MARKUP_PERCENT;

    const currencyId = await ctx.db.insert("currencies", {
      code: upperCode,
      name: args.name,
      country: args.country,
      flag: args.flag,
      symbol: args.symbol,
      marketRate: args.marketRate,
      discountPercent,
      markupPercent,
      buyRate: args.buyRate,
      sellRate: args.sellRate,
      manualBuyRate: args.manualBuyRate,
      manualSellRate: args.manualSellRate,
      lastUpdated: Date.now(),
    });

    // Try to auto-populate standard denominations
    try {
      const standardDenominations = getDenominationsForCurrency(upperCode);
      if (standardDenominations.length > 0) {
        // Insert denominations in parallel for better performance
        const denominationPromises = standardDenominations.map(denom =>
          ctx.db.insert("denominations", {
            currencyCode: upperCode,
            value: denom.value,
            isCoin: denom.isCoin,
          })
        );
        await Promise.all(denominationPromises);
      }
    } catch (error) {
      // Don't fail currency creation if denomination population fails
      console.warn(`Failed to auto-populate denominations for ${upperCode}:`, error);
    }

    return currencyId;
  },
});

export const update = mutation({
  args: {
    id: v.id("currencies"),
    code: v.string(),
    name: v.string(),
    country: v.string(),
    flag: v.string(),
    symbol: v.string(),
    marketRate: v.number(),
    discountPercent: v.number(),
    markupPercent: v.number(),
    buyRate: v.number(),
    sellRate: v.number(),
    manualBuyRate: v.boolean(),
    manualSellRate: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const upperCode = args.code.toUpperCase();

    // Check if another currency with this code already exists (excluding current currency)
    const existingCurrency = await ctx.db
      .query("currencies")
      .withIndex("by_code", (q) => q.eq("code", upperCode))
      .first();

    if (existingCurrency && existingCurrency._id !== args.id) {
      throw new Error(`Currency with code ${upperCode} already exists`);
    }

    const { id, ...updates } = args;
    return await ctx.db.patch(id, {
      ...updates,
      code: upperCode,
      lastUpdated: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("currencies") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    return await ctx.db.delete(args.id);
  },
});

export const get = query({
  args: { id: v.id("currencies") },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    return await ctx.db.get(args.id);
  },
});

interface ExchangeRateResponse {
  rates: { [currencyCode: string]: number };
  base: string;
  date: string;
}

interface MarketRateResult {
  rate: number;
  base: string;
  target: string;
  timestamp: number;
}

export const fetchMarketRate = action({
  args: {
    currencyCode: v.string(),
    baseCurrency: v.optional(v.string())
  },
  returns: v.object({
    rate: v.number(),
    base: v.string(),
    target: v.string(),
    timestamp: v.number(),
  }),
  handler: async (ctx, args): Promise<MarketRateResult> => {
    // Get base currency from settings if not provided
    let base: string = args.baseCurrency || DEFAULT_BASE_CURRENCY;
    if (!args.baseCurrency) {
      const baseCurrencySetting: string = await ctx.runQuery(api.settings.getBaseCurrency);
      base = baseCurrencySetting || DEFAULT_BASE_CURRENCY;
    }
    const target = args.currencyCode.toUpperCase();

    try {
      // Using exchangerate-api.com free tier
      const response: Response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${base}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ExchangeRateResponse = await response.json();

      if (!data.rates || !data.rates[target]) {
        throw new Error(`Exchange rate not found for ${target}`);
      }

      return {
        rate: data.rates[target],
        base: base,
        target: target,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error("Failed to fetch market rate:", error);
      throw new Error("Failed to fetch current market rate. Please try again.");
    }
  },
});

export const updateMarketRate = mutation({
  args: {
    id: v.id("currencies"),
    marketRate: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const currency = await ctx.db.get(args.id);
    if (!currency) {
      throw new Error("Currency not found");
    }

    // Calculate new rates based on existing percentages
    const buyRate = currency.manualBuyRate
      ? currency.buyRate
      : args.marketRate * (1 - currency.discountPercent / 100);

    const sellRate = currency.manualSellRate
      ? currency.sellRate
      : args.marketRate * (1 + currency.markupPercent / 100);

    return await ctx.db.patch(args.id, {
      marketRate: args.marketRate,
      buyRate,
      sellRate,
      lastUpdated: Date.now(),
    });
  },
});

export const bulkUpdateRates = action({
  args: {
    baseCurrency: v.optional(v.string())
  },
  returns: v.object({
    updated: v.number(),
    failed: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Get all currencies
    const currencies = await ctx.runQuery(api.currencies.list, {});

    // Get base currency from settings if not provided
    let base: string = args.baseCurrency || DEFAULT_BASE_CURRENCY;
    if (!args.baseCurrency) {
      const baseCurrencySetting: string = await ctx.runQuery(api.settings.getBaseCurrency);
      base = baseCurrencySetting || DEFAULT_BASE_CURRENCY;
    }

    const results = {
      updated: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      // Fetch all exchange rates in one API call
      const response: Response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${base}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ExchangeRateResponse = await response.json();

      if (!data.rates) {
        throw new Error("No rates data received from API");
      }

      // Update all currencies with rates from the API
      for (const currency of currencies) {
        const rate = data.rates[currency.code];

        if (rate !== undefined) {
          try {
            await ctx.runMutation(api.currencies.updateMarketRate, {
              id: currency._id,
              marketRate: rate
            });
            results.updated++;
          } catch (error) {
            results.failed++;
            results.errors.push(`Failed to update ${currency.code}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            console.error(`Failed to update rate for ${currency.code}:`, error);
          }
        } else {
          results.failed++;
          results.errors.push(`Exchange rate not found for ${currency.code}`);
        }
      }
    } catch (error) {
      // If the entire API fetch fails, no currencies were updated, so all failed
      results.failed = currencies.length;
      results.errors.push(`Failed to fetch exchange rates: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error("Failed to fetch exchange rates:", error);
    }

    return results;
  },
});

export const getCurrencySymbols = query({
  args: {},
  returns: v.record(v.string(), v.string()),
  handler: async (ctx) => {
    await requireAuth(ctx);

    const currencies = await ctx.db.query("currencies").collect();

    // Return a map of currency codes to symbols
    const symbolMap: Record<string, string> = {};
    currencies.forEach(currency => {
      symbolMap[currency.code] = currency.symbol;
    });

    return symbolMap;
  },
});

export const getCurrencySymbol = query({
  args: { currencyCode: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const currency = await ctx.db
      .query("currencies")
      .withIndex("by_code", (q) => q.eq("code", args.currencyCode.toUpperCase()))
      .first();

    // Database is single source of truth - no fallback
    return currency?.symbol || null;
  },
});