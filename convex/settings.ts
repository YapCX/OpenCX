import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

async function requireAuth(ctx: any): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required");
  }
  return userId;
}

// Helper function to get user display info from auth user
export const getUserInfo = query({
  args: { userId: v.id("users") },
  returns: v.union(v.object({
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    displayName: v.string(),
  }), v.null()),
  handler: async (ctx, args) => {
    try {
      // Get user from users table
      const user = await ctx.db.get(args.userId);
      if (user) {
        // Safely access properties that exist on the user table
        const email = user.email || undefined;
        const name = user.name || undefined;
        const displayName = name || email || "Unknown User";

        return {
          email,
          name,
          displayName,
        };
      }
      return null;
    } catch {
      return null;
    }
  },
});

export const DEFAULT_BASE_CURRENCY = "USD";
export const DEFAULT_DISCOUNT_PERCENT = 2.5;
export const DEFAULT_MARKUP_PERCENT = 2.5;
export const DEFAULT_SERVICE_FEE = 2.0;

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
    const userId = await requireAuth(ctx);

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
    const userId = await requireAuth(ctx);

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

export const getDefaultDiscountPercent = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("settings")
      .filter((q) => q.eq(q.field("key"), "defaultDiscountPercent"))
      .first();

    return setting?.value as number || DEFAULT_DISCOUNT_PERCENT;
  },
});

export const getDefaultMarkupPercent = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("settings")
      .filter((q) => q.eq(q.field("key"), "defaultMarkupPercent"))
      .first();

    return setting?.value as number || DEFAULT_MARKUP_PERCENT;
  },
});

export const setDefaultDiscountPercent = mutation({
  args: {
    percent: v.number(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const now = Date.now();

    const existingSetting = await ctx.db
      .query("settings")
      .filter((q) => q.eq(q.field("key"), "defaultDiscountPercent"))
      .first();

    if (existingSetting) {
      await ctx.db.patch(existingSetting._id, {
        value: args.percent,
        lastUpdated: now,
        updatedBy: userId,
      });
    } else {
      await ctx.db.insert("settings", {
        key: "defaultDiscountPercent",
        value: args.percent,
        description: "Default discount percentage from spot rate for new currencies",
        category: "currency",
        lastUpdated: now,
        updatedBy: userId,
      });
    }

    return args.percent;
  },
});

export const setDefaultMarkupPercent = mutation({
  args: {
    percent: v.number(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const now = Date.now();

    const existingSetting = await ctx.db
      .query("settings")
      .filter((q) => q.eq(q.field("key"), "defaultMarkupPercent"))
      .first();

    if (existingSetting) {
      await ctx.db.patch(existingSetting._id, {
        value: args.percent,
        lastUpdated: now,
        updatedBy: userId,
      });
    } else {
      await ctx.db.insert("settings", {
        key: "defaultMarkupPercent",
        value: args.percent,
        description: "Default markup percentage from spot rate for new currencies",
        category: "currency",
        lastUpdated: now,
        updatedBy: userId,
      });
    }

    return args.percent;
  },
});

export const getDefaultServiceFee = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("settings")
      .filter((q) => q.eq(q.field("key"), "defaultServiceFee"))
      .first();

    return setting?.value as number || DEFAULT_SERVICE_FEE;
  },
});

export const setDefaultServiceFee = mutation({
  args: {
    fee: v.number(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const now = Date.now();

    const existingSetting = await ctx.db
      .query("settings")
      .filter((q) => q.eq(q.field("key"), "defaultServiceFee"))
      .first();

    if (existingSetting) {
      await ctx.db.patch(existingSetting._id, {
        value: args.fee,
        lastUpdated: now,
        updatedBy: userId,
      });
    } else {
      await ctx.db.insert("settings", {
        key: "defaultServiceFee",
        value: args.fee,
        description: "Default service fee for currency exchange transactions",
        category: "transaction",
        lastUpdated: now,
        updatedBy: userId,
      });
    }

    return args.fee;
  },
});