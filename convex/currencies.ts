import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import { DEFAULT_BASE_CURRENCY, DEFAULT_DISCOUNT_PERCENT, DEFAULT_MARKUP_PERCENT } from "./settings";

async function requireAuth(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required");
  }
  return userId;
}

export const list = query({
  args: { searchTerm: v.optional(v.string()) },
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
    marketRate: v.number(),
    discountPercent: v.optional(v.number()),
    markupPercent: v.optional(v.number()),
    buyRate: v.number(),
    sellRate: v.number(),
    manualBuyRate: v.boolean(),
    manualSellRate: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Get default values if not provided
    const discountPercent: number = args.discountPercent ??
      (await ctx.runQuery(api.settings.getDefaultDiscountPercent));
    const markupPercent: number = args.markupPercent ??
      (await ctx.runQuery(api.settings.getDefaultMarkupPercent));

    return await ctx.db.insert("currencies", {
      code: args.code.toUpperCase(),
      name: args.name,
      country: args.country,
      flag: args.flag,
      marketRate: args.marketRate,
      discountPercent,
      markupPercent,
      buyRate: args.buyRate,
      sellRate: args.sellRate,
      manualBuyRate: args.manualBuyRate,
      manualSellRate: args.manualSellRate,
      lastUpdated: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("currencies"),
    code: v.string(),
    name: v.string(),
    country: v.string(),
    flag: v.string(),
    marketRate: v.number(),
    discountPercent: v.number(),
    markupPercent: v.number(),
    buyRate: v.number(),
    sellRate: v.number(),
    manualBuyRate: v.boolean(),
    manualSellRate: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const { id, ...updates } = args;
    return await ctx.db.patch(id, {
      ...updates,
      code: updates.code.toUpperCase(),
      lastUpdated: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("currencies") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    return await ctx.db.delete(args.id);
  },
});

export const get = query({
  args: { id: v.id("currencies") },
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
      results.failed = currencies.length;
      results.errors.push(`Failed to fetch exchange rates: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error("Failed to fetch exchange rates:", error);
    }

    return results;
  },
});
