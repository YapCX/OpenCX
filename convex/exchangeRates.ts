import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query("exchangeRates")
      .order("desc")
      .collect()
  },
})

export const getCurrentRates = query({
  args: { baseCurrency: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const base = args.baseCurrency || "USD"
    const now = Date.now()

    const allRates = await ctx.db
      .query("exchangeRates")
      .withIndex("by_currencies")
      .collect()

    const currentRates = allRates.filter(
      (rate) =>
        rate.baseCurrency === base &&
        rate.effectiveFrom <= now &&
        (!rate.effectiveTo || rate.effectiveTo > now)
    )

    const latestRates = new Map()
    for (const rate of currentRates) {
      const existing = latestRates.get(rate.targetCurrency)
      if (!existing || rate.effectiveFrom > existing.effectiveFrom) {
        latestRates.set(rate.targetCurrency, rate)
      }
    }

    return Array.from(latestRates.values())
  },
})

export const getCurrentRatesPublic = query({
  args: { baseCurrency: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const base = args.baseCurrency || "USD"
    const now = Date.now()

    const allRates = await ctx.db
      .query("exchangeRates")
      .withIndex("by_currencies")
      .collect()

    const currentRates = allRates.filter(
      (rate) =>
        rate.baseCurrency === base &&
        rate.effectiveFrom <= now &&
        (!rate.effectiveTo || rate.effectiveTo > now)
    )

    const latestRates = new Map()
    for (const rate of currentRates) {
      const existing = latestRates.get(rate.targetCurrency)
      if (!existing || rate.effectiveFrom > existing.effectiveFrom) {
        latestRates.set(rate.targetCurrency, rate)
      }
    }

    return Array.from(latestRates.values())
  },
})

export const getRate = query({
  args: {
    baseCurrency: v.string(),
    targetCurrency: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const now = Date.now()
    const rates = await ctx.db
      .query("exchangeRates")
      .withIndex("by_currencies", (q) =>
        q.eq("baseCurrency", args.baseCurrency).eq("targetCurrency", args.targetCurrency)
      )
      .collect()

    const currentRates = rates.filter(
      (rate) =>
        rate.effectiveFrom <= now &&
        (!rate.effectiveTo || rate.effectiveTo > now)
    )

    if (currentRates.length === 0) return null

    return currentRates.reduce((latest, rate) =>
      rate.effectiveFrom > latest.effectiveFrom ? rate : latest
    )
  },
})

export const setRate = mutation({
  args: {
    baseCurrency: v.string(),
    targetCurrency: v.string(),
    buyRate: v.number(),
    sellRate: v.number(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const { baseCurrency, targetCurrency, buyRate, sellRate, source = "manual" } = args

    if (baseCurrency === targetCurrency) {
      throw new Error("Base and target currency cannot be the same")
    }

    if (buyRate <= 0 || sellRate <= 0) {
      throw new Error("Rates must be positive numbers")
    }

    const now = Date.now()

    const existingRates = await ctx.db
      .query("exchangeRates")
      .withIndex("by_currencies", (q) =>
        q.eq("baseCurrency", baseCurrency).eq("targetCurrency", targetCurrency)
      )
      .collect()

    const activeRates = existingRates.filter(
      (rate) => !rate.effectiveTo || rate.effectiveTo > now
    )

    for (const rate of activeRates) {
      await ctx.db.patch(rate._id, { effectiveTo: now })
    }

    const midRate = (buyRate + sellRate) / 2
    const spread = ((sellRate - buyRate) / midRate) * 100

    return await ctx.db.insert("exchangeRates", {
      baseCurrency,
      targetCurrency,
      buyRate,
      sellRate,
      midRate,
      spread,
      source,
      effectiveFrom: now,
      createdAt: now,
      createdBy: userId,
    })
  },
})

export const getRateHistory = query({
  args: {
    baseCurrency: v.string(),
    targetCurrency: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const rates = await ctx.db
      .query("exchangeRates")
      .withIndex("by_currencies", (q) =>
        q.eq("baseCurrency", args.baseCurrency).eq("targetCurrency", args.targetCurrency)
      )
      .order("desc")
      .collect()

    return args.limit ? rates.slice(0, args.limit) : rates
  },
})

export const seedDefaultRates = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const existing = await ctx.db.query("exchangeRates").collect()
    if (existing.length > 0) return { seeded: false, message: "Exchange rates already exist" }

    const defaultRates = [
      { target: "EUR", buy: 0.91, sell: 0.93 },
      { target: "GBP", buy: 0.78, sell: 0.80 },
      { target: "CAD", buy: 1.35, sell: 1.38 },
      { target: "JPY", buy: 148.50, sell: 151.50 },
      { target: "CHF", buy: 0.87, sell: 0.89 },
      { target: "AUD", buy: 1.52, sell: 1.55 },
      { target: "MXN", buy: 17.10, sell: 17.50 },
    ]

    const now = Date.now()
    for (const rate of defaultRates) {
      const midRate = (rate.buy + rate.sell) / 2
      const spread = ((rate.sell - rate.buy) / midRate) * 100

      await ctx.db.insert("exchangeRates", {
        baseCurrency: "USD",
        targetCurrency: rate.target,
        buyRate: rate.buy,
        sellRate: rate.sell,
        midRate,
        spread,
        source: "seed",
        effectiveFrom: now,
        createdAt: now,
        createdBy: userId,
      })
    }

    return { seeded: true, message: `Seeded ${defaultRates.length} exchange rates` }
  },
})
