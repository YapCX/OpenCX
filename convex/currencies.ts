import { v } from "convex/values"
import { action, mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"
import { api } from "./_generated/api"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query("currencies")
      .order("asc")
      .collect()
  },
})

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query("currencies")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect()
  },
})

export const getActivePublic = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("currencies")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect()
  },
})

export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    return await ctx.db
      .query("currencies")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first()
  },
})

export const create = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    symbol: v.string(),
    decimalPlaces: v.number(),
    alias: v.optional(v.string()),
    markupPercent: v.optional(v.number()),
    markdownPercent: v.optional(v.number()),
    branchIds: v.optional(v.array(v.id("branches"))),
    flagEmoji: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const existing = await ctx.db
      .query("currencies")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first()

    if (existing && !args.alias) {
      throw new Error(`Currency ${args.code} already exists`)
    }

    if (args.alias) {
      const existingAlias = await ctx.db
        .query("currencies")
        .withIndex("by_alias", (q) => q.eq("alias", args.alias))
        .first()
      if (existingAlias) {
        throw new Error(`Currency alias ${args.alias} already exists`)
      }
    }

    const now = Date.now()
    return await ctx.db.insert("currencies", {
      code: args.code.toUpperCase(),
      name: args.name,
      symbol: args.symbol,
      decimalPlaces: args.decimalPlaces,
      alias: args.alias,
      markupPercent: args.markupPercent,
      markdownPercent: args.markdownPercent,
      branchIds: args.branchIds,
      flagEmoji: args.flagEmoji,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id("currencies"),
    name: v.optional(v.string()),
    symbol: v.optional(v.string()),
    decimalPlaces: v.optional(v.number()),
    alias: v.optional(v.string()),
    markupPercent: v.optional(v.number()),
    markdownPercent: v.optional(v.number()),
    branchIds: v.optional(v.array(v.id("branches"))),
    flagEmoji: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const { id, ...updates } = args
    const currency = await ctx.db.get(id)
    if (!currency) throw new Error("Currency not found")

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    )

    return await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    })
  },
})

export const remove = mutation({
  args: { id: v.id("currencies") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const rates = await ctx.db
      .query("exchangeRates")
      .collect()

    const currency = await ctx.db.get(args.id)
    if (!currency) throw new Error("Currency not found")

    const hasRates = rates.some(
      (r) => r.baseCurrency === currency.code || r.targetCurrency === currency.code
    )

    if (hasRates) {
      throw new Error("Cannot delete currency with existing exchange rates")
    }

    await ctx.db.delete(args.id)
  },
})

export const seedDefaultCurrencies = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const existing = await ctx.db.query("currencies").collect()
    if (existing.length > 0) return { seeded: false, message: "Currencies already exist" }

    const defaultCurrencies = [
      { code: "USD", name: "US Dollar", symbol: "$", decimalPlaces: 2 },
      { code: "EUR", name: "Euro", symbol: "€", decimalPlaces: 2 },
      { code: "GBP", name: "British Pound", symbol: "£", decimalPlaces: 2 },
      { code: "CAD", name: "Canadian Dollar", symbol: "C$", decimalPlaces: 2 },
      { code: "JPY", name: "Japanese Yen", symbol: "¥", decimalPlaces: 0 },
      { code: "CHF", name: "Swiss Franc", symbol: "Fr", decimalPlaces: 2 },
      { code: "AUD", name: "Australian Dollar", symbol: "A$", decimalPlaces: 2 },
      { code: "MXN", name: "Mexican Peso", symbol: "$", decimalPlaces: 2 },
    ]

    const now = Date.now()
    for (const currency of defaultCurrencies) {
      await ctx.db.insert("currencies", {
        ...currency,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
    }

    return { seeded: true, message: `Seeded ${defaultCurrencies.length} currencies` }
  },
})

interface LiveRateResult {
  baseCurrency: string
  targetCurrency: string
  midRate: number
  buyRate: number
  sellRate: number
  source: string
  fetchedAt: number
}

async function fetchLiveRateInternal(
  baseCurrency: string,
  targetCurrency: string,
  markupPercent: number,
  markdownPercent: number
): Promise<LiveRateResult> {
  const response = await fetch(
    `https://open.er-api.com/v6/latest/${baseCurrency}`
  )

  if (!response.ok) {
    throw new Error("Failed to fetch live exchange rate")
  }

  const data = await response.json()

  if (data.result !== "success") {
    throw new Error("Exchange rate API returned an error")
  }

  const midRate = data.rates?.[targetCurrency]

  if (!midRate) {
    throw new Error(`Rate not available for ${targetCurrency}`)
  }

  const buyRate = midRate * (1 - markdownPercent / 100)
  const sellRate = midRate * (1 + markupPercent / 100)

  return {
    baseCurrency,
    targetCurrency,
    midRate,
    buyRate,
    sellRate,
    source: "open.er-api.com",
    fetchedAt: Date.now(),
  }
}

export const applyLiveRate = action({
  args: {
    baseCurrency: v.string(),
    targetCurrency: v.string(),
    markupPercent: v.optional(v.number()),
    markdownPercent: v.optional(v.number()),
    alias: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<LiveRateResult> => {
    const { baseCurrency, targetCurrency, markupPercent = 0, markdownPercent = 0, alias } = args

    const liveRate = await fetchLiveRateInternal(baseCurrency, targetCurrency, markupPercent, markdownPercent)

    await ctx.runMutation(api.exchangeRates.setRate, {
      baseCurrency,
      targetCurrency: alias || targetCurrency,
      buyRate: liveRate.buyRate,
      sellRate: liveRate.sellRate,
      source: "api",
    })

    return liveRate
  },
})

interface FetchAllResult {
  success: string[]
  failed: Array<{ currency: string; error: string }>
  source: string
  fetchedAt: number
}

export const fetchAllLiveRates = action({
  args: {
    baseCurrency: v.string(),
  },
  handler: async (ctx, args): Promise<FetchAllResult> => {
    const { baseCurrency } = args

    // Fetch all currencies to get their markup/markdown settings
    const currencies = await ctx.runQuery(api.currencies.list)
    const nonBaseCurrencies = currencies.filter(c => c.code !== baseCurrency && c.isActive)

    if (nonBaseCurrencies.length === 0) {
      return {
        success: [],
        failed: [],
        source: "open.er-api.com",
        fetchedAt: Date.now(),
      }
    }

    // Make a single API call to get all rates
    const response = await fetch(
      `https://open.er-api.com/v6/latest/${baseCurrency}`
    )

    if (!response.ok) {
      throw new Error("Failed to fetch live exchange rates")
    }

    const data = await response.json()

    if (data.result !== "success") {
      throw new Error("Exchange rate API returned an error")
    }

    const success: string[] = []
    const failed: Array<{ currency: string; error: string }> = []

    // Process each currency using the rates from the single API call
    for (const currency of nonBaseCurrencies) {
      try {
        const midRate = data.rates?.[currency.code]

        if (!midRate) {
          failed.push({ currency: currency.code, error: `Rate not available` })
          continue
        }

        const markupPercent = currency.markupPercent ?? 2
        const markdownPercent = currency.markdownPercent ?? 2
        const buyRate = midRate * (1 - markdownPercent / 100)
        const sellRate = midRate * (1 + markupPercent / 100)

        // Use alias if set, otherwise use currency code
        const targetCurrency = currency.alias || currency.code

        await ctx.runMutation(api.exchangeRates.setRate, {
          baseCurrency,
          targetCurrency,
          buyRate,
          sellRate,
          source: "api",
        })

        success.push(currency.alias || currency.code)
      } catch (error) {
        failed.push({
          currency: currency.code,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return {
      success,
      failed,
      source: "open.er-api.com",
      fetchedAt: Date.now(),
    }
  },
})
