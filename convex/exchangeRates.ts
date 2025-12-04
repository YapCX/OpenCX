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

