import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const existing = await ctx.db
      .query("currencies")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first()

    if (existing) {
      throw new Error(`Currency ${args.code} already exists`)
    }

    const now = Date.now()
    return await ctx.db.insert("currencies", {
      code: args.code.toUpperCase(),
      name: args.name,
      symbol: args.symbol,
      decimalPlaces: args.decimalPlaces,
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
