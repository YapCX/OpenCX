import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("lookups")
      .collect()
  },
})

export const listByKey = query({
  args: { lookupKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("lookups")
      .withIndex("by_key", (q) => q.eq("lookupKey", args.lookupKey))
      .collect()
  },
})

export const listActiveByKey = query({
  args: { lookupKey: v.string() },
  handler: async (ctx, args) => {
    const lookups = await ctx.db
      .query("lookups")
      .withIndex("by_key", (q) => q.eq("lookupKey", args.lookupKey))
      .collect()
    return lookups
      .filter((l) => l.isActive)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
  },
})

export const create = mutation({
  args: {
    lookupKey: v.string(),
    lookupValue: v.string(),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("lookups")
      .withIndex("by_key_value", (q) =>
        q.eq("lookupKey", args.lookupKey).eq("lookupValue", args.lookupValue)
      )
      .first()

    if (existing) {
      throw new Error(`Lookup value "${args.lookupValue}" already exists for key "${args.lookupKey}"`)
    }

    const now = Date.now()
    return await ctx.db.insert("lookups", {
      lookupKey: args.lookupKey,
      lookupValue: args.lookupValue,
      displayOrder: args.displayOrder,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id("lookups"),
    lookupValue: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const lookup = await ctx.db.get(args.id)
    if (!lookup) {
      throw new Error("Lookup not found")
    }

    const newLookupValue = args.lookupValue
    if (newLookupValue && newLookupValue !== lookup.lookupValue) {
      const existing = await ctx.db
        .query("lookups")
        .withIndex("by_key_value", (q) =>
          q.eq("lookupKey", lookup.lookupKey).eq("lookupValue", newLookupValue)
        )
        .first()

      if (existing) {
        throw new Error(`Lookup value "${newLookupValue}" already exists for key "${lookup.lookupKey}"`)
      }
    }

    await ctx.db.patch(args.id, {
      ...(args.lookupValue !== undefined && { lookupValue: args.lookupValue }),
      ...(args.displayOrder !== undefined && { displayOrder: args.displayOrder }),
      ...(args.isActive !== undefined && { isActive: args.isActive }),
      updatedAt: Date.now(),
    })
  },
})

export const remove = mutation({
  args: { id: v.id("lookups") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
  },
})

export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const existingLookups = await ctx.db.query("lookups").first()
    if (existingLookups) {
      return
    }

    const now = Date.now()
    const defaults = [
      { key: "customer_group", values: ["VIP", "Regular", "Tourist", "Corporate", "Wholesale"] },
      { key: "payment_method", values: ["Cash", "Wire Transfer", "Check", "Credit Card", "Debit Card"] },
      { key: "source_of_funds", values: ["Employment", "Business Income", "Investment", "Savings", "Gift", "Inheritance", "Other"] },
      { key: "id_type", values: ["Passport", "Driver's License", "National ID", "Residence Permit", "Military ID"] },
      { key: "transaction_purpose", values: ["Travel", "Business", "Family Support", "Investment", "Education", "Medical", "Other"] },
    ]

    for (const { key, values } of defaults) {
      for (let i = 0; i < values.length; i++) {
        await ctx.db.insert("lookups", {
          lookupKey: key,
          lookupValue: values[i],
          displayOrder: i + 1,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
      }
    }
  },
})
