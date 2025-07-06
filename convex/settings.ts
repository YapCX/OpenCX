import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Default constants
export const DEFAULT_BASE_CURRENCY = "USD";
export const DEFAULT_DISCOUNT_PERCENT = 2.5;
export const DEFAULT_MARKUP_PERCENT = 3.5;

async function requireAuth(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  return identity.subject;
}

export const getBaseCurrency = query({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    // Auth not required for reading base currency as it's needed for UI
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "base_currency"))
      .first();

    return setting?.value as string || DEFAULT_BASE_CURRENCY;
  },
});

export const getDefaultDiscountPercent = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    // Auth not required for reading default settings
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "default_discount_percent"))
      .first();

    return setting?.value as number || DEFAULT_DISCOUNT_PERCENT;
  },
});

export const getDefaultMarkupPercent = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    // Auth not required for reading default settings
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "default_markup_percent"))
      .first();

    return setting?.value as number || DEFAULT_MARKUP_PERCENT;
  },
});

export const setSetting = mutation({
  args: {
    key: v.string(),
    value: v.union(v.string(), v.number(), v.boolean()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  returns: v.id("settings"),
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const existingSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existingSetting) {
      await ctx.db.patch(existingSetting._id, {
        value: args.value,
        description: args.description,
        category: args.category,
        lastUpdated: Date.now(),
        updatedBy: userId,
      });
      return existingSetting._id;
    } else {
      return await ctx.db.insert("settings", {
        key: args.key,
        value: args.value,
        description: args.description,
        category: args.category,
        lastUpdated: Date.now(),
        updatedBy: userId,
      });
    }
  },
});

export const initializeDefaultSettings = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    const defaultSettings = [
      {
        key: "base_currency",
        value: DEFAULT_BASE_CURRENCY,
        description: "Base currency for exchange rate calculations",
        category: "currency",
      },
      {
        key: "default_discount_percent",
        value: DEFAULT_DISCOUNT_PERCENT,
        description: "Default discount percentage for buying currency",
        category: "currency",
      },
      {
        key: "default_markup_percent",
        value: DEFAULT_MARKUP_PERCENT,
        description: "Default markup percentage for selling currency",
        category: "currency",
      },
    ];

    for (const setting of defaultSettings) {
      const existing = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", setting.key))
        .first();

      if (!existing) {
        await ctx.db.insert("settings", {
          ...setting,
          lastUpdated: Date.now(),
          updatedBy: userId,
        });
      }
    }
  },
});