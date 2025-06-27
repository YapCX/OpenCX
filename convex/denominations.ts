import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getDenominationsForCurrency } from "./currencyDenominations";

async function requireAuth(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required");
  }
  return userId;
}

export const list = query({
  args: { currencyCode: v.optional(v.string()) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    let denominations;

    if (args.currencyCode) {
      denominations = await ctx.db
        .query("denominations")
        .withIndex("by_currency", (q) => q.eq("currencyCode", args.currencyCode!))
        .collect();
    } else {
      denominations = await ctx.db.query("denominations").collect();
    }

    // Get image URLs for denominations that have images
    const denominationsWithImages = await Promise.all(
      denominations.map(async (denomination) => ({
        ...denomination,
        imageUrl: denomination.imageId ? await ctx.storage.getUrl(denomination.imageId) : null,
      }))
    );

    return denominationsWithImages;
  },
});

export const create = mutation({
  args: {
    currencyCode: v.string(),
    value: v.number(),
    isCoin: v.boolean(),
    imageId: v.optional(v.id("_storage")),
  },
  returns: v.id("denominations"),
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Verify currency exists
    const currency = await ctx.db
      .query("currencies")
      .withIndex("by_code", (q) => q.eq("code", args.currencyCode.toUpperCase()))
      .unique();

    if (!currency) {
      throw new Error(`Currency ${args.currencyCode} not found`);
    }

    // Check if denomination already exists
    const existing = await ctx.db
      .query("denominations")
      .withIndex("by_currency_and_value", (q) =>
        q.eq("currencyCode", args.currencyCode.toUpperCase()).eq("value", args.value)
      )
      .unique();

    if (existing) {
      throw new Error(`Denomination ${args.value} already exists for ${args.currencyCode}`);
    }

    return await ctx.db.insert("denominations", {
      currencyCode: args.currencyCode.toUpperCase(),
      value: args.value,
      isCoin: args.isCoin,
      imageId: args.imageId,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("denominations"),
    currencyCode: v.string(),
    value: v.number(),
    isCoin: v.boolean(),
    imageId: v.optional(v.id("_storage")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const { id, ...updates } = args;

    // Verify currency exists
    const currency = await ctx.db
      .query("currencies")
      .withIndex("by_code", (q) => q.eq("code", updates.currencyCode.toUpperCase()))
      .unique();

    if (!currency) {
      throw new Error(`Currency ${updates.currencyCode} not found`);
    }

    return await ctx.db.patch(id, {
      ...updates,
      currencyCode: updates.currencyCode.toUpperCase(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("denominations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    return await ctx.db.delete(args.id);
  },
});

export const get = query({
  args: { id: v.id("denominations") },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const denomination = await ctx.db.get(args.id);
    if (!denomination) return null;

    return {
      ...denomination,
      imageUrl: denomination.imageId ? await ctx.storage.getUrl(denomination.imageId) : null,
    };
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const verifyCurrency = query({
  args: { code: v.string() },
  returns: v.object({
    exists: v.boolean(),
    currency: v.union(v.any(), v.null()),
  }),
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const currency = await ctx.db
      .query("currencies")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .unique();

    return currency ? { exists: true, currency } : { exists: false, currency: null };
  },
});

export const loadStandardDenominations = mutation({
  args: { currencyCode: v.string() },
  returns: v.object({
    imported: v.number(),
    skipped: v.number(),
    total: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Verify currency exists
    const currency = await ctx.db
      .query("currencies")
      .withIndex("by_code", (q) => q.eq("code", args.currencyCode.toUpperCase()))
      .unique();

    if (!currency) {
      throw new Error(`Currency ${args.currencyCode} not found`);
    }

    // Get predefined denominations
    const standardDenominations = getDenominationsForCurrency(args.currencyCode.toUpperCase());

    if (standardDenominations.length === 0) {
      throw new Error(`No standard denominations available for ${args.currencyCode}`);
    }

    // Check for existing denominations
    const existingDenominations = await ctx.db
      .query("denominations")
      .withIndex("by_currency", (q) => q.eq("currencyCode", args.currencyCode.toUpperCase()))
      .collect();

    const existingValues = new Set(existingDenominations.map(d => d.value));

    // Insert only new denominations
    const newDenominations = standardDenominations.filter(d => !existingValues.has(d.value));

    const insertedIds = [];
    for (const denomination of newDenominations) {
      const id = await ctx.db.insert("denominations", {
        currencyCode: args.currencyCode.toUpperCase(),
        value: denomination.value,
        isCoin: denomination.isCoin,
      });
      insertedIds.push(id);
    }

    return {
      imported: newDenominations.length,
      skipped: standardDenominations.length - newDenominations.length,
      total: standardDenominations.length
    };
  },
});

export const checkStandardDenominations = query({
  args: { currencyCode: v.string() },
  returns: v.object({
    hasStandard: v.boolean(),
    total: v.number(),
    existing: v.number(),
    availableToImport: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const standardDenominations = getDenominationsForCurrency(args.currencyCode.toUpperCase());

    // If no standard denominations, return zeros across the board to satisfy validator
    if (standardDenominations.length === 0) {
      return {
        hasStandard: false,
        total: 0,
        existing: 0,
        availableToImport: 0,
      };
    }

    // Check existing denominations IN DATABASE (single source of truth)
    const existingDenominations = await ctx.db
      .query("denominations")
      .withIndex("by_currency", (q) => q.eq("currencyCode", args.currencyCode.toUpperCase()))
      .collect();

    const existingValues = new Set(existingDenominations.map((d) => d.value));
    const availableToImport = standardDenominations.filter((d) => !existingValues.has(d.value));

    return {
      hasStandard: true,
      total: standardDenominations.length,
      existing: existingDenominations.length,
      availableToImport: availableToImport.length,
    };
  },
});


