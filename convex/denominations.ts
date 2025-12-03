import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query("denominations")
      .order("asc")
      .collect()
  },
})

export const listByCurrency = query({
  args: { currencyCode: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query("denominations")
      .withIndex("by_currency", (q) => q.eq("currencyCode", args.currencyCode))
      .collect()
  },
})

export const listActiveByCurrency = query({
  args: { currencyCode: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const denominations = await ctx.db
      .query("denominations")
      .withIndex("by_currency", (q) => q.eq("currencyCode", args.currencyCode))
      .collect()

    return denominations
      .filter((d) => d.isActive)
      .sort((a, b) => b.value - a.value)
  },
})

export const create = mutation({
  args: {
    currencyCode: v.string(),
    value: v.number(),
    type: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const existing = await ctx.db
      .query("denominations")
      .withIndex("by_currency_value", (q) =>
        q.eq("currencyCode", args.currencyCode).eq("value", args.value)
      )
      .first()

    if (existing) {
      throw new Error(`Denomination ${args.value} already exists for ${args.currencyCode}`)
    }

    const now = Date.now()
    return await ctx.db.insert("denominations", {
      currencyCode: args.currencyCode,
      value: args.value,
      type: args.type,
      description: args.description,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id("denominations"),
    type: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const { id, ...updates } = args
    const denomination = await ctx.db.get(id)
    if (!denomination) throw new Error("Denomination not found")

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
  args: { id: v.id("denominations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const denomination = await ctx.db.get(args.id)
    if (!denomination) throw new Error("Denomination not found")

    await ctx.db.delete(args.id)
  },
})

export const seedDefaults = mutation({
  args: { currencyCode: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error("Unauthorized")

    const existing = await ctx.db
      .query("denominations")
      .withIndex("by_currency", (q) => q.eq("currencyCode", args.currencyCode))
      .collect()

    if (existing.length > 0) {
      return { seeded: false, message: `Denominations already exist for ${args.currencyCode}` }
    }

    const denominationsByCode: Record<string, { value: number; type: string }[]> = {
      USD: [
        { value: 100, type: "banknote" },
        { value: 50, type: "banknote" },
        { value: 20, type: "banknote" },
        { value: 10, type: "banknote" },
        { value: 5, type: "banknote" },
        { value: 2, type: "banknote" },
        { value: 1, type: "banknote" },
        { value: 0.25, type: "coin" },
        { value: 0.10, type: "coin" },
        { value: 0.05, type: "coin" },
        { value: 0.01, type: "coin" },
      ],
      EUR: [
        { value: 500, type: "banknote" },
        { value: 200, type: "banknote" },
        { value: 100, type: "banknote" },
        { value: 50, type: "banknote" },
        { value: 20, type: "banknote" },
        { value: 10, type: "banknote" },
        { value: 5, type: "banknote" },
        { value: 2, type: "coin" },
        { value: 1, type: "coin" },
        { value: 0.50, type: "coin" },
        { value: 0.20, type: "coin" },
        { value: 0.10, type: "coin" },
        { value: 0.05, type: "coin" },
        { value: 0.02, type: "coin" },
        { value: 0.01, type: "coin" },
      ],
      GBP: [
        { value: 50, type: "banknote" },
        { value: 20, type: "banknote" },
        { value: 10, type: "banknote" },
        { value: 5, type: "banknote" },
        { value: 2, type: "coin" },
        { value: 1, type: "coin" },
        { value: 0.50, type: "coin" },
        { value: 0.20, type: "coin" },
        { value: 0.10, type: "coin" },
        { value: 0.05, type: "coin" },
        { value: 0.02, type: "coin" },
        { value: 0.01, type: "coin" },
      ],
      CAD: [
        { value: 100, type: "banknote" },
        { value: 50, type: "banknote" },
        { value: 20, type: "banknote" },
        { value: 10, type: "banknote" },
        { value: 5, type: "banknote" },
        { value: 2, type: "coin" },
        { value: 1, type: "coin" },
        { value: 0.25, type: "coin" },
        { value: 0.10, type: "coin" },
        { value: 0.05, type: "coin" },
      ],
      JPY: [
        { value: 10000, type: "banknote" },
        { value: 5000, type: "banknote" },
        { value: 2000, type: "banknote" },
        { value: 1000, type: "banknote" },
        { value: 500, type: "coin" },
        { value: 100, type: "coin" },
        { value: 50, type: "coin" },
        { value: 10, type: "coin" },
        { value: 5, type: "coin" },
        { value: 1, type: "coin" },
      ],
      CHF: [
        { value: 1000, type: "banknote" },
        { value: 200, type: "banknote" },
        { value: 100, type: "banknote" },
        { value: 50, type: "banknote" },
        { value: 20, type: "banknote" },
        { value: 10, type: "banknote" },
        { value: 5, type: "coin" },
        { value: 2, type: "coin" },
        { value: 1, type: "coin" },
        { value: 0.50, type: "coin" },
        { value: 0.20, type: "coin" },
        { value: 0.10, type: "coin" },
        { value: 0.05, type: "coin" },
      ],
      AUD: [
        { value: 100, type: "banknote" },
        { value: 50, type: "banknote" },
        { value: 20, type: "banknote" },
        { value: 10, type: "banknote" },
        { value: 5, type: "banknote" },
        { value: 2, type: "coin" },
        { value: 1, type: "coin" },
        { value: 0.50, type: "coin" },
        { value: 0.20, type: "coin" },
        { value: 0.10, type: "coin" },
        { value: 0.05, type: "coin" },
      ],
      MXN: [
        { value: 1000, type: "banknote" },
        { value: 500, type: "banknote" },
        { value: 200, type: "banknote" },
        { value: 100, type: "banknote" },
        { value: 50, type: "banknote" },
        { value: 20, type: "banknote" },
        { value: 20, type: "coin" },
        { value: 10, type: "coin" },
        { value: 5, type: "coin" },
        { value: 2, type: "coin" },
        { value: 1, type: "coin" },
        { value: 0.50, type: "coin" },
      ],
    }

    const denominations = denominationsByCode[args.currencyCode]
    if (!denominations) {
      return { seeded: false, message: `No default denominations for ${args.currencyCode}` }
    }

    const now = Date.now()
    for (const denom of denominations) {
      await ctx.db.insert("denominations", {
        currencyCode: args.currencyCode,
        value: denom.value,
        type: denom.type,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
    }

    return { seeded: true, message: `Seeded ${denominations.length} denominations for ${args.currencyCode}` }
  },
})
