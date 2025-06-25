import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper function to get user display info from auth user
export const getUserInfo = query({
  args: { userId: v.string() },
  returns: v.union(v.object({
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    displayName: v.string(),
  }), v.null()),
  handler: async (ctx, args) => {
    try {
      // Try to get user from auth tables
      const user = await ctx.db.get(args.userId as any);
      if (user) {
        return {
          email: user.email || undefined,
          name: user.name || undefined,
          displayName: user.name || user.email || "Unknown User",
        };
      }
      return null;
    } catch {
      return null;
    }
  },
});

export const DEFAULT_BASE_CURRENCY = "USD";

export const getBaseCurrency = query({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("settings")
      .filter((q) => q.eq(q.field("key"), "baseCurrency"))
      .first();

    return setting?.value as string || DEFAULT_BASE_CURRENCY;
  },
});

export const setBaseCurrency = mutation({
  args: {
    currencyCode: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();

    const existingSetting = await ctx.db
      .query("settings")
      .filter((q) => q.eq(q.field("key"), "baseCurrency"))
      .first();

    if (existingSetting) {
      await ctx.db.patch(existingSetting._id, {
        value: args.currencyCode,
        lastUpdated: now,
        updatedBy: userId,
      });
    } else {
      await ctx.db.insert("settings", {
        key: "baseCurrency",
        value: args.currencyCode,
        description: "Base currency for the system",
        category: "currency",
        lastUpdated: now,
        updatedBy: userId,
      });
    }

    return args.currencyCode;
  },
});

export const getAllSettings = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("settings"),
    _creationTime: v.number(),
    key: v.string(),
    value: v.union(v.string(), v.number(), v.boolean()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    lastUpdated: v.number(),
    updatedBy: v.optional(v.string()), // Auth user ID
  })),
  handler: async (ctx) => {
    return await ctx.db.query("settings").collect();
  },
});

export const getSetting = query({
  args: { key: v.string() },
  returns: v.union(v.string(), v.number(), v.boolean(), v.null()),
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("settings")
      .filter((q) => q.eq(q.field("key"), args.key))
      .first();

    return setting?.value ?? null;
  },
});

export const setSetting = mutation({
  args: {
    key: v.string(),
    value: v.union(v.string(), v.number(), v.boolean()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  returns: v.union(v.string(), v.number(), v.boolean()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();

    const existingSetting = await ctx.db
      .query("settings")
      .filter((q) => q.eq(q.field("key"), args.key))
      .first();

    if (existingSetting) {
      await ctx.db.patch(existingSetting._id, {
        value: args.value,
        description: args.description,
        category: args.category,
        lastUpdated: now,
        updatedBy: userId,
      });
    } else {
      await ctx.db.insert("settings", {
        key: args.key,
        value: args.value,
        description: args.description,
        category: args.category,
        lastUpdated: now,
        updatedBy: userId,
      });
    }

    return args.value;
  },
});